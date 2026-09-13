import time
from datetime import datetime, timezone
from typing import List
from app.schemas import ResearchRequest, ResearchResponse, ProductOffer
from app.search import search_platforms
from app.extractor import extract_offer
from app.ranker import rank_offers

def run_research(request: ResearchRequest) -> ResearchResponse:
    # 1. Search platforms
    search_results = search_platforms(request.product)
    
    # 2. Extract offers — throttle to stay within Cohere's free-tier rate limits
    all_offers: List[ProductOffer] = []

    for platform, results in search_results.items():
        for result in results:
            offer = extract_offer(platform, request.product, result)
            if offer:
                all_offers.append(offer)
            time.sleep(3)  # 3s gap keeps well under Cohere's RPM limit
                
    # 3. Rank offers
    recommendation = rank_offers(all_offers)
    
    return ResearchResponse(
        product_request=request.product,
        searched_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        offers=all_offers,
        recommendation=recommendation
    )
