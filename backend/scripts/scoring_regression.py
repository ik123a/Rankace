"""Regression gate for backend/app/services/scoring.py.

Three defects are pinned here, all of them measured before the fix rather than
assumed from reading the code:

1. Internal Links saturated at 15 average internal links and then hard-zeroed
   discrimination: 0 -> 0, 5 -> 33.3, 15 -> 100, 16 -> 100, 100 -> 100. A site
   with 16 links and one with 100 scored identically.
2. Content saturated at 800 average words: 800, 1600 and 5000 all scored 100.
   Oversized pages were also flagged as an issue by the technical analyzer
   while scoring a perfect 100 on the content axis, so the two signals
   contradicted each other.
3. Opportunity used gap_penalty with opposite signs in two places at once:
   `- health*0.35 + gap_penalty*0.35 + (100 - keyword_fit)*0.3`. Because
   health already contains `100 - gap_penalty` via the "Content Gap" component,
   the term partially cancelled and the remainder dominated, so a site with
   MORE high-severity gaps scored HIGHER opportunity (0 -> 84.7, 100 -> 100).

Run: python backend/scripts/scoring_regression.py
"""

import sys
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.scoring import compute_scores  # noqa: E402


@dataclass
class P:
    """Minimal stand-in for CrawledPage -- only the fields scoring reads."""

    url: str = "https://example.com/a"
    word_count: int = 800
    internal_links: int = 15
    title: str = "T"
    meta_description: str = "M"
    h1: str = "H"
    h2_list: list = field(default_factory=list)
    canonical: str = "c"
    indexable: bool = True
    images_missing_alt: int = 0
    depth: int = 0
    load_time_ms: int = 100
    status_code: int = 200
    content_text: str = ""
    schema_types: list = field(default_factory=list)


def score(**kw):
    pages_kw = {
        k: kw.pop(k)
        for k in ("word_count", "internal_links")
        if k in kw
    }
    page = P(**pages_kw)
    return compute_scores(
        technical=kw.get("technical", 80),
        pages=[page],
        keyword_fit=kw.get("keyword_fit", 70),
        intent_match=kw.get("intent_match", 70),
        gap_penalty=kw.get("gap_penalty", 30),
    )


results = []


def check(name, condition, detail=""):
    results.append((name, condition, detail))
    print(("ok   " if condition else "FAIL ") + name + (f"  {detail}" if detail else ""))


# ---- 1. Internal Links must keep discriminating above the old 15 ceiling ----
low = score(internal_links=5)["breakdown"]["Internal Links"]
mid = score(internal_links=15)["breakdown"]["Internal Links"]
high = score(internal_links=30)["breakdown"]["Internal Links"]
huge = score(internal_links=100)["breakdown"]["Internal Links"]
check("Internal Links strictly increases 5 -> 15 -> 30", low < mid < high,
      f"{low} < {mid} < {high}")
check("Internal Links still distinguishes 30 from 100", high < huge, f"{high} < {huge}")
check("Internal Links stays within 0..100", all(0 <= v <= 100 for v in (low, mid, high, huge)))
check("Internal Links is 0 when there are no links", score(internal_links=0)["breakdown"]["Internal Links"] == 0)

# ---- 2. Content must not call a 5000-word page perfect -------------------
c800 = score(word_count=800)["breakdown"]["Content"]
c1600 = score(word_count=1600)["breakdown"]["Content"]
c5000 = score(word_count=5000)["breakdown"]["Content"]
check("Content increases past the old 800-word ceiling", c800 < c1600, f"{c800} < {c1600}")
check("Content PEAKS below the oversized threshold and then falls",
      c1600 > c5000, f"1600w {c1600} > 5000w {c5000}")
# Monotonic decay matters more than the direction: an earlier multiplicative
# taper dipped and then recovered, scoring 8000 words ABOVE 5000.
c3200 = score(word_count=3200)["breakdown"]["Content"]
c8000 = score(word_count=8000)["breakdown"]["Content"]
check("Content never recovers after the oversized penalty",
      c8000 <= c5000, f"8000w {c8000} <= 5000w {c5000}")
check("Content decays monotonically from 1800 words on",
      c3200 > c5000 > c8000, f"{c3200} > {c5000} > {c8000}")
check("Content is 0 for an empty page", score(word_count=0)["breakdown"]["Content"] == 0)
check("Content never exceeds 100", max(c800, c1600, c5000) <= 100)

# ---- 3. Opportunity must not reward a worse content gap ------------------
# Same site, only the number of high-severity gaps changes. More gaps means
# MORE to be done, so opportunity is expected to RISE -- that is the point of
# the metric. What must never happen is the old inversion, where a site with
# fewer gaps outranked one with more purely because of double-counting.
opp_low_gap = score(gap_penalty=0)["opportunity"]
opp_mid_gap = score(gap_penalty=60)["opportunity"]
opp_high_gap = score(gap_penalty=100)["opportunity"]
check("Opportunity rises with a larger content gap (more to be done)",
      opp_low_gap <= opp_mid_gap <= opp_high_gap,
      f"{opp_low_gap} <= {opp_mid_gap} <= {opp_high_gap}")
check("Opportunity does not SATURATE at 100 on the gap axis",
      opp_high_gap < 100, f"{opp_high_gap}")

# The real invariant: opportunity is the weighted shortfall and nothing else.
# Computed by HAND from the breakdown and compared, rather than against a
# hard-coded constant -- my first attempt asserted a "floor" of 22.5 and failed
# at 57.5, but 57.5 was correct: an earlier version of this test set
# word_count=0 and internal_links=0, which contribute their own full
# shortfalls (100 * 0.15 and 100 * 0.10) that the assertion ignored.
opp_exact = score(technical=50, word_count=0, internal_links=0,
                  keyword_fit=50, intent_match=0, gap_penalty=0)
manual = sum(
    (100 - opp_exact["breakdown"][k]) * w
    for k, w in {
        "Technical SEO": 0.20, "Content": 0.15, "Keyword Fit": 0.25,
        "Internal Links": 0.10, "Intent Match": 0.10, "Content Gap": 0.20,
    }.items()
)
check("Opportunity equals the weighted shortfall (no double counting)",
      abs(opp_exact["opportunity"] - manual) < 0.05,
      f"{opp_exact['opportunity']} vs hand-computed {manual:.1f}")

# A healthier site must never show more opportunity than a broken one.
broken = score(technical=20, word_count=50, internal_links=0, keyword_fit=20, intent_match=30, gap_penalty=0)
healthy = score(technical=95, word_count=2000, internal_links=60, keyword_fit=90, intent_match=90, gap_penalty=100)
check("A healthy site shows no more opportunity than a broken one",
      healthy["opportunity"] < broken["opportunity"],
      f"healthy {healthy['opportunity']} < broken {broken['opportunity']}")

# Opportunity must still respond to a real signal in the right direction:
# a weak keyword fit is more headroom than a strong one.
weak_kw = score(keyword_fit=10)["opportunity"]
strong_kw = score(keyword_fit=95)["opportunity"]
check("Opportunity rises when keyword fit is weak", weak_kw > strong_kw,
      f"{weak_kw} > {strong_kw}")

# ---- 4. Bounds ------------------------------------------------------------
allvals = []
for tech in (0, 50, 100):
    for wf in (0, 50, 100):
        for im in (0, 50, 100):
            for gp in (0, 50, 100):
                s = score(technical=tech, word_count=100, internal_links=0,
                          keyword_fit=wf, intent_match=im, gap_penalty=gp)
                allvals.append((s["health"], s["opportunity"]))
check("Health and opportunity always stay within 0..100",
      all(0 <= h <= 100 and 0 <= o <= 100 for h, o in allvals),
      f"{len(allvals)} combinations sampled")

# ---- 5. Health must remain a weighted blend and stay monotone -----------
# A genuinely perfect site: every axis at its maximum. Content peaks at 1800
# words, and Content Gap is floored at 20 (a site carrying every high-severity
# gap is still credited 20), so 95+ is the realistic ceiling -- not 100.
# My first version of this test used 3000 words AND gap_penalty=100, so it
# asserted >90 against a site the model correctly scores in the 70s.
perfect = score(technical=100, word_count=1800, internal_links=200,
                keyword_fit=100, intent_match=100, gap_penalty=0)
check("A genuinely optimal site scores very high health", perfect["health"] > 93,
      f"{perfect['health']}")
check("An optimal site has almost no opportunity left",
      perfect["opportunity"] < 12, f"{perfect['opportunity']}")

# Content genuinely above the peak must cost health, by design.
bloated = score(technical=100, word_count=9000, internal_links=200,
                keyword_fit=100, intent_match=100, gap_penalty=0)
check("A bloated 9000-word site scores lower health than an optimal one",
      bloated["health"] < perfect["health"], f"{bloated['health']} < {perfect['health']}")

terrible = score(technical=0, word_count=0, internal_links=0,
                 keyword_fit=0, intent_match=0, gap_penalty=0)
check("A hopeless site scores low health", terrible["health"] < 25, f"{terrible['health']}")

# Health must fall monotonically as any single axis degrades from perfect.
prev = perfect["health"]
monotone = True
for v in (90, 75, 50, 25, 0):
    cur = score(technical=v, word_count=1800, internal_links=200,
                keyword_fit=100, intent_match=100, gap_penalty=0)["health"]
    if cur > prev + 0.05:
        monotone = False
    prev = cur
check("Health falls monotonically as Technical SEO degrades", monotone)

failures = [r for r in results if not r[1]]
print(f"\n{len(results) - len(failures)}/{len(results)} passed")
if failures:
    print(f"{len(failures)} FAILURE(S)")
    sys.exit(1)
print("ALL PASS")
