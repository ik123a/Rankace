# RANKACE: Master Project Report & Scientific Whitepaper

> Historical project report. See the [README](README.md) for current setup, checks, and extension behavior.
> **"An Explainable Search Visibility Intelligence and Autonomous Web Optimization Platform"**

**Academic Course Alignment**: CSET488 Growth Hacking / Search Systems Engineering  
**Authors**: Rankace Engineering & Research Team  
**Date**: November 2026  
**Repository Working Directory**: `d:\Projects\Rankace`  
**Compiled Word Report**: [Rankace_Master_Project_Report.docx](file:///d:/Projects/Rankace/Rankace_Master_Project_Report.docx)  
**Academic Whitepaper**: [ACADEMIC_REPORT.md](file:///d:/Projects/Rankace/ACADEMIC_REPORT.md)  

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Problem Statement & Theoretical Philosophy](#2-problem-statement--theoretical-philosophy)
3. [System Architecture & Full-Stack Topology](#3-system-architecture--full-stack-topology)
4. [Comprehensive Feature & Engine Catalog](#4-comprehensive-feature--engine-catalog)
5. [Mathematical Foundations & Scoring Formulations](#5-mathematical-foundations--scoring-formulations)
6. [Curriculum & Academic Alignment (CSET488 Growth Hacking)](#6-curriculum--academic-alignment-cset488-growth-hacking)
7. [Competitive Analysis & Market Matrix](#7-competitive-analysis--market-matrix)
8. [Design System & Accessibility Engineering](#8-design-system--accessibility-engineering)
9. [The 22 Measured Bugs Found & Fixed](#9-the-22-measured-bugs-found--fixed)
10. [Verification Pipeline & Empirical Quality Assurance](#10-verification-pipeline--empirical-quality-assurance)
11. [End-to-End User Journey & Operations Guide](#11-end-to-end-user-journey--operations-guide)
12. [Known Limitations, Ethical Boundaries & Future Roadmap](#12-known-limitations-ethical-boundaries--future-roadmap)

---

## 1. Executive Summary

Search Engine Optimization (SEO) has historically operated under an epistemic dilemma: commercial software platforms present themselves as proprietary "black boxes" that claim to reverse-engineer Google's algorithmic ranking function. In reality, modern search engines utilize localized neural rankers (RankBrain, MUM, Gemini), evolving personalized vectors, and real-time user click-stream graphs that cannot be deterministically duplicated outside Mountain View. Consequently, webmasters and growth engineers are subjected to arbitrary scores, misleading ranking guarantees, and fragmented tools that diagnose problems without remediating them.

**Rankace** is an open-architecture, empirical search visibility intelligence and autonomous web optimization platform designed to restore scientific rigor, transparent explainability, and executable remediation to technical SEO. Rankace completely discards algorithmic illusions, replacing speculative ranking predictions with observable, mathematically sound formulations of **SEO Health** and **Search Visibility Potential**.

### System Architecture at a Glance
Rankace is a unified, full-stack product comprising three synchronized tiers:
1. **High-Performance FastAPI Backend**: Featuring a robots-compliant, SSRF-hardened crawl engine, a 25-signal technical SEO diagnostic analyzer, an NLP-driven search intent classifier, a TF-IDF cosine-similarity competitor content gap engine, a multi-factor keyword clustering module, a dual-layer AI-Search (GEO) readiness auditor, and an `fpdf2` vectorized PDF report compiler.
2. **Next.js 14 App Router Web Application**: An accessible, token-driven analytics cockpit utilizing Tailwind CSS, GSAP scroll choreography, dynamic Recharts data visualizations, WCAG AA compliant contrast ratios across light and dark themes, and an interactive NLP intent experimentation sandbox.
3. **Chrome Manifest V3 Extension Engine (v1.2.0)**: A browser-native DOM auditing tool and real-time **Auto-Fix Remediation Engine** that mutates defective elements in-page and exports clean, production-ready, sanitized HTML files (`...-rankace-fixed.html`).

---

## 2. Problem Statement & Theoretical Philosophy

### 2.1 The Crisis of Epistemic Integrity in Search Software
Commercial SEO software exhibits four structural defects:
1. **The "Algorithm Illusion"**: Platforms promise to "decode" Google's proprietary search ranking algorithm. In reality, Google's modern search stack incorporates deep neural rankers, personalized location vectors, and user engagement graphs. No external vendor has deterministic access to this infrastructure.
2. **Linear Saturation Pitfalls**: Conventional tools apply linear heuristics that clamp arbitrarily at 100 or collapse to 0, failing to differentiate between moderately complete pages and hyper-optimized resources.
3. **Diagnostic Paralysis**: Traditional crawlers generate dense spreadsheets listing hundreds of broken links or missing tags, leaving the burden of remediation entirely to developers and introducing substantial latency between audit and deployment.
4. **The Generative AI Disruption (GEO vs. SEO)**: With the rise of answer engines (SearchGPT, Perplexity, Claude, Google AI Overviews), webmasters are confused between protecting intellectual property (blocking training scrapers like `GPTBot`) and preserving discoverability (allowing answer crawlers like `OAI-SearchBot`). Standard tools fail to distinguish between these crawler classes.

### 2.2 Core Theoretical Philosophy
* **Empirical Observability**: Rankace evaluates strictly observable artifacts: HTTP status codes, server response latencies, DOM node hierarchies, canonical link structures, robots directives, schema entities, and text corpus semantics.
* **Mathematical Monotonicity & Boundedness**: Health and opportunity metrics are strictly bounded in $[0, 100]$ and monotonic—a healthier site can never exhibit higher headroom than a defective one, and metrics never saturate prematurely.
* **Radical Explainability**: Every diagnostic score, classified intent, and technical finding is accompanied by human-readable linguistic or structural evidence. Black-box magic numbers are strictly forbidden.
* **Remediation Over Reporting**: An audit is only as valuable as its corrective efficiency. Where deterministic rules can infer missing attributes safely, the system provides automated, client-side, zero-leakage code fixes.

---

## 3. System Architecture & Full-Stack Topology

```
                           +-----------------------------------------------+
                           |          Chrome Browser Extension             |
                           |  (Manifest V3: Content Script + Side Panel)   |
                           +-----------------------+-----------------------+
                                                   | In-Page Audit / Auto-Fix
                                                   v
+--------------------------------+       +---------------------------------+
|     Next.js 14 Frontend        |       |        Target Web Resource      |
| (App Router, Tailwind, GSAP)   |       |   (Any live Internet document)  |
+---------------+----------------+       +----------------+----------------+
                |                                         ^
                | HTTP / JWT                              | Safe Crawl / Fetch
                v                                         |
+---------------------------------------------------------+----------------+
|                         FastAPI Application Core                         |
|  - Auth & Security: Direct bcrypt + python-jose JWT (HS256)             |
|  - Crawler Service: httpx + BeautifulSoup4/lxml + SSRF Validator        |
|  - Technical SEO Analyzer: 25 Diagnostic Verification Rules             |
|  - NLP & Semantics: scikit-learn TF-IDF + Cosine Similarity + KMeans     |
|  - GEO Auditor: AI SearchBot Protocol Separation & llms.txt Parser      |
|  - PDF Generator: fpdf2 Vectorized Executive Report Service             |
+--------------------------------+----------------------------------------+
                                 |
                 +---------------+---------------+
                 |                               |
                 v                               v
    +-------------------------+     +-------------------------+
    |   SQLAlchemy 2.0 ORM    |     |   Redis 7 Cache / Bus   |
    |  SQLite / PostgreSQL 16 |     |  (Sessions / Rate Limit)|
    +-------------------------+     +-------------------------+
```

### Component Inventory & Scale

| Layer | Component | Technical Selection | Scale & Responsibility |
| :--- | :--- | :--- | :--- |
| **Backend Core** | FastAPI REST API | Python 3.10+, SQLAlchemy 2.0, Pydantic v2, httpx, BeautifulSoup4, scikit-learn, fpdf2 | ~7,900 LOC across 32 REST endpoints. Crawling, 25 diagnostic rules, intent NLP, clustering, PDF generation. |
| **Web Application** | Next.js 14 App Router | React 18, TypeScript 5, Tailwind CSS, GSAP, Recharts, TanStack Query | ~5,900 LOC across 9 routes. Analytics cockpit, project management, design showcase, theme engine. |
| **Browser Extension** | Chrome Manifest V3 | Vanilla JavaScript, Custom Overlay CSS, Side Panel API | ~4,600 LOC across 5 files. Real-time DOM audits, bounding boxes, Auto-Fix mutations, HTML export. |
| **Data Storage** | Relational & Cache | SQLite (dev) / PostgreSQL 16 (prod), Redis 7 | ACID persistence, cascading deletes, session caching, and rate limiting. |

---

## 4. Comprehensive Feature & Engine Catalog

### 4.1 SSRF-Hardened Web Crawler
* **Per-Hop Redirect Defense**: Intercepts all HTTP 3xx redirects individually, resolving target IPs before each hop to prevent public-to-private pivot attacks against internal loopback interfaces or cloud metadata endpoints (`169.254.169.254`).
* **Robots Protocol Compliance**: Parses target `robots.txt` directives per User-Agent, honoring `Crawl-delay` and path-level `Disallow` rules.
* **Atomic Transaction Rollback**: If an unexpected network abort occurs during a crawl session, database transactions roll back atomically, preventing partial, corrupted crawl batches.
* **In-Link Graph Construction**: Evaluates internal link endorsements per source page to accurately identify isolated orphan documents without false positives.

### 4.2 25-Point Technical SEO Diagnostic Analyzer
Evaluates crawled documents across 8 operational vectors:
1. **Indexability**: HTTP 4xx/5xx status codes, `noindex` directives, missing canonicals, cross-domain canonical mismatches.
2. **Metadata**: Title character boundaries ($[30, 60]$ chars), meta description bounds ($[70, 160]$ chars), duplicate title tags, duplicate meta descriptions.
3. **Heading Hierarchy**: Missing H1 tags, **multiple H1 tags present**, heading level skips (e.g. H1 to H3 without an intervening H2), long pages lacking H2 subheadings.
4. **Content Depth**: Thin content ($<200$ words) and oversized content bloat ($>5,000$ words).
5. **Images & Media**: Missing image `alt` attributes (filtering out tracking pixels and decorative icons), missing width/height attributes.
6. **Security**: Serving resources over insecure HTTP instead of HTTPS, mixed HTTP/HTTPS active content.
7. **Performance**: Server response times exceeding $3,000$ ms, excessive DOM node counts.
8. **Structured Data**: Missing JSON-LD markup, invalid schema types failing Google rich-result standards.

### 4.3 NLP Search Intent Classification Engine
Classifies user queries across the 4 canonical search intents:
$$\mathcal{C} = \{\text{Informational}, \text{Navigational}, \text{Commercial Investigation}, \text{Transactional}\}$$
* **Informational**: Matches questions, how-tos, tutorials, explanations (`how`, `what`, `why`, `guide`, `tutorial`, `learn`).
* **Navigational**: Matches brand terms, domain identities, login endpoints (`login`, `portal`, `sign in`, `official`).
* **Commercial Investigation**: Matches comparative shopping, reviews, benchmarks (`best`, `vs`, `compare`, `review`, `top`, `cheap`).
* **Transactional**: Matches direct purchase signals (`buy`, `order`, `discount`, `coupon`, `price`, `checkout`).
* **Bounded Fallback Floor**: When no lexical markers match, the engine falls back to Informational with a confidence capped at **$0.35$**, ensuring transparent uncertainty rather than fabricated certainty.

### 4.4 Competitor Content Gap & Semantic Vector Space Analysis
* Converts crawled corpora into sparse TF-IDF vector spaces.
* Computes cosine similarity across 10 canonical domain themes (*Pricing*, *Itineraries*, *Permits*, *Best Season*, *FAQs*, *Hotels*, *Safety*, *Reviews*, *Difficulty*, *Routes*).
* Identifies topics covered by competitors but omitted by the target site. If no competitor is registered, this axis is omitted and its weight renormalized.

### 4.5 AI-Search Readiness (GEO Audit)
* **Separation of Crawler Classes**: Distinguishes between live answer retrieval bots (`OAI-SearchBot`, `ClaudeBot`, `PerplexityBot`) and model training scrapers (`GPTBot`, `CCBot`, `Google-Extended`). Blocking training scrapers is treated as an intellectual property preference and does **not** penalize the AI Search score. Blocking answer bots triggers an immediate discoverability failure.
* **`llms.txt` Discovery**: Audits presence and markdown syntax of `/llms.txt` and `/llms-full.txt` files.
* **Client-Shell Detection**: Identifies blank client-only Single Page Application (SPA) shells that answer engines fail to parse.

### 4.6 Chrome Extension v1.2 & Autonomous In-Browser Auto-Fix Engine
* **In-Page DOM Remediation**: One-click remediation applying 9 safe classes of DOM corrections:
  1. Title tag synthesized from the primary H1.
  2. Meta description generated from the opening paragraph.
  3. Redundant duplicate H1 tags demoted to H2 tags (preserving attributes and content).
  4. Descriptive image alt attributes generated from sanitized filenames.
  5. `rel="noopener"` appended to all external `target="_blank"` anchors.
  6. Self-referencing canonical tag injected if missing.
  7. Charset (`utf-8`), viewport (`width=device-width, initial-scale=1`), and `html lang` attributes normalized.
* **Clean-Clone HTML Export**: Deep-clones the page, purges all extension injection nodes (drawers, bounding boxes, tooltip badges), embeds derived metadata, and downloads a sanitized, deployable `...-rankace-fixed.html` file.

---

## 5. Mathematical Foundations & Scoring Formulations

### 5.1 Non-Linear Rational Saturation Curves
To ensure scores discriminate effectively without clipping at arbitrary ceilings, Rankace models metrics using a rational saturation function:

$$f(x; k_{1/2}) = \frac{100 \cdot x}{x + k_{1/2}}$$

*(where $k_{1/2}$ represents the half-saturation point where the score achieves exactly 50%).*

### 5.2 Composite SEO Health Formulation
SEO Health is calculated as a convex combination of six independent diagnostic dimensions:

$$\text{Health} = \sum_{j=1}^{6} w_j \cdot S_j, \quad \text{where } \sum_{j=1}^{6} w_j = 1.0$$

| Dimension | Base Weight ($w_j$) | Theoretical Basis |
| :--- | :---: | :--- |
| **Technical SEO** | 0.25 | Severity-weighted defect penalty deduced from the 25 diagnostic rules. |
| **Content Depth** | 0.20 | Asymmetric curve peaking at 1,800 words and exponentially decaying past 5,000 words. |
| **Keyword Fit** | 0.15 | Mean cosine similarity of page corpus against primary target keywords. |
| **Internal Links** | 0.10 | Rational saturation curve of verified in-link graph density ($k_{1/2} = 10$). |
| **Intent Match** | 0.15 | Linguistic concordance between user query intent and page structural semantics. |
| **Content Gap** | 0.15 | Coverage percentage across competitor topic clusters (floored at 20). |

**Dynamic Weight Renormalization**: When an axis cannot be measured (e.g., Content Gap when no competitor is configured), its weight is redistributed proportionally across active dimensions, preventing artificial 100/100 score inflation:

$$w_i' = \frac{w_i}{\sum_{k \in \mathcal{M}} w_k}$$

### 5.3 Monotonic Search Visibility Potential (Opportunity)
Opportunity represents the mathematically defined headroom remaining across the site:

$$\text{Opportunity} = \sum_{j=1}^{6} w_j \cdot (100 - S_j)$$

Because the partial derivative $\frac{\partial \, \text{Opportunity}}{\partial \, S_j} = -w_j < 0$ is strictly negative, a healthier site can never show more headroom than a broken one. Monotonicity is verified by automated regression invariants.

---

## 6. Curriculum & Academic Alignment (CSET488 Growth Hacking)

| Syllabus Module | Theoretical Core Concept | Rankace Implementation |
| :--- | :--- | :--- |
| **Module 1: Foundations** | Search Engine Architecture (Crawl, Index, Rank) | Async link traversal crawler, robots compliance, and in-link graph analysis (`crawler.py`). |
| | Technical SEO & Ranking Factors | 25-signal automated diagnostic engine checking protocols, metadata, and crawl depths (`technical.py`). |
| | Meta Tags, Canonicals & Hierarchy | Length-bounded validation, multiple-H1 demotion, and cross-domain canonical detection. |
| | Performance & Security | Server response latency monitoring and HTTPS protocol enforcement. |
| **Module 2: Keywords & Content**| Canonical Search Intent Dynamics | 4-class NLP lexical intent classifier outputting transparent linguistic evidence (`intent.py`). |
| | Competitor Keyword Intelligence | Vectorized TF-IDF cosine similarity topic gap identification (`gaps.py`). |
| | LSI & Keyword Clustering | KMeans semantic phrase clustering of whole-word extracted n-grams (`keywords.py`). |
| | Schema Entity Markup | JSON-LD detection, schema extraction, and Google rich-result compatibility validation. |
| | Growth Experimentation | Hypothesis tracking framework measuring baseline vs. variant CTR lifts (`projects.py`). |

---

## 7. Competitive Analysis & Market Matrix

| Feature / Dimension | Ahrefs / Semrush | Screaming Frog | Detailed SEO Ext. | Rankace |
| :--- | :---: | :---: | :---: | :---: |
| **Cost / Access** | High Monthly SaaS ($100+/mo) | Paid License (£199/yr) | Free Extension | **Open-Source & Self-Hosted** |
| **Algorithmic Claim** | Proprietary Rank Predict | Neutral Diagnostics | Neutral Diagnostics | **Scientific Explainability** |
| **Data Honesty** | Hidden Estimations | N/A | N/A | **Explicit DEMO DATA Labels** |
| **Crawler SSRF Defense** | Cloud Infrastructure | Local Desktop Only | Client-Side Only | **Per-Hop Redirect Defense** |
| **Search Intent Engine** | Black-box Class Label | None | None | **NLP + Linguistic Evidence** |
| **Competitor Gaps** | Search Volume Based | Manual Spreadsheet | None | **TF-IDF Semantic Cosine Sim** |
| **GEO / Answer Bot Audit**| Conflated User-Agents | Raw User-Agent | None | **Answer vs Training Disjoint** |
| **In-Browser Auto-Fix** | None (Read-Only) | None (Read-Only) | None (Read-Only) | **Live Patch + Clean HTML Export** |
| **Design System** | Standard Dashboard | Java Swing GUI | Standard Popup | **WCAG AA Dark/Light Tokens** |

---

## 8. Design System & Accessibility Engineering

* **Search Field Aesthetic**: A laboratory-grade visual contract utilizing graphite surfaces (`#08090A`), monospace metrics, and bone text (`#F2F3F3`), avoiding generic "AI-purple" tropes.
* **Unified CSS Token Layer**: Every color resolves through CSS `var()` tokens in `globals.css`. Both themes invert cleanly with zero `dark:` utility classes.
* **Zero-Flash Theme Resolution**: Inline script checks `localStorage` and system OS color scheme before first paint, eliminating hydration flicker.
* **WCAG AA Contrast Compliance**: Body text achieves 16.7:1 (light) and 17.9:1 (dark). Primary button text on accent fill passes all AA thresholds.
* **VisibilityField Canvas Signature**: Bespoke particle field rendered on an HTML5 canvas that dynamically parses active theme tokens at runtime.

---

## 9. The 22 Measured Bugs Found & Fixed

During development and hardening, 22 critical defects were discovered, measured, and systematically repaired:

| # | Measured Defect | Category | Engineering Resolution |
| :---: | :--- | :---: | :--- |
| **1** | `tailwind-merge` deleted custom font sizes (`text-mono-micro`) | Frontend UI | Configured custom class group mapping; pinned with 8-case regression suite. |
| **2** | Canvas runtime crash from unparsed hex strings in `rgba()` | Frontend UI | Implemented programmatic hex-to-channel converter. |
| **3** | Light-theme button labels failed contrast (3.39:1) | Theming | Introduced dedicated `--on-accent-fill` token clearing WCAG AA. |
| **4** | Tertiary ink failed contrast on sunken surfaces (4.18:1) | Theming | Darkened ink values to clear WCAG AA across both themes. |
| **5** | CORS policy blocked `localhost` vs `127.0.0.1` origins | Backend | Widened CORS configuration to allow all development loopback variants. |
| **6** | `numpy` pin segfaulted on Python 3.13 | Backend | Removed redundant direct pin; runtime runs cleanly on Python 3.13. |
| **7** | Opportunity score inverted gap penalty, rewarding broken sites | Backend | Corrected mathematical formulation to weighted shortfalls. |
| **8** | Content & Internal Links scores saturated hard at arbitrary ceilings | Backend | Implemented rational saturation curves and word count decay curves. |
| **9** | Crawler collected data that was never read (dead columns) | Backend | Wired `schema_types`, `og_title`, and link profiles into analysis pipeline. |
| **10** | Missing checks for meta description lower bounds and multiple H1s | Backend | Implemented explicit lower-bound rules and multi-H1 demotion. |
| **11** | Deleting a project orphaned child rows, leaking data into new projects | Data Integrity | Added explicit transactional cascade delete for all child entities. |
| **12** | Crawl failure committed partial, broken batches | Data Integrity | Engineered atomic rollback handler prior to session error marking. |
| **13** | Database timestamps were offset by 6 hours due to naive datetimes | Data Integrity | Standardized explicit UTC datetime serialization at API boundary. |
| **14** | Dashboard displayed fabricated placeholder KPIs | Data Integrity | Replaced placeholders with real aggregate database queries; empty state renders `—`. |
| **15** | Content Gap scored a free 100 when no competitor was configured | Data Integrity | Dynamically omit unconfigured axes and renormalize active weights. |
| **16** | Keyword regex extracted broken word fragments (`'oring purposes'`) | Data Integrity | Rewrote extractor to tokenize whole words and construct valid n-grams. |
| **17** | Intent classifier reported 100% confidence on fallback guesses | Data Integrity | Capped ungrounded fallback confidence to a strict 0.35 ceiling. |
| **18** | UI promised automated crawls and pre-filled fake CTR lifts | Data Integrity | Removed false promises; user initiates crawl; CTR requires user input. |
| **19** | Theme toggle selected two radio buttons simultaneously | Frontend UI | Corrected toggle state logic to ensure mutually exclusive selection. |
| **20** | Crawler SSRF defense was bypassable via 302 redirects to `127.0.0.1` | Security | Engineered per-hop redirect validation resolving IPs before every fetch. |
| **21** | Orphan detection evaluated out-links rather than incoming in-links | Logic | Constructed true crawl graph in-link matrix. |
| **22** | Extension Auto-Fix export lost doctype and leaked drawer markup | Extension | Implemented Clean-Clone DOM sanitization before HTML serialization. |

---

## 10. Verification Pipeline & Empirical Quality Assurance

Rankace is protected by an automated multi-tier verification pipeline comprising **91 gates (100% pass rate)**:

```
                  Empirical Verification Breakdown (91/91 Passed)
                  
  Backend Pytest (29/29)        [==============================] 100% (20.08s)
  Scoring Invariants (21/21)    [==============================] 100%
  Tailwind Class Merge (8/8)    [==============================] 100%
  Next.js Production Build (9/9)[==============================] 100% (0 errors)
  Extension DOM Fixtures (24/24)[==============================] 100%
```

* **Backend Integration Suite**: 29/29 tests passing (`pytest tests -v`).
* **Mathematical Scoring Regressions**: 21/21 assertions passing (`scoring_regression.py`).
* **CSS Class Merge Invariants**: 8/8 test cases passing.
* **TypeScript & Production Next.js Build**: 0 static errors across all 9 App Router routes (`npm run build`).
* **Extension Runtime Benchmark**: On a severely broken test fixture (`_verify.html`), Auto-Fix boosted the SEO score from **4/100 to 86/100**, resolving 16 defects automatically while reporting 3 editorial items for human review.

---

## 11. End-to-End User Journey & Operations Guide

```
[ Step 1: Auth ] ──▶ [ Step 2: Project Creation ] ──▶ [ Step 3: Crawl Session ]
(Login/Demo)          (SSRF Validation)                (Atomic Transaction)
                                                               │
                                                               ▼
[ Step 6: Extension Auto-Fix ] ◀── [ Step 5: PDF & Experiments ] ◀── [ Step 4: Audit Analysis ]
(DOM Fixes & Clean HTML Export)    (Action Prioritization)           (Health, Gaps, GEO)
```

1. **Authentication**: Register, sign in, or click "Fill Demo Credentials" (`demo@rankace.local` / `demo1234`).
2. **Project Setup**: Enter domain URL. Hostnames are sanitized and validated against SSRF boundaries.
3. **Execution**: Trigger the crawl engine. Live progress is displayed, and errors trigger atomic rollbacks.
4. **Analysis**: Inspect SEO Health, Search Visibility Potential, 25 diagnostic rules, intent breakdowns, keyword clusters, competitor topic gaps, and AI-Search readiness.
5. **Action & Experiments**: Execute prioritized recommendations, log CTR experiments, and export vector PDF audit reports.
6. **In-Browser Remediation**: Open the Chrome Extension on any live page to view bounding box defect overlays, execute Auto-Fix, and export deployable HTML.

---

## 12. Known Limitations, Ethical Boundaries & Future Roadmap

### 12.1 Explicit System Boundaries (What is NOT Built)
* **Paid Search Volume / CPC**: Does not query paid commercial APIs (e.g., DataForSEO, Google Ads API) in default open-source configuration. Synthetic demonstration metrics are clearly labeled `DEMO DATA`.
* **Global Backlink Web Index**: Does not crawl the open web to compute external PageRank or domain backlink profiles (which requires petabyte-scale web indexes).
* **Live LLM Prompt Probing**: Does not execute automated synthetic multi-turn prompt scraping against commercial LLMs.
* **Historical SERP Tracking**: Does not maintain private proxy farms to record daily rank position histories.

### 12.2 Future Engineering Roadmap
* **Vector Database Integration**: Introduce Milvus or Qdrant for semantic chunk retrieval across massive crawl corpora.
* **Distributed Headless Crawling**: Scale dynamic JavaScript rendering using clustered Playwright headless browser instances.
* **Chrome Web Store Packaging**: Finalize developer packaging for official distribution on the Chrome Web Store.
* **Automated AI Engine Probing**: Develop scheduled benchmark suites to measure brand citation share across answer engines.

---

## Document Artifact Reference
* **Master Word Document**: [Rankace_Master_Project_Report.docx](file:///d:/Projects/Rankace/Rankace_Master_Project_Report.docx) (347 KB with all charts embedded)
* **Master Markdown Report**: [MASTER_PROJECT_REPORT.md](file:///d:/Projects/Rankace/MASTER_PROJECT_REPORT.md)
* **Academic Whitepaper**: [ACADEMIC_REPORT.md](file:///d:/Projects/Rankace/ACADEMIC_REPORT.md)
* **System Design Contract**: [DESIGN.md](file:///d:/Projects/Rankace/DESIGN.md)
* **Core Technical Report**: [PROJECT_REPORT.md](file:///d:/Projects/Rankace/PROJECT_REPORT.md)
* **Browser Extension Audit**: [REPORT.md](file:///d:/Projects/Rankace/REPORT.md)
