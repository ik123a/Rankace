# Rankace — Live SEO Assistant & Page Inspector Extension

A Comet-style browser assistant extension built on **Chrome Manifest V3**. It works directly on **whatever webpage is currently open with just 1 click**, audits the DOM live, and draws precision visual bounding boxes directly over elements that need SEO fixes.

---

## ✨ 1-Click Direct Webpage Activation

You can activate Rankace on **any webpage** in 3 instant 1-click ways:

1. **Toolbar 1-Click**: Click the **Rankace icon** in your browser toolbar on any tab. It instantly activates directly on the open webpage, slides open the Comet-style assistant drawer, and **draws glowing boxes around all elements needing fixes**!
2. **Floating Badge 1-Click**: Click the sleek **`⚡ Rankace`** pill in the bottom-right corner of any webpage.
3. **Keyboard Shortcut**: Press **`Alt+R`** (or `Option+R` on Mac) anywhere to toggle the inspector and defect bounding boxes!

---

- **Master Power Switch (Switch ON / Switch OFF)**:
  - Prominent master button and synchronized toggle (`[ ⏻ SWITCH OFF ]` / `[ ⏻ SWITCH ON ]`).
  - **When ON:** Pulsing green indicator (`🟢 INSPECTION ACTIVE`), drawing glowing bounding boxes on defective elements and keeping them synced as you scroll.
  - **When OFF:** Clean state (`⚪ INSPECTION PAUSED`), immediately wiping all bounding boxes, badges, and tooltips from the webpage so you can browse cleanly.
  - Works synchronously from both the native **Side Panel** and the **In-Page Drawer**.
- **Audited Webpage Link Display**:
  - Displays the active webpage URL that Rankace has completed auditing (`AUDITED WEBPAGE`).
  - Full clickable link with `↗` to open in a new tab.
  - One-click `📋 Copy` button that copies the audited link to clipboard.
  - Shows page title snippet and live completion timestamp (e.g. `15:33:45`).
- **Visual Bounding Boxes Around Defects**:
  - Automatically draws high-contrast, animated bounding boxes directly on the webpage:
    - **Critical (Red):** Missing alt attributes on images, missing H1 heading, empty headings, thin content.
    - **Warning (Amber):** Duplicate H1s, empty link anchors, missing meta description or canonical tag.
  - Displays docked corner badges (`top: 6px; left: 6px;`) that never cover text or headings above elements.
  - Hover tooltip cards expand downwards only on demand.
  - Clicking any issue card in the assistant smoothly scrolls the webpage directly to the offending element.
- **Live On-Page Health Score (0–100)**: Weighted per finding, so the number reflects how many real problems exist and how serious each one is. Advisory findings carry zero weight and cannot mark a page unhealthy.
- **Search Intent Classifier**: Type any target query into the assistant to test query intent against the Rankace NLP backend (`http://127.0.0.1:8000/api/projects/public-intent`).

---

## 🔍 Page Details & Checks (v1.1)

Every finding below is read from the live DOM and shown in the side panel's detail sections; nothing is inferred.

| Check | What it reports | Severity |
|---|---|---|
| **Indexability** | `meta robots` / `googlebot` containing `noindex` or `none` — the page cannot rank at all | Critical |
| **Canonical** | Missing, self-referencing, or pointing at another domain | Warning |
| **Meta refresh** | `<meta http-equiv="refresh">` soft redirects | Warning |
| **Viewport** | Missing mobile viewport declaration | Warning |
| **Language** | `<html lang>` absent | Warning |
| **Mixed content** | HTTP subresources on an HTTPS page | Warning |
| **JSON-LD** | Invalid blocks, blocks without `@type`, or no structured data at all | Warning / Info |
| **Social metadata** | Missing `og:title`, `og:description`, `og:image`, `twitter:card` | Info |
| **Hreflang** | Alternates declared without an `x-default` fallback | Info |
| **Link profile** | Internal vs external, `nofollow` / `sponsored` / `ugc`, empty anchors, `target=_blank` without `rel=noopener` | Warning / Info |
| **Image detail** | Missing dimensions (layout shift) and lazy-loaded count | Info |
| **Heading outline** | Full H1–H6 outline in document order, plus skipped levels | Info |
| **Thin content** | Pages under 250 words | Critical |

### Detail panels

- **SERP preview** — the title, URL and description rendered the way a results page would clip them.
- **Page facts** — canonical, robots, language, viewport, charset, hreflang count, title/description lengths, DOM nodes, scripts and stylesheets.
- **Structured data** — every `@type` found, microdata count, and invalid-block count.
- **Social previews** — per-property presence for Open Graph and Twitter.
- **Link profile** — internal, external, nofollow and safety chips.
- **Heading outline** — the document's heading tree, scrollable.
- **Copy Full Report** — the whole audit as plain text (score, facts, every finding and its fix) to the clipboard.

All of it is mirrored in the in-page drawer (`Alt+R`), which adds a compact SERP preview and facts grid next to the bounding boxes.

---

## 🛠 Auto-Fix & Corrected File (v1.2)

The inspector does not stop at reporting — it corrects what it can safely derive and hands back the fixed file.

### One-click Auto-Fix

Available from the drawer's **✨ Auto-Fix** button and the side panel's **Fix all fixable issues** button. Each pass:

1. Reads the audit *before* the change (the score shown as `4 → 86` in tests is a real measurement).
2. Applies only corrections that are derived, never invented:
   - `<title>` from the page's H1 when the title tag is missing
   - `meta description` from the opening paragraph
   - self-referencing `rel=canonical`
   - `<html lang>` from the browser locale
   - `viewport`, `charset=utf-8`
   - preserves existing robots directives and flags indexability for manual review
   - demotes duplicate `<h1>`s to `<h2>`
   - fills missing `alt` text from image filenames
   - adds `rel="noopener"` to `target="_blank"` links
3. Re-runs the audit and shows every applied change, every skip, and everything that needs a human decision (written copy, meta refresh routing).

Fixes are local to the tab: **reload discards them**. That is intentional — nothing touches the server.

### Corrected file export

**⬇ Download corrected .html** (drawer and side panel) builds the file from a *clean clone* of the document:

- the pill, drawer and defect boxes are stripped before serialization
- body fixes (H1 demotion, alt text, noopener) are folded in even if you never pressed Auto-Fix
- head tags are derived with the same rules as the live pass
- page-supplied strings (`og:description`, JSON-LD, `href`) are **never** copied into the output, so a hostile page cannot smuggle markup into the file you deploy

The download is a plain `…-rankace-fixed.html` produced entirely in the browser.

---

## 🖱 Right-Click SEO Menu (v1.2)

A `contextMenus` menu for the page you are on:

- **⚡ Audit this page with Rankace** — opens the drawer (injecting the script if needed)
- **Highlight nofollow links** — boxes every `rel=nofollow` link with its target
- **Search this site on Google (`site:`)** / **Find this URL in Google (`inurl:`)**
- **Check selected text for duplicates** — exact-phrase Google search on the selection
- **SEO quick tools** → PageSpeed Insights, Rich Results Test, W3C Validator, Wayback Machine, SimilarWeb, Moz, Majestic, BuzzSumo

The side panel carries the same eight tools as clickable chips, built from the active tab's URL.

---

## ✨ Motion

- Drawer sections and issue cards rise in with a staggered 0.25–0.32 s entrance
- Auto-fix results animate item by item so you can read the sequence of changes
- Side-panel sections, chips and the quick-tools row fade up on render; tool chips lift on hover
- All motion respects the existing easing tokens and disappears with the UI it belongs to

- **Comet-Style Docking**:
  - In-Page sliding drawer directly inside the webpage.
  - Native Chrome Side Panel (`chrome.sidePanel`) docked neatly on the right.

---

## 🚀 How to Install

1. Open **Google Chrome**, **Microsoft Edge**, **Brave**, or **Comet**.
2. Navigate to extensions:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
3. Enable **"Developer mode"** (toggle in the top-right corner).
4. Click **"Load unpacked"** (top-left toolbar).
5. Select the folder:
   ```text
   D:\Projects\Rankace\extension
   ```
6. Pin **Rankace** in your browser toolbar.
7. Open any website (e.g. `http://localhost:3000` or any web article) and click the icon or press `Alt+R`!

---

## 📁 Directory Structure

```text
extension/
├── manifest.json       # Manifest V3 (sidePanel, activeTab, scripting, contextMenus)
├── background.js       # Service worker: 1-click activation + right-click SEO menu
├── content.js          # In-DOM live scanner, drawer, & visual bounding box engine
├── overlay.css         # Scoped styles for in-page drawer, bounding boxes, & tooltips
├── sidepanel.html      # Native side panel assistant UI
├── sidepanel.js        # Side panel controller & Rankace backend intent bridge
├── icons/              # Extension icons (16x16, 48x48, 128x128)
└── README.md           # Installation and usage instructions
```
