// ═══════════════════════════════════════════════════════════════
//  ShopWise AI — Content Script
//  Detects products on supported e-commerce pages and sends
//  them to the background service worker for the popup to read.
// ═══════════════════════════════════════════════════════════════

(function () {
  "use strict";

  // ── Utility: pick first non-empty value ──────────────────────
  function first(...fns) {
    for (const fn of fns) {
      try {
        const val = fn();
        if (val && val.trim().length > 3) return val.trim();
      } catch (_) { /* continue */ }
    }
    return null;
  }

  function qs(selector) {
    const el = document.querySelector(selector);
    return el ? el.innerText || el.textContent || el.value || "" : "";
  }

  function qsAttr(selector, attr) {
    const el = document.querySelector(selector);
    return el ? (el.getAttribute(attr) || "") : "";
  }

  // ── Price helpers ─────────────────────────────────────────────
  function extractPrice(selector) {
    const text = qs(selector);
    const match = text.match(/[\d,]+(\.\d+)?/);
    return match ? parseFloat(match[0].replace(/,/g, "")) : null;
  }

  // ── Platform extractors ───────────────────────────────────────
  const PLATFORMS = [

    // Amazon India + Amazon.com
    {
      name: "Amazon",
      test: () => /amazon\.(in|com)/.test(location.hostname),
      extract() {
        const title = first(
          () => qs("#productTitle"),
          () => qs(".product-title-word-break"),
          () => qs("h1.a-size-large"),
          () => qs("h1")
        );
        const price = extractPrice(".a-price-whole") ||
                      extractPrice("#priceblock_ourprice") ||
                      extractPrice(".a-price .a-offscreen");
        return title ? { title, price } : null;
      }
    },

    // Flipkart
    {
      name: "Flipkart",
      test: () => location.hostname.includes("flipkart.com"),
      extract() {
        const title = first(
          () => qs("span.B_NuCI"),
          () => qs("h1.yhB1nd"),
          () => qs(".x-product-title-text"),
          () => qs("h1.VU-ZEz"),
          () => qs("h1")
        );
        const price = extractPrice("._30jeq3._16Jk6d") ||
                      extractPrice("._30jeq3") ||
                      extractPrice(".Nx9bqj");
        return title ? { title, price } : null;
      }
    },

    // Croma
    {
      name: "Croma",
      test: () => location.hostname.includes("croma.com"),
      extract() {
        const title = first(
          () => qs("h1.product-name"),
          () => qs(".pdp-product-name"),
          () => qs("h1")
        );
        const price = extractPrice(".amount");
        return title ? { title, price } : null;
      }
    },

    // Reliance Digital
    {
      name: "Reliance Digital",
      test: () => location.hostname.includes("reliancedigital.in"),
      extract() {
        const title = first(
          () => qs("h1.pdp__title"),
          () => qs(".pdp-title"),
          () => qs("h1")
        );
        const price = extractPrice(".price");
        return title ? { title, price } : null;
      }
    },

    // Vijay Sales
    {
      name: "Vijay Sales",
      test: () => location.hostname.includes("vijaysales.com"),
      extract() {
        const title = first(
          () => qs(".product-name"),
          () => qs("h1")
        );
        const price = extractPrice(".product-price");
        return title ? { title, price } : null;
      }
    },

    // Myntra
    {
      name: "Myntra",
      test: () => location.hostname.includes("myntra.com"),
      extract() {
        const title = first(
          () => qs(".pdp-title"),
          () => qs("h1.title-name"),
          () => qs("h1")
        );
        return title ? { title, price: null } : null;
      }
    },

    // Meesho
    {
      name: "Meesho",
      test: () => location.hostname.includes("meesho.com"),
      extract() {
        const title = first(
          () => qs("p[class*='ProductTitle']"),
          () => qs("h1")
        );
        return title ? { title, price: null } : null;
      }
    },

    // Tata CLiQ
    {
      name: "Tata CLiQ",
      test: () => location.hostname.includes("tatacliq.com"),
      extract() {
        const title = first(
          () => qs(".ProductModule__productTitle"),
          () => qs("h1")
        );
        return title ? { title, price: null } : null;
      }
    },

    // Generic fallback for other sites
    {
      name: "Web",
      test: () => true,
      extract() {
        // Only run on pages that look like product pages
        const ogType = qsAttr('meta[property="og:type"]', "content");
        if (ogType && !ogType.includes("product")) return null;

        const title = first(
          () => qsAttr('meta[property="og:title"]', "content"),
          () => qs("h1")
        );
        const priceText = qsAttr('meta[property="product:price:amount"]', "content");
        const price = priceText ? parseFloat(priceText) : null;
        return title ? { title, price } : null;
      }
    }
  ];

  // ── Run detection ─────────────────────────────────────────────
  function detect() {
    for (const platform of PLATFORMS) {
      if (!platform.test()) continue;

      const result = platform.extract();
      if (!result) continue;

      const product = {
        title:    result.title,
        price:    result.price,
        url:      location.href,
        platform: platform.name
      };

      // Send to background
      try {
        chrome.runtime.sendMessage(
          { type: "PRODUCT_DETECTED", product },
          (response) => {
            // Suppress "Extension context invalidated" type errors silently
            if (chrome.runtime.lastError) { /* no-op */ }
          }
        );
      } catch (_) { /* Extension may have been reloaded */ }

      break; // Only send one detection per page
    }
  }

  // Run on load, and again after a short delay to catch dynamic pages
  detect();
  setTimeout(detect, 2000);

})();
