# ShopWise AI — Chrome Extension

> **AI Shopping Intelligence** — Compare prices across Indian e-commerce platforms, get explainable deal recommendations, track products, and set price alerts — all from your Chrome toolbar.

---

## Features

### Core AI Research
| Feature | Description |
|---|---|
| **Product Search** | Natural-language queries sent to the ShopWise AI backend |
| **AI Recommendation** | Best overall deal selected by a weighted scoring formula |
| **Explainable Recommendation** | Bullet-point breakdown of *why* a deal is recommended |
| **Deal Score** | `confidence × 100` from the backend ranker (0–100) |
| **Match Score** | LLM-assessed similarity between the listing and your query (0–100%) |
| **Data Quality** | LLM-assessed reliability of the price evidence (0–100) |
| **Effective Price** | Listed price + shipping cost, pre-computed by the backend |
| **"Should I Buy This?"** | Verdict derived from Deal Score (Buy / Consider / Wait) |
| **AI Source Evidence** | Raw text snippet the LLM used to extract the price |

### Offer Comparison
| Feature | Description |
|---|---|
| **All Offers Table** | Platform, Price, Shipping, Effective Price, Stock, Match%, Score |
| **Best Offer Highlighting** | Cheapest effective price shown in green |
| **Availability Status** | In Stock / Out of Stock / Unknown per platform |
| **Direct Listing Links** | One-click ↗ to each platform's actual product page |

### Browser Intelligence
| Feature | Description |
|---|---|
| **Smart Page Detection** | Auto-detects product title on Amazon, Flipkart, Croma, Reliance Digital, Vijay Sales, Myntra, Meesho, Tata CLiQ |
| **Auto Pre-fill** | Detected product pre-fills the search bar with one click |
| **Natural Language Search** | Queries like "Best phone under ₹30000" passed directly to the AI |
| **Search Suggestion Chips** | Quick-tap common query templates |

### User Features
| Feature | Description |
|---|---|
| **Search History** | Last 10 searches with deduplication, most-recent-first |
| **Wishlist** | Save products for later; stored in `chrome.storage.local` |
| **Price Alerts** | Set a target price; alerts stored locally with creation date |
| **Copy Deal** | Copies full deal summary (title, platform, price, score, URL) to clipboard |
| **Product Comparison** | Queue 2–5 products, run parallel searches, compare side-by-side |

### Settings
| Feature | Description |
|---|---|
| **API URL Configuration** | Point to local dev or any deployed backend |
| **Health Check** | Live connection test with status indicator |
| **Data Management** | Clear history, wishlist, alerts, or all data |

### Graceful Stubs (future backend features)
| Feature | Status |
|---|---|
| Review Intelligence | UI stub — requires review data from backend |
| Price History Chart | UI stub — requires price-history database |
| Fake Review Signal | UI stub — requires authenticity signals from backend |

---

## File Structure

```
chrome-extension/
├── manifest.json      MV3 manifest — permissions, content scripts, options page
├── popup.html         Main extension UI (4 views: main / wishlist / alerts / compare)
├── popup.css          Dark glassmorphism design system
├── popup.js           All UI logic, API calls, storage, state machine
├── settings.html      Full settings page (opens in tab)
├── settings.css       Settings styles
├── settings.js        Health check, save URL, data management
├── content.js         Product detection on 8+ shopping sites
├── background.js      Service worker — defaults, message relay, badge
├── icons/
│   ├── icon16.png     16×16 toolbar icon
│   ├── icon48.png     48×48 extensions page icon
│   └── icon128.png    128×128 Chrome Web Store icon
└── README.md          This file
```

---

## Installation

### Step 1 — Start the ShopWise AI backend

```bash
cd "ShopWise AI"

# Install dependencies (first time only)
pip install -r requirements.txt

# Start the development server
uvicorn app.api:app --reload
```

The API will be available at `http://127.0.0.1:8000`.  
Swagger docs: `http://127.0.0.1:8000/docs`

### Step 2 — Load the extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** using the toggle in the top-right corner
3. Click **Load unpacked**
4. Select the `chrome-extension/` folder inside the `ShopWise AI` project
5. The ShopWise AI icon will appear in your Chrome toolbar
6. Click **Pin** (📌) to always show it

### Step 3 — Configure the API URL (optional)

The default API URL is `http://localhost:8000`.

To use a deployed backend (e.g. Render.com):

1. Right-click the extension icon → **Options**, or click ⚙ in the popup header
2. Enter your deployed URL (e.g. `https://shopwise-ai.onrender.com`)
3. Click **Test** to verify the connection
4. Click **Save Settings**

---

## API Reference

The extension communicates exclusively with one endpoint:

### `POST /research`

**Request:**
```json
{
  "product": "iPhone 16 Pro 256GB India"
}
```

**Response:**
```json
{
  "product_request": "iPhone 16 Pro 256GB India",
  "searched_at": "2026-09-15T12:00:00Z",
  "offers": [
    {
      "platform": "Amazon India",
      "title": "Apple iPhone 16 Pro (256 GB) - Black Titanium",
      "price": 119900.0,
      "currency": "INR",
      "shipping": 0.0,
      "effective_price": 119900.0,
      "availability": "in_stock",
      "match_score": 0.97,
      "evidence_score": 0.92,
      "evidence_url": "https://www.amazon.in/...",
      "evidence": "Apple iPhone 16 Pro 256GB... ₹1,19,900..."
    }
  ],
  "recommendation": {
    "platform": "Flipkart",
    "title": "Apple iPhone 16 Pro (256 GB)",
    "effective_price": 118999.0,
    "currency": "INR",
    "reason": "Lowest effective price among high-confidence matching offers.",
    "confidence": 0.94,
    "evidence_url": "https://www.flipkart.com/..."
  }
}
```

> **Note:** `recommendation.confidence` is the Deal Score (multiply by 100 to get `/100` display).  
> `offers[].match_score` is the Match Score (multiply by 100 for %).

---

## Testing Guide

### Test: Basic search
1. Open the popup
2. Type `iPhone 15 128GB` in the search bar
3. Click **Find Best Deal**
4. Verify: loading messages cycle, results appear with a Best Deal card

### Test: Natural language search
1. Click the chip `Phone ₹30k camera`
2. Verify: query fills the search bar and search starts

### Test: Smart page detection
1. Navigate to any Amazon.in or Flipkart.com product page
2. Open the popup
3. Verify: the detected product banner appears at the top
4. Click **Use** to pre-fill the search bar

### Test: Wishlist
1. Search for a product and get results
2. Click the ♡ icon on the Best Deal card
3. Click the ♡ icon in the header → verify the product appears

### Test: Price Alert
1. Search for a product and get results
2. Click the 🔔 icon on the Best Deal card
3. Enter a target price lower than the current price
4. Click **Set Alert** → verify the bell icon in the header shows a badge
5. Open the alerts view to confirm the alert was saved

### Test: Product Comparison
1. Type a product name, click the + button (Add to Compare)
2. Type another product name, click + again
3. Open the compare view (⚖ icon in header)
4. Click **Compare All Products**

### Test: Settings
1. Click ⚙ to open Settings
2. Change the API URL to an invalid URL
3. Click **Test** — verify "Unable to connect" appears
4. Restore the correct URL and click **Test** again — verify "Connected"

### Test: API errors
1. Stop the backend server
2. Search for any product
3. Verify: actionable error message appears explaining the backend is not running

---

## CORS Configuration

The backend (`app/api.py`) must allow the Chrome extension origin.  
This project already includes the correct configuration:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "chrome-extension://*",
        "http://localhost:*",
        "http://127.0.0.1:*",
    ],
    allow_origin_regex=r"chrome-extension://.*",
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)
```

For production deployments, replace `chrome-extension://*` with your specific extension ID (found in `chrome://extensions`) to be more restrictive.

---

## Troubleshooting

### CORS errors in the browser console
**Symptom:** `Access-Control-Allow-Origin` error  
**Fix:** Ensure `app/api.py` has the CORS middleware shown above and restart the backend.

### "Cannot reach ShopWise AI" error
**Symptom:** Connection error popup  
**Fix:**  
1. Check the backend is running: `uvicorn app.api:app --reload`  
2. Open Settings and verify the API URL is `http://localhost:8000`  
3. Click **Test** to confirm the connection

### Wrong API URL after deployment
**Fix:** Open Settings → update the URL → click Save → click Test.

### No results returned
**Symptom:** "No qualifying deals found" state  
**Fix:** Use a more specific query (include brand, model, storage capacity). DuckDuckGo may not have found price data for this query.

### Content script not detecting product
**Symptom:** No detected-product banner appears on product pages  
**Fix:**  
1. Reload the extension after any changes (`chrome://extensions` → Reload)  
2. Refresh the product page
3. The extension only injects on supported domains — check the `manifest.json` matches list

### Extension needs to be reloaded after code changes
After editing any extension file:  
1. Go to `chrome://extensions`  
2. Click **Reload** (↻) on the ShopWise AI card  
3. Close and reopen the popup

### Slow responses (~30 seconds)
This is expected. The backend makes up to 10 sequential LLM calls with 3-second delays.  
The loading screen cycles through progress messages while you wait.

---

## Security Notes

- No API keys are stored in the extension
- No user data is sent to any third party
- All storage uses `chrome.storage.local` (device-only)
- `innerHTML` is used only with `escHtml()`-escaped content
- `eval()` is never used
- Content Security Policy is enforced by Manifest V3

---

## Permissions Explained

| Permission | Why |
|---|---|
| `storage` | Save API URL, history, wishlist, alerts locally |
| `activeTab` | Read current tab for product detection |
| `scripting` | Inject content script into product pages |
| `notifications` | Reserved for future price-drop push notifications |
| `host_permissions` | Allow fetch calls to the configured backend URL |

---

## Backend Assumptions

The extension is built against the exact schema defined in `app/schemas.py`:

| Field | Used for |
|---|---|
| `recommendation.confidence` | Deal Score (`× 100 → /100`) |
| `offers[].match_score` | Match percentage displayed in table and card |
| `offers[].evidence_score` | Data Quality score; also used as table "Score" column |
| `offers[].evidence` | Shown in AI Source Evidence accordion |
| `recommendation.reason` | Shown verbatim in Best Deal card |
| `recommendation.evidence_url` | Buy Now button href |

Features **not implemented** (backend does not provide this data):
- Review intelligence / sentiment
- Price history / price trend chart
- Fake review authenticity signals
- Seller rating scores
- Return policy information

These appear as clearly-labelled "Coming Soon" stubs in the UI. **No data is fabricated.**
