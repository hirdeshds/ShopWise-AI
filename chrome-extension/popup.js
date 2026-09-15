// ══════════════════════════════════════════════════════
//  ShopWise AI — Popup Script
//  Handles: search, API call, results rendering,
//           history, settings, detected product banner
// ══════════════════════════════════════════════════════

"use strict";

// ── Constants ──────────────────────────────────────────
const DEFAULT_API_URL   = "http://localhost:8000";
const MAX_HISTORY_ITEMS = 10;

// ── DOM References ─────────────────────────────────────
const viewMain          = document.getElementById("view-main");
const viewSettings      = document.getElementById("view-settings");

// Header
const btnSettings       = document.getElementById("btn-settings");
const btnBack           = document.getElementById("btn-back");

// Search
const searchInput       = document.getElementById("search-input");
const btnSearch         = document.getElementById("btn-search");
const btnClearSearch    = document.getElementById("btn-clear-search");

// Detected banner
const detectedBanner    = document.getElementById("detected-banner");
const detectedText      = document.getElementById("detected-text");
const btnUseDetected    = document.getElementById("btn-use-detected");

// History
const historyWrap       = document.getElementById("history-wrap");
const historyList       = document.getElementById("history-list");
const btnClearHistory   = document.getElementById("btn-clear-history");

// States
const loadingState      = document.getElementById("loading-state");
const errorState        = document.getElementById("error-state");
const errorTitle        = document.getElementById("error-title");
const errorMsg          = document.getElementById("error-msg");
const btnRetry          = document.getElementById("btn-retry");
const resultsState      = document.getElementById("results-state");

// Recommendation
const recommendationCard= document.getElementById("recommendation-card");
const recPlatform       = document.getElementById("rec-platform");
const recTitle          = document.getElementById("rec-title");
const recPrice          = document.getElementById("rec-price");
const recConfidence     = document.getElementById("rec-confidence");
const recReason         = document.getElementById("rec-reason");
const btnBuyNow         = document.getElementById("btn-buy-now");
const btnCopyDeal       = document.getElementById("btn-copy-deal");
const noRecNotice       = document.getElementById("no-rec-notice");

// Offers table
const offersSection     = document.getElementById("offers-section");
const offersCount       = document.getElementById("offers-count");
const offersTbody       = document.getElementById("offers-tbody");
const searchedAt        = document.getElementById("searched-at");

// Settings
const apiUrlInput       = document.getElementById("api-url-input");
const btnSaveSettings   = document.getElementById("btn-save-settings");
const saveMsg           = document.getElementById("save-msg");

// ── State ───────────────────────────────────────────────
let currentQuery  = "";
let lastResponse  = null;

// ══════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════
async function init() {
  const data = await storageGet(["apiUrl", "searchHistory", "detectedProduct"]);

  // Load API URL into settings field
  apiUrlInput.value = data.apiUrl || DEFAULT_API_URL;

  // Render history
  renderHistory(data.searchHistory || []);

  // Show detected product banner if on a product page
  if (data.detectedProduct) {
    detectedText.textContent = `📦 Detected: ${data.detectedProduct}`;
    detectedBanner.classList.remove("hidden");
  }
}

// ══════════════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════════════
btnSettings.addEventListener("click", () => {
  viewMain.classList.remove("active");
  viewSettings.classList.add("active");
});

btnBack.addEventListener("click", () => {
  viewSettings.classList.remove("active");
  viewMain.classList.add("active");
});

// ══════════════════════════════════════════════════════
//  SETTINGS
// ══════════════════════════════════════════════════════
btnSaveSettings.addEventListener("click", async () => {
  const url = apiUrlInput.value.trim().replace(/\/+$/, "");
  if (!url) {
    apiUrlInput.value = DEFAULT_API_URL;
    return;
  }
  await chrome.storage.local.set({ apiUrl: url });
  saveMsg.classList.remove("hidden");
  setTimeout(() => saveMsg.classList.add("hidden"), 2000);
});

// ══════════════════════════════════════════════════════
//  DETECTED PRODUCT BANNER
// ══════════════════════════════════════════════════════
btnUseDetected.addEventListener("click", async () => {
  const data = await storageGet(["detectedProduct"]);
  if (data.detectedProduct) {
    searchInput.value = data.detectedProduct;
    detectedBanner.classList.add("hidden");
    searchInput.focus();
  }
});

// ══════════════════════════════════════════════════════
//  SEARCH BAR
// ══════════════════════════════════════════════════════
btnClearSearch.addEventListener("click", () => {
  searchInput.value = "";
  searchInput.focus();
});

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") triggerSearch();
});

btnSearch.addEventListener("click", triggerSearch);

btnRetry.addEventListener("click", () => {
  if (currentQuery) doSearch(currentQuery);
});

function triggerSearch() {
  const query = searchInput.value.trim();
  if (!query) {
    searchInput.focus();
    return;
  }
  doSearch(query);
}

// ══════════════════════════════════════════════════════
//  COPY DEAL
// ══════════════════════════════════════════════════════
btnCopyDeal.addEventListener("click", () => {
  if (!lastResponse?.recommendation) return;
  const r   = lastResponse.recommendation;
  const txt = `🏆 ShopWise AI Best Deal\n` +
              `Platform: ${r.platform}\n` +
              `Product:  ${r.title}\n` +
              `Price:    ${formatPrice(r.effective_price, r.currency)}\n` +
              `Confidence: ${Math.round(r.confidence * 100)}%\n` +
              `Reason: ${r.reason}\n` +
              `Link: ${r.evidence_url}`;
  navigator.clipboard.writeText(txt).then(() => {
    btnCopyDeal.textContent = "✅ Copied!";
    setTimeout(() => { btnCopyDeal.textContent = "📋 Copy Deal"; }, 2000);
  });
});

// ══════════════════════════════════════════════════════
//  HISTORY
// ══════════════════════════════════════════════════════
function renderHistory(history) {
  if (!history || history.length === 0) {
    historyWrap.classList.add("hidden");
    return;
  }
  historyWrap.classList.remove("hidden");
  historyList.innerHTML = "";
  history.slice(0, MAX_HISTORY_ITEMS).forEach((query) => {
    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `<span class="history-item-icon">🕐</span><span>${escapeHtml(query)}</span>`;
    item.addEventListener("click", () => {
      searchInput.value = query;
      doSearch(query);
    });
    historyList.appendChild(item);
  });
}

async function addToHistory(query) {
  const data    = await storageGet(["searchHistory"]);
  let history   = data.searchHistory || [];
  // Remove if already present, then prepend
  history = [query, ...history.filter(h => h !== query)].slice(0, MAX_HISTORY_ITEMS);
  await chrome.storage.local.set({ searchHistory: history });
  renderHistory(history);
}

btnClearHistory.addEventListener("click", async () => {
  await chrome.storage.local.set({ searchHistory: [] });
  renderHistory([]);
});

// ══════════════════════════════════════════════════════
//  CORE SEARCH → API CALL
// ══════════════════════════════════════════════════════
async function doSearch(query) {
  currentQuery = query;
  searchInput.value = query;

  // Switch to loading UI
  showState("loading");

  try {
    const data   = await storageGet(["apiUrl"]);
    const apiUrl = (data.apiUrl || DEFAULT_API_URL).replace(/\/+$/, "");
    const url    = `${apiUrl}/research`;

    const res = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ product: query }),
      // No timeout in fetch natively; backend may take ~30s
    });

    if (!res.ok) {
      let msg = `Server returned ${res.status}`;
      try { const json = await res.json(); msg = json.detail || msg; } catch (_) {}
      throw new Error(msg);
    }

    const json = await res.json();
    lastResponse = json;

    await addToHistory(query);
    renderResults(json);
    showState("results");

  } catch (err) {
    showError(err);
  }
}

// ══════════════════════════════════════════════════════
//  RENDER RESULTS
// ══════════════════════════════════════════════════════
function renderResults(data) {
  // ── Recommendation Card ──
  if (data.recommendation) {
    const r = data.recommendation;
    recPlatform.textContent   = r.platform;
    recTitle.textContent      = r.title;
    recPrice.textContent      = formatPrice(r.effective_price, r.currency);
    recConfidence.textContent = `${Math.round(r.confidence * 100)}% confidence`;
    recReason.textContent     = r.reason;
    btnBuyNow.href            = r.evidence_url;

    recommendationCard.classList.remove("hidden");
    noRecNotice.classList.add("hidden");
  } else {
    recommendationCard.classList.add("hidden");
    noRecNotice.classList.remove("hidden");
  }

  // ── Offers Table ──
  const validOffers = (data.offers || []).filter(o => o.price != null);

  if (validOffers.length > 0) {
    offersSection.classList.remove("hidden");
    offersCount.textContent = `${validOffers.length} offer${validOffers.length !== 1 ? "s" : ""}`;

    // Find cheapest effective price for highlighting
    const minEff = Math.min(...validOffers.map(o => (o.effective_price || o.price)));

    offersTbody.innerHTML = "";
    validOffers.forEach(offer => {
      const isMin = (offer.effective_price || offer.price) === minEff;
      const tr    = document.createElement("tr");
      const matchPct = Math.round((offer.match_score || 0) * 100);
      const availClass = (offer.availability || "unknown").toLowerCase().replace(/\s+/, "_");

      tr.innerHTML = `
        <td class="platform-cell">${escapeHtml(offer.platform)}</td>
        <td class="price-cell${isMin ? " best" : ""}">
          ${offer.price != null ? formatPrice(offer.price, offer.currency) : "—"}
        </td>
        <td style="color:var(--text-secondary)">
          ${offer.shipping != null ? formatPrice(offer.shipping, offer.currency) : "Free"}
        </td>
        <td class="eff-price-cell${isMin ? " best" : ""}" style="${isMin ? "color:var(--accent-green)" : ""}">
          ${offer.effective_price != null ? formatPrice(offer.effective_price, offer.currency) : "—"}
        </td>
        <td>
          <span class="avail-badge ${availClass}">
            ${formatAvailability(offer.availability)}
          </span>
        </td>
        <td>
          <div class="match-bar-wrap">
            <div class="match-bar-bg">
              <div class="match-bar-fill" style="width:${matchPct}%"></div>
            </div>
            <span class="match-val">${matchPct}%</span>
          </div>
        </td>
        <td>
          ${offer.evidence_url
            ? `<a class="link-icon-btn" href="${escapeHtml(offer.evidence_url)}" target="_blank" rel="noopener noreferrer" title="View listing">↗</a>`
            : ""}
        </td>`;
      offersTbody.appendChild(tr);
    });
  } else {
    offersSection.classList.add("hidden");
  }

  // ── Meta ──
  if (data.searched_at) {
    const d = new Date(data.searched_at);
    searchedAt.textContent = `Searched at ${d.toLocaleTimeString()} on ${d.toLocaleDateString()}`;
  }
}

// ══════════════════════════════════════════════════════
//  UI STATE MACHINE
// ══════════════════════════════════════════════════════
function showState(state) {
  loadingState.classList.add("hidden");
  errorState.classList.add("hidden");
  resultsState.classList.add("hidden");

  if (state === "loading") loadingState.classList.remove("hidden");
  if (state === "error")   errorState.classList.remove("hidden");
  if (state === "results") resultsState.classList.remove("hidden");
}

function showError(err) {
  let title = "Connection Error";
  let msg   = err.message || "Unknown error";

  if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("Load failed")) {
    title = "Cannot reach the API";
    msg   = "Make sure your ShopWise AI backend is running.\n\n" +
            `Trying: ${apiUrlInput.value || DEFAULT_API_URL}\n\n` +
            "Start it with: uvicorn app.api:app --reload";
  } else if (msg.includes("429")) {
    title = "Rate Limited";
    msg   = "Cohere API rate limit hit. Please wait 60 seconds and retry.";
  }

  errorTitle.textContent = title;
  errorMsg.textContent   = msg;
  errorMsg.style.whiteSpace = "pre-wrap";
  showState("error");
}

// ══════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════
function formatPrice(amount, currency = "INR") {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat("en-IN", {
      style:    "currency",
      currency: currency || "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  } catch (_) {
    return `${currency} ${amount.toLocaleString("en-IN")}`;
  }
}

function formatAvailability(av) {
  if (!av) return "Unknown";
  const map = { in_stock: "In Stock", out_of_stock: "Out of Stock", unknown: "Unknown" };
  return map[av.toLowerCase()] || av;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#39;");
}

function storageGet(keys) {
  return new Promise(resolve => chrome.storage.local.get(keys, resolve));
}

// ── Kick off ──
init();
