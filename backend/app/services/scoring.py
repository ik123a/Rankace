# Word count at which the Content axis peaks. Past this a page is treated as
# possibly padded rather than deep; the technical analyzer separately flags
# >5000 words, so the two must not disagree.
OVERSIZED_AT = 1800

# Scale of the decaying tail past OVERSIZED_AT, in words. Sets how gently the
# score falls: at 5000 words (3200 past the knee) the score is
# peak * TAIL_SCALE / (3200 + TAIL_SCALE). 2000 puts that at ~62% of peak,
# which reads as "long but not bloated" rather than a cliff.
TAIL_SCALE = 2000


def _saturating(value: float, half: float, ceiling: float = 100.0) -> float:
    """Diminishing-returns curve through (0, 0), (half, ceiling/2), (ceiling, ceiling).

    The previous straight-line `(value / target) * 100` ramps saturated hard at
    the target and then carried zero information: Content scored 100 for 800,
    1600 AND 5000 average words, and Internal Links scored 100 for 15, 30 and
    100 average links. Everything past the target was invisible to the score.

    A saturating curve keeps rewarding more input while still approaching the
    ceiling, so 30 links beats 15 and 5000 words beats 1600 -- but the
    difference between 30 and 100 links is far smaller than between 5 and 15,
    which is the actual shape of the underlying benefit.
    """
    if value <= 0:
        return 0.0
    # Rational curve: f(v) = ceiling * v / (v + half). f(half) == ceiling/2 and
    # f(v) -> ceiling asymptotically, never overshooting, with no branch cuts.
    return ceiling * value / (value + half)


def compute_scores(
    technical: float,
    pages: list,
    keyword_fit: float,
    intent_match: float,
    gap_penalty: float,
    gap_measured: bool = True,
) -> dict:
    # Content: half-saturation at 600 words (so ~1200 words reads as "full"),
    # rising to a peak at OVERSIZED_AT then DECAYING. The technical analyzer
    # flags >5000 words, so scoring those pages 100 on this axis contradicted a
    # finding in the same report.
    #
    # The tail is a separate decaying hyperbola rather than a penalty
    # SUBTRACTED from the saturation term. Subtraction cannot be made monotone
    # without eventually crushing the score to zero: any capped penalty lets
    # saturation climb back out (8000 words scored 48.0 vs 5000 at 44.3), and
    # an uncapped one drives the score negative (8000 -> 0.0). A decaying
    # hyperbola is monotonically decreasing BY CONSTRUCTION for every input
    # past the peak, approaches zero asymptotically and never reaches it.
    content = 0.0
    if pages:
        avg_words = sum(p.word_count for p in pages) / max(len(pages), 1)
        peak = _saturating(OVERSIZED_AT, 600)
        if avg_words <= OVERSIZED_AT:
            content = _saturating(avg_words, 600)
        else:
            # g(v) = peak * K / (v - OVERSIZED_AT + K) is strictly decreasing
            # in v for v > OVERSIZED_AT and equals `peak` exactly at the knee,
            # so the curve is continuous where the two branches meet.
            content = peak * TAIL_SCALE / (avg_words - OVERSIZED_AT + TAIL_SCALE)

    # Internal links: half-saturation at 10 links. The old ceiling was 15,
    # above which the axis was flat.
    internal = 0.0
    if pages:
        avg_links = sum(p.internal_links for p in pages) / max(len(pages), 1)
        internal = _saturating(avg_links, 10)

    # Content Gap is reported as COVERAGE (100 - penalty), matching the other
    # components, so every entry in `breakdown` reads "higher is better".
    #
    # gap_penalty is 20 per high-severity gap (see api/projects.py), so it is
    # unbounded in principle and reached 0 coverage -- and therefore an
    # unfixable 15-point health hole -- at just 5 gaps. Coverage is floored at
    # 20 so the axis stays actionable, while a site carrying every gap still
    # scores clearly worse than one carrying none (20 vs 100).
    gap_coverage = max(20.0, 100.0 - gap_penalty)

    breakdown = {
        "Technical SEO": round(technical, 1),
        "Content": round(content, 1),
        "Keyword Fit": round(keyword_fit, 1),
        "Internal Links": round(internal, 1),
        "Intent Match": round(intent_match, 1),
    }

    # Content Gap is only measurable when at least one competitor has been
    # analysed. With none, gap_penalty is 0 by construction and the axis scored
    # a perfect 100 -- a site with zero competitor data collected 15 free health
    # points and displayed "Content Gap 100 · Healthy". An unmeasured axis is
    # omitted and the remaining weights are renormalised, so it neither helps
    # nor hurts the score until there is something to compare against.
    if gap_measured:
        breakdown["Content Gap"] = round(gap_coverage, 1)

    weights = {"Technical SEO": 0.25, "Content": 0.2, "Keyword Fit": 0.15, "Internal Links": 0.1, "Intent Match": 0.15, "Content Gap": 0.15}
    measured_weight = sum(weights[key] for key in breakdown) or 1.0
    health = round(sum(breakdown[k] * weights[k] for k in breakdown) / measured_weight, 1)

    # Opportunity = how much is LEFT to gain, not how bad the site is.
    #
    # The old expression was `100 - health*0.35 + gap_penalty*0.35 +
    # (100 - keyword_fit)*0.3`. It used gap_penalty with one sign directly and
    # the opposite sign indirectly (via health's Content Gap term), so the two
    # partially cancelled and the remainder dominated: measured, a site with
    # MORE high-severity gaps scored HIGHER opportunity (0 gaps -> 84.7,
    # 100 -> 100), and a completely healthy site scored 100 -- the same as a
    # broken one.
    #
    # Opportunity is now defined as the weighted shortfall against a perfect
    # score, which makes it monotone by construction: a healthier site can
    # never show more headroom. Keyword Fit is weighted more heavily than the
    # others because it is the axis a crawl can least directly improve and
    # therefore the most actionable finding.
    shortfalls = {key: 100.0 - value for key, value in breakdown.items()}
    opportunity_weights = {
        "Technical SEO": 0.2,
        "Content": 0.15,
        "Keyword Fit": 0.25,
        "Internal Links": 0.1,
        "Intent Match": 0.1,
        "Content Gap": 0.2,
    }
    opportunity_weight = sum(opportunity_weights[key] for key in shortfalls) or 1.0
    opportunity = round(
        max(
            0.0,
            min(
                100.0,
                sum(shortfalls[k] * opportunity_weights[k] for k in shortfalls) / opportunity_weight,
            ),
        ),
        1,
    )
    return {"health": health, "opportunity": opportunity, "breakdown": breakdown}


def build_recommendations(issues: list[dict], gaps: list[dict], keywords: list[dict]) -> list[dict]:
    recs: list[dict] = []

    def add(title, problem, why, impact, action, priority, effort, score):
        recs.append({"title": title, "problem": problem, "why": why, "impact": impact,
                     "action": action, "priority": priority, "effort": effort, "score": score})

    counts: dict[str, int] = {}
    for i in issues:
        counts[i["check"]] = counts.get(i["check"], 0) + 1
    if counts.get("missing_title"):
        add("Add missing page titles", "Some pages have no <title>.", "Titles drive CTR and topical relevance.",
            "high", "Write unique 50-60 char titles including the target topic.", "high", "low", 92)
    if counts.get("missing_meta"):
        add("Write meta descriptions", "Pages missing meta descriptions.", "SERP snippets affect click-through.",
            "medium", "Add 140-160 char benefit-led meta descriptions.", "medium", "low", 78)
    if counts.get("missing_h1"):
        add("Add H1 headings", "Pages without a clear H1.", "H1 signals page topic to users and crawlers.",
            "high", "Add one descriptive H1 per page.", "high", "low", 88)
    if counts.get("missing_alt"):
        add("Fix image alt text", "Images missing alt attributes.", "Alt supports accessibility and image search.",
            "medium", "Add descriptive alt to informative images.", "medium", "low", 70)
    if counts.get("thin_content"):
        add("Expand thin pages", "Pages under 200 words.", "Thin pages rarely satisfy search intent.",
            "high", "Expand with FAQs, steps, examples to 800+ words.", "high", "medium", 85)
    if counts.get("broken_link") or counts.get("fetch_error"):
        add("Fix broken pages", "4xx or unfetchable URLs found.", "Broken pages waste crawl budget and frustrate users.",
            "high", "Fix links, restore pages or 301 redirect.", "high", "low", 90)
    for g in gaps:
        if g["gap_level"] == "high":
            add(f"Cover missing topic: {g['topic']}", f"Competitors cover {g['topic']}, you do not.",
                "Topic gaps limit long-tail visibility.", "medium",
                f"Add a dedicated section/FAQ on {g['topic']}.", "medium", "medium", 75)
            if len([r for r in recs if "missing topic" in r["title"]]) >= 4:
                break
    top_kw = sorted(keywords, key=lambda k: k.get("opportunity", 0), reverse=True)[:3]
    for k in top_kw:
        if k.get("opportunity", 0) >= 55:
            add(f"Create/optimize page for '{k['keyword']}'",
                "No strong dedicated page for a high-opportunity keyword.",
                f"Intent is {k.get('intent')}; coverage is partial.",
                "high", "Build a dedicated landing page matching the intent.", "high", "medium", 86)
    if not recs:
        add("Maintain and monitor", "No critical gaps detected.", "SEO decays without monitoring.",
            "low", "Schedule monthly recrawls and track changes.", "low", "low", 50)
    order = {"high": 0, "medium": 1, "low": 2}
    recs.sort(key=lambda r: (order.get(r["priority"], 1), -r["score"]))
    return recs
