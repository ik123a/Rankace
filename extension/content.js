// Rankace SEO Assistant - Content Script
// Live On-Page DOM Auditor & Visual Bounding Box Inspector

(function () {
  if (window.__RANKACE_CONTENT_SCRIPT_LOADED__) return;
  window.__RANKACE_CONTENT_SCRIPT_LOADED__ = true;

  console.log("%c⚡ Rankace SEO Assistant Loaded", "color: #3b82f6; font-weight: bold; font-size: 12px;");

  let activeHighlightBoxes = [];
  let cachedAuditData = null;
  let allHighlighted = false;
  let isInspectionEnabled = true;

  // -------------------------------------------------------------
  // 1. LIVE ON-PAGE AUDIT ENGINE
  // -------------------------------------------------------------
  function runLiveAudit() {
    const issues = [];
    const elementsToHighlight = [];
    let score = 100;

    // A. Title Tag
    const title = document.title ? document.title.trim() : "";
    const titleLen = title.length;
    if (!title) {
      issues.push({
        id: "title_missing",
        category: "Metadata",
        severity: "critical",
        title: "Missing <title> Tag",
        message: "This page has no title tag. Page titles are critical for search engine rankings and CTR.",
        recommendation: "Add a descriptive <title> tag between 50-60 characters.",
        targetSelector: null,
        isPageLevel: true
      });
      score -= 20;
    } else if (titleLen < 30) {
      issues.push({
        id: "title_too_short",
        category: "Metadata",
        severity: "warning",
        title: "Title Tag Too Short",
        message: `Title is only ${titleLen} characters. Search engines prefer 50-60 characters.`,
        recommendation: "Expand the title with primary keywords and brand value.",
        targetSelector: null,
        isPageLevel: true
      });
      score -= 5;
    } else if (titleLen > 65) {
      issues.push({
        id: "title_too_long",
        category: "Metadata",
        severity: "warning",
        title: "Title Tag Likely Truncated",
        message: `Title is ${titleLen} characters and will be cut off with an ellipsis in Google SERPs.`,
        recommendation: "Shorten title to under 60 characters to avoid truncation.",
        targetSelector: null,
        isPageLevel: true
      });
      score -= 5;
    }

    // B. Meta Description
    const metaDescEl = document.querySelector('meta[name="description"], meta[property="og:description"]');
    const metaDesc = metaDescEl ? (metaDescEl.getAttribute("content") || "").trim() : "";
    const descLen = metaDesc.length;
    if (!metaDesc) {
      issues.push({
        id: "desc_missing",
        category: "Metadata",
        severity: "critical",
        title: "Missing Meta Description",
        message: "No meta description found. Search engines will auto-generate snippets from page text.",
        recommendation: "Add a compelling meta description between 120-160 characters.",
        targetSelector: null,
        isPageLevel: true
      });
      score -= 15;
    } else if (descLen < 80) {
      issues.push({
        id: "desc_too_short",
        category: "Metadata",
        severity: "warning",
        title: "Meta Description Too Short",
        message: `Description is only ${descLen} characters (recommended 120-160).`,
        recommendation: "Expand description with clear user benefits and a call-to-action.",
        targetSelector: null,
        isPageLevel: true
      });
      score -= 5;
    } else if (descLen > 165) {
      issues.push({
        id: "desc_too_long",
        category: "Metadata",
        severity: "warning",
        title: "Meta Description May Truncate",
        message: `Description is ${descLen} characters and may be clipped on mobile SERPs.`,
        recommendation: "Keep meta description between 120 and 160 characters.",
        targetSelector: null,
        isPageLevel: true
      });
      score -= 4;
    }

    // C. Canonical Tag
    const canonicalEl = document.querySelector('link[rel="canonical"]');
    const canonical = canonicalEl ? canonicalEl.getAttribute("href") : "";
    if (!canonical) {
      issues.push({
        id: "canonical_missing",
        category: "Metadata",
        severity: "warning",
        title: "Missing Canonical Tag",
        message: "Missing rel='canonical' tag can lead to duplicate content consolidation issues.",
        recommendation: "Specify <link rel='canonical' href='...'> pointing to the primary URL.",
        targetSelector: null,
        isPageLevel: true
      });
      score -= 6;
    }

    // D. Headings Structure (H1, H2, H3)
    const h1s = Array.from(document.querySelectorAll("h1"));
    if (h1s.length === 0) {
      issues.push({
        id: "h1_missing",
        category: "Headings",
        severity: "critical",
        title: "Missing <h1> Heading",
        message: "No H1 heading found on this page. Search engines use H1 to understand the primary page topic.",
        recommendation: "Add a single, keyword-focused <h1> heading at the top of your main content.",
        targetSelector: null,
        isPageLevel: true
      });
      score -= 15;
    } else if (h1s.length > 1) {
      h1s.slice(1).forEach((el, idx) => {
        const sel = getElementPath(el);
        issues.push({
          id: `h1_multiple_${idx}`,
          category: "Headings",
          severity: "warning",
          title: `Multiple <h1> Headings Found (${h1s.length} total)`,
          message: `Secondary <h1> found: "${(el.textContent || '').trim().substring(0, 45)}...".`,
          recommendation: "Change this heading to an <h2> or <h3> to maintain a clean semantic hierarchy.",
          targetSelector: sel,
          domElement: el
        });
      });
      score -= 8;
    } else {
      const h1Text = (h1s[0].textContent || "").trim();
      if (!h1Text) {
        issues.push({
          id: "h1_empty",
          category: "Headings",
          severity: "critical",
          title: "Empty <h1> Heading",
          message: "The <h1> heading exists but contains no visible text content.",
          recommendation: "Add descriptive text to your primary heading.",
          targetSelector: getElementPath(h1s[0]),
          domElement: h1s[0]
        });
        score -= 12;
      }
    }

    const h2s = Array.from(document.querySelectorAll("h2"));
    const h3s = Array.from(document.querySelectorAll("h3"));

    // E. Images & Alt Text Inspector (Only audit real, visible, measurable content images)
    const images = Array.from(document.querySelectorAll("img"));
    let missingAltCount = 0;
    images.forEach((img, idx) => {
      // 1. Must be rendered in the document layout
      if (!img.isConnected) return;
      const style = window.getComputedStyle(img);
      if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity || "1") === 0) return;
      if (img.offsetParent === null && style.position !== "fixed") return;

      const rect = img.getBoundingClientRect();
      // Must have visible content dimensions (ignore 0x0 images, tracking pixels, tiny icons < 24px)
      if (rect.width < 24 || rect.height < 24) return;

      // 2. Ignore decorative images with role="presentation", role="none", or aria-hidden="true"
      if (img.getAttribute("role") === "presentation" || img.getAttribute("role") === "none" || img.getAttribute("aria-hidden") === "true") return;

      // 3. Ignore images inside <figure> that already have a descriptive <figcaption>
      const figure = img.closest("figure");
      if (figure && figure.querySelector("figcaption") && (figure.querySelector("figcaption").textContent || "").trim().length > 3) return;

      // 4. Check aria-label / aria-labelledby fallback
      const ariaLabel = (img.getAttribute("aria-label") || "").trim();
      const ariaLabelledby = img.getAttribute("aria-labelledby");
      if (ariaLabel || ariaLabelledby) return;

      // 5. Check alt attribute
      const hasAlt = img.hasAttribute("alt");
      const altText = (img.getAttribute("alt") || "").trim();

      if (!hasAlt || altText === "") {
        missingAltCount++;
        const sel = getElementPath(img);
        if (!sel) return;

        issues.push({
          id: `img_alt_${idx}`,
          category: "Images",
          severity: "critical",
          title: `Image Missing 'alt' Description`,
          message: `The image is loaded and visible, but lacks an 'alt' text description in its HTML <img> tag. Search engines (like Google) cannot read the text or diagram inside this graphic without an alt attribute.`,
          recommendation: "Add descriptive alt='...' text (e.g. alt='Playbook containment workflow diagram') to the <img> tag.",
          targetSelector: sel,
          domElement: img
        });
      }
    });
    if (missingAltCount > 0) {
      score -= Math.min(missingAltCount * 4, 20);
    }

    // F. Hyperlinks & Anchor Text Inspector
    const links = Array.from(document.querySelectorAll("a[href]"));
    let emptyLinkCount = 0;
    links.forEach((a, idx) => {
      if (!a.isConnected) return;
      const style = window.getComputedStyle(a);
      if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity || "1") === 0) return;
      if (a.offsetParent === null && style.position !== "fixed") return;

      const rect = a.getBoundingClientRect();
      if (rect.width < 12 || rect.height < 12) return;

      const href = (a.getAttribute("href") || "").trim();
      if (href === "" || href === "#" || href.startsWith("javascript:")) return;

      const text = (a.textContent || "").trim();
      const hasImgWithAlt = a.querySelector("img[alt]:not([alt=''])");
      const ariaLabel = (a.getAttribute("aria-label") || "").trim();
      if (ariaLabel || hasImgWithAlt) return;

      if (!text) {
        emptyLinkCount++;
        const sel = getElementPath(a);
        if (!sel) return;
        issues.push({
          id: `link_empty_${idx}`,
          category: "Links",
          severity: "warning",
          title: "Empty Link Anchor Text",
          message: "Hyperlink has no visible text or image alt. Search engines cannot infer destination context.",
          recommendation: "Provide clear, descriptive anchor text indicating where the link navigates.",
          targetSelector: sel,
          domElement: a
        });
      } else if (/^(click here|read more|learn more|here|more|link)$/i.test(text)) {
        const sel = getElementPath(a);
        if (!sel) return;
        issues.push({
          id: `link_generic_${idx}`,
          category: "Links",
          severity: "info",
          title: `Non-Descriptive Anchor: "${text}"`,
          message: "Generic anchor text gives zero keyword context to search crawlers.",
          recommendation: "Replace generic text with contextual keywords describing the target topic.",
          targetSelector: sel,
          domElement: a
        });
      }
    });
    if (emptyLinkCount > 0) {
      score -= Math.min(emptyLinkCount * 3, 15);
    }

    // G. Content Density & Word Count
    const bodyText = (document.body ? document.body.innerText || "" : "").replace(/\s+/g, " ").trim();
    const wordCount = bodyText ? bodyText.split(" ").length : 0;
    if (wordCount < 250) {
      issues.push({
        id: "content_thin",
        category: "Content",
        severity: "critical",
        title: `Thin Content (${wordCount} words)`,
        message: "Page has fewer than 250 words. Search engines may consider this low-value or thin content.",
        recommendation: "Expand the page with comprehensive, helpful information addressing user search queries.",
        targetSelector: null,
        isPageLevel: true
      });
      score -= 15;
    }

    // Ensure score bounded [0, 100]
    score = Math.max(0, Math.min(100, Math.round(score)));

    // ---- Severity-weighted scoring (replaces ad-hoc flat deductions) -----
    //
    // The previous scheme subtracted a hand-tuned constant PER CHECK, which
    // meant the number of occurrences barely mattered. Measured on fixtures
    // built from this file's own rules:
    //   - 3 duplicate <h1> elements cost 8 points total (one flat -8), so a
    //     page with 12 missing-alt images scored 80 while a page with 3 H1s
    //     scored 92 -- the *worse* page scored higher.
    //   - A page missing title, description, canonical, H1 AND thin content
    //     landed at 29, but stacking more defects could not push it below the
    //     sum of those constants, so severity ordering was arbitrary.
    //
    // Weighting per emitted issue instead makes the score a function of how
    // many real defects exist and how serious each one is, which is what a
    // "Live SEO Score" is supposed to mean.
    const SEVERITY_WEIGHT = { critical: 9, warning: 3, info: 1 };
    let weighted = 0;
    for (const issue of issues) {
      weighted += SEVERITY_WEIGHT[issue.severity] ?? 1;
    }
    // Each weighted point costs 1.6 score points. The multiplier is set from
    // measurement, not taste: a page missing its title, description, canonical
    // and H1 *and* carrying thin content (4 critical + 1 warning = 39 weighted)
    // must land below 40, because that page is not meaningfully usable for
    // search. At 1.15 it scored 55; at 1.6 it scores 38. A single warning still
    // costs only ~5 points, so minor findings stay minor.
    score = Math.max(0, Math.min(100, Math.round(100 - weighted * 1.6)));

    // Return structured report
    cachedAuditData = {
      url: window.location.href,
      domain: window.location.hostname,
      score,
      stats: {
        title,
        titleLength: titleLen,
        metaDescription: metaDesc,
        metaDescLength: descLen,
        canonical,
        h1Count: h1s.length,
        h2Count: h2s.length,
        h3Count: h3s.length,
        totalImages: images.length,
        missingAltCount,
        totalLinks: links.length,
        emptyLinkCount,
        wordCount,
        readingTimeMinutes: Math.max(1, Math.round(wordCount / 200))
      },
      issues: issues.map(({ domElement, ...rest }) => rest) // strip non-serializable elements for messaging
    };

    updateFloatingPill(cachedAuditData);
    return cachedAuditData;
  }

  // -------------------------------------------------------------
  // 2. PRECISION DOM PATH GENERATOR
  // -------------------------------------------------------------
  function getElementPath(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return "";
    if (el.id) return `#${el.id}`;
    if (el.tagName.toLowerCase() === "body") return "body";

    let path = [];
    let current = el;
    while (current && current.nodeType === Node.ELEMENT_NODE && current.tagName.toLowerCase() !== "body") {
      let selector = current.tagName.toLowerCase();
      if (current.className && typeof current.className === "string") {
        const classes = current.className.trim().split(/\s+/).filter(c => !c.startsWith("rankace-") && c.length < 30);
        if (classes.length > 0) {
          selector += `.${classes[0]}`;
        }
      }
      let parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }
      path.unshift(selector);
      current = parent;
    }
    return path.join(" > ");
  }

  // -------------------------------------------------------------
  // 3. VISUAL BOUNDING BOX HIGHLIGHTER ENGINE
  // -------------------------------------------------------------
  function clearAllHighlights() {
    activeHighlightBoxes.forEach(box => {
      if (box && box.parentNode) box.parentNode.removeChild(box);
    });
    activeHighlightBoxes = [];
    allHighlighted = false;
  }

  function highlightSingleElement(targetSelector, issue) {
    clearAllHighlights();
    const el = document.querySelector(targetSelector);
    if (!el) {
      console.warn("Rankace: Target element not found for selector:", targetSelector);
      return false;
    }

    // Smooth scroll into center view
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

    // Build the visual bounding box
    setTimeout(() => {
      createBoundingBox(el, issue);
    }, 250);

    return true;
  }

  function createBoundingBox(el, issue) {
    if (!el || !el.isConnected) return null;
    const tag = el.tagName ? el.tagName.toLowerCase() : "";
    if (tag === "body" || tag === "html" || tag === "head") return null;

    const rect = el.getBoundingClientRect();
    // Strictly ignore 0x0 or invisible elements
    if (rect.width < 16 || rect.height < 16) return null;

    const box = document.createElement("div");
    const severityClass = issue.severity === "critical" ? "rankace-critical" : issue.severity === "warning" ? "rankace-warning" : "rankace-info";
    box.className = `rankace-defect-box ${severityClass}`;
    if (rect.height < 45) box.classList.add("rankace-short");
    box._targetElement = el;
    box._issueData = issue;
    
    // Position fixed coordinates directly relative to viewport
    box.style.top = `${rect.top - 4}px`;
    box.style.left = `${rect.left - 4}px`;
    box.style.width = `${Math.max(rect.width + 8, 24)}px`;
    box.style.height = `${Math.max(rect.height + 8, 20)}px`;

    // Docked Badge INSIDE the bounding box - never overlaps outside headings!
    const badge = document.createElement("div");
    badge.className = "rankace-defect-badge";
    badge.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleInPageDrawer(true);
    });

    const badgePill = document.createElement("span");
    badgePill.className = `rankace-badge-pill rankace-badge-${issue.severity}`;
    badgePill.textContent = issue.severity.toUpperCase();

    const titleSpan = document.createElement("span");
    // Short readable label
    let shortLabel = issue.title;
    if (shortLabel.includes("alt") || shortLabel.includes("Alt")) shortLabel = "No Alt Text";
    else if (shortLabel.includes("Multiple <h1>")) shortLabel = "Duplicate H1";
    else if (shortLabel.includes("Empty <h1>")) shortLabel = "Empty H1";
    else if (shortLabel.includes("Empty Link")) shortLabel = "Empty Link";
    else if (shortLabel.includes("Generic Anchor")) shortLabel = "Generic Link";
    titleSpan.textContent = shortLabel;

    const closeBtn = document.createElement("button");
    closeBtn.className = "rankace-badge-close";
    closeBtn.innerHTML = "&times;";
    closeBtn.title = "Dismiss highlight";
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      box.remove();
      const idx = activeHighlightBoxes.indexOf(box);
      if (idx > -1) activeHighlightBoxes.splice(idx, 1);
    });

    // Hover Tooltip that opens below the badge
    const tooltip = document.createElement("div");
    tooltip.className = "rankace-defect-tooltip";
    tooltip.innerHTML = `
      <strong>${escapeHTML(issue.title)}</strong>
      <div>${escapeHTML(issue.message)}</div>
      <div class="rankace-tooltip-fix">💡 ${escapeHTML(issue.recommendation)}</div>
    `;

    badge.appendChild(badgePill);
    badge.appendChild(titleSpan);
    badge.appendChild(closeBtn);
    badge.appendChild(tooltip);

    box.appendChild(badge);

    document.body.appendChild(box);
    activeHighlightBoxes.push(box);
    return box;
  }

  function repositionAllBoxes() {
    if (!isInspectionEnabled || activeHighlightBoxes.length === 0) return;
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    for (let i = activeHighlightBoxes.length - 1; i >= 0; i--) {
      const box = activeHighlightBoxes[i];
      const el = box._targetElement;
      if (!el || !document.contains(el)) {
        box.remove();
        activeHighlightBoxes.splice(i, 1);
        continue;
      }

      const rect = el.getBoundingClientRect();
      // If off screen or 0 dimensions, hide
      if (rect.bottom < -40 || rect.top > vh + 40 || rect.right < -40 || rect.left > vw + 40 || rect.width < 10 || rect.height < 10) {
        box.style.display = "none";
      } else {
        box.style.display = "block";
        box.style.top = `${rect.top - 4}px`;
        box.style.left = `${rect.left - 4}px`;
        box.style.width = `${Math.max(rect.width + 8, 24)}px`;
        box.style.height = `${Math.max(rect.height + 8, 20)}px`;

        if (rect.height < 45) {
          box.classList.add("rankace-short");
        } else {
          box.classList.remove("rankace-short");
        }
      }
    }
  }

  function highlightAllIssuesOnPage(issues) {
    clearAllHighlights();
    if (!isInspectionEnabled) return 0;
    allHighlighted = true;
    let count = 0;

    issues.forEach(issue => {
      // Never draw bounding boxes for page-level issues or root tags
      if (issue.isPageLevel || (!issue.domElement && (!issue.targetSelector || issue.targetSelector === "head" || issue.targetSelector === "body"))) return;
      
      let el = issue.domElement;
      if (!el || !el.isConnected) {
        if (issue.targetSelector && issue.targetSelector !== "head" && issue.targetSelector !== "body") {
          try {
            el = document.querySelector(issue.targetSelector);
          } catch (e) {
            el = null;
          }
        }
      }

      if (el && el.isConnected) {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        if (rect.width >= 16 && rect.height >= 16 && style.display !== "none" && style.visibility !== "hidden") {
          const box = createBoundingBox(el, issue);
          if (box) count++;
        }
      }
    });

    return count;
  }

  // -------------------------------------------------------------
  // 4. FLOATING TRIGGER PILL & IN-PAGE DRAWER (COMET-STYLE)
  // -------------------------------------------------------------
  let drawerOpen = false;

  function updateFloatingPill(audit) {
    let pill = document.getElementById("rankace-floating-pill");
    if (!pill) {
      pill = document.createElement("div");
      pill.id = "rankace-floating-pill";
      pill.title = "Click to open Rankace Assistant & highlight defects (Alt+R)";
      pill.addEventListener("click", () => {
        toggleInPageDrawer();
      });
      document.body.appendChild(pill);
    }

    // Count EVERY issue, not just critical+warning. The old line was
    // `criticalCount + warningCount`, so a page whose only findings were
    // info-severity (non-descriptive anchor text) displayed "Clean" while the
    // drawer listed real problems -- the pill and the panel contradicted each
    // other on the same page.
    const criticalCount = audit.issues.filter(i => i.severity === "critical").length;
    const warningCount = audit.issues.filter(i => i.severity === "warning").length;
    const infoCount = audit.issues.filter(i => i.severity === "info").length;
    const totalIssues = audit.issues.length;

    pill.innerHTML = `
      <span class="rankace-icon">⚡</span>
      <span>Rankace</span>
      <span class="rankace-score">${audit.score}</span>
      ${totalIssues > 0 ? `<span class="rankace-counter">${totalIssues} Fixes</span>` : `<span class="rankace-counter rankace-is-clean">Clean</span>`}
    `;
  }

  function toggleInPageDrawer(forceOpen) {
    let drawer = document.getElementById("rankace-inpage-drawer");
    if (!drawer) {
      drawer = createInPageDrawer();
      document.body.appendChild(drawer);
    }

    if (forceOpen === true) {
      drawerOpen = true;
    } else if (forceOpen === false) {
      drawerOpen = false;
    } else {
      drawerOpen = !drawerOpen;
    }

    if (drawerOpen) {
      drawer.classList.add("rankace-open");
      const audit = runLiveAudit();
      renderDrawerContent(audit);
      // Auto-box defects on page for instant 1-click feedback
      highlightAllIssuesOnPage(audit.issues);
    } else {
      drawer.classList.remove("rankace-open");
      clearAllHighlights();
    }
  }

  function createInPageDrawer() {
    const drawer = document.createElement("div");
    drawer.id = "rankace-inpage-drawer";

    drawer.innerHTML = `
      <div class="rankace-drawer-header">
        <div class="rankace-drawer-brand">
          <div class="rankace-drawer-brand-logo">⚡</div>
          <div>
            <div class="rankace-drawer-title">RANKACE</div>
            <div class="rankace-drawer-subtitle">Live Page Inspector</div>
          </div>
        </div>
        <div class="rankace-drawer-actions">
          <button id="rankace-drawer-rescan" class="rankace-drawer-btn" title="Re-scan DOM">🔄 Re-Scan</button>
          <button id="rankace-drawer-close" class="rankace-drawer-close" title="Close Assistant (Esc)">&times;</button>
        </div>
      </div>
      <div id="rankace-drawer-body" class="rankace-drawer-body">
        <!-- Content dynamically rendered -->
      </div>
    `;

    drawer.querySelector("#rankace-drawer-close").addEventListener("click", () => {
      toggleInPageDrawer(false);
    });

    drawer.querySelector("#rankace-drawer-rescan").addEventListener("click", () => {
      const audit = runLiveAudit();
      renderDrawerContent(audit);
      highlightAllIssuesOnPage(audit.issues);
    });

    return drawer;
  }

  function renderDrawerContent(audit) {
    const body = document.getElementById("rankace-drawer-body");
    if (!body) return;

    const critCount = audit.issues.filter(i => i.severity === "critical").length;
    const warnCount = audit.issues.filter(i => i.severity === "warning").length;
    const infoCount = audit.issues.filter(i => i.severity === "info").length;

    let scoreStatus = audit.score >= 85 ? "Excellent Condition" : audit.score >= 65 ? "Needs Optimization" : "Critical Fixes Required";
    let scoreClass = audit.score >= 85 ? "rankace-ok" : audit.score >= 65 ? "rankace-warn" : "rankace-bad";
    let scoreHex = audit.score >= 85 ? "#2fbf71" : audit.score >= 65 ? "#d9a441" : "#e5484d";

    body.innerHTML = `
      <!-- Master Switch Bar: ON / OFF -->
      <div id="rankace-drawer-power-card" class="rankace-power-card">
        <div>
          <div class="rankace-power-state${isInspectionEnabled ? " rankace-is-on" : ""}">
            <span class="rankace-dot"></span>
            <span id="rankace-drawer-power-label">${isInspectionEnabled ? "INSPECTOR ON" : "INSPECTION PAUSED"}</span>
          </div>
          <div id="rankace-drawer-power-sub" class="rankace-power-sub">
            ${isInspectionEnabled ? "Bounding boxes active on page defects" : "All bounding boxes cleared • Webpage clean"}
          </div>
        </div>
        <button id="rankace-drawer-power-btn" class="rankace-power-btn${isInspectionEnabled ? "" : " rankace-is-off"}">
          <span aria-hidden="true">⏻</span>
          <span id="rankace-drawer-power-btn-text">${isInspectionEnabled ? "SWITCH OFF" : "SWITCH ON"}</span>
        </button>
      </div>

      <!-- Audited Website Link Card -->
      <div class="rankace-card">
        <div class="rankace-card-row">
          <span class="rankace-eyebrow">AUDITED WEBPAGE</span>
          <span class="rankace-timestamp">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
        <div class="rankace-urlbar">
          <span aria-hidden="true">🌐</span>
          <a href="${escapeAttr(audit.url)}" target="_blank" rel="noopener noreferrer" class="rankace-url-link" title="Open audited webpage in new tab">
            ${escapeHTML(audit.url)}
          </a>
          <button id="rankace-drawer-copy-url" class="rankace-copy-btn" title="Copy webpage link">
            📋 Copy
          </button>
        </div>
        ${audit.title ? `<div class="rankace-page-title">Page: "${escapeHTML(audit.title)}"</div>` : ""}
      </div>

      <!-- Score Hero -->
      <div class="rankace-score-hero">
        <div class="rankace-score-ring" style="background:conic-gradient(${scoreHex} ${(audit.score/100)*360}deg, rgba(255,255,255,0.11) 0deg);">
          <div class="rankace-score-ring-inner"></div>
          <span class="rankace-score-value">${audit.score}</span>
        </div>
        <div style="flex:1 1 auto; min-width:0;">
          <div class="rankace-score-label">Live SEO Score</div>
          <div class="rankace-score-status ${scoreClass}">${scoreStatus}</div>
          <div class="rankace-counts">
            <span class="rankace-count rankace-count-critical">${critCount} Critical</span>
            <span class="rankace-count rankace-count-warning">${warnCount} Warnings</span>
            ${infoCount > 0 ? `<span class="rankace-count rankace-count-info">${infoCount} Info</span>` : ""}
          </div>
        </div>
      </div>

      <!-- Master Box Toggle Switch -->
      <div class="rankace-toggle-row">
        <div>
          <div class="rankace-power-label">🎯 Box Defects on Page</div>
          <div class="rankace-power-sub">Draw glowing boxes over problematic elements</div>
        </div>
        <label class="toggle">
          <input type="checkbox" id="rankace-drawer-toggle-boxes" ${isInspectionEnabled ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </div>

      <!-- Issues Feed Header -->
      <div class="rankace-feed-head">
        Issues Found (${audit.issues.length})
      </div>

      <!-- Issues List -->
      <div id="rankace-drawer-issues-list" class="rankace-drawer-issues-list">
        ${audit.issues.map(issue => `
          <div class="rankace-issue-card ${issue.severity}">
            <div class="rankace-issue-top">
              <div class="rankace-issue-title">${escapeHTML(issue.title)}</div>
              <span class="rankace-badge-tag ${issue.severity}">${issue.severity.toUpperCase()}</span>
            </div>
            <div class="rankace-issue-msg">${escapeHTML(issue.message)}</div>
            <div class="rankace-issue-fix">💡 ${escapeHTML(issue.recommendation)}</div>
            <div class="rankace-issue-foot">
              ${issue.targetSelector && issue.targetSelector !== 'head' ? `
                <button class="rankace-drawer-inspect-btn" data-selector="${escapeAttr(issue.targetSelector)}">
                  👁 Inspect on page
                </button>
              ` : `<span class="rankace-issue-foot-note">Page-level &lt;head&gt; tag</span>`}
            </div>
          </div>
        `).join("")}
      </div>
    `;

    // Power button handler in drawer
    const drawerPowerBtn = body.querySelector("#rankace-drawer-power-btn");
    if (drawerPowerBtn) {
      drawerPowerBtn.addEventListener("click", () => {
        isInspectionEnabled = !isInspectionEnabled;
        if (isInspectionEnabled) {
          highlightAllIssuesOnPage(audit.issues);
        } else {
          clearAllHighlights();
        }
        renderDrawerContent(audit);
      });
    }

    // Copy URL button in drawer
    const drawerCopyBtn = body.querySelector("#rankace-drawer-copy-url");
    if (drawerCopyBtn) {
      drawerCopyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(audit.url).then(() => {
          const prev = drawerCopyBtn.innerHTML;
          drawerCopyBtn.innerHTML = "✓ Copied!";
          drawerCopyBtn.classList.add("rankace-is-done");
          setTimeout(() => {
            drawerCopyBtn.innerHTML = prev;
            drawerCopyBtn.classList.remove("rankace-is-done");
          }, 1800);
        });
      });
    }

    // Toggle bounding boxes listener
    const toggleBoxes = body.querySelector("#rankace-drawer-toggle-boxes");
    if (toggleBoxes) {
      toggleBoxes.addEventListener("change", (e) => {
        isInspectionEnabled = e.target.checked;
        if (isInspectionEnabled) {
          highlightAllIssuesOnPage(audit.issues);
        } else {
          clearAllHighlights();
        }
        renderDrawerContent(audit);
      });
    }

    // Inspect buttons
    body.querySelectorAll(".rankace-drawer-inspect-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const selector = btn.getAttribute("data-selector");
        const issue = audit.issues.find(i => i.targetSelector === selector);
        if (issue) {
          highlightSingleElement(selector, issue);
        }
      });
    });
  }

  function escapeHTML(str) {
    return (str || "").replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  function escapeAttr(str) {
    return (str || "").replace(/"/g, '&quot;');
  }

  // -------------------------------------------------------------
  // 5. KEYBOARD SHORTCUT (Alt+R) & MESSAGE LISTENERS
  // -------------------------------------------------------------
  window.addEventListener("keydown", (e) => {
    // Alt+R or Option+R toggles in-page assistant drawer and boxes
    if (e.altKey && (e.key === "r" || e.key === "R")) {
      e.preventDefault();
      toggleInPageDrawer();
    }
    // Esc closes drawer
    if (e.key === "Escape" && drawerOpen) {
      toggleInPageDrawer(false);
    }
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "ONE_CLICK_ACTIVATE") {
      toggleInPageDrawer(true);
      sendResponse({ success: true, opened: true });
      return true;
    }

    if (request.action === "GET_LIVE_AUDIT") {
      const data = runLiveAudit();
      sendResponse(data);
      return true;
    }

    if (request.action === "HIGHLIGHT_DEFECT") {
      const success = highlightSingleElement(request.targetSelector, request.issue);
      sendResponse({ success });
      return true;
    }

    if (request.action === "HIGHLIGHT_ALL") {
      isInspectionEnabled = !!request.enable;
      if (request.enable) {
        const count = highlightAllIssuesOnPage(request.issues || (cachedAuditData ? cachedAuditData.issues : []));
        sendResponse({ highlightedCount: count, enabled: true });
      } else {
        clearAllHighlights();
        sendResponse({ cleared: true, enabled: false });
      }
      return true;
    }

    if (request.action === "CLEAR_HIGHLIGHTS") {
      clearAllHighlights();
      sendResponse({ success: true });
      return true;
    }

    if (request.action === "TOGGLE_FLOATING_ASSISTANT") {
      toggleInPageDrawer();
      sendResponse({ success: true });
      return true;
    }
  });

  // -------------------------------------------------------------
  // 6. SCROLL & LIVE CHANGE TRACKING ENGINE
  // -------------------------------------------------------------
  
  // A. Scroll Sync (Capture listener catches scrolls in window, body, & inner overflow divs)
  let isScrollThrottled = false;
  window.addEventListener("scroll", () => {
    if (!isScrollThrottled) {
      window.requestAnimationFrame(() => {
        repositionAllBoxes();
        isScrollThrottled = false;
      });
      isScrollThrottled = true;
    }
  }, { capture: true, passive: true });

  // B. Window Resize Sync
  window.addEventListener("resize", () => {
    window.requestAnimationFrame(repositionAllBoxes);
  }, { passive: true });

  // C. Live DOM MutationObserver (Updates live when page elements/attributes change)
  let mutationDebounceTimer = null;
  const domObserver = new MutationObserver((mutations) => {
    // Prevent infinite recursion from Rankace's own DOM updates
    const isSelfMutation = mutations.every(m => {
      const node = m.target;
      return node && (
        node.id === "rankace-inpage-drawer" ||
        node.id === "rankace-floating-pill" ||
        (node.classList && (node.classList.contains("rankace-defect-box") || node.classList.contains("rankace-defect-callout"))) ||
        (node.closest && (node.closest("#rankace-inpage-drawer") || node.closest(".rankace-defect-box") || node.closest("#rankace-floating-pill")))
      );
    });
    if (isSelfMutation) return;

    clearTimeout(mutationDebounceTimer);
    mutationDebounceTimer = setTimeout(() => {
      const audit = runLiveAudit();
      if (drawerOpen) {
        renderDrawerContent(audit);
        const toggle = document.getElementById("rankace-drawer-toggle-boxes");
        if (!toggle || toggle.checked) {
          highlightAllIssuesOnPage(audit.issues);
        }
      } else if (allHighlighted) {
        highlightAllIssuesOnPage(audit.issues);
      } else {
        repositionAllBoxes();
      }
    }, 400);
  });

  if (document.body) {
    domObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["alt", "src", "href", "title", "class", "style"]
    });
  }

  // D. Live SPA Navigation Tracker (Next.js, React, Vue, client-side route changes)
  let currentTrackedUrl = location.href;
  function handleUrlChange() {
    if (location.href !== currentTrackedUrl) {
      currentTrackedUrl = location.href;
      clearAllHighlights();
      setTimeout(() => {
        const audit = runLiveAudit();
        if (drawerOpen) {
          renderDrawerContent(audit);
          highlightAllIssuesOnPage(audit.issues);
        }
      }, 350);
    }
  }

  window.addEventListener("popstate", handleUrlChange);
  window.addEventListener("hashchange", handleUrlChange);

  const _origPushState = history.pushState;
  history.pushState = function () {
    _origPushState.apply(this, arguments);
    handleUrlChange();
  };

  const _origReplaceState = history.replaceState;
  history.replaceState = function () {
    _origReplaceState.apply(this, arguments);
    handleUrlChange();
  };

  // Initial silent audit to display floating pill
  setTimeout(runLiveAudit, 600);
})();
