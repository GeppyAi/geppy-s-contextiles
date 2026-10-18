/**
 * Geppy's Contextile - Service Worker (Background Script)
 * Manages chrome.storage.local initialization, sidePanel API behavior, action click handlers, and messaging.
 */

// Configure side panel behavior on installation and startup
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("[Contextile ServiceWorker] Extension installed/updated:", details.reason);

  // Enable opening side panel when extension icon is clicked
  if (chrome.sidePanel && typeof chrome.sidePanel.setPanelBehavior === "function") {
    try {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    } catch (e) {
      console.warn("[Contextile ServiceWorker] Could not set sidePanel behavior:", e);
    }
  }

  // Initialize default store if missing
  const existingStore = await chrome.storage.local.get(null);
  if (!existingStore || !existingStore.version || !existingStore.dropdownCategories || !existingStore.mediaAssets) {
    try {
      const response = await fetch(chrome.runtime.getURL("data/default-store.json"));
      const defaultStore = await response.json();
      await chrome.storage.local.set(defaultStore);
      console.log("[Contextile ServiceWorker] Successfully initialized default store with media gallery.");
    } catch (err) {
      console.error("[Contextile ServiceWorker] Failed to load default-store.json:", err);
    }
  }
});

// Configure side panel behavior on startup
chrome.runtime.onStartup.addListener(async () => {
  if (chrome.sidePanel && typeof chrome.sidePanel.setPanelBehavior === "function") {
    try {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    } catch (e) {
      console.warn("[Contextile ServiceWorker] Startup sidePanel set behavior error:", e);
    }
  }
});

// Handle extension icon clicks directly
if (chrome.action && typeof chrome.action.onClicked.addListener === "function") {
  chrome.action.onClicked.addListener(async (tab) => {
    if (chrome.sidePanel && typeof chrome.sidePanel.open === "function") {
      if (tab && tab.id) {
        try {
          await chrome.sidePanel.open({ tabId: tab.id });
        } catch (e) {
          console.warn("[Contextile ServiceWorker] Could not open side panel on action click:", e);
        }
      }
    }
  });
}

// Helper to determine operating mode from active tab URL
function detectModeFromUrl(url) {
  if (!url) return "antigravity";
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes("gemini.google.com")) {
    return "gemini";
  }
  if (
    lowerUrl.includes("antigravity") ||
    lowerUrl.includes("localhost") ||
    lowerUrl.includes("127.0.0.1") ||
    lowerUrl.includes("stackblitz") ||
    lowerUrl.includes("codesandbox") ||
    lowerUrl.includes("github.com")
  ) {
    return "antigravity";
  }
  if (
    lowerUrl.includes("midjourney") ||
    lowerUrl.includes("ideogram") ||
    lowerUrl.includes("lexica") ||
    lowerUrl.includes("civitai") ||
    lowerUrl.includes("adobe") ||
    lowerUrl.includes("canva") ||
    lowerUrl.includes("leonardo.ai") ||
    lowerUrl.includes("dall-e") ||
    lowerUrl.includes("bing.com/create")
  ) {
    return "image_gen";
  }

  return "antigravity";
}

// Global Message Handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case "GET_STORE": {
          const store = await chrome.storage.local.get(null);
          sendResponse({ success: true, data: store });
          break;
        }

        case "UPDATE_STORE": {
          if (message.payload) {
            await chrome.storage.local.set(message.payload);
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: "No payload provided" });
          }
          break;
        }

        case "DETECT_MODE": {
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          const detectedMode = activeTab ? detectModeFromUrl(activeTab.url) : "antigravity";
          sendResponse({ success: true, mode: detectedMode, tab: activeTab });
          break;
        }

        case "INJECT_PROMPT": {
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!activeTab || !activeTab.id) {
            sendResponse({ success: false, error: "No active tab found" });
            return;
          }

          try {
            await chrome.tabs.sendMessage(activeTab.id, {
              type: "DO_INJECT",
              prompt: message.prompt
            });
            sendResponse({ success: true });
          } catch (err) {
            try {
              await chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                files: ["content.js"]
              });
              await chrome.tabs.sendMessage(activeTab.id, {
                type: "DO_INJECT",
                prompt: message.prompt
              });
              sendResponse({ success: true });
            } catch (execErr) {
              console.error("[Contextile ServiceWorker] Failed to inject prompt into page:", execErr);
              sendResponse({ success: false, error: execErr.message || "Failed to communicate with page DOM" });
            }
          }
          break;
        }

        default:
          sendResponse({ success: false, error: "Unknown message type: " + message.type });
      }
    } catch (err) {
      console.error("[Contextile ServiceWorker] Error handling message:", err);
      sendResponse({ success: false, error: err.message });
    }
  })();

  return true;
});
