// Rankace SEO Assistant - Background Service Worker
// Direct 1-Click activation + supercharged right-click menu

chrome.runtime.onInstalled.addListener(() => {
  console.log("⚡ Rankace SEO Assistant installed.");

  // ---- Right-click menu (inspired by Detailed SEO Extension) ----------
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "rankace_audit",
      title: "⚡ Audit this page with Rankace",
      contexts: ["page"]
    });
    chrome.contextMenus.create({
      id: "rankace_nofollow",
      title: "Highlight nofollow links",
      contexts: ["page"]
    });
    chrome.contextMenus.create({
      id: "rankace_sep1",
      type: "separator",
      contexts: ["page", "selection"]
    });
    chrome.contextMenus.create({
      id: "rankace_site_search",
      title: "Search this site on Google (site:)",
      contexts: ["page"]
    });
    chrome.contextMenus.create({
      id: "rankace_inurl_search",
      title: "Find this URL in Google (inurl:)",
      contexts: ["page"]
    });
    chrome.contextMenus.create({
      id: "rankace_duplicates",
      title: "Check selected text for duplicates",
      contexts: ["selection"]
    });
    chrome.contextMenus.create({
      id: "rankace_sep2",
      type: "separator",
      contexts: ["page"]
    });
    chrome.contextMenus.create({
      id: "rankace_tools",
      title: "SEO quick tools",
      contexts: ["page"]
    });

    const tools = [
      ["rankace_tool_pagespeed", "PageSpeed Insights", "https://pagespeed.web.dev/analysis?url={url}"],
      ["rankace_tool_richresults", "Google Rich Results Test", "https://search.google.com/test/rich-results?url={url}"],
      ["rankace_tool_validator", "W3C HTML Validator", "https://validator.w3.org/nu/?doc={url}"],
      ["rankace_tool_wayback", "View in Wayback Machine", "https://web.archive.org/web*/{url}"],
      ["rankace_tool_similarweb", "View in SimilarWeb", "https://www.similarweb.com/website/{host}/"],
      ["rankace_tool_moz", "View in Moz", "https://moz.com/domain-analysis?site={host}"],
      ["rankace_tool_majestic", "View in Majestic", "https://majestic.com/reports/site-explorer?q={host}"],
      ["rankace_tool_buzzsumo", "View in BuzzSumo", "https://buzzsumo.com/hosts/{host}"]
    ];
    tools.forEach(([id, title]) => {
      chrome.contextMenus.create({ id, parentId: "rankace_tools", title, contexts: ["page"] });
    });
  });
});

function openInNewTab(url) {
  chrome.tabs.create({ url });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.url) return;
  let pageUrl = tab.url;
  let host = "";
  try {
    const u = new URL(tab.url);
    host = u.hostname.replace(/^www\./, "");
    pageUrl = encodeURIComponent(tab.url);
  } catch (err) {
    return;
  }
  const hostEnc = encodeURIComponent(host);

  switch (info.menuItemId) {
    case "rankace_audit":
      chrome.tabs.sendMessage(tab.id, { action: "ONE_CLICK_ACTIVATE" }, (response) => {
        if (chrome.runtime.lastError || !response) {
          chrome.scripting
            .executeScript({ target: { tabId: tab.id }, files: ["content.js"] })
            .then(() => chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ["overlay.css"] }))
            .then(() => chrome.tabs.sendMessage(tab.id, { action: "ONE_CLICK_ACTIVATE" }))
            .catch((err) => console.warn("Rankace injection error:", err));
        }
      });
      break;

    case "rankace_nofollow":
      chrome.tabs.sendMessage(tab.id, { action: "HIGHLIGHT_NOFOLLOW" }, (response) => {
        if (chrome.runtime.lastError || !response) {
          chrome.scripting
            .executeScript({ target: { tabId: tab.id }, files: ["content.js"] })
            .then(() => chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ["overlay.css"] }))
            .then(() => chrome.tabs.sendMessage(tab.id, { action: "HIGHLIGHT_NOFOLLOW" }))
            .catch((err) => console.warn("Rankace injection error:", err));
        }
      });
      break;

    case "rankace_site_search":
      openInNewTab(`https://www.google.com/search?q=site%3A${hostEnc}`);
      break;

    case "rankace_inurl_search":
      openInNewTab(`https://www.google.com/search?q=inurl%3A${pageUrl}`);
      break;

    case "rankace_duplicates": {
      const phrase = (info.selectionText || "").trim().slice(0, 150);
      if (phrase) openInNewTab(`https://www.google.com/search?q=%22${encodeURIComponent(phrase)}%22`);
      break;
    }

    default: {
      const tool = TOOL_URLS[info.menuItemId];
      if (tool) {
        openInNewTab(tool.replace("{url}", pageUrl).replace("{host}", hostEnc));
      }
    }
  }
});

const TOOL_URLS = {
  rankace_tool_pagespeed: "https://pagespeed.web.dev/analysis?url={url}",
  rankace_tool_richresults: "https://search.google.com/test/rich-results?url={url}",
  rankace_tool_validator: "https://validator.w3.org/nu/?doc={url}",
  rankace_tool_wayback: "https://web.archive.org/web*/{url}",
  rankace_tool_similarweb: "https://www.similarweb.com/website/{host}/",
  rankace_tool_moz: "https://moz.com/domain-analysis?site={host}",
  rankace_tool_majestic: "https://majestic.com/reports/site-explorer?q={host}",
  rankace_tool_buzzsumo: "https://buzzsumo.com/hosts/{host}"
};

// Single-click toolbar icon trigger
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id || !tab.url) return;

  // Ignore restricted internal pages
  if (tab.url.startsWith("chrome://") || tab.url.startsWith("edge://") || tab.url.startsWith("about:")) {
    console.warn("Cannot run on internal browser URLs.");
    return;
  }

  // 1. Try to open native Side Panel if browser supports it
  if (chrome.sidePanel && chrome.sidePanel.open) {
    chrome.sidePanel.open({ tabId: tab.id }).catch(() => {
      // Side panel API might have user gesture restrictions, fallback gracefully
    });
  }

  // 2. Direct 1-Click activation directly inside whatever webpage is open
  try {
    chrome.tabs.sendMessage(tab.id, { action: "ONE_CLICK_ACTIVATE" }, (response) => {
      if (chrome.runtime.lastError || !response) {
        // If content script wasn't injected yet, inject now and activate
        chrome.scripting
          .executeScript({ target: { tabId: tab.id }, files: ["content.js"] })
          .then(() => chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ["overlay.css"] }))
          .then(() => chrome.tabs.sendMessage(tab.id, { action: "ONE_CLICK_ACTIVATE" }))
          .catch((err) => console.warn("Script injection error:", err));
      }
    });
  } catch (err) {
    console.warn("Error activating on tab:", err);
  }
});

// Listen for tab navigation to refresh audits
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url && !tab.url.startsWith("chrome://")) {
    chrome.runtime.sendMessage({ action: "TAB_NAVIGATED", tabId, url: tab.url }).catch(() => {
      // Side panel may be closed
    });
  }
});