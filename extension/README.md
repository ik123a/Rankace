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
- **Live On-Page Health Score (0–100)**: Instantly calculated from title tags, metadata, heading hierarchy, image accessibility, link health, and content density.
- **Search Intent Classifier**: Type any target query into the assistant to test query intent against the Rankace NLP backend (`http://127.0.0.1:8000/api/projects/public-intent`).
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
├── manifest.json       # Manifest V3 (sidePanel, activeTab, scripting, storage)
├── background.js       # Background service worker (1-click active tab activation)
├── content.js          # In-DOM live scanner, drawer, & visual bounding box engine
├── overlay.css         # Scoped styles for in-page drawer, bounding boxes, & tooltips
├── sidepanel.html      # Native side panel assistant UI
├── sidepanel.js        # Side panel controller & Rankace backend intent bridge
├── icons/              # Extension icons (16x16, 48x48, 128x128)
└── README.md           # Installation and usage instructions
```
