from app.schemas import ProductOffer
from app.ranker import rank_offers

def test_rank_offers_cheapest_wins():
    offers = [
        ProductOffer(
            platform="Amazon", title="Phone", price=1000, currency="INR", shipping=0,
            availability="in_stock", match_score=0.9, evidence_score=0.9,
            evidence_url="http://amazon", evidence="..."
        ),
        ProductOffer(
            platform="Flipkart", title="Phone", price=900, currency="INR", shipping=0,
            availability="in_stock", match_score=0.9, evidence_score=0.9,
            evidence_url="http://flipkart", evidence="..."
        )
    ]
    
    rec = rank_offers(offers)
    assert rec is not None
    assert rec.platform == "Flipkart"
    assert rec.effective_price == 900

def test_rank_offers_shipping_included():
    offers = [
        ProductOffer(
            platform="Amazon", title="Phone", price=1000, currency="INR", shipping=0,
            availability="in_stock", match_score=0.9, evidence_score=0.9,
            evidence_url="http://amazon", evidence="..."
        ),
        ProductOffer(
            platform="Flipkart", title="Phone", price=900, currency="INR", shipping=200,
            availability="in_stock", match_score=0.9, evidence_score=0.9,
            evidence_url="http://flipkart", evidence="..."
        )
    ]
    
    rec = rank_offers(offers)
    assert rec is not None
    assert rec.platform == "Amazon"
    assert rec.effective_price == 1000

def test_rank_offers_excludes_low_match():
    offers = [
        ProductOffer(
            platform="Amazon", title="Phone", price=1000, currency="INR", shipping=0,
            availability="in_stock", match_score=0.9, evidence_score=0.9,
            evidence_url="http://amazon", evidence="..."
        ),
        ProductOffer(
            platform="Flipkart", title="Case", price=100, currency="INR", shipping=0,
            availability="in_stock", match_score=0.3, evidence_score=0.9,
            evidence_url="http://flipkart", evidence="..."
        )
    ]
    
    rec = rank_offers(offers)
    assert rec is not None
    assert rec.platform == "Amazon"
    assert rec.effective_price == 1000

def test_rank_offers_empty():
    assert rank_offers([]) is None

def test_rank_offers_duplicate_urls():
    offers = [
        ProductOffer(
            platform="Amazon", title="Phone", price=1000, currency="INR", shipping=0,
            availability="in_stock", match_score=0.9, evidence_score=0.9,
            evidence_url="http://amazon", evidence="..."
        ),
        ProductOffer(
            platform="Amazon", title="Phone", price=900, currency="INR", shipping=0,
            availability="in_stock", match_score=0.9, evidence_score=0.9,
            evidence_url="http://amazon", evidence="..."
        )
    ]
    
    # Should only process the first one (price 1000)
    rec = rank_offers(offers)
    assert rec is not None
    assert rec.effective_price == 1000
