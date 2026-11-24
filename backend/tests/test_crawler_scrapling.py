import json
import pytest
from app.crawler.crawler import CrawledPage, extract_page_data
from scrapling.parser import Selector

def test_extract_page_data_comprehensive():
    html = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <title>Scrapling-Powered SEO Crawler | Rankace</title>
        <meta name="description" content="State-of-the-art crawler inspired by Scrapling for modern websites.">
        <link rel="canonical" href="https://example.com/scrapling-crawler">
        <meta name="robots" content="index, follow">
        <meta property="og:title" content="Scrapling SEO Crawler">
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Rankace Scraper"
        }
        </script>
    </head>
    <body>
        <header>
            <a href="/home">Home</a>
            <a href="https://external.com/docs">External Documentation</a>
        </header>
        <main>
            <h1>Main <span>Heading</span> With Nested Span</h1>
            <h2>Section 1: Architecture</h2>
            <p>Rankace integrates Scrapling features for resilient element extraction and stealth crawling.</p>
            <h2>Section 2: Performance</h2>
            <p>High speed C-backed lxml parsing ensures sub-millisecond execution.</p>
            <img src="/img/hero.png" alt="Descriptive hero diagram">
            <img src="/img/broken.png">
            <img src="/img/icon.svg" role="presentation">
        </main>
    </body>
    </html>
    """
    sel = Selector(html)
    page = extract_page_data(sel, "https://example.com/test", 200, 45, 0, "https://example.com")
    
    assert page.status_code == 200
    assert page.load_time_ms == 45
    assert page.title == "Scrapling-Powered SEO Crawler | Rankace"
    assert page.meta_description == "State-of-the-art crawler inspired by Scrapling for modern websites."
    assert page.canonical == "https://example.com/scrapling-crawler"
    assert page.indexable is True
    assert page.h1 == "Main Heading With Nested Span"
    assert len(page.h2_list) == 2
    assert "Section 1: Architecture" in page.h2_list
    assert page.images_total == 3
    # broken.png is missing alt; hero has alt; icon.svg has role="presentation" (ignored)
    assert page.images_missing_alt == 1
    assert "SoftwareApplication" in page.schema_types
    assert page.og_title == "Scrapling SEO Crawler"
    assert page.internal_links == 1
    assert page.external_links == 1
    assert "https://example.com/home" in page.out_links
    assert page.word_count > 15
    assert page.is_spa_shell is False


def test_extract_page_data_adaptive_h1_fallback():
    # Modern SPA markup where H1 is a div with role="heading" and aria-level="1"
    html = """
    <!DOCTYPE html>
    <html>
    <head><title>SPA Heading Test</title></head>
    <body>
        <div role="heading" aria-level="1" class="font-bold text-3xl">Adaptive Title Detected</div>
        <p>Some body text for word count testing.</p>
    </body>
    </html>
    """
    sel = Selector(html)
    page = extract_page_data(sel, "https://example.com/spa", 200, 30, 1, "https://example.com")
    
    assert page.title == "SPA Heading Test"
    assert page.h1 == "Adaptive Title Detected"


def test_extract_page_data_spa_shell_detection():
    # Empty unhydrated Next.js or React shell
    html = """
    <!DOCTYPE html>
    <html>
    <head><title>App</title></head>
    <body>
        <div id="__next"></div>
        <script src="/_next/static/chunks/main.js"></script>
    </body>
    </html>
    """
    sel = Selector(html)
    page = extract_page_data(sel, "https://example.com/app", 200, 20, 0, "https://example.com")
    
    assert page.is_spa_shell is True


@pytest.mark.parametrize(
    "meta_tags, expected_indexable",
    [
        ("", True),
        ('<meta name="robots" content="index, follow">', True),
        ('<meta name="robots" content="noindex, follow">', False),
        ('<meta name="RoBoTs" content="NOINDEX, FOLLOW">', False),
        ('<meta name="robots" content="none">', False),
        ('<meta name="robots" content="follow\tNOINDEX">', False),
        ('<meta name="robots" content="not-noindex">', True),
        (
            '<meta name="robots" content="index, follow">'
            '<meta name="ROBOTS" content="NOINDEX">',
            False,
        ),
        (
            '<meta name="robots" content="noindex">'
            '<meta name="robots" content="index">',
            False,
        ),
    ],
)
def test_robots_metadata_reaches_technical_analysis(meta_tags, expected_indexable):
    from app.analyzers.technical import analyze_technical

    html = f"<html><head>{meta_tags}</head><body><h1>Test page</h1></body></html>"
    url = "https://example.com/test"
    page = extract_page_data(Selector(html), url, 200, 10, 0, url)

    assert page.indexable is expected_indexable
    issues, _ = analyze_technical([page])
    noindex_issues = [issue for issue in issues if issue["check"] == "noindex"]
    assert len(noindex_issues) == (0 if expected_indexable else 1)
    if noindex_issues:
        assert noindex_issues[0]["page_url"] == url



def test_page_and_robots_share_validated_transport(monkeypatch):
    import gzip

    import httpx

    from app.crawler import crawler

    requests = []

    def respond(request):
        assert request.url.host == "93.184.215.14"
        assert request.headers["host"] == "example.com"
        assert request.extensions["sni_hostname"] == "example.com"
        assert request.headers["user-agent"].startswith("RankaceBot/")
        requests.append(request.url.path)
        if request.url.path == "/robots.txt":
            return httpx.Response(200, text="User-agent: *\nAllow: /")
        if request.url.path == "/":
            return httpx.Response(301, headers={"location": "/guide"})
        return httpx.Response(
            200, headers={"content-type": "text/html", "content-encoding": "gzip"},
            stream=httpx.ByteStream(gzip.compress(b"<title>Trail guide</title><h1>Trail guide</h1>")),
        )

    httpx_client = httpx.Client
    transport = httpx.MockTransport(respond)
    monkeypatch.setattr(crawler.httpx, "Client", lambda **kwargs: httpx_client(transport=transport, **kwargs))
    page = crawler.fetch_page("https://example.com/")
    assert requests == ["/robots.txt", "/", "/guide"]
    assert page.url == "https://example.com/guide"
    assert page.title == "Trail guide"
