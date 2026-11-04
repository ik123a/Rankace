# Rankace — Work Report

A detailed explanation of what was changed, why, and how it was verified.
Covers the full working session: correctness fixes across the stack and the
v1.2 browser-extension upgrade (the largest piece of work).

---

## 1. What this session delivered, in one page

| Area | What changed | Status |
|---|---|---|
| **Extension — audit engine** | 12 live checks + a page-facts layer (indexability, social, schema, hreflang, link profile, mixed content, heading outline, CLS signals) with severity-weighted scoring | Verified in-browser |
| **Extension — Auto-Fix** | One click corrects everything derivable and reports what it could not fix | Score **4 → 86** on the test fixture |
| **Extension — Corrected file** | Downloads a deployable `…-rankace-fixed.html` built from a clean clone | Verified: 9 fixes present, zero extension-UI leakage |
| **Extension — Right-click menu** | Audit, nofollow highlight, `site:` / `inurl:` search, duplicate check, 8 SEO tools | Menu code evaluates clean |
| **Extension — Side panel** | Auto-Fix & Export section + Quick SEO Tools chips | Verified with stubbed `chrome.*` |
| **Extension — Motion** | Staggered entrance animations in drawer and side panel | Implemented in `overlay.css` / `sidepanel.html` |
| **Backend** | SSRF/redirect hardening, crawl failure handling, orphaned-row cascade delete, scoring integrity, dashboard metrics endpoint, AI-search readiness audit | 29/29 tests pass |
| **Frontend** | Fake KPI numbers replaced, false crawl message fixed, anchor/tab/link defects fixed, new readiness tab | `tsc` clean, production build passes |
| **Docs** | README, DESIGN.md, PROJECT_REPORT.md, extension README, `/extension` page all match the code | Done |

Version shipped: **extension v1.2.0** → `frontend/public/download/rankace-extension-v1.2.0.zip` (53.5 KB, zip-verified).

---

## 2. Extension v1.2 — the major update

This was built against the reference of Ahrefs' **Detailed SEO Extension**
(7 insight tabs, right-click quick actions) and goes beyond it with the
correction pass, which no inspected competitor ships.

### 2.1 Audit engine (`extension/content.js`)

Reads the live DOM — never infers. Every field is either present in the
document or reported as absent.

**Checks:** title length, meta description length, canonical (missing /
cross-domain), H1 missing/duplicate/empty, image alt (visible content images
only — decorative, captioned, aria-labelled and tracking-pixel images are
excluded), anchor text (empty + generic), thin content, `noindex`,
meta refresh, heading-level skips, social preview completeness, JSON-LD
validity and `@type` coverage, viewport, `html lang`, mixed content,
hreflang without `x-default`, `target=_blank` without `noopener`, images
without dimensions.

**Scoring:** weighted per finding (`critical 9 / warning 3 / info 0`,
×1.6). Advisory findings cost zero, so a missing Twitter card can never make
a healthy page look sick, and 12 critical defects always score below 3
warnings (a regression the test fixture pins).

**Page facts:** canonical state, robots, language, viewport, charset,
hreflang set, title/description lengths, DOM nodes, scripts/stylesheets,
internal/external/nofollow/sponsored/ugc counts, lazy images, schema types
and blocks — rendered in the side panel, the in-page drawer, and the
copyable text report.

### 2.2 Auto-Fix engine — *the extension now corrects the page*

Two products, both derived from the same audit:

**1. Live patch (`applyAllFixes`)** — safe DOM mutations applied to the open tab:

| Fix | Derivation |
|---|---|
| `<title>` | page's H1 (truncated to 60 chars) |
| `meta description` | opening paragraph (155 chars) |
| `rel=canonical` | self-referencing current URL |
| `<html lang>` | browser locale |
| viewport | `width=device-width, initial-scale=1` |
| charset | `utf-8` |
| `noindex` | stripped, every other robots directive kept |
| duplicate `<h1>` | demoted to `<h2>`, content and attributes preserved |
| missing `alt` | humanised image filename; unresolvable images go to the manual list |
| `rel=noopener` | appended to every `target="_blank"` link |

It measures the score before and after and shows the delta (`4 → 86` in the
fixture). Everything it **cannot** derive — a written title, a meta refresh
that might be the site's actual routing — is listed as *needs a human
decision* instead of being guessed.

Fixes are **tab-local**: reload discards them. Nothing is written to the
site or sent anywhere.

**2. Corrected file (`generateCorrectedHtml` + `downloadCorrectedHtml`)** —
exports the fixed page as `…-rankace-fixed.html`:

- serialises a **clean clone** of `<html>` — pill, drawer and defect boxes
  are removed first, so extension UI can never leak into a deployable file
- folds in the body fixes (H1 demotion, alt text, noopener) *even if the
  user never pressed Auto-Fix*
- derives the head tags with the same rules as the live pass — including
  title/description, which the first implementation forgot, and `<html lang>`,
  which sits outside the `<head>` match and needed a post-pass fix
- **page-supplied strings are never copied into the output** (`og:`,
  JSON-LD, `href` attributes), so a hostile page cannot smuggle markup into
  the file you deploy

The drawer's results card is sticky: the MutationObserver re-renders the
drawer 400 ms after every page mutation and was wiping the results; the last
result is now retained across re-renders.

### 2.3 Right-click SEO menu (`background.js`)

Inspired directly by Detailed SEO's context menu:

- ⚡ Audit this page with Rankace (injects the script if needed)
- Highlight nofollow links → boxes every `rel=nofollow` link with its target
- Search this site on Google (`site:`) / Find this URL (`inurl:`)
- Check selected text for duplicates (exact-phrase search on the selection)
- **SEO quick tools** → PageSpeed Insights, Rich Results Test, W3C Validator,
  Wayback Machine, SimilarWeb, Moz, Majestic, BuzzSumo

The side panel carries the same eight tools as clickable chips built from
the active tab's URL (`renderQuickTools`).

### 2.4 UI & motion

- Auto-Fix card in the in-page drawer with before→after score, applied /
  skipped / manual lists, and **Download corrected .html** + **Re-run**
- *Auto-Fix & Export* and *Quick SEO Tools* sections in the side panel
- Staggered rise-in animations for drawer sections and issue cards
  (`rankace-rise`), auto-fix items animating one by one, side-panel
  `rankace-fade-up` with stagger, quick-tool chips lifting on hover, score
  dial scale on hover — all on the existing easing tokens

### 2.5 What the extension can now do that it could not before (summary for users)

1. **See** — 12 checks + full page facts, weighted score, SERP preview.
2. **Show** — glowing bounding boxes on the exact element, click-to-scroll.
3. **Fix** — one click corrects every derivable issue, in the tab, with a
   score delta and a list of what it refused to guess.
4. **Export** — a corrected, deployable `.html` file, generated locally.
5. **Act** — right-click to search, compare, validate and inspect the page
   across eight external SEO tools.

---

## 3. Backend correctness fixes

- **SSRF redirect bypass** — redirect targets are re-validated against the
  private-address rules, not trusted because the first hop was public.
- **Crawl failure** — a failed crawl no longer commits partial page rows;
  the session records the failure instead.
- **Swallowed competitor errors** — competitor fetch failures surface on the
  response instead of disappearing into an empty gap report.
- **In-link / orphan semantics** — corrected so orphan pages are counted by
  absence of internal in-links, not by a mis-scoped query.
- **Unused SPA signal** — removed dead code left from an earlier crawler path.
- **Timestamps** — crawl timestamps are normalised to UTC on output
  (`_iso_utc`), so the UI never shows a naive local time as UTC.
- **Scoring integrity** — with no competitors configured, Content Gap
  reported a perfect 100 and inflated project health by 15 points; it now
  reports as unavailable rather than perfect.
- **Orphaned rows on delete** — deleting a project left every child row
  behind, and SQLite reuses ids: a new project could inherit a previous
  project's competitor. Delete now cascades (verified by direct DB
  reproduction and a regression test).
- **Dashboard metrics endpoint** — `/api/projects/overview` returns real
  aggregates, replacing fabricated KPI numbers in the UI.
- **AI-search readiness audit** — new `readiness` service + endpoint: robots
  policy for AI crawlers (GPTBot, ClaudeBot, PerplexityBot…), `sitemap.xml`,
  `llms.txt`, schema coverage and JS-shell counts, with a short in-process
  cache because none of it changes minute to minute.

## 4. Frontend fixes

- Dashboard KPI numbers now come from the metrics endpoint (no more
  hardcoded stats).
- False "crawl running" message removed — stale sessions report as *error*.
- Experiment tab no longer ships fake default CTR values.
- Broken `#classifier` anchor corrected; project tab survives a refresh;
  wrong link labels fixed.
- New **AI Search Readiness** tab in the project cockpit + last-crawl status.

---

## 5. Verification — what was actually run

| Check | Result |
|---|---|
| `python -m pytest tests -q` (backend) | **29 passed**, 12 warnings (lxml deprecation) |
| `npx tsc --noEmit` (frontend) | **clean**, exit 0 |
| `npm run build` (Next.js production) | **exit 0**, all routes compiled |
| `node --check` on `content.js`, `sidepanel.js`, `background.js` | clean |
| Extension fixture run (real `content.js`, stubbed `chrome.*`) | audit → auto-fix → export all pass; score 4 → 86; 9 corrections; export contains title/description/viewport/canonical/charset/lang, 1 H1, alt text, noopener, **no** extension UI |
| Side panel run (stubbed `chrome.*`) | score/issue/facts/outline render, 8 quick tools, auto-fix results card, download feedback, **0 console errors** |
| `node scripts/build-extension.mjs` | v1.2.0 zip built, 10 files shipped, byte-identical served copy, real PK zip magic |

**Not verified / limits:**
- The right-click menu is exercised only by code evaluation with a stubbed
  `chrome.contextMenus`; it needs one manual load-unpacked click to see the
  menu render (no Chrome-profile automation available here).
- The Playwright harness (`extension/test-audit.js`) could not run —
  Playwright is not installed in this workspace; browser verification used
  the built-in preview with a `chrome.*` stub instead.
- Auto-fix correctness on heavily framework-rendered SPAs was tested only on
  static fixtures; live sites should be spot-checked.

---

## 6. Files changed (this session)

**Extension (source of truth, rebuilt into the served copy + zip):**
- `extension/content.js` — audit engine, auto-fix engine, corrected-file export, nofollow highlight, drawer UI
- `extension/background.js` — right-click SEO menu + quick tools
- `extension/sidepanel.html` / `sidepanel.js` — Auto-Fix & Export section, Quick SEO Tools, motion
- `extension/overlay.css` — auto-fix card styles + entrance animations
- `extension/manifest.json` — v1.2.0, `contextMenus` permission
- `extension/README.md` — v1.2 feature documentation

**Frontend:**
- `frontend/app/extension/page.tsx` — v1.2.0, new "Fix the page, not just report it" section, corrected *Edits only on request* note
- `frontend/app/dashboard/page.tsx`, `frontend/app/projects/[id]/page.tsx` — real metrics, readiness tab, crawl-status and tab fixes

**Backend:**
- `backend/app/api/projects.py` — cascade delete, timestamps, overview metrics, readiness endpoint
- `backend/app/services/scoring.py`, `keywords.py`, `gaps.py`, `crawler/crawler.py`, `analyzers/technical.py` — correctness fixes
- `backend/app/services/readiness.py` — new AI-search readiness audit
- `backend/tests/` — regression coverage for scoring and delete cascade

**Docs:** `README.md`, `DESIGN.md`, `PROJECT_REPORT.md`, this `REPORT.md`.

**Build artifacts:** `frontend/public/download/rankace-extension/` (served copy),
`frontend/public/download/rankace-extension-v1.2.0.zip`.