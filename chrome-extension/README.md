# 🛒 ShopWise AI — Chrome Extension

> A sleek Chrome browser extension for the **ShopWise AI** FastAPI backend.  
> Compare prices across Indian e-commerce platforms instantly from your toolbar.

---

## ✨ Features

### 🔍 AI-Powered Product Search
Type any product query (e.g. *"iPhone 16 Pro 256GB"*, *"Samsung Galaxy S24"*) and the extension calls your ShopWise AI backend to search across **5 major Indian e-commerce platforms** simultaneously:

| Platform | Domain |
|---|---|
| 🛒 Amazon India | amazon.in |
| 🛍️ Flipkart | flipkart.com |
| 🔌 Croma | croma.com |
| 📱 Reliance Digital | reliancedigital.in |
| 🏪 Vijay Sales | vijaysales.com |

---

### 🏆 Best Deal Recommendation Card
The extension prominently displays the **single best deal** selected by the AI ranking engine:
- **Platform name** and full product title
- **Effective price** (price + shipping) formatted in INR
- **Confidence score** — how certain the AI is this is the right product
- **AI reasoning** — a human-readable explanation for why this deal wins
- **🛒 Buy Now** button — opens the listing directly in a new tab
- **📋 Copy Deal** — copies all deal details to clipboard in one click

---

### 📊 Full Offers Table
Below the recommendation, see **all extracted offers** in a detailed table:

| Column | Description |
|---|---|
| Platform | Which e-commerce site |
| Price | Listed product price |
| Ship | Shipping cost (Free if ₹0) |
| Effective | Total price (price + shipping) |
| Stock | In Stock / Out of Stock / Unknown |
| Match | How well the listing matches your query (0–100%) |
| ↗ Link | Direct link to view the live listing |

The cheapest effective price is highlighted in **green**.

---

### 🕵️ Smart Page Detection
When you visit a product page on **Amazon, Flipkart, Croma, Reliance Digital,** or **Vijay Sales**, the extension automatically detects the product name and shows a banner:

> 📦 Detected: Apple iPhone 16 Pro (256 GB) — Black Titanium  
> [Use]

Click **Use** to pre-fill the search bar instantly.

---

### 📋 Search History
The extension remembers your **last 10 searches** locally in your browser. Click any previous search to re-run it immediately. Clear history at any time with one click.

---

### ⚙️ Configurable API URL
Open **Settings** (⚙ icon) to set the backend URL:
- Default: `http://localhost:8000` (local dev)
- Change to your Render.com or any deployed URL for production use

---

### ⏳ Animated Loading State
Since the backend makes up to 10 LLM calls (~30 seconds), the extension shows:
- A **spinning ring** animation
- **Shimmer skeleton cards** while results load
- Platform names being searched

---

### ❌ Smart Error Handling
Clear, actionable error messages for common failure modes:
- **Backend not running** — tells you exactly what command to run
- **Rate limit (429)** — advises you to wait 60 seconds
- **Server errors** — shows the HTTP status and detail message
- **Retry button** — re-runs the last search without re-typing

---

## 📁 Folder Structure

```
chrome-extension/
├── manifest.json      # MV3 manifest — permissions, popup, content script
├── popup.html         # Extension UI markup
├── popup.css          # Dark glassmorphism styles + animations
├── popup.js           # Full UI logic, API calls, history, copy
├── content.js         # Auto-detects product on e-commerce pages
├── background.js      # Service worker — defaults & message relay
├── icons/
│   ├── icon16.png     # 16×16  toolbar icon
│   ├── icon48.png     # 48×48  extensions page icon
│   └── icon128.png    # 128×128 Chrome Web Store icon
└── README.md          # This file
```

---

## 🚀 Installation (Developer Mode)

> **Prerequisites:** Your ShopWise AI backend must be running.  
> See the [main project README](../README.md) for setup instructions.

### Step 1 — Start the backend
```bash
cd "ShopWise AI"
uvicorn app.api:app --reload
# API available at http://127.0.0.1:8000
```

### Step 2 — Load the extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `chrome-extension/` folder from this project
5. The ShopWise AI icon will appear in your Chrome toolbar

### Step 3 — Configure the API URL *(optional)*

If using a deployed backend (e.g. Render):
1. Click the ShopWise AI icon in the toolbar
2. Click ⚙ **Settings**
3. Enter your deployed API URL (e.g. `https://shopwise-ai.onrender.com`)
4. Click **Save Settings**

---

## 🔑 Permissions Explained

| Permission | Why it's needed |
|---|---|
| `storage` | Save API URL and search history locally |
| `activeTab` | Read current tab for smart product detection |
| `scripting` | Inject content script to extract product names |
| Host permissions | Allow fetch calls to your API URL |

> **Privacy:** All data stays on your device. No data is sent to any third party. The extension only communicates with the ShopWise AI backend you configure.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Extension API | Chrome MV3 (Manifest Version 3) |
| UI | Vanilla HTML + CSS + JavaScript |
| Styling | Dark glassmorphism, CSS custom properties, Inter font |
| Storage | `chrome.storage.local` |
| Backend | ShopWise AI FastAPI server |
| Search | DuckDuckGo (via backend) |
| LLM | Cohere command-r-plus (via backend) |

---

## ⚠️ Known Limitations

| Issue | Detail |
|---|---|
| Slow results | Backend takes ~30s (10 LLM calls × 3s sleep). Loading animation is shown. |
| Localhost only by default | Change API URL in Settings for deployed backends |
| Content script detection | Works best on product detail pages, not category/search pages |
| Rate limits | Cohere free tier: ~5 req/min. Backend retries automatically. |
| CORS | If using a custom backend, ensure `CORS` is enabled in `app/api.py` |

---

## 🔧 Enabling CORS on the Backend

If you access the backend from the extension, add CORS middleware to `app/api.py`:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://*"],
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)
```

---

## 📜 License

This extension is part of the **ShopWise AI** project. See the root `LICENSE` file for details.
