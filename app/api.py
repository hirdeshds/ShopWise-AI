from fastapi import FastAPI
from app.schemas import ResearchRequest, ResearchResponse
from app.agent import run_research

app = FastAPI(title="AI Shopping Research Agent")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/research", response_model=ResearchResponse)
def research(request: ResearchRequest):
    return run_research(request)
