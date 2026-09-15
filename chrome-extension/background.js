// ─────────────────────────────────────────────
// ShopWise AI — Background Service Worker (MV3)
// ─────────────────────────────────────────────

const DEFAULT_API_URL = "http://localhost:8000";

// Set defaults on first install
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    chrome.storage.local.set({
      apiUrl: DEFAULT_API_URL,
      searchHistory: [],
      detectedProduct: null
    });
    console.log("[ShopWise AI] Extension installed. Default API URL:", DEFAULT_API_URL);
  }
});

// Relay detected product from content script → popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PRODUCT_DETECTED") {
    // Store the detected product so popup can read it
    chrome.storage.local.set({ detectedProduct: message.product });
    sendResponse({ ok: true });
  }
  return true; // keep channel open for async response
});
