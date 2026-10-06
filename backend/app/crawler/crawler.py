import json
import logging
import time
import urllib.robotparser as robotparser
from dataclasses import dataclass, field
from urllib.parse import urlparse

import httpx

try:
    from scrapling.fetchers import Fetcher
    from scrapling.parser import Selector
    SCRAPLING_AVAILABLE = True
except Exception:
    SCRAPLING_AVAILABLE = False

from app.core.config import settings
from app.core.validators import normalize_url

logger = logging.getLogger(__name__)

# Stealth browser impersonation headers (inspired by Scrapling)
STEALTH_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/126.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Ch-Ua": '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "cross-site",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}


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
    indexable: bool = True
    depth: int = 0
    content_text: str = ""
    out_links: list[str] = field(default_factory=list)
    # Advanced SEO signals (inspired by Scrapling)
    schema_types: list[str] = field(default_factory=list)
    og_title: str = ""
    is_spa_shell: bool = False


def _robots_allowed(base: str, user_agent: str) -> robotparser.RobotFileParser | None:
    if not settings.crawl_respect_robots:
        return None
    try:
        parsed = urlparse(base)
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
        with httpx.Client(headers=STEALTH_HEADERS, follow_redirects=True, timeout=10) as client:
            resp = client.get(robots_url)
            if resp.status_code == 200:
                rp = robotparser.RobotFileParser()
                rp.parse(resp.text.splitlines())
                return rp
    except Exception:
        pass
    return None


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


def fetch_url(url: str, timeout: int = 15):
    """Fetch URL using Scrapling Fetcher (with TLS spoofing & stealth headers), fallback to httpx."""
    t0 = time.time()

    # 1. Primary Engine: Scrapling Fetcher
    if SCRAPLING_AVAILABLE:
        try:
            resp = Fetcher.get(url, timeout=timeout)
            elapsed = int((time.time() - t0) * 1000)
            ctype = resp.headers.get("content-type", "") or ""
            if "html" not in ctype and resp.status == 200:
                return None, resp.status, elapsed, ctype
            return resp, resp.status, elapsed, ctype
        except Exception as e:
            logger.debug(f"Scrapling fetch failed for {url} ({e}), falling back to httpx...")

    # 2. Resilient Fallback: httpx with modern browser impersonation headers
    try:
        with httpx.Client(headers=STEALTH_HEADERS, follow_redirects=True, timeout=timeout) as client:
            resp = client.get(url)
            elapsed = int((time.time() - t0) * 1000)
            ctype = resp.headers.get("content-type", "") or ""
            if "html" not in ctype and resp.status_code == 200:
                return None, resp.status_code, elapsed, ctype

            sel = Selector(resp.text) if SCRAPLING_AVAILABLE else None
            return sel, resp.status_code, elapsed, ctype
    except Exception as e:
        elapsed = int((time.time() - t0) * 1000)
        logger.warning(f"HTTP fetch failed for {url}: {e}")
        return None, 0, elapsed, ""


def crawl_site(start_url: str) -> list[CrawledPage]:
    """Crawl a website starting at `start_url` with Scrapling anti-bot stealth & adaptive parsing."""
    max_pages = settings.crawl_max_pages
    max_depth = settings.crawl_max_depth
    visited: set[str] = set()
    queue: list[tuple[str, int]] = [(start_url, 0)]
    results: list[CrawledPage] = []

    rp = _robots_allowed(start_url, settings.crawl_user_agent)

    while queue and len(results) < max_pages:
        url, depth = queue.pop(0)
        key = url.rstrip("/").lower()
        if key in visited or depth > max_depth:
            continue
        visited.add(key)

        # Check robots.txt permission
        if rp is not None:
            try:
                if not rp.can_fetch(settings.crawl_user_agent, url):
                    continue
            except Exception:
                pass

        sel, status_code, elapsed, ctype = fetch_url(url, timeout=settings.crawl_timeout_seconds)

        if sel is None:
            if status_code != 0 and "html" not in ctype:
                # Non-HTML content (e.g. PDF, image) -> skip
                continue
            # Connection or fetch error
            results.append(CrawledPage(url=url, status_code=status_code, load_time_ms=elapsed, depth=depth))
            continue

        try:
            page = extract_page_data(sel, url, status_code, elapsed, depth, start_url)
            results.append(page)

            # Queue newly discovered internal links for BFS traversal
            for link in page.out_links:
                nkey = link.rstrip("/").lower()
                if nkey not in visited and len(results) + len(queue) < max_pages * 2:
                    queue.append((link, depth + 1))

        except Exception as err:
            logger.error(f"Error parsing page {url}: {err}")
            results.append(CrawledPage(url=url, status_code=status_code, load_time_ms=elapsed, depth=depth))

        # Adaptive rate-limiting & crawl delay
        if status_code in (429, 503):
            # Backoff dynamically when throttled
            time.sleep(2.0)
        elif settings.crawl_delay_seconds:
            time.sleep(settings.crawl_delay_seconds)

    return results
