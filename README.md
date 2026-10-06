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
  - Full internal link crawl engine built with `httpx`, `BeautifulSoup`, and `lxml`.
  - Respects `robots.txt` directives and crawl delays.
  - Implements strict Server-Side Request Forgery (SSRF) defense against private IP ranges and localhost.
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
- **ORM & Database**: SQLAlchemy 2.0 (SQLite default fallback; PostgreSQL production-ready)
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
│   │   ├── dashboard/        # Main project dashboard
│   │   │   └── page.tsx
│   │   ├── login/            # Authentication & registration
│   │   │   └── page.tsx
│   │   ├── projects/[id]/    # Flagship 7-tab project intelligence suite
│   │   │   └── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx          # Marketing landing page & live NLP intent sandbox
│   ├── lib/                  # API client, token storage & blob downloader
│   │   └── api.ts
│   ├── Dockerfile
│   ├── package.json
│   └── tailwind.config.js
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

Run the full automated test suite (11 unit and integration tests):

```bash
cd backend
python -m pytest tests -v
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
