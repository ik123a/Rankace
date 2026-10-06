import datetime as dt
from app.analyzers.technical import analyze_technical
from app.core.validators import normalize_url, validate_url
from app.crawler.crawler import CrawledPage
from app.nlp.intent import classify_intent, cluster_keywords, embedding_similarity
from app.services.gaps import content_gaps, detect_topics
from app.services.report import clean_text, generate_pdf_report
from app.services.scoring import build_recommendations, compute_scores


def test_validators():
    # Auto-prefixes https
    assert validate_url("example.com").startswith("https://")
    
    # Blocks localhost & private networks (SSRF protection)
    try:
        validate_url("http://localhost:8000")
        assert False, "Should have blocked localhost"
    except ValueError:
        pass

    try:
        validate_url("http://127.0.0.1:8000")
        assert False, "Should have blocked 127.0.0.1"
    except ValueError:
        pass

    # URL normalization
    assert normalize_url("https://example.com", "/about") == "https://example.com/about"
    assert normalize_url("https://example.com", "/about#team") == "https://example.com/about"
    assert normalize_url("https://example.com", "https://other.com/x") is None
    assert normalize_url("https://example.com", "/assets/file.pdf") is None
    assert normalize_url("https://example.com", "mailto:test@example.com") is None


def test_intent_engine_all_classes():
    # Transactional
    res_trans = classify_intent("buy iphone 17 pro price")
    assert res_trans["intent"] == "Transactional"
    assert "matched" in res_trans["why"]

    # Informational
    res_info = classify_intent("how to clean a laptop keyboard safely")
    assert res_info["intent"] == "Informational"
    assert "matched" in res_info["why"]

    # Commercial Investigation
    res_comm = classify_intent("best laptops under 50000 review and comparison")
    assert res_comm["intent"] == "Commercial Investigation"
    assert "matched" in res_comm["why"]

    # Navigational
    res_nav = classify_intent("amazon")
    assert res_nav["intent"] == "Navigational"

    # Empty fallback
    res_empty = classify_intent("")
    assert res_empty["intent"] == "Informational"


def test_embedding_and_clustering():
    sim_high = embedding_similarity("nepal trekking packages", "nepal trekking trip")
    sim_low = embedding_similarity("nepal trekking packages", "quantum physics string theory")
    assert sim_high > sim_low

    keywords = [
        "nepal trek price", "nepal trek cost", "annapurna route", "everest itinerary",
        "best time to trek", "trekking permits"
    ]
    clusters = cluster_keywords(keywords)
    assert len(clusters) == len(keywords)
    assert all(k in clusters for k in keywords)


def test_technical_analyzer_comprehensive():
    pages = [
        CrawledPage(
            url="https://example.com/",
            status_code=200,
            title="Short",
            meta_description="",
            h1="",
            h2_list=[],
            word_count=50,
            images_missing_alt=3,
            depth=0
        ),
        CrawledPage(
            url="https://example.com/broken",
            status_code=404,
            title="404 Not Found",
            depth=1
        ),
        CrawledPage(
            url="http://example.com/insecure",
            status_code=200,
            title="Duplicate Title Test Page Long Enough to Pass 30 Chars",
            meta_description="Duplicate Meta Test Description Long Enough to Pass",
            depth=4
        ),
        CrawledPage(
            url="https://example.com/duplicate",
            status_code=200,
            title="Duplicate Title Test Page Long Enough to Pass 30 Chars",
            meta_description="Duplicate Meta Test Description Long Enough to Pass",
            depth=2
        ),
    ]

    issues, breakdown = analyze_technical(pages)
    check_names = {i["check"] for i in issues}

    assert "missing_meta" in check_names
    assert "missing_h1" in check_names
    assert "short_title" in check_names
    assert "missing_alt" in check_names
    assert "thin_content" in check_names
    assert "broken_link" in check_names
    assert "not_https" in check_names
    assert "deep_page" in check_names
    assert "duplicate_title" in check_names

    assert 0 <= breakdown["technical"] <= 100
    assert breakdown["pages"] == 4


def test_content_gaps():
    your_text = "We offer trekking packages with price and detailed itinerary."
    competitor_texts = [
        "Best season is October. Requires permits and TIMS card. Route passes through hotels and lodges. FAQs answered."
    ]
    gaps = content_gaps(your_text, competitor_texts)
    high_gaps = [g["topic"] for g in gaps if g["gap_level"] == "high"]
    assert "Best Season" in high_gaps or "Permits" in high_gaps


def test_scoring_and_recommendations():
    pages = [CrawledPage(url="https://example.com", word_count=900, internal_links=12)]
    scores = compute_scores(technical=85.0, pages=pages, keyword_fit=75.0, intent_match=90.0, gap_penalty=20.0)

    assert "health" in scores
    assert "opportunity" in scores
    assert 0 <= scores["health"] <= 100
    assert 0 <= scores["opportunity"] <= 100

    issues = [
        {"check": "missing_title", "severity": "high"},
        {"check": "broken_link", "severity": "critical"}
    ]
    gaps = [{"topic": "Permits", "gap_level": "high"}]
    keywords = [{"keyword": "nepal trekking packages", "opportunity": 88, "intent": "Commercial"}]

    recs = build_recommendations(issues, gaps, keywords)
    assert len(recs) > 0
    assert any("title" in r["title"].lower() for r in recs)
    assert any("broken" in r["title"].lower() for r in recs)
    # Check that priority ordering holds (high priority first)
    assert recs[0]["priority"] in ("high", "critical")


def test_pdf_report_generation():
    class DummyProject:
        name = "Demo Travel Website"
        website_url = "https://example.com"
        target_keyword = "nepal trekking packages"

    class DummyScore:
        health = 82.0
        opportunity = 78.0

    class DummyIssue:
        severity = "critical"
        check = "broken_link"
        message = "Page returned HTTP 404."
        page_url = "https://example.com/old-page"

    class DummyRec:
        title = "Fix broken pages"
        priority = "high"
        impact = "high"
        effort = "low"
        problem = "404 errors found"
        why = "Wastes crawl budget"
        action = "Setup 301 redirects"

    class DummyGap:
        topic = "Permits"
        gap_level = "high"

    pdf_bytes = generate_pdf_report(
        project=DummyProject(),
        score=DummyScore(),
        issues=[DummyIssue()],
        recs=[DummyRec()],
        gaps=[DummyGap()],
        keywords=[]
    )

    assert isinstance(pdf_bytes, (bytes, bytearray))
    assert len(pdf_bytes) > 500
    assert pdf_bytes.startswith(b"%PDF")
