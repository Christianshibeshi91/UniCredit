"""Cluster API — FastAPI gateway for the distributed agent system.

Replaces api.py with cluster-aware endpoints that use Redis task queue,
vector store, and phase-based orchestration.
"""

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Header, Depends
from pydantic import BaseModel, Field
import uvicorn

from cluster_config import ClusterConfig
from orchestrator import Orchestrator
from security import APIKeyAuth, RateLimiter, RateLimitConfig, InputSanitizer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

config = ClusterConfig()
orchestrator = Orchestrator(config)
_orchestrator_task = None

# Optional API key auth (set CLUSTER_API_KEYS or AGENT_API_KEYS in .env.cluster)
auth = APIKeyAuth()
_api_keys = os.environ.get("CLUSTER_API_KEYS") or os.environ.get("AGENT_API_KEYS", "")
if _api_keys:
    for key in _api_keys.split(","):
        auth.add_key(key.strip())

rate_limiter = RateLimiter(RateLimitConfig(
    requests_per_minute=60,
    requests_per_hour=1000,
    burst_limit=20,
))


def verify_api_key(x_api_key: Optional[str] = Header(None)):
    """Require valid API key when keys are configured."""
    if not auth.validate(x_api_key or ""):
        raise HTTPException(status_code=401, detail="Invalid API key")


def check_rate_limit(x_api_key: Optional[str] = Header(None)):
    """Enforce rate limit per client."""
    client_id = x_api_key or "anonymous"
    if not rate_limiter.check(client_id):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _orchestrator_task
    await orchestrator.start()
    _orchestrator_task = asyncio.create_task(orchestrator.run())
    logger.info("Cluster API started: host=%s port=%d",
                config.api_host, config.api_port)
    yield
    orchestrator._running = False
    if _orchestrator_task:
        _orchestrator_task.cancel()
    await orchestrator.stop()


app = FastAPI(
    title="AI Computer Agent — Cluster Mode",
    version="2.0.0",
    lifespan=lifespan,
)


# --- Request models ---

class ResearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    priority: str = Field("normal", pattern="^(low|normal|high|critical)$")


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    top_k: int = Field(10, ge=1, le=100)


# --- Endpoints ---

@app.get("/")
async def root():
    return {
        "service": "AI Computer Agent — Cluster Mode",
        "version": "2.0.0",
        "endpoints": {
            "POST /research": "Submit async research task",
            "POST /research/sync": "Run research synchronously",
            "GET /task/{task_id}": "Check task status/result",
            "POST /search": "Semantic search over stored results",
            "GET /status": "Full cluster status",
            "GET /health": "Health check",
        },
    }


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "phase": orchestrator.phase.value,
        "paused": orchestrator._paused,
    }


@app.post("/research",
          dependencies=[Depends(verify_api_key), Depends(check_rate_limit)])
async def submit_research(req: ResearchRequest):
    """Submit an async research task. Returns task_id immediately."""
    query = InputSanitizer.sanitize_query(req.query)
    task_id = await orchestrator.submit_task(query, req.priority)
    return {
        "task_id": task_id,
        "status": "queued",
        "priority": req.priority,
    }


@app.post("/research/sync",
          dependencies=[Depends(verify_api_key), Depends(check_rate_limit)])
async def research_sync(req: ResearchRequest):
    """Run research synchronously (blocks until complete)."""
    query = InputSanitizer.sanitize_query(req.query)
    task_id = await orchestrator.submit_task(query, req.priority)

    # Poll for completion
    for _ in range(600):  # 10 min max
        status = await orchestrator.get_task_status(task_id)
        if status and status["task"].get("state") == "completed":
            return status["result"]
        if status and status["task"].get("state") == "dead":
            raise HTTPException(500, f"Task failed: {status['task'].get('last_error')}")
        await asyncio.sleep(1)

    raise HTTPException(408, "Task timed out")


@app.get("/task/{task_id}", dependencies=[Depends(verify_api_key)])
async def get_task(task_id: str):
    """Get task status and result."""
    status = await orchestrator.get_task_status(task_id)
    if not status:
        raise HTTPException(404, "Task not found")
    return status


@app.post("/search",
          dependencies=[Depends(verify_api_key), Depends(check_rate_limit)])
async def semantic_search(req: SearchRequest):
    """Search across all stored research results using semantic similarity."""
    query = InputSanitizer.sanitize_query(req.query)
    results = await orchestrator.semantic_search(query, req.top_k)
    return {"query": query, "results": results, "count": len(results)}


@app.get("/status", dependencies=[Depends(verify_api_key)])
async def cluster_status():
    """Full cluster status including memory, workers, and queue."""
    status = orchestrator.get_status()
    queue_stats = await orchestrator.task_queue.get_stats()
    vector_count = await orchestrator.vector_store.count()
    status["queue"] = queue_stats
    status["vector_store"] = {"documents": vector_count}
    return status


@app.get("/queue/stats", dependencies=[Depends(verify_api_key)])
async def queue_stats():
    return await orchestrator.task_queue.get_stats()


if __name__ == "__main__":
    uvicorn.run(
        "cluster_api:app",
        host=config.api_host,
        port=config.api_port,
        workers=1,  # Single worker to minimize RAM
        log_level="info",
    )
