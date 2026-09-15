// ═══════════════════════════════════════════════════════════════
//  ShopWise AI — Background Service Worker (Manifest V3)
//  Responsibilities:
//    • Set default storage on first install (without overwriting)
//    • Relay PRODUCT_DETECTED messages from content → popup
//    • Provide HEALTH_CHECK relay for settings page
//    • Price alert infrastructure (local storage + badge)
// ═══════════════════════════════════════════════════════════════

"use strict";

const DEFAULTS = {
  apiUrl:        "http://localhost:8000",
  searchHistory: [],
  wishlist:      [],
  priceAlerts:   [],
  compareQueue:  [],
  detectedProduct: null
};

// ── Install: set defaults only for missing keys ─────────────────
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason !== "install" && reason !== "update") return;

  const existing = await chrome.storage.local.get(Object.keys(DEFAULTS));
  const toSet    = {};

  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (existing[key] === undefined) {
      toSet[key] = value;
    }
  }

  if (Object.keys(toSet).length > 0) {
    await chrome.storage.local.set(toSet);
  }

  console.log("[ShopWise AI] Background worker started.", reason);
});

// ── Message Router ───────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {

    // Content script → background → popup relay
    case "PRODUCT_DETECTED":
      chrome.storage.local.set({ detectedProduct: message.product })
        .then(() => sendResponse({ ok: true }))
        .catch(err => sendResponse({ ok: false, error: err.message }));
      return true; // keep channel open

    // Settings page health check
    case "HEALTH_CHECK":
      (async () => {
        try {
          const { apiUrl } = await chrome.storage.local.get("apiUrl");
          const url = (apiUrl || DEFAULTS.apiUrl).replace(/\/+$/, "");
          const res = await fetch(`${url}/health`, {
            method: "GET",
            signal: AbortSignal.timeout(5000)
          });
          const json = await res.json();
          sendResponse({ ok: res.ok, status: res.status, body: json });
        } catch (err) {
          sendResponse({ ok: false, error: err.message });
        }
      })();
      return true;

    // Clear detected product after popup reads it
    case "CLEAR_DETECTED":
      chrome.storage.local.set({ detectedProduct: null })
        .then(() => sendResponse({ ok: true }));
      return true;

    default:
      sendResponse({ ok: false, error: "Unknown message type" });
      return false;
  }
});

// ── Update badge with wishlist count ────────────────────────────
chrome.storage.onChanged.addListener((changes) => {
  if (changes.priceAlerts) {
    const alerts = changes.priceAlerts.newValue || [];
    const count  = alerts.length;
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" });
    chrome.action.setBadgeBackgroundColor({ color: "#7c3aed" });
  }
});
