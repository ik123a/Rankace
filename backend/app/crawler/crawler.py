import json
import logging
import time
from collections import Counter
from collections.abc import Callable
from dataclasses import dataclass, field
from urllib.parse import urljoin, urlparse

import httpx
from scrapling.parser import Selector

from app.core.config import settings
from app.core.validators import normalize_url, public_target
from app.crawler.robots import RobotsPolicy

logger = logging.getLogger(__name__)


@dataclass
class CrawledPage:
    url: str
    status_code: int = 0
    load_time_ms: int = 0
    title: str = ""
    meta_description: str = ""
    h1: str = ""
    # Number of <h1> elements on the page. Stored separately from `h1`
    # because the analyzer needs the COUNT to enforce the one-H1-per-page rule
    # (Module 2, Topic 13) -- the joined text alone cannot distinguish one H1
    # from three. Defaults to 0 rather than 1 so a page with no H1 at all and a
    # page whose H1 was never parsed are distinguishable in principle; the
    # missing-H1 check uses `not p.h1` because that is what it already relied on.
    h1_count: int = 0
    h2_list: list[str] = field(default_factory=list)
    canonical: str = ""
    word_count: int = 0
    images_total: int = 0
    images_missing_alt: int = 0
    internal_links: int = 0
    external_links: int = 0
    # Internal pages that LINK TO this page. Distinct from internal_links,
    # which counts links going out of it. A page with zero in-links is a true
    # orphan; the previous orphan check tested the out-link count, so a
    # well-linked destination page with no navigation of its own was reported
    # as unreachable. Filled in after the crawl from the link graph.
    in_links: int = 0
    indexable: bool = True
    depth: int = 0
    content_text: str = ""
    out_links: list[str] = field(default_factory=list)
    # Advanced SEO signals (inspired by Scrapling)
    schema_types: list[str] = field(default_factory=list)
    og_title: str = ""
    is_spa_shell: bool = False


def extract_page_data(sel, url: str, status_code: int, elapsed_ms: int, depth: int, start_url: str) -> CrawledPage:
    """Extract full SEO data using Scrapling's high-speed C-backed Selector."""
    # 1. Title
    title = (sel.css("title::text").get() or "").strip()

    # 2. Meta description (case-insensitive attribute search)
    meta_desc = (
        sel.css("meta[name='description']::attr(content)").get()
        or sel.css("meta[name='Description']::attr(content)").get()
        or sel.xpath("//meta[translate(@name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')='description']/@content").get()
        or ""
    ).strip()

    # 3. Canonical tag
    canonical = (
        sel.css("link[rel='canonical']::attr(href)").get()
        or sel.xpath("//link[translate(@rel, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')='canonical']/@href").get()
        or ""
    ).strip()

    # 4. Robots & Indexability
    robots_values = sel.xpath(
        "//meta[translate(@name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')='robots']/@content"
    ).getall()
    robots_directives = {
        directive
        for value in robots_values
        for directive in value.lower().replace(",", " ").split()
    }
    indexable = not robots_directives.intersection({"noindex", "none"})

    # 5. Headings (with nested text support & adaptive fallback)
    h1_texts = [t.strip() for t in sel.xpath("//h1//text()").getall() if t.strip()]
    h1 = " ".join(h1_texts)
    # Count the elements, not the text nodes: one <h1> wrapping several spans
    # yields several text nodes but is still a single heading. xpath on the
    # element itself is what gives the real count.
    h1_count = len(sel.xpath("//h1").getall())
    if not h1:
        # Adaptive fallback: modern SPAs/Tailwind using [role="heading"][aria-level="1"]
        aria_h1s = [t.strip() for t in sel.xpath("//*[@role='heading' and @aria-level='1']//text()").getall() if t.strip()]
        if aria_h1s:
            h1 = " ".join(aria_h1s)
            h1_count = len(sel.xpath("//*[@role='heading' and @aria-level='1']").getall())
    # Fall back to 1 when a heading was found but the element count came back
    # zero (an unusual parser response), so a valid single H1 is never
    # misreported as "multiple headings".
    if h1 and h1_count == 0:
        h1_count = 1

    h2_list = []
    for h2 in sel.css("h2"):
        sub_texts = [t.strip() for t in h2.xpath(".//text()").getall() if t.strip()]
        if sub_texts:
            h2_list.append(" ".join(sub_texts))
    h2_list = h2_list[:20]

    # 6. Body text & clean word count (excluding script, style, noscript, svg)
    body_texts = sel.xpath(
        "//body//text()[not(ancestor::script) and not(ancestor::style) and not(ancestor::noscript) and not(ancestor::svg)]"
    ).getall()
    clean_text = " ".join(" ".join(body_texts).split())
    words = [w for w in clean_text.split() if w]
    word_count = len(words)

    # 7. Images & Alt Text check
    img_nodes = sel.css("img")
    images_total = len(img_nodes)
    missing_alt = 0
    for img in img_nodes:
        alt = (img.attrib.get("alt") or "").strip()
        role = img.attrib.get("role", "")
        aria_hidden = img.attrib.get("aria-hidden", "")
        if not alt and role not in ("presentation", "none") and aria_hidden != "true":
            missing_alt += 1

    # 8. Schema.org JSON-LD Structured Data
    schema_types = []
    for s in sel.css("script[type='application/ld+json']::text").getall():
        try:
            d = json.loads(s)
            if isinstance(d, dict) and "@type" in d:
                schema_types.append(d["@type"])
            elif isinstance(d, list):
                for item in d:
                    if isinstance(item, dict) and "@type" in item:
                        schema_types.append(item["@type"])
        except Exception:
            pass

    # 9. OpenGraph
    og_title = (
        sel.css("meta[property='og:title']::attr(content)").get()
        or sel.css("meta[property='og:Title']::attr(content)").get()
        or ""
    ).strip()

    # 10. SPA Shell Detection (detects empty JavaScript frameworks)
    is_spa_shell = word_count < 30 and bool(sel.css("#__next, #root, #app, [data-reactroot]"))

    # 11. Links (Internal vs External with deduplication)
    out_links = []
    internal = 0
    external = 0
    for href in sel.css("a[href]::attr(href)").getall():
        norm = normalize_url(start_url, href)
        if norm:
            internal += 1
            out_links.append(norm)
        elif href.startswith("http"):
            external += 1

    return CrawledPage(
        url=url,
        status_code=status_code,
        load_time_ms=elapsed_ms,
        title=title,
        meta_description=meta_desc,
        h1=h1,
        h1_count=h1_count,
        h2_list=h2_list,
        canonical=canonical,
        word_count=word_count,
        images_total=images_total,
        images_missing_alt=missing_alt,
        internal_links=internal,
        external_links=external,
        indexable=indexable,
        depth=depth,
        content_text=clean_text[:20000],
        out_links=list(dict.fromkeys(out_links))[:200],
        schema_types=schema_types,
        og_title=og_title,
        is_spa_shell=is_spa_shell,
    )


# Redirect handling is deliberately manual.
#
REDIRECT_CODES = {301, 302, 303, 307, 308}
MAX_REDIRECTS = 5
MAX_RESPONSE_BYTES = 2 * 1024 * 1024


def _get_response(target: httpx.URL, addresses: list[str], timeout: int) -> httpx.Response:
    # Connect to a validated address while retaining the site's HTTP host and TLS identity.
    hostname = target.raw_host.decode("ascii").rstrip(".")
    headers = {"Host": target.netloc.decode("ascii"), "User-Agent": settings.crawl_user_agent}
    with httpx.Client(follow_redirects=False, timeout=timeout, trust_env=False) as client:
        last_error = None
        for address in addresses:
            try:
                with client.stream(
                    "GET",
                    target.copy_with(host=address),
                    headers=headers,
                    extensions={"sni_hostname": hostname},
                ) as response:
                    if response.status_code in REDIRECT_CODES:
                        return httpx.Response(response.status_code, headers=response.headers)
                    content = bytearray()
                    for chunk in response.iter_bytes(chunk_size=65536):
                        content.extend(chunk)
                        if len(content) > MAX_RESPONSE_BYTES:
                            raise ValueError("Response exceeds the audit size limit")
                    decoded_headers = response.headers.copy()
                    decoded_headers.pop("content-encoding", None)
                    decoded_headers.pop("content-length", None)
                    return httpx.Response(
                        response.status_code, headers=decoded_headers,
                        content=bytes(content),
                    )
            except (httpx.ConnectError, httpx.ConnectTimeout) as exc:
                last_error = exc
    raise last_error or ValueError("No reachable public addresses")


def follow(
    url: str, timeout: int = 15, may_fetch: Callable[[str], bool] | None = None,
) -> tuple[httpx.Response, str]:
    current = url
    for _ in range(MAX_REDIRECTS + 1):
        target, addresses = public_target(current)
        current = str(target)
        if may_fetch is not None and not may_fetch(current):
            raise ValueError("robots.txt policy does not allow this page to be fetched")
        response = _get_response(target, addresses, timeout)
        location = response.headers.get("location")
        if response.status_code not in REDIRECT_CODES or not location:
            return response, current
        current = urljoin(current, location)
    raise ValueError("Redirect limit reached")


def fetch_text(url: str, timeout: int = 8) -> tuple[int, str]:
    try:
        response, _ = follow(url, timeout)
    except (httpx.HTTPError, ValueError) as exc:
        logger.info("Could not fetch audit resource: %s", exc)
        return 0, ""
    return response.status_code, response.text


def _site_policy(url: str, policies: dict[str, RobotsPolicy]) -> RobotsPolicy:
    parsed = urlparse(url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    if origin not in policies:
        status, text = fetch_text(f"{origin}/robots.txt")
        policies[origin] = RobotsPolicy.from_response(status, text)
    return policies[origin]


def fetch_page(url: str, *, depth: int = 0, policies: dict[str, RobotsPolicy] | None = None) -> CrawledPage:
    policies = {} if policies is None else policies
    user_agent = settings.crawl_user_agent.split("/", 1)[0]
    start = time.monotonic()
    response, final_url = follow(
        url, timeout=settings.crawl_timeout_seconds,
        may_fetch=lambda target: _site_policy(target, policies).allows(target, user_agent),
    )
    elapsed_ms = round((time.monotonic() - start) * 1000)
    if "html" not in response.headers.get("content-type", "").lower():
        if response.is_success:
            raise ValueError("The requested resource did not return HTML")
        return CrawledPage(url=final_url, status_code=response.status_code, load_time_ms=elapsed_ms, depth=depth)
    return extract_page_data(Selector(response.text), final_url, response.status_code, elapsed_ms, depth, final_url)


def crawl_site(start_url: str) -> list[CrawledPage]:
    """Crawl a site's HTML pages within the configured page and depth budgets."""
    max_pages = settings.crawl_max_pages
    max_depth = settings.crawl_max_depth
    visited: set[str] = set()
    results: list[CrawledPage] = []
    queue = [(start_url, 0)]
    policies: dict[str, RobotsPolicy] = {}
    user_agent = settings.crawl_user_agent.split("/", 1)[0]

    while queue and len(results) < max_pages:
        url, depth = queue.pop(0)
        key = url.rstrip("/")
        if key in visited or depth > max_depth:
            continue
        visited.add(key)
        try:
            page = fetch_page(url, depth=depth, policies=policies)
        except (httpx.HTTPError, ValueError) as exc:
            logger.info("Page could not be audited: %s", exc)
            results.append(CrawledPage(url=url, depth=depth))
            continue
        final_key = page.url.rstrip("/")
        if final_key != key and final_key in visited:
            continue
        visited.add(final_key)
        results.append(page)
        for link in page.out_links:
            if link.rstrip("/") not in visited and len(results) + len(queue) < max_pages * 2:
                queue.append((link, depth + 1))

        delay = max(settings.crawl_delay_seconds, _site_policy(page.url, policies).delay(user_agent))
        if page.status_code in (429, 503):
            delay = max(delay, 2.0)
        if delay:
            time.sleep(delay)

    _count_in_links(results)
    return results


def _count_in_links(pages: list[CrawledPage]) -> None:
    """Fill `in_links` for every crawled page from the discovered link graph.

    A page is counted once per source page, not once per <a> tag: ten links to
    the same URL in one footer are one endorsement, and counting each would let
    a single nav block outrank real editorial links.
    """
    counts: Counter[str] = Counter()
    for page in pages:
        for link in set(page.out_links):
            counts[link.rstrip("/").lower()] += 1
    for page in pages:
        page.in_links = counts.get(page.url.rstrip("/").lower(), 0)
