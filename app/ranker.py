from typing import List, Optional
from app.schemas import ProductOffer, Recommendation

MATCH_SCORE_THRESHOLD = 0.7

def rank_offers(offers: List[ProductOffer]) -> Optional[Recommendation]:
    valid_offers = []
    seen_urls = set()

    for offer in offers:
        if offer.price is None:
            continue
        if not offer.evidence_url:
            continue
        if offer.match_score < MATCH_SCORE_THRESHOLD:
            continue
        if offer.evidence_url in seen_urls:
            continue
        
        seen_urls.add(offer.evidence_url)
        
        # Calculate effective price
        shipping = offer.shipping if offer.shipping is not None else 0.0
        offer.effective_price = offer.price + shipping
        
        valid_offers.append(offer)

    if not valid_offers:
        return None

    # Find minimum effective price
    min_effective_price = min(o.effective_price for o in valid_offers if o.effective_price is not None)

    best_score = -1.0
    best_offer = None

    for offer in valid_offers:
        if offer.effective_price is None or offer.effective_price <= 0:
            continue
            
        price_score = min_effective_price / offer.effective_price
        
        final_score = (0.65 * price_score) + (0.25 * offer.match_score) + (0.10 * offer.evidence_score)
        
        if final_score > best_score:
            best_score = final_score
            best_offer = offer

    if not best_offer:
        return None

    return Recommendation(
        platform=best_offer.platform,
        title=best_offer.title,
        effective_price=best_offer.effective_price, # type: ignore
        currency=best_offer.currency,
        reason="Lowest effective price among high-confidence matching offers.",
        confidence=best_score,
        evidence_url=best_offer.evidence_url
    )
