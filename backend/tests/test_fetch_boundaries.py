from unittest.mock import patch
import httpx
from app.crawler import crawler


def test_robots_fetch_uses_validated_redirect_path(monkeypatch):
    seen = []
    def fake_follow(url, timeout=15):
        seen.append(url)
        raise ValueError('internal redirect blocked')
    monkeypatch.setattr(crawler, 'follow', fake_follow)
    monkeypatch.setattr(crawler.settings, 'crawl_respect_robots', True)
    with patch.object(httpx.Client, 'get', side_effect=AssertionError('unvalidated HTTP request')) as direct:
        assert crawler._robots_allowed('https://example.com/', 'RankaceBot') is None
    assert seen == ['https://example.com/robots.txt']
    direct.assert_not_called()


def test_httpx_fallback_extracts_real_html(monkeypatch):
    html = '<html><head><title>Fallback page title</title></head><body><h1>Fallback heading</h1><a href="/about">About</a></body></html>'
    response = httpx.Response(200, text=html, headers={'content-type': 'text/html'}, request=httpx.Request('GET', 'https://example.com/'))
    monkeypatch.setattr(crawler, 'SCRAPLING_AVAILABLE', False)
    monkeypatch.setattr(crawler, 'validate_url', lambda url: url)
    monkeypatch.setattr(crawler, '_robots_allowed', lambda *args: None)
    monkeypatch.setattr(crawler.settings, 'crawl_max_pages', 1)
    monkeypatch.setattr(crawler.settings, 'crawl_delay_seconds', 0)
    with patch.object(httpx.Client, 'get', return_value=response):
        pages = crawler.crawl_site('https://example.com/')
    assert len(pages) == 1
    assert pages[0].title == 'Fallback page title'
    assert pages[0].h1 == 'Fallback heading'
    assert pages[0].out_links == ['https://example.com/about']

def test_robots_redirect_to_private_host_is_not_requested(monkeypatch):
    calls = []
    def validate(url):
        if '127.0.0.1' in url:
            raise ValueError('private address blocked')
        return url
    def request(self, url, *args, **kwargs):
        calls.append(str(url))
        return httpx.Response(302, headers={'location': 'http://127.0.0.1/admin'}, request=httpx.Request('GET', url))
    monkeypatch.setattr(crawler, 'SCRAPLING_AVAILABLE', False)
    monkeypatch.setattr(crawler, 'validate_url', validate)
    monkeypatch.setattr(crawler.settings, 'crawl_respect_robots', True)
    with patch.object(httpx.Client, 'get', request):
        assert crawler._robots_allowed('https://example.com', 'RankaceBot') is None
    assert calls == ['https://example.com/robots.txt']


def test_httpx_fallback_preserves_seo_signals():
    html = '''<html><head><title>Fallback</title>
    <meta name="RoBoTs" content="NOINDEX,follow"><meta name="Description" content="A description">
    <meta property="og:title" content="Social title"><link rel="canonical" href="https://example.com/page">
    <script type="application/ld+json">{"@type":"Article"}</script></head>
    <body><div role="heading" aria-level="1">Accessible heading</div><h2>Section</h2>
    <p>Visible content</p><script>hidden code</script><img src="a"><img alt="" role="presentation">
    <a href="/about">About</a><a href="https://other.example/">External</a></body></html>'''
    response = httpx.Response(200, text=html)
    page = crawler.extract_page_data(response, 'https://example.com/page', 200, 5, 1, 'https://example.com')
    assert page.indexable is False
    assert page.meta_description == 'A description'
    assert page.h1 == 'Accessible heading' and page.h1_count == 1
    assert page.h2_list == ['Section']
    assert page.schema_types == ['Article']
    assert page.og_title == 'Social title'
    assert page.canonical == 'https://example.com/page'
    assert page.images_total == 2 and page.images_missing_alt == 1
    assert page.internal_links == 1 and page.external_links == 1
    assert 'hidden code' not in page.content_text
