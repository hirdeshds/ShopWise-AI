// ──────────────────────────────────────────────
// ShopWise AI — Content Script
// Detects current product page & pre-fills search
// ──────────────────────────────────────────────

(function () {
  "use strict";

  // ── Platform-specific product title extractors ──
  const extractors = [
    // Amazon India
    {
      test: () => location.hostname.includes("amazon.in"),
      extract: () => {
        const el =
          document.getElementById("productTitle") ||
          document.querySelector("h1.a-size-large") ||
          document.querySelector("h1");
        return el ? el.innerText.trim() : null;
      }
    },
    // Flipkart
    {
      test: () => location.hostname.includes("flipkart.com"),
      extract: () => {
        const el =
          document.querySelector("span.B_NuCI") ||
          document.querySelector("h1.yhB1nd") ||
          document.querySelector("h1");
        return el ? el.innerText.trim() : null;
      }
    },
    // Croma
    {
      test: () => location.hostname.includes("croma.com"),
      extract: () => {
        const el =
          document.querySelector("h1.product-name") ||
          document.querySelector("h1");
        return el ? el.innerText.trim() : null;
      }
    },
    // Reliance Digital
    {
      test: () => location.hostname.includes("reliancedigital.in"),
      extract: () => {
        const el =
          document.querySelector("h1.pdp__title") ||
          document.querySelector("h1");
        return el ? el.innerText.trim() : null;
      }
    },
    // Vijay Sales
    {
      test: () => location.hostname.includes("vijaysales.com"),
      extract: () => {
        const el =
          document.querySelector("h1.product-name") ||
          document.querySelector("h1");
        return el ? el.innerText.trim() : null;
      }
    },
    // Generic fallback — use document.title
    {
      test: () => true,
      extract: () => {
        const title = document.title.split("|")[0].split("-")[0].trim();
        return title.length > 3 ? title : null;
      }
    }
  ];

  // Run matching extractor
  for (const extractor of extractors) {
    if (extractor.test()) {
      const product = extractor.extract();
      if (product) {
        // Notify background to store the detected product
        chrome.runtime.sendMessage(
          { type: "PRODUCT_DETECTED", product },
          () => {
            // Suppress any errors if popup isn't open
            if (chrome.runtime.lastError) { /* no-op */ }
          }
        );
        break;
      }
    }
  }
})();
