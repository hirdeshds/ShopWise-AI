from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.schemas import ResearchRequest, ResearchResponse
from app.agent import run_research

app = FastAPI(title="AI Shopping Research Agent")

# Allow the Chrome extension and local dev tools to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "chrome-extension://*",   # Chrome extension (any extension ID)
        "http://localhost:*",     # Local dev / Swagger UI
        "http://127.0.0.1:*",
    ],
    allow_origin_regex=r"chrome-extension://.*",
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/research", response_model=ResearchResponse)
def research(request: ResearchRequest):
    return run_research(request)
