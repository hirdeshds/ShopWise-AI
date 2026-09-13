import logging
from typing import Dict, Any
from duckduckgo_search import DDGS

logger = logging.getLogger(__name__)

PLATFORMS = {
    "Amazon India": "site:amazon.in",
    "Flipkart": "site:flipkart.com",
    "Croma": "site:croma.com",
    "Reliance Digital": "site:reliancedigital.in",
    "Vijay Sales": "site:vijaysales.com"
}

def search_platforms(product_query: str) -> Dict[str, Any]:
    results_by_platform = {}

    with DDGS() as ddgs:
        for platform_name, site_filter in PLATFORMS.items():
            query = f'{site_filter} "{product_query}" price buy'
            try:
                raw = list(ddgs.text(query, max_results=2))
                # Normalize to the shape extractor.py expects: title, url, content
                results_by_platform[platform_name] = [
                    {
                        "title": r.get("title", ""),
                        "url": r.get("href", ""),
                        "content": r.get("body", ""),
                    }
                    for r in raw
                ]
            except Exception as e:
                logger.error(f"Search failed for {platform_name}: {e}")
                results_by_platform[platform_name] = []

    return results_by_platform
