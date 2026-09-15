# ShopWise AI — Codebase Documentation

> A FastAPI-powered AI Shopping Research Agent that searches multiple Indian e-commerce platforms, extracts structured product offers using an LLM, and recommends the best deal.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture & Data Flow](#2-architecture--data-flow)
3. [Project Structure](#3-project-structure)
4. [Environment Setup](#4-environment-setup)
5. [Dependencies](#5-dependencies)
6. [Module Reference](#6-module-reference)
7. [API Endpoints](#7-api-endpoints)
8. [Data Models](#8-data-models)
9. [Scoring & Ranking Logic](#9-scoring--ranking-logic)
10. [Deployment (Render)](#10-deployment-render)
11. [Running Locally](#11-running-locally)
12. [Known Limitations & Tips](#12-known-limitations--tips)

---

## 1. Project Overview

**ShopWise AI** is a backend service that answers:
> *"Where can I buy [product] at the best price in India?"*

It works in 3 automated steps:
1. **Search** — Queries DuckDuckGo for each supported platform with `site:` filtering.
2. **Extract** — Sends raw search snippets to Cohere LLM, which returns structured JSON.
3. **Rank** — Scores all valid offers and recommends the single best deal.

---

## 2. Architecture & Data Flow

```
POST /research
      |
      v
  agent.py -- run_research()
      |
      |-> search.py -- search_platforms()
      |       |
      |       |  DuckDuckGo (DDGS) - free, no API key
      |       |  Queries: site:amazon.in | site:flipkart.com | ...
      |       |
      |       --> returns: { "Amazon India": [{title, url, content},...], ... }
      |
      |-> extractor.py -- extract_offer()  [called per search result]
      |       |
      |       |  Cohere LLM (command-r-plus-08-2024)
      |       |  Input:  raw search snippet + product query
      |       |  Output: structured ProductOffer JSON
      |       |
      |       --> returns: ProductOffer | None
      |
      |-> ranker.py -- rank_offers()
      |       |
      |       |  Filters by match_score >= 0.7 and price != null
      |       |  Scores: 65% price + 25% match + 10% evidence
      |       |
      |       --> returns: Recommendation | None
      |
      --> ResearchResponse (JSON)
```

---

## 3. Project Structure

```
ShopWise AI/
|
|-- app/
|   |-- __init__.py       # Package marker
|   |-- api.py            # FastAPI app + route definitions
|   |-- agent.py          # Orchestrator - ties search -> extract -> rank
|   |-- search.py         # DuckDuckGo search per platform
|   |-- extractor.py      # Cohere LLM extraction with retry logic
|   |-- ranker.py         # Scoring + best-offer selection
|   |-- schemas.py        # Pydantic data models
|   |-- config.py         # Settings loaded from .env
|   `-- main.py           # CLI entry point (terminal usage)
|
|-- tests/                # Test suite (pytest)
|-- .env                  # Secret keys (NOT committed to git)
|-- .env.example          # Template for new developers
|-- .gitignore
|-- requirements.txt      # Python dependencies
|-- render.yaml           # Render.com deployment config
|-- CODEBASE.md           # This file
`-- README.md
```

---

## 4. Environment Setup

### .env file (never commit this)

```
COHERE_API_KEY=your_cohere_api_key_here
COHERE_MODEL=command-r-plus-08-2024
```

| Variable | Required | Description |
|---|---|---|
| COHERE_API_KEY | Yes | Cohere API key for LLM extraction |
| COHERE_MODEL | Yes | Cohere model name (default: command-r-plus-08-2024) |

No Tavily/search API key needed — DuckDuckGo is completely free with no signup.

### First-time setup

```bash
git clone <repo-url>
cd "ShopWise AI"
cp .env.example .env
# Fill in COHERE_API_KEY in .env
pip install -r requirements.txt
uvicorn app.api:app --reload
```

---

## 5. Dependencies

| Package | Version | Purpose |
|---|---|---|
| fastapi | >=0.100.0 | Web framework for the REST API |
| uvicorn | >=0.22.0 | ASGI server to run FastAPI |
| pydantic | >=2.0.0 | Data validation and serialization |
| pydantic-settings | >=2.0.0 | Load settings from .env |
| python-dotenv | >=1.0.0 | .env file loading |
| ddgs | >=0.1.0 | DuckDuckGo search (free, no key needed) |
| cohere | >=5.0.0 | LLM API for offer extraction |
| pytest | >=7.0.0 | Testing framework |
| httpx | >=0.24.0 | Async HTTP client (used by FastAPI test client) |

---

## 6. Module Reference

---

### 6.1 app/config.py

Loads environment variables into a typed Settings object using pydantic-settings.

```python
class Settings(BaseSettings):
    COHERE_API_KEY: str = ""
    COHERE_MODEL: str = "command-r-plus-08-2024"
```

Usage across the app:
```python
from app.config import settings
settings.COHERE_API_KEY   # your key
settings.COHERE_MODEL     # "command-r-plus-08-2024"
```

- Reads from .env automatically via SettingsConfigDict(env_file=".env")
- extra="ignore" means unknown env vars won't raise errors

---

### 6.2 app/schemas.py

Defines all Pydantic data models used across the application.

#### ProductOffer
Represents a single product listing extracted from one search result.

| Field | Type | Description |
|---|---|---|
| platform | str | Platform name e.g. "Amazon India" |
| title | str | Product listing title |
| price | float or None | Listed price (null if not found) |
| currency | str | Currency code e.g. "INR" |
| shipping | float or None | Shipping cost (null if not mentioned) |
| effective_price | float or None | price + shipping, set by ranker |
| availability | str | "in_stock" / "out_of_stock" / "unknown" |
| match_score | float | 0.0-1.0: how well listing matches query |
| evidence_score | float | 0.0-1.0: reliability of extracted price |
| evidence_url | str | Source URL of the search result |
| evidence | str | Text snippet justifying the extraction |

#### Recommendation
The single best offer chosen by the ranker.

| Field | Type | Description |
|---|---|---|
| platform | str | Winning platform name |
| title | str | Product title |
| effective_price | float | Total cost including shipping |
| currency | str | Currency code |
| reason | str | Human-readable explanation |
| confidence | float | Final ranking score (0.0-1.0) |
| evidence_url | str | Link to verify the listing |

#### ResearchRequest
Request body for POST /research.

| Field | Type | Description |
|---|---|---|
| product | str | Free-text product search query |

#### ResearchResponse
Full response returned by the API.

| Field | Type | Description |
|---|---|---|
| product_request | str | The original query |
| searched_at | str | ISO 8601 UTC timestamp |
| offers | List[ProductOffer] | All extracted offers |
| recommendation | Recommendation or None | Best offer, or null if none qualified |

---

### 6.3 app/search.py

Performs web searches using DuckDuckGo (no API key required).

#### PLATFORMS (constant)

```python
PLATFORMS = {
    "Amazon India":     "site:amazon.in",
    "Flipkart":         "site:flipkart.com",
    "Croma":            "site:croma.com",
    "Reliance Digital": "site:reliancedigital.in",
    "Vijay Sales":      "site:vijaysales.com"
}
```

Add or remove entries here to change which platforms are searched.

#### search_platforms(product_query: str) -> Dict[str, Any]

Searches all 5 platforms in sequence and returns raw results.

**Parameters:**
- product_query — the user's search string (e.g. "iPhone 16 Pro 256GB India")

**Returns:**
```python
{
  "Amazon India": [
    { "title": "...", "url": "https://amazon.in/...", "content": "..." },
    ...
  ],
  "Flipkart": [ ... ],
  ...
}
```

**Query format:** `site:amazon.in "iPhone 16 Pro 256GB India" price buy`

**Behaviour:**
- Up to 2 results per platform (max_results=2)
- On error, logs and returns [] for that platform (never crashes the whole request)
- DDG field mapping: href -> url, body -> content

---

### 6.4 app/extractor.py

Uses Cohere's LLM to extract structured offer data from raw search snippets.

#### SYSTEM_PROMPT (constant)

Instructs the LLM. Key rules:
- Never invent a price — return null if unsure
- match_score: how well the listing matches the user's request (0.0-1.0)
- evidence_score: how reliable/clear the price evidence is (0.0-1.0)
- availability must be one of: in_stock, out_of_stock, unknown

#### extract_offer(platform, product_query, search_result) -> Optional[ProductOffer]

Calls Cohere to parse a single search result into a ProductOffer.

**Parameters:**
- platform — e.g. "Flipkart"
- product_query — original user query string
- search_result — dict with keys: title, url, content

**Returns:** ProductOffer on success, None if skipped or failed.

**Skip conditions (returns None immediately):**
- COHERE_API_KEY is not set
- content field is empty/whitespace

**Retry logic:**
- Up to 3 attempts on 429 Rate Limit errors
- Wait time: 60s x attempt_number (60s then 120s)
- Any other exception logs error and returns None

**LLM call settings:**
- model: settings.COHERE_MODEL (command-r-plus-08-2024)
- response_format: json_object (enforces valid JSON output)
- temperature: 0.0 (deterministic, minimises hallucination)

**Post-processing:** platform and evidence_url are always overridden with known values — LLM cannot change these.

---

### 6.5 app/ranker.py

Filters and scores all extracted offers to find the single best deal.

#### MATCH_SCORE_THRESHOLD (constant)

```python
MATCH_SCORE_THRESHOLD = 0.7
```

Offers with match_score < 0.7 are discarded (likely a different product variant).

#### rank_offers(offers: List[ProductOffer]) -> Optional[Recommendation]

Selects the best offer from the list of extracted ProductOffer objects.

**Parameters:**
- offers — full list of ProductOffer items from the extractor

**Returns:** Recommendation (best offer) or None if no offer qualifies.

**Filtering — an offer is discarded if:**
1. price is None
2. evidence_url is empty
3. match_score < 0.7
4. Duplicate evidence_url (deduplication)

**Scoring formula:**

```
effective_price = price + (shipping or 0)
price_score     = min_effective_price / this_offer_effective_price

final_score = (0.65 x price_score)
            + (0.25 x match_score)
            + (0.10 x evidence_score)
```

| Weight | Factor | Rationale |
|---|---|---|
| 65% | Price score | Cheapest option wins most weight |
| 25% | Match score | Must be the right product |
| 10% | Evidence score | Trustworthy price data |

The offer with the highest final_score becomes the Recommendation.

---

### 6.6 app/agent.py

The orchestrator — calls search -> extract -> rank in sequence.

#### run_research(request: ResearchRequest) -> ResearchResponse

Main pipeline function. Called by both the API and the CLI.

**Parameters:**
- request — ResearchRequest with a product string

**Steps:**
1. Calls search_platforms(request.product) -> raw results dict
2. Loops over each platform's results, calls extract_offer() per result
3. Sleeps 3 seconds between each LLM call (rate limit protection)
4. Calls rank_offers(all_offers) -> best Recommendation
5. Returns ResearchResponse

**Throttle note:** With 5 platforms x 2 results = up to 10 LLM calls. At 3s each, expect ~30s response time per request.

---

### 6.7 app/api.py

Defines the FastAPI application and HTTP routes.

#### GET /health

```python
def health() -> {"status": "ok"}
```

Simple liveness check. Returns HTTP 200. Use to verify the server is running.

#### POST /research

```python
def research(request: ResearchRequest) -> ResearchResponse
```

Main research endpoint. Accepts JSON body, returns full research result.

Request body:
```json
{ "product": "iPhone 16 Pro 256GB India" }
```

---

### 6.8 app/main.py

CLI entry point for running research directly from the terminal.

#### main()

Reads product query from command-line args, runs the full pipeline, prints a formatted table.

**Usage:**
```bash
python -m app.main iPhone 16 Pro 256GB India
```

**Output:**
```
====================================================================
AI SHOPPING RESEARCH AGENT
====================================================================
Product: iPhone 16 Pro 256GB India

Platform             Price           Ship       Effective
--------------------------------------------------------------------
Amazon India         INR 119,900.00  INR 0.00   INR 119,900.00
Flipkart             INR 118,999.00  INR 0.00   INR 118,999.00

--------------------------------------------------------------------
RECOMMENDATION
--------------------------------------------------------------------
Best option : Flipkart
Product     : Apple iPhone 16 Pro (256 GB) - Black Titanium
Price       : INR 118,999.00
Confidence  : 91%
Reason      : Lowest effective price among high-confidence matching offers.
Verify      : https://www.flipkart.com/...
====================================================================
```

---

## 7. API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /health | Server liveness check |
| POST | /research | Run product price research |
| GET | /docs | Swagger UI (auto-generated) |
| GET | /redoc | ReDoc UI (auto-generated) |

---

## 8. Data Models

```
ResearchRequest
    `-- product: str

ResearchResponse
    |-- product_request: str
    |-- searched_at: str (ISO 8601 UTC)
    |-- offers: List[ProductOffer]
    `-- recommendation: Recommendation | None

ProductOffer
    |-- platform: str
    |-- title: str
    |-- price: float | None
    |-- currency: str
    |-- shipping: float | None
    |-- effective_price: float | None   <- computed by ranker
    |-- availability: str
    |-- match_score: float              <- 0.0-1.0 (LLM confidence)
    |-- evidence_score: float           <- 0.0-1.0 (data reliability)
    |-- evidence_url: str
    `-- evidence: str

Recommendation
    |-- platform: str
    |-- title: str
    |-- effective_price: float
    |-- currency: str
    |-- reason: str
    |-- confidence: float               <- final_score from ranking formula
    `-- evidence_url: str
```

---

## 9. Scoring & Ranking Logic

### Why offers get rejected

| Condition | Reason |
|---|---|
| price is None | LLM found no price in the evidence |
| evidence_url is empty | Cannot verify the source |
| match_score < 0.7 | Wrong product variant found |
| Duplicate evidence_url | Same listing found twice |

### Final score formula

```
effective_price = price + (shipping ?? 0)
price_score     = cheapest_price / this_price   (1.0 = cheapest)

final_score = 0.65 x price_score
            + 0.25 x match_score
            + 0.10 x evidence_score
```

The offer with the highest final_score wins.

---

## 10. Deployment (Render)

Configuration file: render.yaml

```yaml
services:
  - type: web
    name: shopwise-ai
    runtime: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.api:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.0
```

IMPORTANT: Set COHERE_API_KEY and COHERE_MODEL in the Render Dashboard under
Environment variables. Do NOT rely on the .env file in production (it is gitignored).

Why --host 0.0.0.0?
Render scans for open ports on all interfaces. Without this flag, uvicorn binds to
127.0.0.1 only and Render cannot detect the service, causing deployment to fail.

---

## 11. Running Locally

```bash
# Install dependencies
pip install -r requirements.txt

# Start the dev server (auto-reloads on file changes)
uvicorn app.api:app --reload

# Server runs at:
#   API:   http://127.0.0.1:8000
#   Docs:  http://127.0.0.1:8000/docs

# Or use the CLI directly
python -m app.main "Samsung Galaxy S24 256GB India"

# Run tests
pytest
```

---

## 12. Known Limitations & Tips

| Issue | Detail | Tip |
|---|---|---|
| Slow responses | 10 LLM calls x 3s sleep = ~30s | Reduce max_results=1 in search.py for faster results |
| Cohere rate limits | Free tier ~5 req/min | Extractor has auto-retry (up to 3x, waits 60s/120s) |
| Empty offers | DDG snippets may not contain visible price | LLM returns price: null; ranker filters these out |
| Currency variation | LLM extracts whatever currency appears in text | All Indian platforms return INR; safe for India searches |
| match_score threshold | Set to 0.7 in ranker.py | Lower to 0.5 if you are getting too few results |
| Adding platforms | Edit the PLATFORMS dict in search.py | Works for any platform with a domain name |
| Model change | Set COHERE_MODEL in .env | Try command-r-08-2024 for faster/cheaper calls |
