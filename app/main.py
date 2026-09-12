import sys
from app.schemas import ResearchRequest
from app.agent import run_research

def main():
    if len(sys.argv) < 2:
        print("Usage: python -m app.main <product>")
        sys.exit(1)
        
    product_query = " ".join(sys.argv[1:])
    
    print("====================================================================")
    print("AI SHOPPING RESEARCH AGENT")
    print("====================================================================")
    print(f"Product: {product_query}\n")
    
    request = ResearchRequest(product=product_query)
    response = run_research(request)
    
    print(f"{'Platform':<20} {'Price':<15} {'Ship':<10} {'Effective':<15}")
    print("-" * 68)
    
    for offer in response.offers:
        if offer.effective_price:
            price_str = f"{offer.currency} {offer.price:,.2f}" if offer.price else "N/A"
            ship_str = f"{offer.currency} {offer.shipping:,.2f}" if offer.shipping else f"{offer.currency} 0.00"
            eff_str = f"{offer.currency} {offer.effective_price:,.2f}"
            print(f"{offer.platform[:20]:<20} {price_str:<15} {ship_str:<10} {eff_str:<15}")
            
    print("\n--------------------------------------------------------------------")
    print("RECOMMENDATION")
    print("--------------------------------------------------------------------")
    
    if response.recommendation:
        rec = response.recommendation
        print(f"Best option : {rec.platform}")
        print(f"Product     : {rec.title}")
        print(f"Price       : {rec.currency} {rec.effective_price:,.2f}")
        print(f"Confidence  : {rec.confidence * 100:.0f}%")
        print(f"Reason      : {rec.reason}")
        print(f"Verify      : {rec.evidence_url}")
    else:
        print("No reliable recommendation could be made.")
        
    print("====================================================================")

if __name__ == "__main__":
    main()
