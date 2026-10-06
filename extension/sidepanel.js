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

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  initSidePanel();
  setupEventListeners();
});

async function initSidePanel() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
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
    btnPowerText.textContent = enable ? "SWITCH OFF" : "SWITCH ON";
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
    });
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
      if (auditedUrlLink && auditedUrlLink.href) {
        navigator.clipboard.writeText(auditedUrlLink.href).then(() => {
          const prev = btnCopyUrl.innerHTML;
          btnCopyUrl.innerHTML = "✓ Copied!";
          btnCopyUrl.classList.add("copied");
          setTimeout(() => {
            btnCopyUrl.innerHTML = prev;
            btnCopyUrl.classList.remove("copied");
          }, 1800);
        });
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

  // Target Keyword NLP Intent Classifier
  btnIntent.addEventListener("click", testSearchIntent);
  targetKeyword.addEventListener("keyup", (e) => {
    if (e.key === "Enter") testSearchIntent();
    checkKeywordPlacement();
  });

  // Re-audit when active tab changes or finishes navigating
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "TAB_NAVIGATED" && request.tabId === activeTabId) {
      setTimeout(fetchAuditData, 500);
    }
  });
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
      });
    }
  });
}

// Render complete UI from audit payload
function updateUI(audit) {
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

  // Overview metrics
  metricWords.textContent = `${audit.stats.wordCount.toLocaleString()} words`;
  metricRead.textContent = `~${audit.stats.readingTimeMinutes} min read`;
  metricHeadings.textContent = `H1: ${audit.stats.h1Count} · H2: ${audit.stats.h2Count} · H3: ${audit.stats.h3Count}`;
  metricImages.textContent = `${audit.stats.totalImages} (${audit.stats.missingAltCount} missing alt)`;

  renderIssuesFeed();
  checkKeywordPlacement();
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
        });
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
  const descHas = (currentAudit.stats.metaDescription || "").toLowerCase().includes(kw);

  let status = [];
  if (titleHas) status.push("✓ in Title");
  if (descHas) status.push("✓ in Meta");
  if (!titleHas && !descHas) status.push("⚠️ Missing in Title & Meta");

  keywordPresence.textContent = status.join(" · ");
}

// Test Search Intent with Rankace Backend NLP Engine
async function testSearchIntent() {
  const query = targetKeyword.value.trim();
  if (!query) return;

  btnIntent.disabled = true;
  btnIntent.textContent = "Testing...";
  intentResult.style.display = "none";

  try {
    const res = await fetch("http://127.0.0.1:8000/api/projects/public-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });

    if (res.ok) {
      const data = await res.json();
      intentResult.style.display = "block";
      intentResult.innerHTML = `
        <strong>Intent:</strong> ${data.intent} (${Math.round(data.confidence * 100)}% conf)<br/>
        <small class="txt-secondary">${data.serp_target || "SERP Target: Content page"}</small>
      `;
    } else {
      throw new Error("Rankace backend unreachable");
    }
  } catch (e) {
    intentResult.style.display = "block";
    intentResult.innerHTML = `
        <span class="txt-error">⚠️ Rankace API Offline</span><br/>
        <small class="txt-tertiary">Start backend at http://127.0.0.1:8000 for AI intent classification.</small>
    `;
  } finally {
    btnIntent.disabled = false;
    btnIntent.textContent = "Classify Intent";
  }
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
