import json
from collections import Counter


def analyze_technical(pages: list) -> tuple[list[dict], dict]:
    issues: list[dict] = []
    titles = Counter(p.title for p in pages if p.title)
    metas = Counter(p.meta_description for p in pages if p.meta_description)

    def add(url, check, severity, message):
        issues.append({"page_url": url, "check": check, "severity": severity, "message": message})

    for p in pages:
        if p.status_code == 0:
            add(p.url, "fetch_error", "high", "Page could not be fetched (timeout/connection error).")
            continue
        if p.status_code >= 400:
            add(p.url, "broken_link", "critical", f"Page returns HTTP {p.status_code}.")
            continue
        if not p.title:
            add(p.url, "missing_title", "high", "Missing <title> tag.")
        elif len(p.title) < 30:
            add(p.url, "short_title", "medium", f"Title too short ({len(p.title)} chars). Aim 50-60.")
        elif len(p.title) > 65:
            add(p.url, "long_title", "medium", f"Title too long ({len(p.title)} chars). May truncate in SERPs.")
        if not p.meta_description:
            add(p.url, "missing_meta", "high", "Missing meta description.")
        elif len(p.meta_description) > 160:
            add(p.url, "long_meta", "low", "Meta description over 160 chars may truncate.")
        elif len(p.meta_description) < 70:
            # Only the upper bound was checked, so a 10-character description
            # passed unflagged. Module 1 (Slide 12) puts the useful range at
            # 150-160 chars; anything under ~70 cannot summarise the page and
            # Google will invent a snippet from body text instead.
            add(p.url, "short_meta", "low",
                f"Meta description very short ({len(p.meta_description)} chars). Aim 150-160.")
        if not p.h1:
            add(p.url, "missing_h1", "high", "Missing H1 heading.")
        elif p.h1_count > 1:
            # Module 2, Topic 13: exactly ONE H1 per page. Multiple H1s split
            # the topical signal and leave search engines guessing which
            # heading states the page's subject. The crawler previously stored
            # only the joined H1 text, so this could not be detected at all.
            add(p.url, "multiple_h1", "medium",
                f"{p.h1_count} H1 headings on one page; use a single H1 and H2 for subtopics.")
        if len(p.h2_list) == 0 and p.word_count > 400:
            add(p.url, "heading_structure", "low", "Long page with no H2 subheadings.")
        if not p.canonical:
            add(p.url, "missing_canonical", "low", "No canonical tag found.")
        if not p.indexable:
            add(p.url, "noindex", "medium", "Page has noindex and will not appear in search results.")
        if p.images_missing_alt > 0:
            add(p.url, "missing_alt", "medium", f"{p.images_missing_alt} image(s) missing alt text.")
        if p.word_count < 200 and p.status_code == 200:
            add(p.url, "thin_content", "medium", f"Thin content ({p.word_count} words).")
        if p.word_count > 5000:
            add(p.url, "oversized_page", "low", f"Very large page ({p.word_count} words); consider splitting.")
        if not p.url.startswith("https://") and p.url.startswith("http://"):
            add(p.url, "not_https", "high", "Page served over HTTP, not HTTPS.")
        if p.depth >= 4:
            add(p.url, "deep_page", "low", f"Page buried at depth {p.depth}; important pages should be within 3 clicks.")
        if p.load_time_ms > 3000:
            add(p.url, "slow_page", "medium", f"Slow response ({p.load_time_ms}ms).")
        if titles[p.title] > 1 and p.title:
            add(p.url, "duplicate_title", "medium", "Duplicate title tag across multiple pages.")
        if metas[p.meta_description] > 1 and p.meta_description:
            add(p.url, "duplicate_meta", "low", "Duplicate meta description across multiple pages.")

        # ---- Client-rendered shell (Scrapling-inspired) -------------------
        # The crawler has always flagged pages whose body is an empty JS mount
        # point (`#__next`, `#root`, `#app`) and then discarded the flag. This
        # is the single highest-impact rendering defect: the HTML a crawler and
        # a social unfurler receive contains no content at all, so the page can
        # be indexed as thin or not at all while looking perfect in a browser.
        if getattr(p, "is_spa_shell", False):
            add(p.url, "client_rendered_shell", "high",
                "Body HTML is an empty JavaScript mount point (<30 words). Content only "
                "appears after hydration; crawlers and unfurlers may see nothing.")

        # ---- Structured data (Module 2, Topic 17) --------------------------
        # The crawler has always extracted JSON-LD @type values and stored them
        # as `schema_types`, but nothing read the field: the data was collected
        # on every crawl and then discarded. Schema markup is what earns rich
        # results (star ratings, FAQ accordions, breadcrumbs), so its absence
        # is a genuine missed opportunity rather than a neutral gap.
        if not p.schema_types:
            add(p.url, "missing_schema", "low",
                "No JSON-LD structured data found. Schema markup unlocks rich results "
                "(FAQ, Article, Breadcrumb, Product).")
        else:
            # Rich-result types Google actually renders. Breadcrumb and
            # Article are the two most broadly applicable to a content site.
            RICH = {"FAQPage", "Article", "BlogPosting", "NewsArticle", "Product",
                    "BreadcrumbList", "Recipe", "HowTo", "LocalBusiness",
                    "Organization", "Event", "VideoObject", "AggregateRating"}
            if not (set(p.schema_types) & RICH):
                add(p.url, "low_value_schema", "low",
                    f"Structured data present ({', '.join(p.schema_types[:3])}) but no "
                    "rich-result type; FAQPage/Article/BreadcrumbList render as enhanced results.")

        # ---- Open Graph (Module 1, Slide 12) ------------------------------
        # Also extracted by the crawler and never used. Missing og:title means
        # shared links render with no control over the preview title.
        if not p.og_title:
            add(p.url, "missing_og", "low",
                "No og:title. Social shares fall back to the <title>, losing preview control.")

    total = max(len(pages), 1)
    critical = sum(1 for i in issues if i["severity"] == "critical")
    high = sum(1 for i in issues if i["severity"] == "high")
    penalty = min(100, critical * 12 + high * 5 + len(issues))
    technical = max(0, 100 - penalty)
    breakdown = {"technical": round(technical, 1), "pages": total, "issues": len(issues)}
    _ = json
    return issues, breakdown
