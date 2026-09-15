// ═══════════════════════════════════════════════════════════════
//  ShopWise AI — Popup Script
//  Handles all UI views, API calls, storage, and state machine.
//
//  Backend API (actual schema from app/schemas.py):
//    POST /research  { product: string }
//    → { product_request, searched_at, offers[], recommendation }
//
//  ProductOffer fields:
//    platform, title, price, currency, shipping, effective_price,
//    availability, match_score, evidence_score, evidence_url, evidence
//
//  Recommendation fields:
//    platform, title, effective_price, currency, reason,
//    confidence (= final_score 0–1), evidence_url
// ═══════════════════════════════════════════════════════════════

"use strict";

// ══════════════════════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════════════════════

const DEFAULT_API_URL    = "https://shopwise-ai-ls25.onrender.com";
const MAX_HISTORY        = 10;
const MAX_COMPARE        = 5;

/** Loading messages cycled during the ~30s wait */
const LOADING_MSGS = [
  "Researching products…",
  "Searching retailers…",
  "Matching product variants…",
  "Comparing prices…",
  "Analysing offers…",
  "Finding the best deal…"
];

// ══════════════════════════════════════════════════════════════
//  DOM REFERENCES
// ══════════════════════════════════════════════════════════════

const $ = id => document.getElementById(id);

// Header
const btnWishlistTab  = $("btn-wishlist-tab");
const btnAlertsTab    = $("btn-alerts-tab");
const btnCompareTab   = $("btn-compare-tab");
const btnSettingsOpen = $("btn-settings-open");
const wishlistBadge   = $("wishlist-badge");
const alertsBadge     = $("alerts-badge");
const compareBadge    = $("compare-badge");

// Views
const viewMain     = $("view-main");
const viewWishlist = $("view-wishlist");
const viewAlerts   = $("view-alerts");
const viewCompare  = $("view-compare");
const ALL_VIEWS    = [viewMain, viewWishlist, viewAlerts, viewCompare];

// Search
const detectedBanner    = $("detected-banner");
const detectedName      = $("detected-name");
const btnUseDetected    = $("btn-use-detected");
const btnDismissDetected= $("btn-dismiss-detected");
const searchInput       = $("search-input");
const btnSearch         = $("btn-search");
const btnAddCompare     = $("btn-add-compare");
const hintChips         = $("hint-chips");
const historySection    = $("history-section");
const historyList       = $("history-list");
const btnClearHistory   = $("btn-clear-history");

// States
const stateLoading   = $("state-loading");
const stateError     = $("state-error");
const stateNoResults = $("state-no-results");
const stateResults   = $("state-results");
const loadingMsg     = $("loading-msg");
const errorTitle     = $("error-title");
const errorBody      = $("error-body");
const btnRetry       = $("btn-retry");

// Results
const resultsQuery     = $("results-query");
const resultsTimestamp = $("results-timestamp");

// Best Deal Card
const dealScore      = $("deal-score");
const dealConfidence = $("deal-confidence");
const dealPlatform   = $("deal-platform");
const dealTitle      = $("deal-title");
const dealEffPrice   = $("deal-eff-price");
const dealMatch      = $("deal-match");
const dealMatchWrap  = $("deal-match-wrap");
const buyVerdict     = $("buy-verdict");
const dealWhyList    = $("deal-why-list");
const dealReason     = $("deal-reason");
const btnBuyNow      = $("btn-buy-now");
const btnSaveWishlist= $("btn-save-wishlist");
const btnSetAlert    = $("btn-set-alert");
const btnCopyDeal    = $("btn-copy-deal");

// Alert Modal
const alertModal        = $("alert-modal");
const alertCurrentPrice = $("alert-current-price");
const alertTargetInput  = $("alert-target-input");
const btnAlertConfirm   = $("btn-alert-confirm");
const btnAlertCancel    = $("btn-alert-cancel");

// Offers
const offersCount  = $("offers-count");
const offersTbody  = $("offers-tbody");
const evidenceWrap = $("evidence-wrap");
const evidenceText = $("evidence-text");

// Wishlist view
const wishlistEmpty = $("wishlist-empty");
const wishlistItems = $("wishlist-list");

// Alerts view
const alertsEmpty = $("alerts-empty");
const alertsItems = $("alerts-list");

// Compare view
const compareEmpty   = $("compare-empty");
const compareList    = $("compare-list");
const btnRunCompare  = $("btn-run-compare");
const btnClearCompare= $("btn-clear-compare");
const compareResults = $("compare-results");

// ══════════════════════════════════════════════════════════════
//  APP STATE
// ══════════════════════════════════════════════════════════════

let currentQuery    = "";
let lastResponse    = null;   // most recent ResearchResponse
let loadingInterval = null;   // cycling message interval
let loadingMsgIdx   = 0;

// ══════════════════════════════════════════════════════════════
//  STORAGE HELPERS
// ══════════════════════════════════════════════════════════════

function storageGet(keys) {
  return chrome.storage.local.get(keys);
}

function storageSet(obj) {
  return chrome.storage.local.set(obj);
}

// ══════════════════════════════════════════════════════════════
//  DATA NORMALISATION
//  Maps raw backend response into extension-friendly structure.
//  Provides safe defaults for all optional fields.
// ══════════════════════════════════════════════════════════════

function normalizeResponse(raw) {
  const offers = (raw.offers || []).map(o => ({
    platform:       String(o.platform    || "Unknown"),
    title:          String(o.title       || ""),
    price:          typeof o.price       === "number" ? o.price       : null,
    currency:       String(o.currency    || "INR"),
    shipping:       typeof o.shipping    === "number" ? o.shipping    : null,
    effective_price:typeof o.effective_price === "number" ? o.effective_price : null,
    availability:   String(o.availability || "unknown").toLowerCase(),
    match_score:    typeof o.match_score    === "number" ? o.match_score    : 0,
    evidence_score: typeof o.evidence_score === "number" ? o.evidence_score : 0,
    evidence_url:   String(o.evidence_url || ""),
    evidence:       String(o.evidence    || "")
  }));

  const rec = raw.recommendation ? {
    platform:       String(raw.recommendation.platform       || ""),
    title:          String(raw.recommendation.title          || ""),
    effective_price:typeof raw.recommendation.effective_price === "number"
                      ? raw.recommendation.effective_price : 0,
    currency:       String(raw.recommendation.currency       || "INR"),
    reason:         String(raw.recommendation.reason         || ""),
    confidence:     typeof raw.recommendation.confidence     === "number"
                      ? raw.recommendation.confidence : 0,
    evidence_url:   String(raw.recommendation.evidence_url   || "")
  } : null;

  return {
    product_request: String(raw.product_request || ""),
    searched_at:     String(raw.searched_at      || ""),
    offers,
    recommendation: rec
  };
}

// ══════════════════════════════════════════════════════════════
//  FORMATTING HELPERS
// ══════════════════════════════════════════════════════════════

function formatPrice(amount, currency = "INR") {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency", currency: currency || "INR",
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(amount);
  } catch {
    return `${currency} ${Number(amount).toLocaleString("en-IN")}`;
  }
}

function pct(score) {
  return `${Math.round((score || 0) * 100)}%`;
}

function score100(score) {
  return Math.round((score || 0) * 100);
}

function formatTimestamp(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

function escHtml(str) {
  return String(str || "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

function availLabel(av) {
  const map = { in_stock: "In Stock", out_of_stock: "Out of Stock", unknown: "Unknown" };
  return map[av] || "Unknown";
}

// ══════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════

async function init() {
  const data = await storageGet([
    "apiUrl", "searchHistory", "wishlist", "priceAlerts",
    "compareQueue", "detectedProduct"
  ]);

  // Render search history
  renderHistory(data.searchHistory || []);

  // Update badges
  updateBadges(data.wishlist || [], data.priceAlerts || [], data.compareQueue || []);

  // Show detected product banner
  if (data.detectedProduct) {
    const p = data.detectedProduct;
    detectedName.textContent = p.title || "Detected product";
    detectedBanner.classList.remove("hidden");
  }

  // Hint chips
  document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      searchInput.value = chip.dataset.query;
      triggerSearch();
    });
  });

  // Back buttons
  document.querySelectorAll(".btn-back").forEach(btn => {
    btn.addEventListener("click", () => showView("view-main"));
  });
}

// ══════════════════════════════════════════════════════════════
//  VIEW ROUTER
// ══════════════════════════════════════════════════════════════

function showView(viewId) {
  ALL_VIEWS.forEach(v => {
    if (v.id === viewId) {
      v.classList.remove("hidden");
      v.classList.add("active");
    } else {
      v.classList.add("hidden");
      v.classList.remove("active");
    }
  });

  // Refresh secondary views when navigating to them
  if (viewId === "view-wishlist")  renderWishlistView();
  if (viewId === "view-alerts")    renderAlertsView();
  if (viewId === "view-compare")   renderCompareView();
}

// ══════════════════════════════════════════════════════════════
//  BADGES
// ══════════════════════════════════════════════════════════════

function updateBadges(wl, al, cq) {
  setBadge(wishlistBadge, wl.length);
  setBadge(alertsBadge,   al.length);
  setBadge(compareBadge,  cq.length);
}

function setBadge(el, count) {
  if (count > 0) {
    el.textContent = count > 9 ? "9+" : String(count);
    el.classList.remove("hidden");
  } else {
    el.classList.add("hidden");
  }
}

// ══════════════════════════════════════════════════════════════
//  SEARCH HISTORY
// ══════════════════════════════════════════════════════════════

function renderHistory(history) {
  if (!history || history.length === 0) {
    historySection.classList.add("hidden");
    return;
  }
  historySection.classList.remove("hidden");
  historyList.innerHTML = "";
  history.forEach(item => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.setAttribute("role", "listitem");
    div.setAttribute("tabindex", "0");

    const timeStr = item.time ? formatDate(item.time) : "";
    div.innerHTML =
      `<span class="history-item-icon" aria-hidden="true">🕐</span>` +
      `<span class="history-item-text">${escHtml(item.query || item)}</span>` +
      (timeStr ? `<span class="history-item-time">${escHtml(timeStr)}</span>` : "");

    const query = item.query || item;
    div.addEventListener("click", () => {
      searchInput.value = query;
      triggerSearch();
    });
    div.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        searchInput.value = query;
        triggerSearch();
      }
    });
    historyList.appendChild(div);
  });
}

async function addToHistory(query) {
  const data    = await storageGet(["searchHistory"]);
  let history   = data.searchHistory || [];
  // Deduplicate — remove existing, then prepend
  history = [
    { query, time: new Date().toISOString() },
    ...history.filter(h => (h.query || h) !== query)
  ].slice(0, MAX_HISTORY);
  await storageSet({ searchHistory: history });
  renderHistory(history);
}

// ══════════════════════════════════════════════════════════════
//  DETECTED PRODUCT BANNER
// ══════════════════════════════════════════════════════════════

btnUseDetected.addEventListener("click", async () => {
  const data = await storageGet(["detectedProduct"]);
  if (data.detectedProduct) {
    searchInput.value = data.detectedProduct.title || "";
    detectedBanner.classList.add("hidden");
    chrome.runtime.sendMessage({ type: "CLEAR_DETECTED" });
  }
});

btnDismissDetected.addEventListener("click", () => {
  detectedBanner.classList.add("hidden");
  chrome.runtime.sendMessage({ type: "CLEAR_DETECTED" });
});

// ══════════════════════════════════════════════════════════════
//  SEARCH TRIGGER
// ══════════════════════════════════════════════════════════════

searchInput.addEventListener("keydown", e => {
  if (e.key === "Enter") triggerSearch();
});

btnSearch.addEventListener("click", triggerSearch);

btnRetry.addEventListener("click", () => {
  if (currentQuery) doSearch(currentQuery);
});

btnClearHistory.addEventListener("click", async () => {
  await storageSet({ searchHistory: [] });
  renderHistory([]);
});

function triggerSearch() {
  const q = searchInput.value.trim();
  if (!q) { searchInput.focus(); return; }
  doSearch(q);
}

// ══════════════════════════════════════════════════════════════
//  API SERVICE
// ══════════════════════════════════════════════════════════════

async function getApiUrl() {
  const data = await storageGet(["apiUrl"]);
  return (data.apiUrl || DEFAULT_API_URL).replace(/\/+$/, "");
}

async function researchProduct(query) {
  const apiUrl = await getApiUrl();

  const response = await fetch(`${apiUrl}/research`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ product: query })
    // No manual timeout — backend may take ~30s; AbortController would prematurely kill it
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try { const j = await response.json(); detail = j.detail || detail; } catch {}
    throw new Error(detail);
  }

  return await response.json();
}

// ══════════════════════════════════════════════════════════════
//  MAIN SEARCH FLOW
// ══════════════════════════════════════════════════════════════

async function doSearch(query) {
  currentQuery = query;
  searchInput.value = query;

  // Collapse hint chips to save space
  hintChips.classList.add("hidden");
  showState("loading");
  startLoadingMessages();

  try {
    const raw  = await researchProduct(query);
    const data = normalizeResponse(raw);

    stopLoadingMessages();
    lastResponse = data;

    await addToHistory(query);
    renderResults(data);
    showState("results");

  } catch (err) {
    stopLoadingMessages();
    showSearchError(err);
  }
}

// ══════════════════════════════════════════════════════════════
//  LOADING MESSAGE CYCLING
// ══════════════════════════════════════════════════════════════

function startLoadingMessages() {
  loadingMsgIdx = 0;
  loadingMsg.textContent = LOADING_MSGS[0];
  loadingInterval = setInterval(() => {
    loadingMsgIdx = (loadingMsgIdx + 1) % LOADING_MSGS.length;
    loadingMsg.style.opacity = "0";
    setTimeout(() => {
      loadingMsg.textContent  = LOADING_MSGS[loadingMsgIdx];
      loadingMsg.style.opacity = "1";
    }, 180);
  }, 5000);
}

function stopLoadingMessages() {
  if (loadingInterval) {
    clearInterval(loadingInterval);
    loadingInterval = null;
  }
}

// ══════════════════════════════════════════════════════════════
//  STATE MACHINE
// ══════════════════════════════════════════════════════════════

function showState(state) {
  [stateLoading, stateError, stateNoResults, stateResults].forEach(el => {
    el.classList.add("hidden");
  });

  if (state === "loading")    stateLoading.classList.remove("hidden");
  if (state === "error")      stateError.classList.remove("hidden");
  if (state === "no-results") stateNoResults.classList.remove("hidden");
  if (state === "results")    stateResults.classList.remove("hidden");
}

function showSearchError(err) {
  let title = "Connection Error";
  let body  = err.message || "An unexpected error occurred.";

  if (/fetch|network|load failed|failed to fetch/i.test(body)) {
    title = "Cannot reach ShopWise AI";
    body  = `Unable to connect to the backend.\n\nCheck:\n• Backend is running\n• API URL is correct\n  (currently: ${DEFAULT_API_URL})\n• Network connection is available\n\nStart the backend:\n  uvicorn app.api:app --reload`;
  } else if (/429/i.test(body)) {
    title = "Rate Limited";
    body  = "The AI extraction service hit its rate limit.\nPlease wait 60 seconds and try again.";
  } else if (/timeout|aborted/i.test(body)) {
    title = "Request Timed Out";
    body  = "The research request is taking longer than expected.\nPlease try again.";
  } else if (/500|502|503/i.test(body)) {
    title = "Backend Error";
    body  = `The backend returned an error (${err.message}).\nCheck the server logs.`;
  }

  errorTitle.textContent = title;
  errorBody.textContent  = body;
  showState("error");
}

// ══════════════════════════════════════════════════════════════
//  RENDER RESULTS
// ══════════════════════════════════════════════════════════════

function renderResults(data) {
  // ── Product header
  resultsQuery.textContent     = data.product_request;
  resultsTimestamp.textContent = formatTimestamp(data.searched_at);

  // ── Recommendation / Best Deal ──────────────────────────────
  if (data.recommendation) {
    const rec       = data.recommendation;
    const scoreVal  = score100(rec.confidence);

    // Find the offer matching the recommendation to get match_score
    const matchedOffer = data.offers.find(
      o => o.evidence_url && o.evidence_url === rec.evidence_url
    );
    const matchVal = matchedOffer ? score100(matchedOffer.match_score) : null;

    // Scores
    dealScore.textContent      = `Score ${scoreVal}/100`;
    dealConfidence.textContent = `Confidence ${pct(rec.confidence)}`;

    // Platform + title
    dealPlatform.textContent = rec.platform;
    dealTitle.textContent    = rec.title;

    // Effective price
    dealEffPrice.textContent = formatPrice(rec.effective_price, rec.currency);

    // Match score
    if (matchVal !== null) {
      dealMatch.textContent = pct(matchedOffer.match_score);
      dealMatchWrap.classList.remove("hidden");
    } else {
      dealMatchWrap.classList.add("hidden");
    }

    // ── "Should I Buy This?" Verdict ──────────────────────────
    renderVerdict(scoreVal);

    // ── Explanation bullets ───────────────────────────────────
    renderWhyBullets(rec, matchedOffer, data.offers);

    // Reason text from backend
    dealReason.textContent = rec.reason;

    // Buy Now
    if (rec.evidence_url) {
      btnBuyNow.href = rec.evidence_url;
      btnBuyNow.removeAttribute("aria-disabled");
    } else {
      btnBuyNow.href = "#";
      btnBuyNow.setAttribute("aria-disabled", "true");
    }

    // Evidence
    if (matchedOffer && matchedOffer.evidence) {
      evidenceText.textContent = matchedOffer.evidence;
      evidenceWrap.classList.remove("hidden");
    } else {
      evidenceWrap.classList.add("hidden");
    }

  } else {
    // No recommendation — show no-results
    showState("no-results");
    return;
  }

  // ── Offers Table ─────────────────────────────────────────────
  const validOffers = data.offers.filter(o => o.price != null && o.evidence_url);

  if (validOffers.length > 0) {
    offersCount.textContent = `${validOffers.length} offer${validOffers.length !== 1 ? "s" : ""}`;

    // Find min effective price for highlighting
    const minEff = Math.min(
      ...validOffers.map(o => o.effective_price ?? o.price ?? Infinity)
    );

    // Max deal score for highlighting
    const maxScore = Math.max(...validOffers.map(o => score100(o.evidence_score)));

    offersTbody.innerHTML = "";
    validOffers.forEach(offer => {
      const isBest   = (offer.effective_price ?? offer.price) === minEff;
      const effPrice = offer.effective_price ?? offer.price;
      const scoreVal = score100(offer.evidence_score);
      const matchVal = Math.round((offer.match_score || 0) * 100);
      const avCls    = offer.availability.replace(/\s+/g, "_");

      const tr = document.createElement("tr");
      if (isBest) tr.classList.add("is-best");

      tr.innerHTML =
        `<td class="td-platform">${escHtml(offer.platform)}</td>` +
        `<td class="td-price">${formatPrice(offer.price, offer.currency)}</td>` +
        `<td class="td-shipping">${offer.shipping != null ? formatPrice(offer.shipping, offer.currency) : "Free"}</td>` +
        `<td class="td-eff${isBest ? " best" : ""}">${effPrice != null ? formatPrice(effPrice, offer.currency) : "—"}</td>` +
        `<td><span class="avail-pill ${avCls}">${escHtml(availLabel(offer.availability))}</span></td>` +
        `<td><div class="match-cell">` +
          `<div class="match-track"><div class="match-fill" style="width:${matchVal}%"></div></div>` +
          `<span class="match-val">${matchVal}%</span>` +
        `</div></td>` +
        `<td class="score-cell${scoreVal === maxScore ? " top" : ""}">${scoreVal}</td>` +
        `<td class="link-cell">${offer.evidence_url
          ? `<a href="${escHtml(offer.evidence_url)}" target="_blank" rel="noopener noreferrer" aria-label="View listing on ${escHtml(offer.platform)}">↗</a>`
          : ""
        }</td>`;

      offersTbody.appendChild(tr);
    });
  } else {
    offersCount.textContent = "0 offers";
    offersTbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text-3);padding:14px">No priced offers found.</td></tr>`;
  }
}

// ── "Should I Buy This?" Verdict ─────────────────────────────

function renderVerdict(scoreVal) {
  let cls, icon, text;

  if (scoreVal >= 85) {
    cls  = "verdict-buy";
    icon = "✓";
    text = `BUY NOW — Strong deal (score ${scoreVal}/100). This is among the best available offers.`;
  } else if (scoreVal >= 70) {
    cls  = "verdict-consider";
    icon = "~";
    text = `CONSIDER — Decent deal (score ${scoreVal}/100). Worth buying if you need it now.`;
  } else {
    cls  = "verdict-wait";
    icon = "↻";
    text = `WAIT — Weaker deal (score ${scoreVal}/100). Consider searching more specifically or waiting.`;
  }

  buyVerdict.className  = `buy-verdict ${cls}`;
  buyVerdict.innerHTML  = `<span aria-hidden="true">${icon}</span> ${escHtml(text)}`;
}

// ── Explanation Bullets ───────────────────────────────────────

function renderWhyBullets(rec, matchedOffer, allOffers) {
  const bullets = [];

  // Price comparison
  const allEffPrices = allOffers
    .filter(o => o.effective_price != null && o.evidence_url)
    .map(o => o.effective_price);

  if (allEffPrices.length > 1) {
    const minP = Math.min(...allEffPrices);
    const maxP = Math.max(...allEffPrices);
    if (rec.effective_price === minP) {
      bullets.push({ icon: "✓", text: "Lowest effective price across all platforms" });
    } else {
      const diff = rec.effective_price - minP;
      bullets.push({ icon: "~", text: `${formatPrice(diff, rec.currency)} above the cheapest offer` });
    }
  }

  // Shipping
  if (matchedOffer) {
    if (matchedOffer.shipping === 0 || matchedOffer.shipping === null) {
      bullets.push({ icon: "✓", text: "Free shipping" });
    } else if (matchedOffer.shipping > 0) {
      bullets.push({ icon: "·", text: `${formatPrice(matchedOffer.shipping, matchedOffer.currency)} shipping included in effective price` });
    }

    // Match quality
    const matchPct = Math.round(matchedOffer.match_score * 100);
    if (matchPct >= 90) {
      bullets.push({ icon: "✓", text: `Exact product match (${matchPct}%)` });
    } else if (matchPct >= 70) {
      bullets.push({ icon: "~", text: `Good product match (${matchPct}%) — verify variant before buying` });
    } else {
      bullets.push({ icon: "⚠", text: `Lower match score (${matchPct}%) — may be a different variant` });
    }

    // Availability
    if (matchedOffer.availability === "in_stock") {
      bullets.push({ icon: "✓", text: "In stock" });
    } else if (matchedOffer.availability === "out_of_stock") {
      bullets.push({ icon: "⚠", text: "Currently out of stock — verify before purchasing" });
    }

    // Evidence quality
    const evPct = Math.round(matchedOffer.evidence_score * 100);
    if (evPct >= 80) {
      bullets.push({ icon: "✓", text: `High data quality (${evPct}%) — price information is reliable` });
    }
  }

  // Confidence
  const confPct = Math.round(rec.confidence * 100);
  bullets.push({ icon: "·", text: `AI confidence: ${confPct}%` });

  dealWhyList.innerHTML = bullets.map(b =>
    `<li class="why-item"><span class="why-icon" aria-hidden="true">${escHtml(b.icon)}</span><span>${escHtml(b.text)}</span></li>`
  ).join("");
}

// ══════════════════════════════════════════════════════════════
//  COPY DEAL
// ══════════════════════════════════════════════════════════════

btnCopyDeal.addEventListener("click", async () => {
  if (!lastResponse?.recommendation) return;
  const r = lastResponse.recommendation;

  const matchedOffer = lastResponse.offers.find(o => o.evidence_url === r.evidence_url);
  const matchStr     = matchedOffer ? pct(matchedOffer.match_score) : "N/A";
  const scoreStr     = `${score100(r.confidence)}/100`;

  const text =
    `ShopWise AI — Best Deal\n` +
    `─────────────────────────\n` +
    `Product:        ${r.title}\n` +
    `Platform:       ${r.platform}\n` +
    `Effective Price:${formatPrice(r.effective_price, r.currency)}\n` +
    `Deal Score:     ${scoreStr}\n` +
    `Match Score:    ${matchStr}\n` +
    `\n` +
    `Why this deal:\n${r.reason}\n` +
    `\n` +
    `Buy: ${r.evidence_url}`;

  try {
    await navigator.clipboard.writeText(text);
    btnCopyDeal.title = "Copied!";
    btnCopyDeal.classList.add("active");
    setTimeout(() => {
      btnCopyDeal.title = "Copy Deal";
      btnCopyDeal.classList.remove("active");
    }, 2000);
  } catch {
    // Fallback: if clipboard API fails silently
    console.warn("[ShopWise AI] Clipboard write failed.");
  }
});

// ══════════════════════════════════════════════════════════════
//  SHARE DEAL
// ══════════════════════════════════════════════════════════════
//  We re-use the copy button — Web Share API isn't reliably
//  available in extension popups; copy is the better UX.

// ══════════════════════════════════════════════════════════════
//  WISHLIST
// ══════════════════════════════════════════════════════════════

btnSaveWishlist.addEventListener("click", async () => {
  if (!lastResponse?.recommendation) return;
  const r    = lastResponse.recommendation;
  const data = await storageGet(["wishlist"]);
  let wl     = data.wishlist || [];

  // Deduplicate by evidence_url
  if (wl.some(w => w.url === r.evidence_url)) {
    btnSaveWishlist.classList.add("active");
    return;
  }

  wl.push({
    title:    r.title,
    platform: r.platform,
    price:    r.effective_price,
    currency: r.currency,
    url:      r.evidence_url,
    savedAt:  new Date().toISOString()
  });

  await storageSet({ wishlist: wl });
  btnSaveWishlist.classList.add("active");
  setBadge(wishlistBadge, wl.length);
});

async function renderWishlistView() {
  const data = await storageGet(["wishlist"]);
  const wl   = data.wishlist || [];

  if (wl.length === 0) {
    wishlistEmpty.classList.remove("hidden");
    wishlistItems.innerHTML = "";
    return;
  }
  wishlistEmpty.classList.add("hidden");
  wishlistItems.innerHTML = "";

  wl.forEach((item, idx) => {
    const card = document.createElement("div");
    card.className = "item-card";
    card.setAttribute("role", "listitem");
    card.innerHTML =
      `<div class="item-card-header">` +
        `<div>` +
          `<div class="item-card-platform">${escHtml(item.platform)}</div>` +
          `<div class="item-card-title">${escHtml(item.title)}</div>` +
        `</div>` +
        `<div class="item-card-price">${formatPrice(item.price, item.currency)}</div>` +
      `</div>` +
      `<div class="item-card-meta">Saved ${formatDate(item.savedAt)}</div>` +
      `<div class="item-card-actions">` +
        `${item.url ? `<a href="${escHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="btn-item-action" aria-label="View on ${escHtml(item.platform)}">View Listing ↗</a>` : ""}` +
        `<button class="btn-item-action btn-remove-wl" data-idx="${idx}" aria-label="Remove from wishlist">Remove</button>` +
      `</div>`;
    wishlistItems.appendChild(card);
  });

  // Remove buttons
  wishlistItems.querySelectorAll(".btn-remove-wl").forEach(btn => {
    btn.addEventListener("click", async () => {
      const i   = parseInt(btn.dataset.idx, 10);
      const d   = await storageGet(["wishlist"]);
      const arr = (d.wishlist || []).filter((_, j) => j !== i);
      await storageSet({ wishlist: arr });
      setBadge(wishlistBadge, arr.length);
      renderWishlistView();
    });
  });
}

// ══════════════════════════════════════════════════════════════
//  PRICE ALERTS
// ══════════════════════════════════════════════════════════════

btnSetAlert.addEventListener("click", () => {
  if (!lastResponse?.recommendation) return;
  const r = lastResponse.recommendation;
  alertCurrentPrice.textContent = formatPrice(r.effective_price, r.currency);
  alertTargetInput.value        = "";
  alertModal.classList.remove("hidden");
  alertTargetInput.focus();
});

btnAlertCancel.addEventListener("click",  () => alertModal.classList.add("hidden"));
alertModal.addEventListener("click", e => {
  if (e.target === alertModal) alertModal.classList.add("hidden");
});

btnAlertConfirm.addEventListener("click", async () => {
  const target = parseFloat(alertTargetInput.value);
  if (isNaN(target) || target <= 0) {
    alertTargetInput.focus();
    return;
  }

  const r    = lastResponse.recommendation;
  const data = await storageGet(["priceAlerts"]);
  const arr  = data.priceAlerts || [];

  // Deduplicate by URL
  if (!arr.some(a => a.url === r.evidence_url)) {
    arr.push({
      title:        r.title,
      platform:     r.platform,
      currentPrice: r.effective_price,
      targetPrice:  target,
      currency:     r.currency,
      url:          r.evidence_url,
      createdAt:    new Date().toISOString()
    });
    await storageSet({ priceAlerts: arr });
  }

  setBadge(alertsBadge, arr.length);
  alertModal.classList.add("hidden");
  btnSetAlert.classList.add("active");
});

async function renderAlertsView() {
  const data = await storageGet(["priceAlerts"]);
  const arr  = data.priceAlerts || [];

  if (arr.length === 0) {
    alertsEmpty.classList.remove("hidden");
    alertsItems.innerHTML = "";
    return;
  }
  alertsEmpty.classList.add("hidden");
  alertsItems.innerHTML = "";

  arr.forEach((alert, idx) => {
    const card = document.createElement("div");
    card.className = "item-card";
    card.setAttribute("role", "listitem");
    card.innerHTML =
      `<div class="item-card-header">` +
        `<div>` +
          `<div class="item-card-platform">${escHtml(alert.platform)}</div>` +
          `<div class="item-card-title">${escHtml(alert.title)}</div>` +
        `</div>` +
      `</div>` +
      `<div class="alert-target">` +
        `Current: <strong>${formatPrice(alert.currentPrice, alert.currency)}</strong> &nbsp;→&nbsp; ` +
        `Target: <strong>${formatPrice(alert.targetPrice, alert.currency)}</strong>` +
      `</div>` +
      `<div class="item-card-meta">Set ${formatDate(alert.createdAt)}</div>` +
      `<div class="item-card-actions">` +
        `${alert.url ? `<a href="${escHtml(alert.url)}" target="_blank" rel="noopener noreferrer" class="btn-item-action" aria-label="View listing">View ↗</a>` : ""}` +
        `<button class="btn-item-action" data-idx="${idx}" aria-label="Remove alert">Remove</button>` +
      `</div>`;

    card.querySelector("[data-idx]").addEventListener("click", async () => {
      const d = await storageGet(["priceAlerts"]);
      const a = (d.priceAlerts || []).filter((_, j) => j !== idx);
      await storageSet({ priceAlerts: a });
      setBadge(alertsBadge, a.length);
      renderAlertsView();
    });

    alertsItems.appendChild(card);
  });
}

// ══════════════════════════════════════════════════════════════
//  ADD TO COMPARE QUEUE
// ══════════════════════════════════════════════════════════════

btnAddCompare.addEventListener("click", async () => {
  const q = searchInput.value.trim();
  if (!q) { searchInput.focus(); return; }

  const data = await storageGet(["compareQueue"]);
  let queue  = data.compareQueue || [];

  if (queue.length >= MAX_COMPARE) {
    // Replace oldest
    queue.shift();
  }

  if (!queue.some(item => item.query === q)) {
    queue.push({ query: q, status: "pending", result: null });
    await storageSet({ compareQueue: queue });
    setBadge(compareBadge, queue.length);
  }
});

// ══════════════════════════════════════════════════════════════
//  COMPARE VIEW
// ══════════════════════════════════════════════════════════════

async function renderCompareView() {
  const data  = await storageGet(["compareQueue"]);
  const queue = data.compareQueue || [];

  compareResults.classList.add("hidden");

  if (queue.length === 0) {
    compareEmpty.classList.remove("hidden");
    compareList.innerHTML = "";
    btnRunCompare.classList.add("hidden");
    return;
  }

  compareEmpty.classList.add("hidden");
  compareList.innerHTML = "";
  btnRunCompare.classList.remove("hidden");

  queue.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = "compare-queue-item";
    const statusClass = item.status || "pending";
    const statusLabel = { pending:"Pending", done:"Done", loading:"Searching…", error:"Error" }[statusClass] || statusClass;

    div.innerHTML =
      `<span class="compare-queue-title">${escHtml(item.query)}</span>` +
      `<span class="compare-queue-status ${statusClass}">${statusLabel}</span>` +
      `<button class="btn-remove-compare" data-idx="${idx}" aria-label="Remove from compare">✕</button>`;

    div.querySelector(".btn-remove-compare").addEventListener("click", async () => {
      const d  = await storageGet(["compareQueue"]);
      const q  = (d.compareQueue || []).filter((_, j) => j !== idx);
      await storageSet({ compareQueue: q });
      setBadge(compareBadge, q.length);
      renderCompareView();
    });

    compareList.appendChild(div);
  });
}

btnClearCompare.addEventListener("click", async () => {
  await storageSet({ compareQueue: [] });
  setBadge(compareBadge, 0);
  renderCompareView();
});

btnRunCompare.addEventListener("click", runCompare);

async function runCompare() {
  const data  = await storageGet(["compareQueue"]);
  const queue = data.compareQueue || [];
  if (queue.length === 0) return;

  btnRunCompare.disabled = true;
  btnRunCompare.textContent = "Comparing…";

  // Mark all as loading
  queue.forEach(item => { item.status = "loading"; item.result = null; });
  await storageSet({ compareQueue: queue });
  renderCompareView();

  // Fetch each product sequentially (to avoid rate limits)
  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    try {
      const raw    = await researchProduct(item.query);
      const normal = normalizeResponse(raw);
      queue[i].status = "done";
      queue[i].result = normal;
    } catch (err) {
      queue[i].status = "error";
      queue[i].errorMsg = err.message;
    }
    await storageSet({ compareQueue: queue });
  }

  btnRunCompare.disabled = false;
  btnRunCompare.textContent = "Compare All Products";

  renderCompareView();
  renderCompareTable(queue);
}

function renderCompareTable(queue) {
  const done = queue.filter(q => q.status === "done" && q.result?.recommendation);
  if (done.length < 2) {
    compareResults.classList.add("hidden");
    return;
  }

  compareResults.classList.remove("hidden");

  // Columns = products
  const cols = done.map(d => d.result.recommendation);

  // Find best per row
  const minPrice = Math.min(...cols.map(c => c.effective_price));

  let html =
    `<table class="compare-table" aria-label="Product comparison">` +
    `<thead><tr><th scope="col">Feature</th>` +
    cols.map(c => `<th scope="col">${escHtml(c.platform)}</th>`).join("") +
    `</tr></thead><tbody>`;

  const rows = [
    { label: "Product", fn: c => c.title },
    { label: "Effective Price", fn: c => formatPrice(c.effective_price, c.currency), bestFn: c => c.effective_price === minPrice },
    { label: "Deal Score", fn: (c, d) => `${score100(c.confidence)}/100`, bestFn: (c, d, all) => score100(c.confidence) === Math.max(...all.map(x => score100(x.confidence))) },
    { label: "Confidence", fn: c => pct(c.confidence) },
    { label: "Buy", fn: c => c.evidence_url ? `<a href="${escHtml(c.evidence_url)}" target="_blank" rel="noopener noreferrer" style="color:var(--cyan)">View ↗</a>` : "—" }
  ];

  rows.forEach(row => {
    html += `<tr><td class="row-label">${escHtml(row.label)}</td>`;
    cols.forEach((c, i) => {
      const isBest = row.bestFn ? row.bestFn(c, done[i], cols) : false;
      html += `<td class="${isBest ? "cell-best" : ""}">${row.fn(c, done[i], cols)}</td>`;
    });
    html += `</tr>`;
  });

  html += `</tbody></table>`;
  compareResults.innerHTML = html;
}

// ══════════════════════════════════════════════════════════════
//  NAVIGATION EVENTS
// ══════════════════════════════════════════════════════════════

btnWishlistTab.addEventListener("click", () => showView("view-wishlist"));
btnAlertsTab.addEventListener("click",   () => showView("view-alerts"));
btnCompareTab.addEventListener("click",  () => showView("view-compare"));

btnSettingsOpen.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

// ══════════════════════════════════════════════════════════════
//  BOOT
// ══════════════════════════════════════════════════════════════

init();
