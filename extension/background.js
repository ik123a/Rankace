// Rankace SEO Assistant - Background Service Worker
// Direct 1-Click activation on whatever webpage is currently open

chrome.runtime.onInstalled.addListener(() => {
  console.log("⚡ Rankace SEO Assistant installed.");
});

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
    // Send message to active tab
    chrome.tabs.sendMessage(tab.id, { action: "ONE_CLICK_ACTIVATE" }, (response) => {
      if (chrome.runtime.lastError || !response) {
        // If content script wasn't injected yet, inject now and activate
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"]
        }).then(() => {
          chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: ["overlay.css"]
          }).then(() => {
            chrome.tabs.sendMessage(tab.id, { action: "ONE_CLICK_ACTIVATE" });
          });
        }).catch(err => console.warn("Script injection error:", err));
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
