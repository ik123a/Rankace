"""AI-search readiness audit.

Search visibility in 2026 is not only blue-link rankings: a growing share of
queries are answered by assistants that read the web through their own
crawlers. That surface has its own, checkable preconditions -- a robots policy
that does not block the answer engines, a discoverable sitemap, an llms.txt
entry point, structured data, and server-rendered text. All of them are
observable from outside, so all of them can be reported honestly instead of
guessed at.

`analyse` is pure: it takes already-fetched text and returns findings. The
network lives in `api/projects.py`, which keeps this module testable without
touching the internet.
"""
import json
import urllib.robotparser as robotparser

# Three distinct kinds of AI crawler, and they must not be conflated:
#
#   index  - build the retrieval index an answer is drawn from. Blocking these
#            removes the site from AI answers for good.
#   live   - fetch one URL on a user's behalf, at question time. Blocking these
#            only breaks the "open this page" path, and they do not index.
#   train  - collect model-training corpora. Blocking these is a data-licensing
#            decision that does not affect whether the site can be cited today.
#
# Treating a live-fetch agent as equivalent to an index crawler makes a site
# that blocks ChatGPT, Claude and Perplexity look "partly allowed" merely
# because an on-demand fetcher still gets through. It is not partly allowed.
ANSWER_CRAWLERS = [
    ("OAI-SearchBot", "ChatGPT search index", "index"),
    ("ClaudeBot", "Anthropic / Claude index", "index"),
    ("PerplexityBot", "Perplexity index", "index"),
    ("ChatGPT-User", "ChatGPT live browsing", "live"),
    ("Claude-User", "Claude live browsing", "live"),
]
INDEX_CRAWLERS = [name for name, _purpose, kind in ANSWER_CRAWLERS if kind == "index"]
TRAINING_CRAWLERS = [
    ("GPTBot", "OpenAI model training"),
    ("Google-Extended", "Gemini training"),
    ("CCBot", "Common Crawl corpus"),
]

PASS, WARN, FAIL = "pass", "warn", "fail"


def _robot_policy(robots_text: str, user_agent: str) -> str:
    """Return 'allowed' | 'blocked' | 'unknown' for one user agent."""
    if not robots_text.strip():
        return "unknown"
    parser = robotparser.RobotFileParser()
    try:
        parser.parse(robots_text.splitlines())
        # Probe the root: a site that blocks "/" blocks everything, and a site
        # that allows it usually allows its content. Per-path crawling is the
        # crawler's job, not this summary's.
        return "allowed" if parser.can_fetch(user_agent, "/") else "blocked"
    except Exception:
        return "unknown"


def _sitemap_locations(sitemap_text: str) -> int:
    if not sitemap_text:
        return 0
    return sitemap_text.lower().count("<loc>")


def analyse(
    *,
    origin: str,
    robots_text: str,
    robots_status: int,
    sitemap_text: str,
    sitemap_status: int,
    llms_text: str,
    llms_status: int,
    pages: list,
) -> dict:
    """Turn fetched artefacts plus stored crawl rows into a readiness report.

    `pages` are Page ORM rows for the project's most recent crawl.
    """
    answer_policy = {name: _robot_policy(robots_text, name) for name, _p, _k in ANSWER_CRAWLERS}
    training_policy = {name: _robot_policy(robots_text, name) for name, _ in TRAINING_CRAWLERS}

    allowed_answer = [n for n in INDEX_CRAWLERS if answer_policy[n] == "allowed"]
    blocked_answer = [n for n in INDEX_CRAWLERS if answer_policy[n] == "blocked"]

    signals: list[dict] = []

    def add(key, label, status, detail, advice):
        signals.append(
            {"key": key, "label": label, "status": status, "detail": detail, "advice": advice}
        )

    # 1. robots.txt reachable at all.
    if robots_status == 200:
        add(
            "robots",
            "robots.txt published",
            PASS,
            "robots.txt is served, so crawler policy is explicit rather than implied.",
            "Keep it version-controlled; it is a production file.",
        )
    elif robots_status == 0:
        add(
            "robots",
            "robots.txt unreachable",
            WARN,
            "robots.txt could not be fetched. Crawlers then assume everything is allowed.",
            "Publish robots.txt at the site root to state the policy deliberately.",
        )
    else:
        add(
            "robots",
            "robots.txt missing",
            WARN,
            f"robots.txt returned HTTP {robots_status}; crawlers fall back to allow-all.",
            "Publish robots.txt at the site root and reference the sitemap from it.",
        )

    # 2. Answer-engine access -- the one that actually removes you from AI answers.
    #
    # No robots.txt (or an unreadable one) means allow-all by protocol, so every
    # answer crawler IS permitted. Reporting that as "blocked" -- which the first
    # draft did, because every policy came back "unknown" -- would have told a
    # site with no robots.txt that AI engines cannot cite it, which is the
    # opposite of the truth. Access and stated policy are separate signals and
    # are scored separately.
    if robots_status != 200:
        add(
            "answer_crawlers",
            "Answer engines allowed by default",
            PASS,
            "No robots.txt is served, so every crawler -- including the answer engines -- is allowed.",
            "Publish robots.txt to make that policy deliberate and to point at the sitemap.",
        )
    elif allowed_answer and not blocked_answer:
        add(
            "answer_crawlers",
            "Answer engines allowed",
            PASS,
            f"All {len(INDEX_CRAWLERS)} answer-index crawlers are permitted at the root.",
            "No action; re-check after any robots.txt edit.",
        )
    elif allowed_answer:
        add(
            "answer_crawlers",
            "Answer engines partly blocked",
            WARN,
            f"Blocked at root: {', '.join(blocked_answer)}.",
            "Unblock the answer crawlers whose surfaces you want to appear in. "
            "Training crawlers can stay blocked independently.",
        )
    else:
        add(
            "answer_crawlers",
            "Answer engines blocked",
            FAIL,
            "No answer crawler is permitted at the root, so AI surfaces cannot cite this site.",
            "Allow OAI-SearchBot, ClaudeBot and PerplexityBot if AI answers matter to you. "
            "Blocking them does not protect rankings; it only removes the citation.",
        )

    # 3. Sitemap.
    locs = _sitemap_locations(sitemap_text)
    sitemap_in_robots = "sitemap:" in robots_text.lower()
    if sitemap_status == 200 and locs:
        add(
            "sitemap",
            "XML sitemap found",
            PASS if sitemap_in_robots else WARN,
            f"{locs} URL{'s' if locs != 1 else ''} declared in sitemap.xml"
            + ("" if sitemap_in_robots else ", but robots.txt does not reference it."),
            "Reference the sitemap from robots.txt so a crawler finds it in one hop."
            if not sitemap_in_robots
            else "Keep the sitemap current after publishing.",
        )
    elif sitemap_status == 200:
        add(
            "sitemap",
            "Sitemap has no URLs",
            FAIL,
            "sitemap.xml is served but declares no <loc> entries.",
            "Emit absolute URLs for indexable pages, or point to a sitemap index.",
        )
    else:
        add(
            "sitemap",
            "No XML sitemap",
            FAIL,
            f"sitemap.xml returned HTTP {sitemap_status or 'no response'}.",
            "Publish /sitemap.xml listing canonical, indexable URLs and link it from robots.txt.",
        )

    # 4. llms.txt -- the emerging convention for telling an assistant what a site is.
    if llms_status == 200 and llms_text.strip():
        add(
            "llms_txt",
            "llms.txt present",
            PASS,
            f"{len(llms_text.strip().splitlines())} lines of machine-readable site context.",
            "Keep it short: what the site is, the canonical entry points, and what to skip.",
        )
    elif llms_status == 200:
        add(
            "llms_txt",
            "llms.txt empty",
            WARN,
            "llms.txt is served but contains no text.",
            "Add a one-paragraph description, the key URLs and a licence note.",
        )
    else:
        add(
            "llms_txt",
            "No llms.txt",
            WARN,
            f"llms.txt returned HTTP {llms_status or 'no response'}.",
            "Optional, not a ranking factor. It is a cheap way to describe the site to assistants.",
        )

    # 5. Structured data coverage, from the stored crawl.
    schema_pages = 0
    for page in pages:
        try:
            types = json.loads(getattr(page, "schema_types", "") or "[]")
        except Exception:
            types = []
        if types:
            schema_pages += 1
    total = len(pages)
    coverage = round(100 * schema_pages / total) if total else 0
    if not total:
        add(
            "schema",
            "Structured data unknown",
            WARN,
            "No crawl is stored yet, so schema coverage cannot be measured.",
            "Run an audit to measure JSON-LD coverage across the crawled pages.",
        )
    elif coverage >= 80:
        add(
            "schema",
            "Structured data coverage",
            PASS,
            f"{coverage}% of crawled pages declare JSON-LD ({schema_pages}/{total}).",
            "Check the types render as rich results in Search Console.",
        )
    elif coverage >= 40:
        add(
            "schema",
            "Partial structured data",
            WARN,
            f"{coverage}% of crawled pages declare JSON-LD ({schema_pages}/{total}).",
            "Extend the same template to the remaining page types; start with Article and BreadcrumbList.",
        )
    else:
        add(
            "schema",
            "Little structured data",
            FAIL,
            f"Only {coverage}% of crawled pages declare JSON-LD ({schema_pages}/{total}).",
            "Add Organization at the root and the type that matches each page template.",
        )

    # 6. Server-rendered text.
    shells = sum(1 for p in pages if getattr(p, "is_spa_shell", False))
    if not total:
        add(
            "rendering",
            "Rendering unknown",
            WARN,
            "No crawl is stored yet, so HTML body text cannot be checked.",
            "Run an audit; the crawler records whether a page's HTML is an empty app shell.",
        )
    elif shells == 0:
        add(
            "rendering",
            "Server-rendered content",
            PASS,
            f"All {total} crawled pages contain text in the initial HTML.",
            "No action.",
        )
    else:
        add(
            "rendering",
            "Client-only pages",
            FAIL if shells == total else WARN,
            f"{shells} of {total} crawled pages render as an empty JavaScript shell.",
            "Server-render or pre-render those routes; an assistant that does not execute JS sees nothing.",
        )

    # 7. HTTPS.
    if origin.startswith("https://"):
        add(
            "https",
            "HTTPS",
            PASS,
            "Served over HTTPS; crawlers and assistants can fetch it without downgrade.",
            "No action.",
        )
    else:
        add(
            "https",
            "Served over HTTP",
            FAIL,
            "The site is reachable over plain HTTP.",
            "Redirect all HTTP traffic to HTTPS and keep one canonical origin.",
        )

    weights = {
        "robots": 1,
        "answer_crawlers": 3,
        "sitemap": 2,
        "llms_txt": 1,
        "schema": 2,
        "rendering": 2,
        "https": 2,
    }
    status_points = {PASS: 1.0, WARN: 0.5, FAIL: 0.0}
    earned = sum(weights[s["key"]] * status_points[s["status"]] for s in signals)
    total_weight = sum(weights.values())
    score = round(100 * earned / total_weight)

    return {
        "score": score,
        "origin": origin,
        "signals": signals,
        "answer_crawlers": [
            {"name": name, "purpose": purpose, "kind": kind, "policy": answer_policy[name]}
            for name, purpose, kind in ANSWER_CRAWLERS
        ],
        "training_crawlers": [
            {"name": name, "purpose": purpose, "policy": training_policy[name]}
            for name, purpose in TRAINING_CRAWLERS
        ],
        "pages_measured": total,
        "note": (
            "robots.txt, sitemap.xml and llms.txt are fetched live; schema and rendering "
            "come from the stored crawl. No ranking is predicted."
        ),
    }
