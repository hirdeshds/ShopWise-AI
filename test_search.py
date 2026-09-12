from app.search import search_platforms
import json

def test_search():
    results = search_platforms("iPhone 16 Pro 256GB India")
    print("Search Results:")
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    test_search()
