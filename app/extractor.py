import json
import logging
from typing import Optional, Any, Dict
from groq import Groq
from app.config import settings
from app.schemas import ProductOffer

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an AI Shopping Research Assistant.
Your task is to extract product listing details from raw search evidence.
Return a valid JSON object matching the requested schema.
Rules:
- NEVER invent or guess a price. If a clear price is not supported by the evidence, set it to null.
- Extract the currency.
- If shipping cost is not mentioned, set it to null (do not assume 0).
- availability should be one of: 'in_stock', 'out_of_stock', 'unknown'.
- match_score (0.0 to 1.0) indicates how well the found product matches the user request.
- evidence_score (0.0 to 1.0) indicates the reliability of the price evidence.
- evidence must be a short snippet from the text justifying the extraction.

Expected JSON format:
{
  "platform": "string",
  "title": "string",
  "price": number or null,
  "currency": "string",
  "shipping": number or null,
  "availability": "string",
  "match_score": number,
  "evidence_score": number,
  "evidence": "string"
}
"""

def extract_offer(platform: str, product_query: str, search_result: Dict[str, Any]) -> Optional[ProductOffer]:
    if not settings.GROQ_API_KEY:
        logger.warning("GROQ_API_KEY is missing, skipping extraction.")
        return None

    client = Groq(api_key=settings.GROQ_API_KEY)
    
    title = search_result.get("title", "")
    url = search_result.get("url", "")
    content = search_result.get("content", "")

    if not content.strip():
        logger.warning(f"Skipping {platform}: search result has no content.")
        return None

    user_prompt = f"""
Original Request: {product_query}
Platform: {platform}
Evidence URL: {url}
Evidence Title: {title}
Evidence Content: {content}

Extract the product offer details in JSON.
"""

    try:
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.0
        )
        
        raw_content = response.choices[0].message.content
        if not raw_content or not raw_content.strip():
            logger.warning(f"Empty response from LLM for {platform}, skipping.")
            return None
        offer_data = json.loads(raw_content)
        offer = ProductOffer(**offer_data)
        
        # override platform and evidence_url to ensure they match our search
        offer.platform = platform
        offer.evidence_url = url
        return offer
    except Exception as e:
        logger.error(f"Failed to extract offer for {platform}: {e}")
        return None
