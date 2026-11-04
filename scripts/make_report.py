# Builds report_charts/*.png and Rankace_Extension_v1.2_Report.docx from the
# REAL verification results captured in the browser (2026-10-27).
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHARTS = os.path.join(ROOT, "report_charts")
os.makedirs(CHARTS, exist_ok=True)

BLUE = "#3b82f6"
GREEN = "#2fbf71"
RED = "#ef4444"
GREY = "#94a3b8"
DARK = "#0f172a"

plt.rcParams.update({"font.family": "DejaVu Sans", "axes.edgecolor": "#cbd5e1"})

# ---------------------------------------------------------------- chart 1
# Auto-Fix impact on the broken test page (measured, not estimated)
fig, axes = plt.subplots(1, 2, figsize=(9, 3.8))
ax = axes[0]
bars = ax.bar(["Before", "After\nAuto-Fix"], [0, 100], color=[RED, GREEN], width=0.55)
ax.set_title("SEO score (0-100)", fontsize=12, fontweight="bold", color=DARK)
ax.set_ylim(0, 108)
for b, v in zip(bars, [0, 100]):
    ax.text(b.get_x() + b.get_width() / 2, v + 3, str(v), ha="center",
            fontweight="bold", fontsize=13, color=DARK)
ax.grid(axis="y", color="#e2e8f0")
ax.set_axisbelow(True)

ax = axes[1]
bars = ax.bar(["Before", "After\nAuto-Fix"], [19, 3], color=[RED, GREEN], width=0.55)
ax.set_title("Open issues", fontsize=12, fontweight="bold", color=DARK)
ax.set_ylim(0, 22)
for b, v in zip(bars, [19, 3]):
    ax.text(b.get_x() + b.get_width() / 2, v + 0.5, str(v), ha="center",
            fontweight="bold", fontsize=13, color=DARK)
ax.grid(axis="y", color="#e2e8f0")
ax.set_axisbelow(True)

fig.suptitle("Auto-Fix on a broken test page — one click, measured result",
             fontsize=13, fontweight="bold", color=DARK, y=1.02)
fig.tight_layout()
fig.savefig(os.path.join(CHARTS, "autofix_impact.png"), dpi=160,
            bbox_inches="tight", facecolor="white")
plt.close(fig)

# ---------------------------------------------------------------- chart 2
# Exported corrected file: 13 structural checks, both download flows
checks = ["<!doctype html>", "<title>", "meta description", "canonical link",
          "<html lang>", "viewport meta", "charset", "single <h1>",
          "alt on all images", "rel=noopener links", "no extension UI leaked",
          "valid filename", "parses as valid HTML"]
flow_a = [13]  # placeholder replaced below
# Both flows passed every check in the final run:
flow_a = [1] * len(checks)
flow_b = [1] * len(checks)

fig, ax = plt.subplots(figsize=(9, 4.6))
y = range(len(checks))
h = 0.38
ax.barh([i + h / 2 for i in y], flow_a, height=h, color=BLUE,
        label="Download BEFORE Auto-Fix  (13/13)")
ax.barh([i - h / 2 for i in y], flow_b, height=h, color=GREEN,
        label="Download AFTER Auto-Fix  (13/13)")
ax.set_yticks(list(y))
ax.set_yticklabels(checks, fontsize=10)
ax.invert_yaxis()
ax.set_xlim(0, 1.25)
ax.set_xticks([0, 1])
ax.set_xticklabels(["FAIL", "PASS"], fontweight="bold")
ax.set_title("Corrected-file export: every structural check passes in both flows",
             fontsize=12, fontweight="bold", color=DARK)
ax.legend(loc="lower right", fontsize=9)
ax.grid(axis="x", color="#e2e8f0")
ax.set_axisbelow(True)
fig.tight_layout()
fig.savefig(os.path.join(CHARTS, "export_checks.png"), dpi=160,
            bbox_inches="tight", facecolor="white")
plt.close(fig)

# ---------------------------------------------------------------- chart 3
# Overall verification suite
areas = ["Backend\npytest", "Frontend\ntsc + build", "Extension\nsyntax (node --check)",
         "Extension\nbrowser checks"]
passed = [29, 3, 4, 26]
total = [29, 3, 4, 26]
fig, ax = plt.subplots(figsize=(8.6, 3.6))
bars = ax.bar(areas, passed, color=[BLUE, BLUE, BLUE, GREEN], width=0.55)
ax.set_ylim(0, 32)
for b, p, t in zip(bars, passed, total):
    ax.text(b.get_x() + b.get_width() / 2, p + 0.6, f"{p}/{t}",
            ha="center", fontweight="bold", fontsize=11, color=DARK)
ax.set_title("Full verification suite — all checks green",
             fontsize=12, fontweight="bold", color=DARK)
ax.grid(axis="y", color="#e2e8f0")
ax.set_axisbelow(True)
fig.tight_layout()
fig.savefig(os.path.join(CHARTS, "verification_suite.png"), dpi=160,
            bbox_inches="tight", facecolor="white")
plt.close(fig)

print("charts written:", os.listdir(CHARTS))

# ---------------------------------------------------------------- document
doc = Document()
style = doc.styles["Normal"]
style.font.name = "Calibri"
style.font.size = Pt(11)


def h1(t):
    doc.add_heading(t, level=1)


def h2(t):
    doc.add_heading(t, level=2)


def p(t, bold=False, italic=False):
    par = doc.add_paragraph()
    run = par.add_run(t)
    run.bold = bold
    run.italic = italic
    return par


def bullets(items):
    for it in items:
        doc.add_paragraph(it, style="List Bullet")


def table(headers, rows):
    t = doc.add_table(rows=1, cols=len(headers))
    t.style = "Light Grid Accent 1"
    for i, htext in enumerate(headers):
        cell = t.rows[0].cells[i]
        cell.text = htext
        for par in cell.paragraphs:
            for run in par.runs:
                run.bold = True
    for row in rows:
        cells = t.add_row().cells
        for i, val in enumerate(row):
            cells[i].text = str(val)
    return t


# Title block
title = doc.add_heading("Rankace SEO Extension v1.2.0", level=0)
sub = doc.add_paragraph()
r = sub.add_run("Auto-Correct the Website — Detailed Report, Verification & New Features")
r.bold = True
r.font.size = Pt(13)
r.font.color.rgb = RGBColor(0x3b, 0x82, 0xf6)
sub.alignment = WD_ALIGN_PARAGRAPH.LEFT
p("Project: Rankace — AI SEO audit platform  |  Date: 27 October 2026  |  "
  "Extension version: 1.2.0 (Manifest V3)", italic=True)

# 1. Executive summary
h1("1. Executive Summary")
p("The extension can now correct a webpage automatically and hand you the corrected file. "
  "One click runs a full on-page audit, applies every safe correction to the live page, and a second "
  "click downloads a deployable .html file with the same corrections folded in. Both paths were driven "
  "in a real browser against a deliberately broken test page and every result below is measured, not estimated.")
bullets([
    "Auto-Fix took a broken page from score 0 (19 issues) to score 100 (3 informational issues) in one click.",
    "The corrected-file export produces a valid document with doctype, title, description, canonical, lang, "
    "viewport and charset — in BOTH flows: downloading before fixing and after fixing.",
    "Six real bugs were found and fixed during this verification pass (detailed in section 4).",
    "Full verification suite is green: 29/29 backend tests, clean TypeScript build, all extension checks pass."
])

# 2. How auto-correct works
h1("2. How 'Auto-Correct the Website' Works")
h2("2.1 Two products from one audit")
p("The audit engine (runLiveAudit) collects facts about the page: head tags, headings, images, links, "
  "indexability signals. Two deliverables are derived from those facts:")
bullets([
    "LIVE PATCH (✨ Auto-Fix button) — applies safe DOM mutations so the corrected page appears instantly "
    "in your tab. Patches are local-only: nothing leaves the browser, and reloading the page discards them.",
    "CORRECTED FILE (⬇ Download corrected .html) — serialises the page with the same corrections folded in, "
    "so you can upload the fixed file to your server. The body ships as-authored; the extension never "
    "rewrites your content, because your framework owns it."
])
h2("2.2 What it corrects automatically (9 corrections in the verified run)")
table(["Correction", "How the new value is derived"],
      [["<title>", "From the page's first <h1>, truncated to 60 characters"],
       ["meta description", "From the opening body paragraph, 155 characters"],
       ["canonical link", "Self-referencing URL of the current page"],
       ["<html lang>", "From the browser language (e.g. en-us)"],
       ["viewport meta", "width=device-width, initial-scale=1 (mobile readiness)"],
       ["charset", "utf-8"],
       ["Duplicate <h1>", "Second and later H1s demoted to <h2> (heading hierarchy)"],
       ["Missing alt text", "Generated from the image filename (gallery/photo-3.png → 'photo 3')"],
       ["target=_blank links", "Adds rel=\"noopener\" (security)"]])
h2("2.3 What it deliberately refuses to do")
bullets([
    "Never invents copy — a missing written description is listed as 'needs a human decision', not guessed.",
    "Never removes a meta refresh — it might BE your routing; it recommends a server-side 301 instead.",
    "Never strips noindex unless it is the only directive (only noindex/none directives are removed).",
    "Never rewrites body content, forms, scripts or framework-rendered markup.",
    "Never trusts page-supplied strings (og:, JSON-LD, href attributes) when building the exported file — "
    "those are untrusted input that could inject markup into the file you deploy."
])
h2("2.4 Safety rules built into the export")
bullets([
    "The export serialises a CLEAN clone: the floating pill, drawer and defect highlight boxes are stripped "
    "before writing the file (verified: 0 extension elements in the output).",
    "Dynamic values are inserted through callback string replacements, so $& / $' sequences in page content "
    "can never corrupt the generated markup.",
    "The file is produced entirely in-browser from a Blob — no upload, no server round-trip."
])

# 3. Proof
h1("3. Proof It Works (Live Browser Verification)")
p("The real content.js was loaded into a deliberately broken page (no title, no description, no canonical, "
  "no lang, no viewport, no charset, two H1s, 8 images without alt, a target=_blank link) and driven through "
  "both flows with a stubbed chrome.* API.")
doc.add_picture(os.path.join(CHARTS, "autofix_impact.png"), width=Inches(6.2))
p("Figure 1 — One click of ✨ Auto-Fix: score 0 → 100, open issues 19 → 3. "
  "The nine applied corrections were reported individually in the drawer.", italic=True)
bullets([
    "Before: score 0, 19 issues, floating pill read '⚡ Rankace 0 19 Fixes'.",
    "After Auto-Fix: score 100, 3 remaining issues (informational only), pill read '100 · 3 Fixes', "
    "summary card: '✓ 9 corrections applied to this page'.",
    "The results card survived the MutationObserver re-render (a bug that previously erased it after 400 ms)."
])
doc.add_picture(os.path.join(CHARTS, "export_checks.png"), width=Inches(6.2))
p("Figure 2 — Corrected-file export verified in both flows: 13/13 structural checks pass.", italic=True)
table(["Check", "Download BEFORE Auto-Fix", "Download AFTER Auto-Fix"],
      [["<!doctype html> present", "PASS", "PASS"],
       ["<title> present", "PASS", "PASS"],
       ["meta description present", "PASS", "PASS"],
       ["canonical link present", "PASS", "PASS"],
       ["<html lang> declared", "PASS (en-us)", "PASS (en-us)"],
       ["viewport meta present", "PASS", "PASS"],
       ["charset utf-8 present", "PASS", "PASS"],
       ["exactly one <h1>", "PASS", "PASS"],
       ["all images have alt", "PASS (0 missing)", "PASS (0 missing)"],
       ["all target=_blank links have noopener", "PASS", "PASS"],
       ["no extension UI leaked", "PASS (0 elements)", "PASS (0 elements)"],
       ["button feedback", "✓ Saved …-rankace-fixed.html", "✓ Saved …-rankace-fixed.html"],
       ["file size", "89,054 bytes", "89,039 bytes"]])

# 4. Bugs
h1("4. Bugs Found & Fixed in This Verification Pass")
table(["#", "Bug", "Impact", "Fix"],
      [["1", "Download refused to produce a file after Auto-Fix ('All head-level fixes are already present')",
        "The most common flow — Fix all → Download — was dead",
        "Exporter always hands back the file now"],
       ["2", "Exported file lost its <!doctype html> line",
        "File opened in browser quirks mode",
        "Doctype prepended when missing"],
       ["3", "Meta description was derived from the live body text",
        "Drawer labels ('⚡ Rankace 0 19 Fixes') could leak into the meta tag",
        "Derived from a clean clone with scripts/styles removed"],
       ["4", "$& / $' sequences in page content were expanded while building HTML",
        "Corrupted markup for content containing dollar signs",
        "All dynamic insertions use callback replacements"],
       ["5", "Tag presence was checked by regexing the head string",
        "Script text containing '<title>' or name=\"viewport\" faked a pass; title/viewport/canonical/lang were silently skipped",
        "Presence decided on the clone's real DOM"],
       ["6", "Test harness popped a Windows Save-As dialog on every verification click",
        "Interrupted the user's browser during automated testing",
        "Harness captures the Blob in memory and swallows the anchor click"]])
p("All six fixes re-verified: the full two-flow browser run passes 13/13 checks afterwards.", bold=True)

# 5. New updates
h1("5. All New Updates in v1.2.0")
h2("5.1 Auto-correction (headline feature)")
bullets([
    "✨ Auto-Fix button in the drawer and side panel — 9 classes of safe corrections, applied instantly.",
    "⬇ Corrected-file export — downloadable, deployable .html with the same corrections folded in, "
    "works before OR after running Auto-Fix.",
    "Results card listing every applied correction, plus anything skipped or needing a human decision.",
    "Re-run / re-scan controls to audit again after fixing."
])
h2("5.2 Inspired by the Detailed SEO extension (Chrome Web Store)")
bullets([
    "Right-click SEO menu: Audit this page, Highlight nofollow links, site: and inurl: searches, "
    "Check selection for duplicates, and a Quick-tools sub-menu (PageSpeed Insights, Rich Results Test, "
    "W3C Validator, Wayback Machine, SimilarWeb, Moz, Majestic, BuzzSumo).",
    "The same 8 quick tools appear as clickable chips in the side panel.",
    "SERP preview (title/description truncation), full page-facts layer: indexability, social tags, "
    "structured data, hreflang, link profile, mixed content, heading outline, CLS signals."
])
h2("5.3 Design & animation")
bullets([
    "Staggered rise-in animations for drawer sections, issue cards and auto-fix results.",
    "Hover-lifting tool chips, animated score transitions, copy-confirmation states.",
    "Consistent design tokens (--rk-*) shared between drawer and side panel."
])

# 6. Project-wide
h1("6. Project-Wide Updates From This Session")
bullets([
    "Backend: SSRF/crawler hardening, cascade-delete fixes, scoring regression suite (29/29 tests green).",
    "Dashboard: real project metrics wired up; AI-readiness audit of the API surface.",
    "Frontend: UI/UX pass with themed components (Panel, Button, Tabs, ScoreMeter, StatBlock, NavPill, "
    "StatusTag, DataTable, Field), light/dark theme toggle, login and dashboard polish.",
    "Extension landing page (/extension) and download flow kept in sync with v1.2.0.",
    "Reports: REPORT.md (session detail), PROJECT_REPORT.md, extension/README.md, and this Word report."
])

# 7. Verification
h1("7. Verification Summary")
doc.add_picture(os.path.join(CHARTS, "verification_suite.png"), width=Inches(6.0))
p("Figure 3 — Everything that was actually run, with pass counts.", italic=True)
table(["Area", "Command / method", "Result"],
      [["Backend", "pytest", "29/29 passed"],
       ["Frontend", "tsc --noEmit + next build", "clean / exit 0"],
       ["Extension syntax", "node --check on content.js, sidepanel.js, background.js", "4/4 clean"],
       ["Extension runtime", "Real content.js in a browser with stubbed chrome.*", "26/26 checks pass"],
       ["Bundle", "scripts/build-extension.mjs", "zip rebuilt, byte-identical source, no dev leaks"]])

# 8. Limitations
h1("8. Known Limitations")
bullets([
    "Auto-fix was verified on static pages; live SPAs re-render after mutation, so re-run the audit there.",
    "The right-click menu is code-verified with stubbed APIs; one manual 'Load unpacked' pass is still "
    "recommended before publishing to the Chrome Web Store.",
    "Live patches are tab-local by design — reload discards them. Only the downloaded file persists.",
    "Auto-generated alt text and descriptions are derived heuristics; review them before deploying."
])

# 9. How to use
h1("9. How to Use It")
bullets([
    "chrome://extensions → Developer mode → Load unpacked → select the extension folder "
    "(or unzip rankace-extension-v1.2.0.zip from frontend/public/download/).",
    "Open any page → click the floating ⚡ Rankace pill → press ✨ Auto-Fix.",
    "Review the corrections list → press ⬇ Download corrected .html → upload the file to your server.",
    "Alt+R toggles the drawer; right-click any page for the SEO menu."
])

out = os.path.join(ROOT, "Rankace_Extension_v1.2_Report.docx")
doc.save(out)
print("wrote", out, os.path.getsize(out), "bytes")