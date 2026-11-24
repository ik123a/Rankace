# Rankace — Project Report

> Historical project report. See the [README](README.md) for current setup, checks, and extension behavior.

**"Understand Rankings. Find Opportunities. Grow Visibility."**

AI-powered SEO intelligence and search visibility platform. Audits technical SEO
health, classifies query intent, maps competitor content gaps, and tracks CTR
experiments — with the reasoning behind every score.

---

## 1. Problem & Philosophy

Traditional SEO tools either bury users in cryptic metrics or overclaim about
reverse-engineering Google's proprietary algorithm. Google evaluates sites using
thousands of private, evolving, and localised signals that cannot be
deterministically duplicated outside Mountain View.

Rankace takes an honest, measurable approach. It reports **Search Health** and
**Visibility Opportunity** from evidence it can actually observe: crawl
records, HTTP responses, document structure, and semantic similarity. It does
not predict rankings, and it labels every modelled estimate as an estimate.

---

## 2. Architecture

```
┌─────────────────────────┐        ┌──────────────────────────┐
│  Next.js 14 frontend    │        │  FastAPI backend         │
│  · 5 routes             │───────▶│  · JWT auth              │
│  · light/dark themes    │  /api  │  · SQLAlchemy models     │
│  · token-driven charts  │◀───────│  · crawler + analyzers   │
└─────────────────────────┘        │  · PDF report generator  │
                                   └──────────────────────────┘
```

| Layer | Tech | LOC |
|---|---|---|
| Frontend | Next.js 14, React 18, Tailwind, GSAP, Recharts | ~4,500 |
| Backend | FastAPI, SQLAlchemy, scikit-learn, Scrapling, httpx | ~1,600 |
| Reports | fpdf2 | — |

**Routes:** `/` (landing) · `/login` · `/dashboard` · `/projects/[id]` · `/extension` · `/showcase`

---

## 3. Core Features

### 3.1 Robots-Compliant Web Crawler
- Internal-link crawl to configurable depth (`crawl_max_pages`, `crawl_max_depth`)
- Honours `robots.txt` directives and crawl delays
- **SSRF defence** — rejects private IP ranges and localhost
- Records status codes, redirects, canonicals, response times, click depth
- Parses JSON-LD `@type` values and Open Graph tags

### 3.2 Automated Technical SEO Analyzer — 25 checks

| Category | Checks |
|---|---|
| **Indexability** | `noindex`, missing/invalid canonical, HTTP status |
| **Metadata** | missing/short/long title, missing/short/long meta description, duplicate title, duplicate meta, missing `og:title` |
| **Headings** | missing H1, **multiple H1**, long page with no H2 |
| **Content** | thin content (<200 words), oversized page (>5000) |
| **Images** | missing `alt` attributes |
| **Links** | broken links (4xx/5xx), fetch errors, deep pages (>3 clicks) |
| **Security** | served over HTTP instead of HTTPS |
| **Performance** | slow response (>3000ms) |
| **Structured data** | missing JSON-LD, schema present but no rich-result type |

Severity is graded `critical` / `high` / `medium` / `low`, and **every finding
links back to the exact page that produced it**.

### 3.3 NLP Search Intent Engine
Classifies queries into the four canonical intents (Module 2, Topic 3):

1. **Informational** — guides, questions, tutorials
2. **Navigational** — brand and domain navigation
3. **Commercial Investigation** — reviews, comparisons, "best of", price filters
4. **Transactional** — direct buy, order, checkout signals

Every classification returns **human-readable linguistic markers** explaining
*why* it was categorised, never just a label.

### 3.4 Competitor Content Gap Analyzer
- Crawls competitor URLs, runs semantic cosine similarity on page text
- Detects missing topic domains (Pricing, Itineraries, Permits, Best Season,
  FAQs, Hotels, Safety, Reviews, Difficulty, Routes)
- Grades each gap `high` / `medium` / `low` against what competitors cover

### 3.5 Keyword Opportunity Engine
Scores keyword candidates on a transparent blend of **topical relevance**,
**commercial intent value**, and **content gap coverage**, grouped into semantic
clusters.

### 3.6 Scoring Model

Six weighted axes, each 0–100, all reading "higher is better":

| Axis | Weight | Basis |
|---|---|---|
| Technical SEO | 25% | Severity-weighted issue penalty |
| Content | 20% | Saturating word-count curve, decaying past 1800 words |
| Keyword Fit | 15% | Mean keyword relevance across the corpus |
| Internal Links | 10% | Saturating internal-link density curve |
| Intent Match | 15% | Target keyword vs. page intent |
| Content Gap | 15% | Topic coverage vs. competitors (floored at 20) |

- **Health** = weighted blend of the six axes.
- **Opportunity** = weighted *shortfall* against a perfect score — how much is
  left to gain. Monotone by construction: a healthier site can never show more
  headroom.

Both curves use a rational saturation (`f(v) = 100v/(v+half)`) rather than a
linear ramp, so the score keeps discriminating past the halfway mark instead of
flat-lining at 100.

### 3.7 Prioritised Recommendations
Findings are converted into ranked actions carrying **impact**, **effort**,
**priority** and a composite **score**, ordered so the highest-value fix comes
first.

### 3.8 Growth Experiments
Log a title/description hypothesis, record a baseline CTR, then track it against
the shipped variant. Rankace **records your measurements** — it does not pretend
to run tests inside Google.

### 3.9 AI-Search Readiness Audit
Answers a different question from the crawl: can an answer engine read this
site at all? Three live artefacts (`robots.txt`, `sitemap.xml`, `llms.txt`) are
fetched through the same SSRF-validated redirect walk as the crawler, and two
signals (JSON-LD coverage, server-rendered text) come from the stored crawl.

- Answer-index crawlers (`OAI-SearchBot`, `ClaudeBot`, `PerplexityBot`),
live-fetch agents (`ChatGPT-User`, `Claude-User`) and training crawlers
(`GPTBot`, `Google-Extended`, `CCBot`) are reported **separately**. Blocking a
training crawler is a licensing decision and does not remove a site from live
answers; conflating the two is the most common error in AI-SEO advice.
- No `robots.txt` is allow-all by protocol, not "blocked".
- Advisory gaps (`llms.txt`, missing social metadata) cannot fail the score.
- Signals are weighted, the result is scored 0–100, and every signal carries a
concrete next action. Results are cached for ten minutes and invalidated by a
crawl.

### 3.10 Live Browser Extension
A Manifest V3 side panel and in-page drawer audit the page the user is on:
indexability (meta robots / googlebot), canonical safety, headings, image alt
and dimensions, link profile (internal/external/nofollow/sponsored/ugc,
`target=_blank` without `rel=noopener`), JSON-LD types and validity, Open
Graph / Twitter coverage, viewport, language, charset, hreflang, mixed content
and thin content — plus a SERP preview, page-facts grid, heading outline and a
copyable text report. Defective elements get live bounding boxes.

### 3.11 PDF Export
Generates a formatted PDF report of scores, issues, recommendations, gaps and
keywords.

---

## 4. Design System

Token-driven, defined in `DESIGN.md` and enforced in `globals.css` +
`tailwind.config.js`.

- **Two full themes** — dark (default) and light, switched via
  `:root[data-theme]`. Every colour resolves through a `var()` token, so there
  are zero `dark:` utilities and the theme switch re-colours the whole app
  without touching a component.
- **No-flash loading** — an inline script resolves the stored preference
  against the OS preference before first paint.
- **Three-way control** — Light / Dark / System, with live OS-change repainting
  while following the system.
- **Accessible contrast** — every text-on-surface pair verified in a real
  browser against WCAG AA (body text 16.7:1 light, 17.9:1 dark).
- **Depth** — a four-layer specular/ambient shadow recipe that *inverts*
  between themes rather than merely fading.
- **Canvas signature** — `VisibilityField`, a WebGL-free canvas particle field
  that reads its palette from CSS tokens at runtime (canvas cannot resolve
  `var()`) and rebuilds on theme change.
- **Motion** — GSAP + ScrollTrigger, fully disabled under
  `prefers-reduced-motion`.

---

## 5. Course Coverage (CSET488 Growth Hacking)

### Module 1 — Foundations
| Topic | Status |
|---|---|
| Search engines: crawling / indexing / ranking | Informational (product context) |
| SEO fundamentals | Core |
| Googlebot | Robots-respecting crawler |
| On-Page / Off-Page / Technical SEO | Technical fully covered |
| Algorithm updates (Panda→BERT→Helpful Content) | Informational |
| SEO strategy & planning | Report + prioritised roadmap |
| SEO tools | This product |
| **Technical SEO** | **25 checks** |
| **Technical ranking factors** | **10 factors covered** |
| **Meta tags** | Title, description, robots, canonical, OG, charset, viewport |
| **Website architecture** | Click-depth analysis, internal-link graph |
| Breadcrumbs | Navigation rendered; schema gap flagged |
| **Permalinks** | URL structure crawled |
| **Canonicalization** | Declared vs. present, cross-checked |
| CDN / SSL / TLS | HTTPS enforcement check |
| Website performance | Response-time tracking |
| **XML/HTML sitemap** | Crawl-derived |
| Google Search Console | Manual export path |

### Module 2 — Keyword Research & Content
| Topic | Status |
|---|---|
| Keywords & keyword research | Core |
| **Types** (length / intent / branding) | **All 4 intents implemented** |
| Keyword analysis tools | Built in |
| Easy-to-rank keywords | Relevance + competition blend |
| **Metrics** (volume, KD, CPC) | *Not implemented — needs paid data* |
| Competitor keyword analysis | Content-gap analogue |
| Selecting the right keywords | Relevance-first scoring |
| Own-site ranking keywords | *Partial — via crawl corpus* |
| Hidden ranking keywords | *Not implemented* |
| **LSI keywords** | Semantic clustering via TF-IDF + KMeans |
| **Content research & structure** | H1/H2 hierarchy, depth, thin-content |
| Content planning (pillar-cluster) | Cluster output present |
| **Internal links** | Density + click depth |
| Outbound links | Crawled, not yet analysed |
| **Schema markup** | **JSON-LD detection + rich-result grading** |

---

## 6. Bugs Found & Fixed

Every item below was **measured**, not inferred from reading code.

### Frontend
1. **`tailwind-merge` silently deleted every custom font size.** Its
   `text-color` group is a catch-all, and Rankace names font sizes with the same
   `text-` prefix — so `text-mono-micro`, `text-display-xl` and `text-label`
   were classified as colours and dropped. Live impact: every
   `StatusTag`/`IntentTag` rendered at 16px instead of 11px, and primary buttons
   lost their label ink. Fixed with a project merge config; pinned by an
   8-case regression suite.
2. **Canvas crash killed hydration.** `getPropertyValue` returns `#ff2e6b`, not
   channels, so `rgba(ff2e6b,0.24)` threw at runtime — while `tsc` and the
   production build both passed. Fixed with hex→channel conversion.
3. **Light-theme button labels at 3.39:1.** Primary buttons used
   `text-ink-primary`, which inverts to near-black, putting dark text on a
   saturated rose fill. Fixed with a dedicated `--on-accent-fill` token.
4. **Tertiary ink at 4.18:1** on the sunken surface. Darkened to clear AA on
   every surface it lands on.
5. **CORS blocked all API traffic.** `localhost` and `127.0.0.1` are different
   origins to a browser; neither the app's port nor the IP spelling was listed.
6. **`numpy==1.*` segfaulted on Python 3.13**, so the backend could not start at
   all. Nothing imports numpy directly — the pin was only costing a broken
   interpreter.

### Backend
7. **Opportunity score double-counted the content gap**, using `gap_penalty`
   with opposite signs in two places. A site with *more* high-severity gaps
   scored *higher* opportunity (0 gaps → 84.7, 100 → 100), and a healthy site
   scored the same 100 as a broken one.
8. **Content and Internal Links saturated hard.** Content scored 100 for 800,
   1600 *and* 5000 words; Internal Links scored 100 for 15, 30 *and* 100 links.
   Everything past the target was invisible to the score.
9. **Dead crawler data.** `schema_types`, `og_title`, `external_links` and
   `out_links` were collected on every crawl and read by nothing.
10. **Missing checks:** no meta-description lower bound, and no multiple-H1
    detection — the crawler stored only the joined H1 *text*, so counting was
    impossible.

### Data integrity & truthfulness
11. **Deleting a project orphaned every child row.** Pages, keywords,
    competitors, gaps, recommendations, experiments, scores and sessions all
    survived. SQLite reuses the highest id, so the next project created
    inherited them — measured: a fresh project showed a competitor from a
    deleted one, which also reactivated the Content Gap axis. Child rows are
    now deleted explicitly.
12. **A failed crawl committed its half-written batch.** The error handler set
    the session status and committed, which flushed the pages and issues
    already added. It now rolls back first, then marks the session.
13. **Timestamps were six hours off.** SQLite returns naive datetimes, FastAPI
    serialised them without an offset, and the browser read them as local time,
    so a just-finished audit displayed "6h ago". Serialised with an explicit
    UTC offset at the API boundary.
14. **The dashboard showed three invented KPIs** (88/100 health, 94% "intent
    coverage", an "Online" growth lab). Replaced by a real aggregates endpoint;
    no-data now renders as "—" instead of a failing 0.
15. **Content Gap scored a free 100/100 with no competitors configured,** adding
    15 unearned health points. The axis is now omitted and the remaining
    weights renormalised until a competitor exists.
16. **Keyword extraction produced word fragments.** The regex had no word
    boundaries, so "for illustrative purposes" yielded "oring purposes" and
    shipped it as a keyword opportunity. Rewritten to tokenise whole words and
    build adjacent 2–3-word phrases.
17. **The intent classifier reported 100% confidence for its fallback guess.**
    A query with no signals defaulted to a class and scored the default as a
    unanimous vote. Fallback confidence is now capped at 0.35.
18. **The UI claimed work that had not happened.** Creating a project promised
    "baseline crawl is being initialised" although nothing started a crawl; the
    experiment form was pre-filled with 2.5% / 3.8% CTRs, so submitting it
    recorded a fabricated measurement and a 1.3-point "lift"; and the cockpit
    tab was lost on refresh. All three corrected, and the tab is deep-linkable.
19. **The theme control checked two radios at once** (Dark and System) while
    following the OS preference. Exactly one is now selected.
20. **The crawler's SSRF defence was bypassable by redirect.** Both fetch
    engines followed redirects blindly after the initial URL had been
    validated, so a public host could answer `302 Location: http://127.0.0.1/`.
    Redirects are now resolved one hop at a time, each re-validated.
21. **Orphan detection tested out-links, not in-links.** A well-linked leaf
    with no navigation of its own was reported as unreachable. In-link counts
    are computed from the crawl graph, persisted, and legacy rows read "not
    measured" rather than a false zero.

---

## 7. Verification

| Gate | Result |
|---|---|
| `tsc --noEmit` | clean |
| `next build` | 9 routes built |
| `cn` regression suite | 8/8 |
| Scoring regression suite | 21/21 |
| Backend `pytest` | 29/29 |
| Extension audit engine (live browser, 5 fixtures) | facts + checks verified; clean 100, duplicate H1 90, missing-core-tags 28, broken page 0 |
| Extension Playwright harness (`extension/test-audit.js`) | not run here — node Playwright is not installed in this workspace; the same fixtures were driven manually in a real browser |
| Theme radios | exactly one checked per group (was two) |

---

## 8. Known Gaps

Honest list of what is **not** built:

- **Keyword volume / difficulty / CPC** — requires a paid data provider
- **Rank tracking over time** — no historical position series
- **Crawl-over-crawl diffing** — no change detection between runs
- **Backlink analysis** — off-page authority is not measured
- **AI answer tracking** — readiness is audited (robots, llms.txt, schema,
  rendering); whether ChatGPT or Perplexity actually cites the brand is not
  measured, because that needs live prompt sampling
- **Outbound link quality analysis** — links are crawled, not assessed
- **Pillar-cluster content calendar** — clustering exists, planning does not
- **AI-crawler log analysis** — no server-log ingestion

---

## 9. License

MIT
