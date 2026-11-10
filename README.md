# RANKACE

## Verified source review — 10 November 2026

This repository contains an implemented SEO research application: a FastAPI/SQLAlchemy backend, Next.js frontend, and Manifest V3 browser extension. Intent classification uses explicit linguistic rules; similarity/clustering use TF-IDF/KMeans when available, with simpler fallbacks. Opportunity, content gaps and AI-readiness are heuristic diagnostics, not measured search rankings or validated predictions. The topic-gap hints are travel-oriented rather than a general learned topic model.

### Repairs and actual checks

- **Robots redirect boundary:** the robots loader previously used an independent automatically-following HTTP client. It now uses the same validated redirect path as other crawl resources. A mocked redirect to a private address verifies that no second/private request is made.
- **HTTP fallback parsing:** when Scrapling fetching was unavailable, an `httpx.Response` reached a selector-only extractor and produced empty failed pages. A BeautifulSoup/lxml fallback now extracts the same main SEO fields. Regression fixtures verify actual title, headings, metadata, links, schema and indexability.
- **Accessible hero heading:** animated word spans had no semantic spaces. The hero now exposes the original spaced headline as its accessible name without changing the visual composition.
- Two initial crawler regressions failed for the reproduced causes before repairs. `cd backend && python tests/run_offline.py` then passed **29 tests**, with 12 lxml deprecation warnings. The runner supplies deterministic DNS fixtures, blocks socket connections and excludes database/auth tests. It requires the backend dependencies, `pytest`, and Scrapling parser for the existing parser tests; this audit reused the provided Python environment rather than claiming a clean-room install.
- `python backend/scripts/scoring_regression.py`: **21/21 passed**, synthetic pages only.
- `cd frontend && npm ci --ignore-scripts --no-audit --no-fund`: passed (171 packages). `npm run build`: passed after the heading correction, including type checking and route generation.
- `node --check extension/background.js`, `content.js`, and `sidepanel.js`: passed. These are syntax checks, not proof of an installed/working extension or auto-fix safety.
- The final production landing page rendered in fresh Edge desktop1440×900/mobile390×844 contexts with both dark/light preferences and reduced motion. Each had the exact spaced accessible heading, one selected theme radio, zero page errors and no horizontal overflow. No backend, login, provider, crawling, email, account, extension installation or real-site action was invoked by those browser checks.

### Source flow

```mermaid
flowchart LR
  UI[Next.js frontend] --> API[FastAPI project endpoints]
  API --> DB[SQLAlchemy project and crawl records]
  API --> Crawl[Crawler: guarded redirects and HTML extraction]
  Crawl --> Analyze[Technical rules, intent, topic gaps, scoring]
  Analyze --> DB
  API --> Report[PDF report generation]
  Ext[Browser extension] --> DOM[Current-page DOM inspection]
```

The diagram describes source relationships. Full authenticated workflows, PostgreSQL/Redis deployment, live crawling and browser-extension integration were not verified in this review.

### Actual local captures

![Local production desktop, dark preference](docs/images/landing-desktop-dark.png)

![Local production mobile, light preference](docs/images/landing-mobile-light.png)

[Desktop light](docs/images/landing-desktop-light.png) · [Mobile dark](docs/images/landing-mobile-dark.png)

These are genuine local landing renders, not generated design mockups. Older screenshots, reports, download bundles and historical verification claims below are preserved as project artifacts; they were not regenerated or independently validated by this audit.

### Open boundaries

The configured JWT/demo defaults are for local development and require deployment review. The URL validator still accepts a hostname after DNS lookup errors and checks DNS separately from the eventual connection, so DNS rebinding/error-path safety is not established. Robots-fetch failures still produce an unknown policy and allow the existing crawl fallback. Do not describe this snapshot as production hardened. No credential rotation, history cleanup, authentication/database mutation or live deployment was performed.

Rollback: revert the review commit to restore the prior crawler, heading and documentation. Existing license and historical provenance remain unchanged.

---


> **"Understand Rankings. Find Opportunities. Grow Visibility."**

AI-powered SEO intelligence and search visibility platform for websites that want to discover where their next organic search-growth opportunity is hiding.

---

## 1. Problem & Philosophy

Traditional SEO tools often confuse users with cryptic raw metrics or make misleading promises about reverse-engineering Google's proprietary ranking algorithms. Google evaluates websites using thousands of private, evolving, and localized signals that cannot be deterministically duplicated outside Mountain View.

**Rankace takes an honest, scientific, and actionable approach:**

Instead of claiming to know Google's secret formula, Rankace computes **Search Visibility Potential** and **SEO Health**. It audits technical foundations, assesses content depth, classifies search intent, evaluates competitor topic gaps, and produces an explainable, prioritized roadmap for real-world growth.

---

## 2. Core Features

- **Robots-Compliant Web Crawler**:
  - Full internal link crawl engine built with `httpx`, `BeautifulSoup`, and `lxml`.
  - Respects `robots.txt` directives and crawl delays.
  - Rejects known private/internal addresses and validates redirect hops, but DNS validation is not connection-pinned and DNS lookup errors currently fail open; this is not a complete SSRF boundary.
  - Detects redirects, canonical tags, page response times, and click depth.

- **Automated Technical SEO Analyzer**:
  - Audits 20+ crucial search signals: HTTPS enforcement, title tag length, missing meta descriptions, H1/H2 heading hierarchy, broken internal links (4xx/5xx), missing image `alt` tags, canonical declarations, thin content (<200 words), oversized pages (>5000 words), and deep crawl levels (>3 clicks).

- **NLP Search Intent Engine**:
  - Classifies queries into 4 canonical search intents:
    1. **Informational** (guides, questions, tutorials)
    2. **Navigational** (brand and domain navigation)
    3. **Commercial Investigation** (reviews, comparisons, "best of", price filters)
    4. **Transactional** (direct buy, order, checkout signals)
  - Every classification includes transparent, human-readable linguistic signals explaining **why** it was categorized.

- **Competitor Content Gap Analyzer**:
  - Crawls competitor URLs and performs semantic cosine similarity analysis on page text.
  - Identifies missing topic domains (e.g. Pricing, Itineraries, Permits, Best Season, FAQs, Hotels) where competitors provide answers that your site omits.

- **Keyword Intelligence & Clustering**:
  - Extracts key semantic phrases from crawled pages and groups them into thematic clusters (e.g., Pricing, Routes, Planning).
  - Computes a transparent 0–100 **Keyword Opportunity Score** combining topical relevance, intent commercial value, and content gap coverage.
  - Clearly designates demo data when commercial search volume APIs are unconfigured.

- **Growth Experiment Engine**:
  - Framework for SEO experimentation: Log hypotheses for title tags, meta descriptions, or headings.
  - Track baseline click-through rates (CTR) vs variant CTR over time without making deceptive claims of automated Google live split-testing.

- **AI-Search Readiness Audit**:
  - Checks the signals that decide whether answer engines can read a site: the `robots.txt` policy for index crawlers (`OAI-SearchBot`, `ClaudeBot`, `PerplexityBot`), live-browsing agents and training crawlers reported **separately**, `sitemap.xml` discovery, `llms.txt`, JSON-LD coverage and server-rendered text.
  - Scores the result 0–100 and explains every signal with the exact advice to act on. Unmeasured axes are marked unmeasured, never scored as perfect.

- **Live Browser Extension**:
  - Manifest V3 side panel + in-page drawer that audits any open page: indexability, canonical, headings, images, link profile, structured data, social metadata, SERP preview and technical hygiene.
  - Draws bounding boxes over defective elements and copies a full text report. Source in `extension/`, one-click download from `/extension`.

- **Executive Report & PDF Export**:
  - Generates comprehensive on-screen reports and instant one-click downloadable PDF audit reports powered by `fpdf2`.

- **Demo Mode**:
  - Pre-seeded with a fully interactive Demo Project ("Demo Travel Website") featuring synthetic metrics clearly labeled `DEMO DATA`.

---

## 3. Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **HTTP Client**: Native Fetch with JWT bearer interceptor and blob stream handlers

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Validation**: Pydantic v2 & Pydantic Settings
- **ORM & Database**: SQLAlchemy 2.0 (SQLite default fallback; PostgreSQL configurable; production deployment unverified)
- **Security**: Direct `bcrypt` password hashing + JSON Web Tokens (`python-jose`)
- **HTTP & Parsing**: `httpx`, `beautifulsoup4`, `lxml`
- **NLP & ML**: `scikit-learn` (TF-IDF vectorizers, cosine similarity, KMeans clustering)
- **Reporting**: `fpdf2` (vectorized PDF generator)
- **Testing**: `pytest`, `pytest-asyncio`

---

## 4. Project Structure

```text
D:\Projects\Rankace
├── backend/
│   ├── app/
│   │   ├── analyzers/        # Technical SEO diagnostic rules
│   │   │   └── technical.py
│   │   ├── api/              # FastAPI REST endpoints
│   │   │   ├── auth.py       # Authentication & JWT verification
│   │   │   └── projects.py   # Projects, crawls, experiments, reports
│   │   ├── core/             # Configuration, database setup, validators, security
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   ├── security.py
│   │   │   └── validators.py
│   │   ├── crawler/          # Safe web crawler engine
│   │   │   └── crawler.py
│   │   ├── models/           # SQLAlchemy ORM models
│   │   │   └── __init__.py
│   │   ├── nlp/              # Search intent classifier & keyword clustering
│   │   │   └── intent.py
│   │   ├── schemas/          # Pydantic validation schemas
│   │   │   └── __init__.py
│   │   ├── services/         # Scoring, topic gaps, keyword opps, PDF generator
│   │   │   ├── demo.py
│   │   │   ├── gaps.py
│   │   │   ├── keywords.py
│   │   │   ├── report.py
│   │   │   └── scoring.py
│   │   └── main.py           # FastAPI application entrypoint & lifespan
│   ├── tests/                # Comprehensive unit and integration test suite
│   │   ├── test_core.py      # Crawler, analyzer, NLP, scoring, PDF tests
│   │   └── test_api.py       # Auth, project, and endpoint integration tests
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── dashboard/        # Project roster, real aggregate metrics
│   │   │   └── page.tsx
│   │   ├── extension/        # Extension download & capability page
│   │   │   └── page.tsx
│   │   ├── login/            # Authentication & registration
│   │   │   └── page.tsx
│   │   ├── projects/[id]/    # 8-tab project intelligence suite
│   │   │   └── page.tsx
│   │   ├── globals.css       # Design tokens, both themes
│   │   ├── layout.tsx
│   │   └── page.tsx          # Marketing landing page & live NLP intent sandbox
│   ├── components/           # Design-system primitives, visuals, theme provider
│   ├── lib/                  # API client, token storage, formatting helpers
│   ├── Dockerfile
│   ├── package.json
│   └── tailwind.config.js
├── extension/                # Manifest V3 page inspector (source of truth)
│   ├── content.js            # Live audit engine, facts layer, bounding boxes
│   ├── sidepanel.html/js     # Side panel: score, SERP preview, page details
│   ├── overlay.css           # Drawer, boxes, tooltips, facts grid
│   ├── manifest.json
│   └── test-audit.js         # Playwright harness for the audit engine
├── scripts/build-extension.mjs  # Rebuilds the served copy + verifiable zip
├── docker-compose.yml
├── .env.example
├── LICENSE
└── README.md
```

---

## 5. Getting Started

### Prerequisites
- Python 3.10 or higher
- Node.js 18+ and npm
- (Optional) Docker & Docker Compose

### 1. Environment Configuration

Copy the example configuration file:

```bash
cp .env.example .env
```

Key environment variables:
- `DATABASE_URL`: `sqlite:///./data/rankace.db` (or `postgresql+psycopg://user:pass@localhost:5432/rankace`)
- `JWT_SECRET`: Random secret key for session signatures
- `CORS_ORIGINS`: `http://localhost:3000`
- `CRAWL_MAX_PAGES`: 50
- `CRAWL_MAX_DEPTH`: 3
- `DEMO_EMAIL`: `demo@rankace.local`
- `DEMO_PASSWORD`: `demo1234`

### 2. Backend Setup & Run

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Run database migrations / initialization and start server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`. Interactive Swagger documentation is accessible at `http://localhost:8000/docs`.

### 3. Frontend Setup & Run

In a separate terminal window:

```bash
cd frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```

Visit `http://localhost:3000` in your web browser.

---

## 6. Demo Mode & Credentials

Rankace is designed to be immediately demonstrable without requiring external paid API keys.

- **Pre-configured Demo Credentials**:
  - **Email**: `demo@rankace.local`
  - **Password**: `demo1234`
- You can also click the **"Fill Demo Credentials"** button on the Sign In page for one-click login.
- To view the demo data preview, open `http://localhost:3000/dashboard?demo=1`.

---

## 7. Running Tests

Run the full automated test suite (29 unit and integration tests) plus the scoring regression suite:

```bash
cd backend
python -m pytest tests -v
python scripts/scoring_regression.py
```

Tests cover:
1. URL validation & SSRF protection against loopback/private IPs
2. Canonical URL normalization and protocol enforcement
3. NLP intent classification across all 4 classes + explainability
4. Keyword clustering & semantic similarity
5. Technical SEO diagnostics (status codes, metadata, headings, alt tags, canonicals, depth)
6. Competitor content gap extraction
7. Multi-factor Opportunity Scoring & Recommendation prioritization
8. PDF report byte compilation
9. API authentication (Register, Login, Me)
10. API project lifecycle (Create, Read, Archive, Export PDF, Delete)
11. Public intent classification sandbox endpoint
12. AI-readiness signals: blocked vs allowed answer crawlers, training-crawler separation, allow-all without robots.txt, partial-signal scoring, client-rendered shells
13. In-link counting: one endorsement per source page, true orphan detection

---

## 8. Docker Deployment

To launch the full Rankace stack (Backend, Frontend, PostgreSQL database, and Redis):

```bash
docker-compose up --build
```

---

## 9. Academic Positioning & Transparency

Rankace is architected as an empirical research and experimentation platform for web crawling, NLP semantics, and heuristic optimization:
- **No algorithmic illusions**: We do not claim to predict Google's private ranking positions.
- **Explainability first**: Every score, recommendation, and intent classification is backed by transparent diagnostic reasons.
- **Data integrity**: Simulated or non-provider data is strictly and explicitly marked as `DEMO DATA`.

---

## 10. License

MIT License. Copyright © 2026 Rankace.
