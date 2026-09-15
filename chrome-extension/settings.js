// ═══════════════════════════════════════════════════════════════
//  ShopWise AI — Settings Page Script
// ═══════════════════════════════════════════════════════════════

"use strict";

// ── DOM ─────────────────────────────────────────────────────────
const apiUrlInput      = document.getElementById("api-url");
const btnTest          = document.getElementById("btn-test");
const btnSave          = document.getElementById("btn-save");
const connDot          = document.getElementById("conn-dot");
const connText         = document.getElementById("conn-text");
const connDetail       = document.getElementById("conn-detail");
const saveFeedback     = document.getElementById("save-feedback");
const wishlistCount    = document.getElementById("wishlist-count");
const alertsCount      = document.getElementById("alerts-count");
const btnClearHistory  = document.getElementById("btn-clear-history");
const btnClearWishlist = document.getElementById("btn-clear-wishlist");
const btnClearAlerts   = document.getElementById("btn-clear-alerts");
const btnResetAll      = document.getElementById("btn-reset-all");

// ── Init ─────────────────────────────────────────────────────────
async function init() {
  const data = await chrome.storage.local.get([
    "apiUrl", "wishlist", "priceAlerts"
  ]);

  apiUrlInput.value = data.apiUrl || "http://localhost:8000";

  const wl = data.wishlist || [];
  const al = data.priceAlerts || [];
  wishlistCount.textContent = `${wl.length} saved product${wl.length !== 1 ? "s" : ""}`;
  alertsCount.textContent   = `${al.length} active alert${al.length !== 1 ? "s" : ""}`;
}

// ── Connection Test ───────────────────────────────────────────────
async function testConnection() {
  setConnStatus("testing", "Testing…", "");
  btnTest.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({ type: "HEALTH_CHECK" });

    if (response.ok) {
      setConnStatus("connected",
        "Connected",
        `${response.body?.status || "ok"} · ${apiUrlInput.value.trim()}`
      );
    } else {
      setConnStatus("disconnected",
        "Unable to connect",
        response.error || `HTTP ${response.status}`
      );
    }
  } catch (err) {
    setConnStatus("disconnected", "Unable to connect", err.message);
  } finally {
    btnTest.disabled = false;
  }
}

function setConnStatus(state, text, detail) {
  connDot.className  = `conn-dot ${state}`;
  connText.textContent  = text;
  connDetail.textContent = detail;
}

// ── Save ─────────────────────────────────────────────────────────
async function saveSettings() {
  const url = apiUrlInput.value.trim().replace(/\/+$/, "");
  if (!url) {
    showFeedback("Please enter a valid API URL.", "error");
    return;
  }

  try {
    await chrome.storage.local.set({ apiUrl: url });
    showFeedback("Settings saved successfully.", "success");
    // Re-test after save
    await testConnection();
  } catch (err) {
    showFeedback(`Failed to save: ${err.message}`, "error");
  }
}

function showFeedback(msg, type) {
  saveFeedback.textContent  = msg;
  saveFeedback.className    = `save-feedback ${type}`;
  saveFeedback.classList.remove("hidden");
  setTimeout(() => saveFeedback.classList.add("hidden"), 3000);
}

// ── Data Management ───────────────────────────────────────────────
btnClearHistory.addEventListener("click", async () => {
  if (!confirm("Clear all search history?")) return;
  await chrome.storage.local.set({ searchHistory: [] });
  showFeedback("Search history cleared.", "success");
});

btnClearWishlist.addEventListener("click", async () => {
  if (!confirm("Clear all wishlist items?")) return;
  await chrome.storage.local.set({ wishlist: [] });
  wishlistCount.textContent = "0 saved products";
  showFeedback("Wishlist cleared.", "success");
});

btnClearAlerts.addEventListener("click", async () => {
  if (!confirm("Clear all price alerts?")) return;
  await chrome.storage.local.set({ priceAlerts: [] });
  alertsCount.textContent = "0 active alerts";
  showFeedback("Price alerts cleared.", "success");
});

btnResetAll.addEventListener("click", async () => {
  if (!confirm("This will reset ALL extension data to defaults. Are you sure?")) return;
  await chrome.storage.local.clear();
  await chrome.storage.local.set({
    apiUrl:          "http://localhost:8000",
    searchHistory:   [],
    wishlist:        [],
    priceAlerts:     [],
    compareQueue:    [],
    detectedProduct: null
  });
  apiUrlInput.value = "http://localhost:8000";
  wishlistCount.textContent = "0 saved products";
  alertsCount.textContent   = "0 active alerts";
  setConnStatus("", "Not tested", "");
  showFeedback("All data reset to defaults.", "success");
});

// ── Events ───────────────────────────────────────────────────────
btnTest.addEventListener("click", testConnection);
btnSave.addEventListener("click", saveSettings);

apiUrlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveSettings();
});

// ── Boot ─────────────────────────────────────────────────────────
init();
