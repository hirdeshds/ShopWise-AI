# AI Shopping Research Agent

## Overview
The AI Shopping Research Agent is a Python application that accepts a natural-language product request, searches multiple e-commerce platforms on the live web, extracts structured product and pricing information with an LLM, validates the results, compares effective prices, and recommends the best buying option.

## Features
- **Live Web Research**: Uses Tavily API to fetch current pricing and availability from top e-commerce sites.
- **LLM Data Extraction**: Extracts structured product offers from messy search evidence using OpenAI's Structured Outputs.
- **Deterministic Ranking**: Uses a Python-based scoring engine to calculate effective prices and objectively rank the best offer.
- **REST API & CLI**: Provides both a FastAPI server and a Command-Line Interface.

## Setup

1. **Create and activate a virtual environment:**
```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # macOS/Linux
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Configure environment variables:**
Rename `.env.example` to `.env` and fill in your API keys:
```env
TAVILY_API_KEY=your_tavily_key
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o-mini # Or your preferred OpenAI model
```

## Running the Application

### CLI Mode
```bash
python -m app.main "iPhone 16 Pro 256GB India"
```

### FastAPI Server
```bash
uvicorn app.api:app --reload
```
Then visit: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

## Testing
Run the deterministic ranking tests:
```bash
pytest -q tests/test_ranker.py
```
