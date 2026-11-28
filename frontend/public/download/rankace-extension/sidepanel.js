// Rankace SEO Assistant - Side Panel Controller
// Manages real-time page auditing, defect bounding box controls, and NLP intent testing

let currentAudit = null;
let activeFilter = "all";
let activeTabId = null;
let isInspectionOn = true;

// DOM Elements
const powerCard = document.getElementById("power-card");
const btnMasterPower = document.getElementById("btn-master-power");
const btnPowerText = document.getElementById("btn-power-text");
const powerStatusLabel = document.getElementById("power-status-label");
const powerStatusSub = document.getElementById("power-status-sub");
const auditedUrlLink = document.getElementById("audited-url-link");
const auditedTime = document.getElementById("audited-time");
const auditedPageTitle = document.getElementById("audited-page-title");
const btnCopyUrl = document.getElementById("btn-copy-url");

const scoreDial = document.getElementById("score-dial");
const scoreNumber = document.getElementById("score-number");
const scoreHeadline = document.getElementById("score-headline");
const badgeCrit = document.getElementById("badge-crit");
const badgeWarn = document.getElementById("badge-warn");
const toggleHighlightAll = document.getElementById("toggle-highlight-all");
const btnScan = document.getElementById("btn-scan");
const issuesFeed = document.getElementById("issues-feed");
const countAll = document.getElementById("count-all");
const targetKeyword = document.getElementById("target-keyword");
const btnIntent = document.getElementById("btn-intent");
const intentResult = document.getElementById("intent-result");
const keywordPresence = document.getElementById("keyword-presence");

// Metrics
const metricWords = document.getElementById("metric-words");
const metricRead = document.getElementById("metric-read");
const metricHeadings = document.getElementById("metric-headings");
const metricImages = document.getElementById("metric-images");

// Page detail sections
const serpPreview = document.getElementById("serp-preview");
const serpCardView = document.getElementById("serp-card-view");
const socialCardView = document.getElementById("social-card-view");
const socialCardMedia = document.getElementById("social-card-media");
const socialCardDomain = document.getElementById("social-card-domain");
const socialCardTitle = document.getElementById("social-card-title");
const socialCardDesc = document.getElementById("social-card-desc");
const serpUrl = document.getElementById("serp-url");
const serpTitle = document.getElementById("serp-title");
const serpDesc = document.getElementById("serp-desc");
const simTitleInput = document.getElementById("sim-title-input");
const simDescInput = document.getElementById("sim-desc-input");
const simTitleGauge = document.getElementById("sim-title-gauge");
const simDescGauge = document.getElementById("sim-desc-gauge");
const btnSimApply = document.getElementById("btn-sim-apply");
const btnSimReset = document.getElementById("btn-sim-reset");
const vitalsChips = document.getElementById("vitals-chips");
const factsGrid = document.getElementById("facts-grid");
const schemaChips = document.getElementById("schema-chips");
const schemaInspector = document.getElementById("schema-inspector");
const schemaTypeSelect = document.getElementById("schema-type-select");
const btnSchemaCopy = document.getElementById("btn-schema-copy");
const btnSchemaInject = document.getElementById("btn-schema-inject");
const socialChips = document.getElementById("social-chips");
const linkChips = document.getElementById("link-chips");
const headingOutline = document.getElementById("heading-outline");
const btnCopyReport = document.getElementById("btn-copy-report");

// Auto-fix & export
const btnAutofix = document.getElementById("btn-autofix");
const btnHeroAutofix = document.getElementById("btn-hero-autofix");
const btnDownloadHtml = document.getElementById("btn-download-html");
const autofixResults = document.getElementById("autofix-results");
const quickTools = document.getElementById("quick-tools");
const tabIssuesCount = document.getElementById("tab-issues-count");
const explainVerdict = document.getElementById("explain-verdict");
const explainPillars = document.getElementById("explain-pillars");
const explainFormula = document.getElementById("explain-formula");

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  initSidePanel();
  setupEventListeners();
});

async function initSidePanel(forcedTabId) {
  const selfTab = chrome.tabs.getCurrent ? await chrome.tabs.getCurrent().catch(() => null) : null;
  let tab = null;
  if (forcedTabId) {
    tab = await chrome.tabs.get(forcedTabId).catch(() => null);
  } else {
    const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (active && (!selfTab || active.id !== selfTab.id) && !(active.url || "").startsWith("chrome-extension://")) {
      tab = active;
    } else if (!activeTabId) {
      const httpTabs = await chrome.tabs.query({ windowType: "normal" });
      tab = httpTabs.find((t) => t.active && /^https?:/i.test(t.url || "")) || httpTabs.find((t) => /^https?:/i.test(t.url || "")) || active;
    } else {
      return;
    }
  }
  if (!tab || !tab.id) {
    if (auditedUrlLink) auditedUrlLink.textContent = "No active tab detected";
    return;
  }
  activeTabId = tab.id;
  if (auditedUrlLink) {
    auditedUrlLink.href = tab.url || "#";
    auditedUrlLink.textContent = tab.url || "about:blank";
  }

  // Ensure content script is injected
  try {
    await chrome.scripting.executeScript({
      target: { tabId: activeTabId },
      files: ["content.js"]
    });
    await chrome.scripting.insertCSS({
      target: { tabId: activeTabId },
      files: ["overlay.css"]
    });
  } catch (err) {
    // Already injected or restricted page (e.g. chrome://)
  }

  fetchAuditData();
}

function setInspectionState(enable) {
  isInspectionOn = enable;

  if (powerCard) {
    if (enable) {
      powerCard.classList.add("is-active");
      powerCard.classList.remove("is-paused");
    } else {
      powerCard.classList.remove("is-active");
      powerCard.classList.add("is-paused");
    }
  }

  if (btnMasterPower) {
    btnMasterPower.className = enable ? "btn-power on" : "btn-power off";
  }
  if (btnPowerText) {
    btnPowerText.textContent = enable ? "ON" : "OFF";
  }
  if (powerStatusLabel) {
    powerStatusLabel.textContent = enable ? "INSPECTOR ON" : "INSPECTION PAUSED";
  }
  if (powerStatusSub) {
    powerStatusSub.textContent = enable
      ? "Bounding boxes active on page defects"
      : "All bounding boxes cleared • Webpage clean";
  }
  if (toggleHighlightAll) {
    toggleHighlightAll.checked = enable;
  }

  if (activeTabId) {
    chrome.tabs.sendMessage(activeTabId, {
      action: "HIGHLIGHT_ALL",
      enable: enable,
      issues: currentAudit ? currentAudit.issues : []
    }, () => { void chrome.runtime.lastError; });
  }
}

function setupEventListeners() {
  btnScan.addEventListener("click", () => {
    fetchAuditData();
  });

  // Master Power Button: SWITCH ON / SWITCH OFF
  if (btnMasterPower) {
    btnMasterPower.addEventListener("click", () => {
      setInspectionState(!isInspectionOn);
    });
  }

  // Sync Toggle Switch
  if (toggleHighlightAll) {
    toggleHighlightAll.addEventListener("change", (e) => {
      setInspectionState(e.target.checked);
    });
  }

  // Copy Website Link button
  if (btnCopyUrl) {
    btnCopyUrl.addEventListener("click", () => {
      if (auditedUrlLink && auditedUrlLink.href && navigator.clipboard) {
        navigator.clipboard.writeText(auditedUrlLink.href).then(() => {
          const prev = btnCopyUrl.innerHTML;
          btnCopyUrl.innerHTML = "✓ Copied!";
          btnCopyUrl.classList.add("copied");
          setTimeout(() => {
            btnCopyUrl.innerHTML = prev;
            btnCopyUrl.classList.remove("copied");
          }, 1800);
        }).catch(() => {});
      }
    });
  }

  // Filter Tabs
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.filter;
      renderIssuesFeed();
    });
  });

  // Studio Primary Tabs
  document.querySelectorAll(".studio-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchStudioTab(btn.dataset.studioTab));
  });

  if (btnHeroAutofix) {
    btnHeroAutofix.addEventListener("click", () => {
      switchStudioTab("preview");
      if (btnAutofix) btnAutofix.click();
    });
  }

  if (btnCopyReport) {
    btnCopyReport.addEventListener("click", () => {
      if (!currentAudit || !navigator.clipboard) return;
      navigator.clipboard.writeText(buildReportText(currentAudit)).then(() => {
        const prev = btnCopyReport.innerHTML;
        btnCopyReport.innerHTML = "✓ Full report copied";
        setTimeout(() => { btnCopyReport.innerHTML = prev; }, 1800);
      }).catch(() => {});
    });
  }

  // Auto-Fix: apply safe corrections in the page, then show what happened
  if (btnAutofix) {
    btnAutofix.addEventListener("click", async () => {
      if (!activeTabId) return;
      btnAutofix.disabled = true;
      btnAutofix.textContent = "Fixing…";
      const result = await sendMessage({ action: "APPLY_ALL_FIXES" });
      btnAutofix.disabled = false;
      btnAutofix.textContent = "✨ Fix all fixable issues";
      if (result) renderAutofixResults(result);
      fetchAuditData();
    });
  }

  // Corrected file export (works whether or not fixes were applied first)
  if (btnDownloadHtml) {
    btnDownloadHtml.addEventListener("click", async () => {
      if (!activeTabId) return;
      const res = await sendMessage({ action: "DOWNLOAD_CORRECTED_HTML" });
      const prev = btnDownloadHtml.innerHTML;
      btnDownloadHtml.innerHTML = res && res.ok
        ? `✓ Saved ${res.filename || "corrected file"}`
        : `⚠ ${res ? res.note : "page not inspectable"}`;
      setTimeout(() => { btnDownloadHtml.innerHTML = prev; }, 2600);
    });
  }

  if (quickTools) renderQuickTools();

  // SERP & Social simulator controls
  document.querySelectorAll(".sim-mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => setSimulatorMode(btn.dataset.simMode));
  });
  if (simTitleInput) simTitleInput.addEventListener("input", updateSimulatorPreview);
  if (simDescInput) simDescInput.addEventListener("input", updateSimulatorPreview);
  if (btnSimReset) {
    btnSimReset.addEventListener("click", () => {
      syncSimulatorInputs(currentAudit);
      updateSimulatorPreview();
    });
  }
  if (btnSimApply) {
    btnSimApply.addEventListener("click", async () => {
      if (!activeTabId) return;
      const res = await sendMessage({
        action: "APPLY_CUSTOM_META",
        title: simTitleInput ? simTitleInput.value : "",
        description: simDescInput ? simDescInput.value : ""
      });
      if (res && res.ok && res.audit) {
        updateUI(res.audit);
        const prev = btnSimApply.textContent;
        btnSimApply.textContent = "✓ Applied";
        setTimeout(() => { btnSimApply.textContent = prev; }, 1600);
      }
    });
  }

  // JSON-LD Schema generator controls
  if (btnSchemaCopy) {
    btnSchemaCopy.addEventListener("click", () => {
      if (!currentAudit || !navigator.clipboard) return;
      const jsonLd = buildSchemaTemplate(schemaTypeSelect ? schemaTypeSelect.value : "WebPage", currentAudit);
      navigator.clipboard.writeText(JSON.stringify(jsonLd, null, 2)).then(() => {
        const prev = btnSchemaCopy.textContent;
        btnSchemaCopy.textContent = "✓ Copied JSON-LD";
        setTimeout(() => { btnSchemaCopy.textContent = prev; }, 1600);
      }).catch(() => {});
    });
  }
  if (btnSchemaInject) {
    btnSchemaInject.addEventListener("click", async () => {
      if (!activeTabId || !currentAudit) return;
      const jsonLd = buildSchemaTemplate(schemaTypeSelect ? schemaTypeSelect.value : "WebPage", currentAudit);
      const res = await sendMessage({ action: "INJECT_JSONLD", jsonLd });
      if (res && res.ok && res.audit) {
        updateUI(res.audit);
        const prev = btnSchemaInject.textContent;
        btnSchemaInject.textContent = "✓ Injected";
        setTimeout(() => { btnSchemaInject.textContent = prev; }, 1600);
      }
    });
  }

  // Target Keyword NLP Intent Classifier
  btnIntent.addEventListener("click", testSearchIntent);
  targetKeyword.addEventListener("keyup", (e) => {
    if (e.key === "Enter") testSearchIntent();
    checkKeywordPlacement();
  });

  // Re-audit when active tab changes or finishes navigating
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "TAB_NAVIGATED" && request.tabId === activeTabId) {
      renderQuickTools();
      setTimeout(fetchAuditData, 500);
    }
  });

  if (chrome.tabs && chrome.tabs.onActivated) {
    chrome.tabs.onActivated.addListener(async ({ tabId }) => {
      const selfTab = chrome.tabs.getCurrent ? await chrome.tabs.getCurrent().catch(() => null) : null;
      if (selfTab && tabId === selfTab.id) return;
      const tab = await chrome.tabs.get(tabId).catch(() => null);
      if (!tab || (tab.url || "").startsWith("chrome-extension://")) return;
      activeTabId = tabId;
      renderQuickTools(tab.url);
      initSidePanel(tabId);
    });
  }
}

// Fetch live audit from active tab content script
function fetchAuditData() {
  if (!activeTabId) return;

  chrome.tabs.sendMessage(activeTabId, { action: "GET_LIVE_AUDIT" }, (response) => {
    if (chrome.runtime.lastError || !response) {
      issuesFeed.innerHTML = `
        <div class="empty-state">
          Cannot inspect this page.<br/>
          <small class="txt-tertiary">(Restricted browser page or content script loading)</small>
        </div>`;
      return;
    }

    currentAudit = response;
    updateUI(response);

    // Auto-box defects on page if inspector is ON
    if (isInspectionOn) {
      chrome.tabs.sendMessage(activeTabId, {
        action: "HIGHLIGHT_ALL",
        enable: true,
        issues: response.issues
      }, () => { void chrome.runtime.lastError; });
    }
  });
}

// Render complete UI from audit payload
function updateUI(audit) {
  currentAudit = audit;
  renderQuickTools(audit.url);
  // Update Audited Website Link Card
  if (auditedUrlLink) {
    auditedUrlLink.href = audit.url;
    auditedUrlLink.textContent = audit.url;
  }
  if (auditedTime) {
    auditedTime.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  if (auditedPageTitle) {
    auditedPageTitle.textContent = audit.title ? `Page Title: "${audit.title}"` : "Untitled Webpage";
  }

  // Update Score Dial
  scoreNumber.textContent = audit.score;
  scoreDial.style.setProperty("--score-deg", (audit.score / 100) * 360);

  const band = audit.score >= 85 ? "ok" : audit.score >= 65 ? "warn" : "bad";
  scoreHeadline.textContent =
    band === "ok" ? "Excellent Condition" : band === "warn" ? "Needs Optimization" : "Critical Fixes Required";
  scoreHeadline.classList.remove("ok", "warn", "bad");
  scoreHeadline.classList.add(band);
  scoreDial.classList.remove("ok", "warn", "bad");
  scoreDial.classList.add(band);

  // Count issues
  const critCount = audit.issues.filter(i => i.severity === "critical").length;
  const warnCount = audit.issues.filter(i => i.severity === "warning").length;
  badgeCrit.textContent = `${critCount} Critical`;
  badgeWarn.textContent = `${warnCount} Warnings`;
  countAll.textContent = audit.issues.length;
  if (tabIssuesCount) tabIssuesCount.textContent = audit.issues.length;

  // Overview metrics
  metricWords.textContent = `${audit.stats.wordCount.toLocaleString()} words`;
  metricRead.textContent = `~${audit.stats.readingTimeMinutes} min read`;
  metricHeadings.textContent = `H1: ${audit.stats.h1Count} · H2: ${audit.stats.h2Count} · H3: ${audit.stats.h3Count}`;
  metricImages.textContent = `${audit.stats.totalImages} (${audit.stats.missingAltCount} missing alt)`;

  renderExplainSummary(audit, critCount, warnCount);
  renderIssuesFeed();
  renderDetails(audit);
  checkKeywordPlacement();
}

function switchStudioTab(tabName) {
  document.querySelectorAll(".studio-tab-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.studioTab === tabName);
  });
  document.querySelectorAll(".studio-panel").forEach((p) => {
    p.hidden = p.dataset.panel !== tabName;
  });
}

/** Build a clear, plain-English scorecard summary suitable for live demos. */
function renderExplainSummary(audit, critCount, warnCount) {
  if (!explainVerdict || !explainPillars || !explainFormula) return;
  const topIssues = audit.issues
    .filter((i) => i.severity === "critical" || i.severity === "warning")
    .slice(0, 2)
    .map((i) => i.title.toLowerCase());
  const issueNote = topIssues.length
    ? `Key improvements needed: ${topIssues.join(" and ")}.`
    : "No critical or warning defects detected — key on-page SEO signals are healthy.";
  explainVerdict.textContent = `${audit.domain || "This page"} scores ${audit.score}/100. ${issueNote}`;

  const computePillar = (cats) => {
    const subset = audit.issues.filter((i) => cats.includes(i.category));
    const penalty = subset.reduce((sum, i) => sum + (i.severity === "critical" ? 28 : i.severity === "warning" ? 14 : 4), 0);
    return Math.max(15, 100 - penalty);
  };
  const pillars = [
    ["Titles, Meta & Indexing", computePillar(["Metadata", "Indexability"])],
    ["Headings, Content & Links", computePillar(["Headings", "Content", "Images", "Links"])],
    ["Technical Setup & Speed", computePillar(["Technical"])],
    ["Social & Rich Schema", computePillar(["Social", "Schema"])],
  ];
  explainPillars.innerHTML = pillars.map(([label, pct]) => {
    const tone = pct >= 85 ? "ok" : pct >= 60 ? "warn" : "bad";
    return `
      <div class="pillar-row">
        <div class="pillar-meta"><span>${escapeHTML(label)}</span><span class="txt-mono">${pct}%</span></div>
        <div class="pillar-track"><div class="pillar-fill ${tone}" style="width:${pct}%"></div></div>
      </div>`;
  }).join("");

  const rawPoints = critCount * 9 + warnCount * 3;
  explainFormula.textContent = `Formula: 100 − (${critCount} critical × 9 + ${warnCount} warnings × 3) × 1.6  [−${Math.round(rawPoints * 1.6)} pts] = ${audit.score}/100`;
}

function setSimulatorMode(mode) {
  document.querySelectorAll(".sim-mode-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.simMode === mode);
  });
  if (serpPreview) serpPreview.classList.toggle("is-mobile", mode === "mobile");
  if (serpCardView) serpCardView.hidden = mode === "social";
  if (socialCardView) socialCardView.hidden = mode !== "social";
}

let _measureCtx = null;
/** Measure rendered pixel width for Google SERP title/description typography. */
function measureSerpPixels(text, font) {
  if (!_measureCtx) {
    const c = document.createElement("canvas");
    _measureCtx = c.getContext("2d");
  }
  if (!_measureCtx) return text.length * 8;
  _measureCtx.font = font;
  return Math.round(_measureCtx.measureText(text || "").width);
}

function syncSimulatorInputs(audit) {
  if (!audit) return;
  if (simTitleInput) simTitleInput.value = audit.title || "";
  if (simDescInput) simDescInput.value = (audit.stats && audit.stats.metaDescription) || "";
}

function updateSimulatorPreview() {
  const draftTitle = simTitleInput ? simTitleInput.value.trim() : "";
  const draftDesc = simDescInput ? simDescInput.value.trim() : "";
  if (serpTitle) serpTitle.textContent = draftTitle || "(no title tag)";
  if (serpDesc) {
    serpDesc.textContent = draftDesc || "(no meta description — search engines will invent a snippet)";
  }
  if (socialCardTitle) socialCardTitle.textContent = draftTitle || (socialCardTitle.dataset.ogFallback || "—");
  if (socialCardDesc) socialCardDesc.textContent = draftDesc || (socialCardDesc.dataset.ogFallback || "—");

  const titlePx = measureSerpPixels(draftTitle, "20px Arial, sans-serif");
  if (simTitleGauge) {
    simTitleGauge.textContent = `${draftTitle.length} chars · ${titlePx}px / 580px`;
    simTitleGauge.className = `sim-gauge ${titlePx > 600 || draftTitle.length < 25 ? "bad" : titlePx > 560 ? "warn" : "ok"}`;
  }
  const descPx = measureSerpPixels(draftDesc, "14px Arial, sans-serif");
  if (simDescGauge) {
    simDescGauge.textContent = `${draftDesc.length} chars · ${descPx}px / 920px`;
    simDescGauge.className = `sim-gauge ${descPx > 960 || draftDesc.length < 70 ? "bad" : descPx > 880 ? "warn" : "ok"}`;
  }
}

/** Generate a valid Schema.org JSON-LD payload seeded with live page facts. */
function buildSchemaTemplate(schemaType, audit) {
  const origin = (() => {
    try { return new URL(audit.url).origin; } catch (e) { return audit.url; }
  })();
  const title = (audit && audit.title) || "Untitled Page";
  const desc = (audit && audit.stats && audit.stats.metaDescription) || "";
  const image = (audit && audit.facts && audit.facts.social && audit.facts.social.ogImage) || "";
  if (schemaType === "Article") {
    return {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title.slice(0, 110),
      description: desc,
      mainEntityOfPage: audit.url,
      ...(image ? { image: [image] } : {}),
      datePublished: new Date().toISOString().slice(0, 10),
      author: { "@type": "Organization", name: audit.domain || "Publisher" }
    };
  }
  if (schemaType === "Organization") {
    return {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: audit.domain || title,
      url: origin,
      ...(image ? { logo: image } : {})
    };
  }
  if (schemaType === "FAQPage") {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [{
        "@type": "Question",
        name: (audit && audit.stats && audit.stats.h1) || `About ${title}`,
        acceptedAnswer: {
          "@type": "Answer",
          text: desc || `Summary and details for ${title}.`
        }
      }]
    };
  }
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    url: audit.url,
    description: desc
  };
}

// Render the SERP preview, page facts, vitals, schema, social, link profile and
// heading outline. Everything is read from the audit's `facts` object so the
// side panel never makes a claim the DOM did not support.
function renderDetails(audit) {
  const facts = audit.facts;
  if (!facts) return;

  if (serpUrl) serpUrl.textContent = audit.url;
  syncSimulatorInputs(audit);
  if (socialCardDomain) socialCardDomain.textContent = audit.domain || audit.url;
  if (socialCardTitle) {
    socialCardTitle.dataset.ogFallback = facts.social.ogTitle || audit.title || "—";
  }
  if (socialCardDesc) {
    socialCardDesc.dataset.ogFallback = facts.social.ogDescription || audit.stats.metaDescription || "—";
  }
  if (socialCardMedia) {
    socialCardMedia.innerHTML = "";
    const ogImg = facts.social.ogImage || "";
    if (/^https?:\/\//i.test(ogImg)) {
      const img = document.createElement("img");
      img.className = "social-card-img";
      img.alt = "Open Graph preview";
      img.referrerPolicy = "no-referrer";
      img.src = ogImg;
      img.addEventListener("error", () => {
        socialCardMedia.innerHTML = '<div class="social-card-placeholder">og:image failed to load</div>';
      });
      socialCardMedia.appendChild(img);
    } else {
      socialCardMedia.innerHTML = '<div class="social-card-placeholder">No og:image declared</div>';
    }
  }
  updateSimulatorPreview();

  if (vitalsChips) {
    const v = facts.vitals || {};
    const vChips = [];
    if (typeof v.lcpMs === "number") {
      vChips.push(chip(`LCP ${v.lcpMs}ms`, v.lcpMs <= 2500 ? "ok" : "bad"));
    } else {
      vChips.push(chip("LCP pending"));
    }
    vChips.push(chip(`CLS ${typeof v.cls === "number" ? v.cls : 0}`, (v.cls || 0) <= 0.1 ? "ok" : "bad"));
    if (typeof v.ttfbMs === "number") {
      vChips.push(chip(`TTFB ${v.ttfbMs}ms`, v.ttfbMs <= 800 ? "ok" : "bad"));
    }
    if (typeof v.domContentLoadedMs === "number") {
      vChips.push(chip(`DCL ${v.domContentLoadedMs}ms`));
    }
    vitalsChips.innerHTML = vChips.join("");
  }

  const rows = [
    ["Canonical", !facts.meta.canonical ? "missing" : facts.meta.canonicalSelf === false ? "cross-domain" : "self-referencing"],
    ["Robots", facts.meta.robots],
    ["Language", facts.meta.lang || "missing"],
    ["Viewport", facts.meta.viewport ? "declared" : "missing"],
    ["Charset", facts.meta.charset || "missing"],
    ["Hreflang", facts.hreflang.count ? `${facts.hreflang.count} alternates` : "none"],
    ["Title length", `${facts.meta.titleLength} chars`],
    ["Description", `${facts.meta.descriptionLength} chars`],
    ["DOM nodes", facts.tech.domNodes.toLocaleString()],
    ["Scripts / CSS", `${facts.tech.scripts} / ${facts.tech.stylesheets}`]
  ];
  if (factsGrid) {
    factsGrid.innerHTML = rows
      .map(
        ([label, value]) => `
        <div class="detail-row">
          <div class="detail-label">${escapeHTML(label)}</div>
          <div class="detail-value" title="${escapeAttr(value)}">${escapeHTML(value)}</div>
        </div>`
      )
      .join("");
  }

  if (schemaChips) {
    const chips = [];
    if (facts.schema.types.length) {
      facts.schema.types.forEach((type) => chips.push(chip(type, "ok")));
    } else if (facts.schema.microdataItems > 0) {
      chips.push(chip(`${facts.schema.microdataItems} microdata items`, "ok"));
    } else if (facts.schema.blocks > 0) {
      // A block exists but parsed to no usable type. Saying "no structured
      // data" alongside "1 invalid block" described two different faults for
      // one cause and suggested the wrong fix.
      chips.push(chip("0 usable types", "bad"));
    } else {
      chips.push(chip("No structured data", "bad"));
    }
    if (facts.schema.invalidBlocks > 0) chips.push(chip(`${facts.schema.invalidBlocks} invalid block(s)`, "bad"));
    schemaChips.innerHTML = chips.join("");
  }

  if (schemaInspector) {
    const items = facts.schema.items || [];
    schemaInspector.innerHTML = items.length
      ? items.map((item) => {
          const titleText = item.valid
            ? (item.types.length ? item.types.join(", ") : "Untyped JSON-LD")
            : "Syntax Error";
          const detailText = item.missing && item.missing.length
            ? `Missing: ${item.missing.join(", ")}`
            : `Keys: ${(item.keys || []).join(", ") || "none"}`;
          return `
            <div class="schema-block-card">
              <div class="schema-block-head">
                <span>Block #${item.index} · ${escapeHTML(titleText)}</span>
                <span class="${item.valid && !(item.missing && item.missing.length) ? "sim-gauge ok" : "sim-gauge warn"}">
                  ${item.valid ? "valid" : "invalid"}
                </span>
              </div>
              <div class="schema-block-meta">${escapeHTML(detailText)}</div>
            </div>`;
        }).join("")
      : '<div class="schema-block-meta">No JSON-LD blocks detected — generate one below.</div>';
  }

  if (socialChips) {
    const social = facts.social;
    const entries = [
      ["og:title", social.ogTitle],
      ["og:description", social.ogDescription],
      ["og:image", social.ogImage],
      ["twitter:card", social.twitterCard]
    ];
    socialChips.innerHTML = entries
      .map(([label, value]) => chip(value ? `✓ ${label}` : `✗ ${label}`, value ? "ok" : "bad"))
      .join("");
  }

  if (linkChips) {
    const links = facts.links;
    linkChips.innerHTML = [
      chip(`${links.internal} internal`),
      chip(`${links.external} external`),
      chip(`${links.nofollow} nofollow`),
      links.emptyAnchor > 0 ? chip(`${links.emptyAnchor} empty anchors`, "bad") : chip("0 empty anchors", "ok"),
      links.newTabMissingNoopener > 0
        ? chip(`${links.newTabMissingNoopener} missing noopener`, "bad")
        : chip("noopener ok", "ok")
    ].join("");
  }

  if (headingOutline) {
    const outline = facts.headings.outline;
    headingOutline.innerHTML = outline.length
      ? outline
          .map(
            (item) => `
          <div class="outline-item">
            <span class="outline-level">H${item.level}</span>
            <span class="outline-text" title="${escapeAttr(item.text)}">${escapeHTML(item.text || "(empty)")}</span>
          </div>`
          )
          .join("")
      : `<div class="outline-item"><span class="outline-text">No headings found</span></div>`;
  }
}

function chip(label, tone) {
  return `<span class="chip${tone ? ` ${tone}` : ""}">${escapeHTML(label)}</span>`;
}

// Plain-text report, shared shape with the in-page drawer.
function buildReportText(audit) {
  const lines = [
    `Rankace page report — ${audit.url}`,
    `Scanned: ${new Date().toISOString()}`,
    `On-page score: ${audit.score}/100`,
    "",
    `Title (${audit.stats.titleLength}): ${audit.stats.title || "(missing)"}`,
    `Description (${audit.stats.metaDescLength}): ${audit.stats.metaDescription || "(missing)"}`,
    `Canonical: ${audit.stats.canonical || "(missing)"}`,
    `Robots: ${audit.stats.robots || "(none)"}`,
    `Language: ${audit.stats.lang || "(missing)"}`,
    `Words: ${audit.stats.wordCount} · H1: ${audit.stats.h1Count} · H2: ${audit.stats.h2Count} · H3: ${audit.stats.h3Count}`,
    `Links: ${audit.stats.internalLinks} internal / ${audit.stats.externalLinks} external / ${audit.stats.nofollowLinks} nofollow`,
    `Schema: ${(audit.stats.schemaTypes || []).join(", ") || "none"}`,
    `Vitals: LCP ${audit.facts?.vitals?.lcpMs ?? "pending"}ms · CLS ${audit.facts?.vitals?.cls ?? 0} · TTFB ${audit.facts?.vitals?.ttfbMs ?? "--"}ms`,
    "",
    `Findings (${audit.issues.length}):`
  ];
  audit.issues.forEach((issue) => {
    lines.push(`- [${issue.severity.toUpperCase()}] ${issue.title}`);
    lines.push(`  ${issue.message}`);
    lines.push(`  Fix: ${issue.recommendation}`);
    if (issue.targetSelector) lines.push(`  Element: ${issue.targetSelector}`);
  });
  return lines.join("\n");
}

// Render filtered issue cards
function renderIssuesFeed() {
  if (!currentAudit) return;

  const filtered = currentAudit.issues.filter(i => {
    if (activeFilter === "all") return true;
    return i.category.toLowerCase() === activeFilter.toLowerCase();
  });

  if (filtered.length === 0) {
    issuesFeed.innerHTML = `
      <div class="empty-state">
        <span class="glyph-lg">✨</span><br/>
        <b>Zero issues detected in this category!</b><br/>
        <span class="txt-tertiary">Page adheres to on-page SEO best practices.</span>
      </div>`;
    return;
  }

  issuesFeed.innerHTML = "";
  filtered.forEach(issue => {
    const card = document.createElement("div");
    card.className = `issue-card ${issue.severity}`;

    const badgeClass = issue.severity === "critical" ? "badge-critical" : issue.severity === "warning" ? "badge-warning" : "badge-info";

    const hasTargetElement = issue.targetSelector && issue.targetSelector !== "head";

    card.innerHTML = `
      <div class="issue-header">
        <div class="issue-title">${escapeHTML(issue.title)}</div>
        <span class="badge-tag ${badgeClass}">${issue.severity.toUpperCase()}</span>
      </div>
      <div class="issue-msg">${escapeHTML(issue.message)}</div>
      <div class="issue-fix">💡 ${escapeHTML(issue.recommendation)}</div>
      <div class="issue-actions">
        ${hasTargetElement ? `
          <button class="btn-inspect" data-selector="${escapeAttr(issue.targetSelector)}" data-id="${issue.id}">
            👁️ Inspect on Page
          </button>
        ` : `<span class="txt-micro txt-tertiary">Page-level &lt;head&gt; tag</span>`}
      </div>
    `;

    // Click to highlight & box element on webpage
    if (hasTargetElement) {
      const btn = card.querySelector(".btn-inspect");
      btn.addEventListener("click", () => {
        chrome.tabs.sendMessage(activeTabId, {
          action: "HIGHLIGHT_DEFECT",
          targetSelector: issue.targetSelector,
          issue: issue
        }, () => { void chrome.runtime.lastError; });
      });
    }

    issuesFeed.appendChild(card);
  });
}

// Check target keyword placement across title, H1, meta
function checkKeywordPlacement() {
  const kw = targetKeyword.value.trim().toLowerCase();
  if (!kw || !currentAudit) {
    keywordPresence.textContent = "";
    return;
  }

  const titleHas = (currentAudit.stats.title || "").toLowerCase().includes(kw);
  const h1Has = (currentAudit.stats.h1 || "").toLowerCase().includes(kw);
  const descHas = (currentAudit.stats.metaDescription || "").toLowerCase().includes(kw);

  let status = [];
  if (titleHas) status.push("✓ in Title");
  if (h1Has) status.push("✓ in H1");
  if (descHas) status.push("✓ in Meta");
  if (!titleHas && !h1Has && !descHas) status.push("⚠️ Missing in Title, H1 & Meta");

  keywordPresence.textContent = status.join(" · ");
}

function classifyIntentLocally(query) {
  const q = (query || "").toLowerCase().trim();
  const signals = {
    Transactional: ["buy", "price", "order", "checkout", "discount", "deal", "book now", "hire"],
    "Commercial Investigation": ["best", "top", "review", "vs", "compare", "alternative", "cheapest", "under "],
    Informational: ["how", "what", "why", "guide", "tutorial", "tips", "learn", "meaning"]
  };
  const scores = { Informational: 0, Navigational: 0, "Commercial Investigation": 0, Transactional: 0 };
  const reasons = [];
  for (const [intent, words] of Object.entries(signals)) {
    for (const w of words) {
      if (q.includes(w)) {
        scores[intent] += w.length > 4 ? 2 : 1;
        reasons.push(`matched '${w}' -> ${intent}`);
      }
    }
  }
  if (/^[a-z0-9.-]+\.[a-z]{2,}$/.test(q) || ["amazon", "facebook", "youtube", "google"].includes(q)) {
    scores.Navigational += 3;
    reasons.push("looks like a brand/domain navigation query");
  }
  let fallback = false;
  const sum = Object.values(scores).reduce((a, b) => a + b, 0);
  if (sum === 0) {
    fallback = true;
    if (q.split(/\s+/).length >= 5) {
      scores.Informational += 1;
      reasons.push("long question-like query, defaulting to Informational");
    } else {
      scores["Commercial Investigation"] += 1;
      reasons.push("short ambiguous query, defaulting to Commercial Investigation");
    }
  }
  const best = Object.keys(scores).reduce((a, b) => (scores[b] > scores[a] ? b : a), "Informational");
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  let confidence = total ? Math.round((scores[best] / total) * 100) / 100 : 0;
  if (fallback) confidence = Math.min(confidence, 0.35);
  return { intent: best, confidence, why: reasons.join("; ") || "Local RankAce heuristic" };
}

// Classify Search Intent locally using RankAce's deterministic signal model (zero network errors)
async function testSearchIntent() {
  const query = targetKeyword.value.trim();
  if (!query) return;

  btnIntent.disabled = true;
  btnIntent.textContent = "Testing...";

  const data = classifyIntentLocally(query);
  intentResult.style.display = "block";
  intentResult.innerHTML = `
    <strong>Intent:</strong> ${escapeHTML(data.intent || "Unknown")} (${Math.round((data.confidence || 0) * 100)}% conf)<br/>
    <small class="txt-secondary">${escapeHTML(data.why || "SERP Target: Content page")}</small>
  `;
  btnIntent.disabled = false;
  btnIntent.textContent = "Classify Intent";
}

// Promise wrapper around chrome.tabs.sendMessage with error tolerance.
function sendMessage(message) {
  return new Promise((resolve) => {
    if (!activeTabId) return resolve(null);
    chrome.tabs.sendMessage(activeTabId, message, (response) => {
      if (chrome.runtime.lastError) return resolve(null);
      resolve(response || null);
    });
  });
}

// Render the auto-fix outcome: applied corrections, skips, human-decisions.
function renderAutofixResults(result) {
  if (!autofixResults) return;
  const line = (tone, glyph, text) => `<div class="autofix-line ${tone}">${glyph} ${escapeHTML(text)}</div>`;
  let html = "";
  if (!result.applied.length && !result.skipped.length && !result.manual.length) {
    html += line("ok", "✓", `Nothing to correct — every checkable fix is already in place · score ${result.scoreAfter}/100`);
  }
  if (result.applied.length) html += line("ok", "✓", `${result.applied.length} correction${result.applied.length === 1 ? "" : "s"} applied · score ${result.scoreBefore} → ${result.scoreAfter}`);
  if (result.skipped.length) html += line("warn", "⚠", `${result.skipped.length} could not be derived automatically`);
  if (result.manual.length) html += line("warn", "✎", `${result.manual.length} need a human decision`);
  html += result.applied
    .map((f) => `<div class="autofix-item"><b>${escapeHTML(f.title)}</b>${f.detail ? `<span>${escapeHTML(f.detail)}</span>` : ""}</div>`)
    .join("");
  html += result.manual
    .map((f) => `<div class="autofix-item manual"><b>${escapeHTML(f.title)}</b>${f.detail ? `<span>${escapeHTML(f.detail)}</span>` : ""}</div>`)
    .join("");
  autofixResults.innerHTML = html;
  autofixResults.hidden = false;
}

// One-click links to the free external tools SEOs check daily.
function renderQuickTools(overrideUrl) {
  if (!quickTools) return;
  const populate = (pageUrl) => {
    if (!pageUrl || !/^https?:/.test(pageUrl)) {
      quickTools.innerHTML = '<span class="chip">Restricted page</span>';
      return;
    }
    let u;
    try { u = new URL(pageUrl); } catch (e) {
      quickTools.innerHTML = '<span class="chip">Restricted page</span>';
      return;
    }
    const enc = encodeURIComponent(pageUrl);
    const host = encodeURIComponent(u.hostname.replace(/^www\./, ""));
    const tools = [
      ["PageSpeed", `https://pagespeed.web.dev/analysis?url=${enc}`],
      ["Rich Results", `https://search.google.com/test/rich-results?url=${enc}`],
      ["W3C Validator", `https://validator.w3.org/nu/?doc=${enc}`],
      ["Wayback", `https://web.archive.org/web*/${enc}`],
      ["SimilarWeb", `https://www.similarweb.com/website/${host}/`],
      ["Moz", `https://moz.com/domain-analysis?site=${host}`],
      ["Majestic", `https://majestic.com/reports/site-explorer?q=${host}`],
      ["site: search", `https://www.google.com/search?q=site%3A${host}`]
    ];
    quickTools.innerHTML = tools
      .map(([label, url]) => `<a class="chip chip-link" href="${escapeAttr(url)}" target="_blank" rel="noopener">↗ ${escapeHTML(label)}</a>`)
      .join("");
  };
  if (overrideUrl) {
    populate(overrideUrl);
    return;
  }
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    populate(tab && tab.url);
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
