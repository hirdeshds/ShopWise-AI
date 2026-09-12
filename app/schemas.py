from pydantic import BaseModel
from typing import Optional, List

class ProductOffer(BaseModel):
    platform: str
    title: str
    price: Optional[float]
    currency: str
    shipping: Optional[float]
    effective_price: Optional[float] = None
    availability: str
    match_score: float
    evidence_score: float
    evidence_url: str = ""
    evidence: str

class Recommendation(BaseModel):
    platform: str
    title: str
    effective_price: float
    currency: str
    reason: str
    confidence: float
    evidence_url: str

class ResearchRequest(BaseModel):
    product: str

class ResearchResponse(BaseModel):
    product_request: str
    searched_at: str
    offers: List[ProductOffer]
    recommendation: Optional[Recommendation]
