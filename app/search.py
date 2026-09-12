import logging
from typing import List, Dict, Any
from tavily import TavilyClient
from app.config import settings

logger = logging.getLogger(__name__)

PLATFORMS = {
    "Amazon India": "site:amazon.in",
    "Flipkart": "site:flipkart.com",
    "Croma": "site:croma.com",
    "Reliance Digital": "site:reliancedigital.in",
    "Vijay Sales": "site:vijaysales.com"
}

def search_platforms(product_query: str) -> Dict[str, Any]:
    if not settings.TAVILY_API_KEY:
        logger.warning("TAVILY_API_KEY is missing, returning empty search results.")
        return {}

    client = TavilyClient(api_key=settings.TAVILY_API_KEY)
    results_by_platform = {}

    for platform_name, site_filter in PLATFORMS.items():
        query = f'{site_filter} "{product_query}" price'
        try:
            # We want search depth advanced to get better page content
            response = client.search(query=query, search_depth="advanced", max_results=2)
            results_by_platform[platform_name] = response.get("results", [])
        except Exception as e:
            logger.error(f"Search failed for {platform_name}: {e}")
            results_by_platform[platform_name] = []

    return results_by_platform
