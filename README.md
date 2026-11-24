# RANKACE

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
  - HTTPX fetches public pages, and Scrapling parses their HTML.
  - Uses a consistent Rankace user agent and applies robots rules on each origin, including redirect destinations. Waits for the configured or published crawl delay between pages.
  - Validates public DNS addresses on every request and connects to an approved IP while retaining the website's HTTP host and TLS identity.
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
  - Fetches competitor HTML under the same crawler policy and compares page text using TF-IDF cosine similarity. An unavailable competitor is marked unmeasured and can be retried by submitting the URL again.
  - Identifies missing topic domains (e.g. Pricing, Itineraries, Permits, Best Season, FAQs, Hotels) where competitors provide answers that your site omits.

- **Keyword Intelligence & Clustering**:
  - Extracts key semantic phrases from crawled pages and groups them into thematic clusters (e.g., Pricing, Routes, Planning).
  - Computes a transparent 0–100 **Keyword Opportunity Score** combining topical relevance, intent commercial value, and content gap coverage.
  - Clearly designates demo data when commercial search volume APIs are unconfigured.

- **Growth Experiment Engine**:
  - Framework for SEO experimentation: Log hypotheses for title tags, meta descriptions, or headings.
  - Track baseline click-through rates (CTR) vs variant CTR over time without making deceptive claims of automated Google live split-testing.

- **AI-Search Readiness Audit**:
  - Checks the signals that decide whether answer engines can read a site: the `robots.txt` policy for index crawlers (`OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot`), live-browsing agents and training crawlers reported **separately**, `sitemap.xml` discovery, `llms.txt`, JSON-LD coverage and server-rendered text.
  - Scores the result 0–100 and explains every signal with the exact advice to act on. Unmeasured axes are marked unmeasured, never scored as perfect.

- **Live Browser Extension**:
  - Manifest V3 side panel + in-page drawer that audits any open page: indexability, canonical, headings, images, link profile, structured data, social metadata, SERP preview and technical hygiene.
  - Draws bounding boxes over defective elements and copies a full text report. Source in `extension/`, one-click download from `/extension`.

- **Executive Report & PDF Export**:
  - Generates comprehensive on-screen reports and instant one-click downloadable PDF audit reports powered by `fpdf2`.

- **Demo Mode**:
  - Public dashboard preview with synthetic summary figures labeled `DEMO DATA`.

---

## 3. Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **HTTP Client**: Native Fetch with JWT bearer headers and PDF downloads

### Backend
- **Framework**: FastAPI (Python 3.12)
- **Validation**: Pydantic v2 & Pydantic Settings
- **ORM & Database**: SQLAlchemy 2.0 (SQLite default fallback; PostgreSQL production-ready)
- **Security**: Direct `bcrypt` password hashing + JSON Web Tokens (`python-jose`)
- **HTTP & Parsing**: `httpx`, Scrapling, and Protego
- **NLP & ML**: `scikit-learn` (TF-IDF vectorizers, cosine similarity, KMeans clustering)
- **Reporting**: `fpdf2` (vectorized PDF generator)
- **Testing**: pytest, Playwright, TypeScript, and ESLint

---

## 4. Project Structure

```text
Rankace
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
│   │   ├── projects/[id]/    # Project intelligence workspace
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

Use Python 3.12 and Node.js 22 or later. The container and CI use Node.js 24. Docker Compose is optional for local development.

### 1. Configure the environment

Copy `.env.example` to `.env`. Generate a unique value for `JWT_SECRET` with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Rankace requires the generated secret at startup. When upgrading an existing installation, replace the old example secret and sign in again. The local API uses SQLite at `backend/data/rankace.db` by default. If the frontend is served on a different origin, set `CORS_ORIGINS` to that exact origin. For a custom browser-facing API address in local development, set `NEXT_PUBLIC_API_URL` in `frontend/.env.local`.

### 2. Start the backend

```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The API documentation is at `http://localhost:8000/docs`.

### 3. Start the frontend

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:3000` and register a local account to create projects and audit websites.

---

## 6. Demo and audit behavior

Open `/dashboard?demo=1` for a public, read-only preview with labeled synthetic metrics. A local demo sign-in account is optional. Set `DEMO_ENABLED=true` and a custom `DEMO_PASSWORD` before startup to create it. Startup preserves passwords on existing accounts, and the legacy example password is disabled.

A crawl that reads zero HTML pages reports an error and preserves the previous successful audit. Competitors contribute to the gap score after their page text has been fetched. Competitors saved before this update can be re-fetched from the Gaps tab.

---

## 7. Checks and extension releases

```bash
cd backend
python -m pip install -r requirements-dev.txt
python -m pytest tests -q
python scripts/scoring_regression.py
```

```bash
cd frontend
npm ci
npm run lint
npm run typecheck
npm run test:classes
npm run build
npx playwright install chromium
npm run test:extension
```

Run `node scripts/build-extension.mjs` from the repository root after a manifest or extension change. It uses Python's standard library to package the versioned ZIP. `node scripts/build-extension.mjs --check` verifies the ZIP and unpacked download against the current source. The extension is available from `/extension`. Extension 1.2.1 preserves indexing directives during Auto-Fix and export. The extension page lists the permissions used by Chrome.

---

## 8. Docker deployment

Set a separate URL-safe `POSTGRES_PASSWORD` in `.env`, then run:

```bash
docker compose up --build --wait
```

Compose starts PostgreSQL, the API, and a standalone production build of Next.js. It keeps PostgreSQL on the Compose network and publishes the web and API ports to loopback by default. `NEXT_PUBLIC_API_URL` is a build-time setting, so set it and rebuild when the browser-facing address changes. For an existing PostgreSQL volume, keep the configured password in sync with the database role because changing `.env` alone does not change the role password.

The Markdown reports, charts, slides, and older extension ZIPs are historical project snapshots. Use this README and the current source for setup and release behavior.

---

## 9. Academic Positioning & Transparency

Rankace is architected as an empirical research and experimentation platform for web crawling, NLP semantics, and heuristic optimization:
- **No algorithmic illusions**: We do not claim to predict Google's private ranking positions.
- **Explainability first**: Every score, recommendation, and intent classification is backed by transparent diagnostic reasons.
- **Data integrity**: Simulated or non-provider data is strictly and explicitly marked as `DEMO DATA`.

---

## 10. License

MIT License. Copyright © 2026 Rankace.
