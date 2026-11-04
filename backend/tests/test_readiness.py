"""Tests for the AI-search readiness audit and crawler link accounting."""
import json

from app.crawler.crawler import CrawledPage, _count_in_links
from app.services.readiness import analyse


def signal(report, key):
    return next(item for item in report["signals"] if item["key"] == key)


class Row:
    """Minimal stand-in for a Page ORM row."""

    def __init__(self, schema_types=None, is_spa_shell=False):
        self.schema_types = json.dumps(schema_types or [])
        self.is_spa_shell = is_spa_shell


def base_report(**overrides):
    kwargs = dict(
        origin="https://example.com",
        robots_text="User-agent: *\nAllow: /\n",
        robots_status=200,
        sitemap_text="<urlset><url><loc>https://example.com/</loc></url></urlset>",
        sitemap_status=200,
        llms_text="# Example\n\nOne line of context.\n",
        llms_status=200,
        pages=[Row(["Organization"]), Row(["Article"])],
    )
    kwargs.update(overrides)
    return analyse(**kwargs)


def test_robots_blocking_answer_crawlers_fails_access_signal():
    robots = (
        "User-agent: OAI-SearchBot\nDisallow: /\n\n"
        "User-agent: ClaudeBot\nDisallow: /\n\n"
        "User-agent: PerplexityBot\nDisallow: /\n\n"
        "User-agent: *\nAllow: /\n"
    )
    report = base_report(robots_text=robots)
    assert signal(report, "answer_crawlers")["status"] == "fail"


def test_blocking_training_crawler_only_does_not_block_answers():
    # Blocking GPTBot is a training-data decision; it must not be reported as
    # removing the site from live AI answers. Conflating the two is the most
    # common error in AI-SEO advice, and it is the reason the two crawler lists
    # are separate.
    robots = "User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nAllow: /\n"
    report = base_report(robots_text=robots)
    assert signal(report, "answer_crawlers")["status"] == "pass"
    gptbot = next(bot for bot in report["training_crawlers"] if bot["name"] == "GPTBot")
    assert gptbot["policy"] == "blocked"


def test_missing_robots_means_allow_all_not_blocked():
    # Absent robots.txt is allow-all by protocol. The first draft reported it as
    # "no answer crawler is permitted", which is precisely backwards.
    report = base_report(robots_text="", robots_status=404)
    assert signal(report, "answer_crawlers")["status"] == "pass"
    assert "allowed" in signal(report, "answer_crawlers")["detail"].lower()


def test_partial_signals_score_between_full_and_blocked():
    full = base_report()
    no_sitemap = base_report(sitemap_text="", sitemap_status=404)
    assert full["score"] > no_sitemap["score"]
    assert signal(no_sitemap, "sitemap")["status"] == "fail"


def test_client_only_pages_are_reported_as_a_failure():
    report = base_report(pages=[Row(is_spa_shell=True), Row(is_spa_shell=True)])
    assert signal(report, "rendering")["status"] == "fail"


def test_in_links_count_sources_not_links():
    pages = [
        CrawledPage(url="https://example.com/", out_links=["https://example.com/a", "https://example.com/a"]),
        CrawledPage(url="https://example.com/a", out_links=[]),
        CrawledPage(url="https://example.com/b", out_links=[]),
    ]
    _count_in_links(pages)
    by_url = {page.url: page for page in pages}
    # Two <a> tags from the SAME page are one endorsement, not two.
    assert by_url["https://example.com/a"].in_links == 1
    # Nothing links to /b, so it is a genuine orphan; /a is not.
    assert by_url["https://example.com/b"].in_links == 0
    assert by_url["https://example.com/"].in_links == 0
