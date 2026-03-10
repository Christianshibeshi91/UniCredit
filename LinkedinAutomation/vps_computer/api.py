"""API Server - High-performance multi-agent runtime API.

Designed for VPS with 32-64 cores, 128-512GB RAM, 10-25Gbps network.
Runs multiple uvicorn workers to saturate available CPU cores.
"""

import asyncio
import logging
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import AgentConfig, RuntimeConfig
from agent import AgentController
from runtime import Runtime
from security import RateLimiter, RateLimitConfig, APIKeyAuth, InputSanitizer
from output_formatter import OutputFormatter

logger = logging.getLogger(__name__)

# Global state
runtime: Runtime = None
tasks: dict[str, dict] = {}
rate_limiter = RateLimiter(RateLimitConfig(
    requests_per_minute=200,   # Higher limits for high-perf VPS
    requests_per_hour=5000,
    burst_limit=50,
))
auth = APIKeyAuth()

# Load API keys from env if set
_api_keys = os.environ.get("AGENT_API_KEYS", "")
if _api_keys:
    for key in _api_keys.split(","):
        auth.add_key(key.strip())


def verify_api_key(x_api_key: Optional[str] = Header(None)):
    """Dependency: validate API key if auth is configured."""
    if not auth.validate(x_api_key or ""):
        raise HTTPException(status_code=401, detail="Invalid API key")


def check_rate_limit(x_api_key: Optional[str] = Header(None)):
    """Dependency: check rate limit."""
    client_id = x_api_key or "anonymous"
    if not rate_limiter.check(client_id):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    global runtime
    rt_config = RuntimeConfig()
    runtime = Runtime(config=rt_config)
    await runtime.start()

    # Create a default agent
    await runtime.create_agent("default")

    logger.info(
        "API started: max_agents=%d, pool=%dGB, cores=%d",
        rt_config.max_agents,
        rt_config.memory_pool_mb // 1024,
        os.cpu_count(),
    )
    yield
    await runtime.stop()
    logger.info("API server stopped")


app = FastAPI(
    title="AI Computer Agent API",
    description="High-performance multi-agent autonomous web research runtime",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Models ---

class ResearchRequest(BaseModel):
    query: str = Field(..., description="Natural language research query")
    agent_name: str = Field("default", description="Agent to use (slot name)")
    max_pages: int = Field(50, description="Max pages to scrape")
    max_loops: int = Field(5, description="Max research iterations")
    output_format: str = Field("json", description="json, human, or markdown")
    use_cache: bool = Field(True, description="Use cached results if available")


class CreateAgentRequest(BaseModel):
    name: str = Field(..., description="Agent name")
    model: str = Field("claude-sonnet-4-6", description="LLM model")
    headless: bool = Field(True, description="Run browser headless")
    max_pages: int = Field(50, description="Max pages per task")
    cpu_cores: list[int] | None = Field(None, description="Pin to specific CPU cores")


class ParallelResearchRequest(BaseModel):
    tasks: list[dict] = Field(..., description="List of {agent, query} dicts")


class BroadcastRequest(BaseModel):
    query: str = Field(..., description="Query to send to all idle agents")


class QueueTaskRequest(BaseModel):
    agent_name: str = Field(..., description="Agent name")
    query: str = Field(..., description="Research query")
    priority: str = Field("normal", description="low, normal, high, critical")


class TaskStatus(BaseModel):
    task_id: str
    status: str
    query: str
    created_at: str
    completed_at: str | None = None
    result: dict | None = None
    error: str | None = None


# --- Background task runner ---

async def _run_research_task(task_id: str, slot_id: str, query: str,
                             output_format: str, use_cache: bool = True):
    """Execute research in background."""
    global runtime
    tasks[task_id]["status"] = "running"

    try:
        result = await runtime.run_task(slot_id, query, use_cache=use_cache)

        formatter = OutputFormatter()
        if output_format == "human":
            result["human_output"] = formatter.format_human(
                result["query"], result["results"], result.get("summary", "")
            )
        elif output_format == "markdown":
            result["markdown_output"] = formatter.format_markdown(
                result["query"], result["results"], result.get("summary", "")
            )

        tasks[task_id]["status"] = "completed"
        tasks[task_id]["result"] = result
        tasks[task_id]["completed_at"] = datetime.now(timezone.utc).isoformat()

    except Exception as e:
        logger.error("Task %s failed: %s", task_id, e)
        tasks[task_id]["status"] = "failed"
        tasks[task_id]["error"] = str(e)
        tasks[task_id]["completed_at"] = datetime.now(timezone.utc).isoformat()


def _find_slot_by_name(name: str) -> str:
    """Find agent slot_id by name."""
    for slot_id, slot in runtime._slots.items():
        if slot.name == name:
            return slot_id
    raise HTTPException(status_code=404, detail=f"Agent '{name}' not found")


# --- Agent Management Endpoints ---

@app.post("/agents", dependencies=[Depends(verify_api_key)])
async def create_agent(request: CreateAgentRequest):
    """Create a new agent instance with optional CPU pinning."""
    config = AgentConfig()
    config.llm_model = request.model
    config.browser.headless = request.headless
    config.scraper.max_pages_per_task = request.max_pages

    slot_id = await runtime.create_agent(
        request.name, config, cpu_cores=request.cpu_cores
    )
    return {"slot_id": slot_id, "name": request.name, "status": "idle"}


@app.delete("/agents/{name}", dependencies=[Depends(verify_api_key)])
async def delete_agent(name: str):
    """Remove an agent and free its resources."""
    slot_id = _find_slot_by_name(name)
    await runtime.remove_agent(slot_id)
    return {"removed": name}


@app.get("/agents", dependencies=[Depends(verify_api_key)])
async def list_agents():
    """List all agents with status and resource usage."""
    return runtime.list_agents()


# --- Research Endpoints ---

@app.post("/research",
          dependencies=[Depends(verify_api_key), Depends(check_rate_limit)])
async def start_research(request: ResearchRequest,
                         background_tasks: BackgroundTasks):
    """Start a research task (async - returns immediately with task ID)."""
    query = InputSanitizer.sanitize_query(request.query)
    slot_id = _find_slot_by_name(request.agent_name)

    task_id = str(uuid.uuid4())[:12]
    tasks[task_id] = {
        "task_id": task_id,
        "status": "pending",
        "query": query,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
        "result": None,
        "error": None,
    }

    background_tasks.add_task(
        _run_research_task, task_id, slot_id, query,
        request.output_format, request.use_cache
    )
    return TaskStatus(**tasks[task_id])


@app.post("/research/sync",
          dependencies=[Depends(verify_api_key), Depends(check_rate_limit)])
async def research_sync(request: ResearchRequest):
    """Run research synchronously (blocks until complete)."""
    query = InputSanitizer.sanitize_query(request.query)
    slot_id = _find_slot_by_name(request.agent_name)

    try:
        result = await runtime.run_task(
            slot_id, query, use_cache=request.use_cache
        )

        formatter = OutputFormatter()
        if request.output_format == "human":
            result["human_output"] = formatter.format_human(
                result["query"], result["results"], result.get("summary", "")
            )
        elif request.output_format == "markdown":
            result["markdown_output"] = formatter.format_markdown(
                result["query"], result["results"], result.get("summary", "")
            )

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/research/parallel",
          dependencies=[Depends(verify_api_key), Depends(check_rate_limit)])
async def research_parallel(request: ParallelResearchRequest):
    """Run multiple tasks across agents simultaneously (uses all available cores)."""
    resolved = []
    for t in request.tasks:
        slot_id = _find_slot_by_name(t["agent"])
        resolved.append({"agent": slot_id, "query": t["query"]})

    return await runtime.run_parallel(resolved)


@app.post("/research/broadcast",
          dependencies=[Depends(verify_api_key), Depends(check_rate_limit)])
async def research_broadcast(request: BroadcastRequest):
    """Send the same query to ALL idle agents simultaneously."""
    query = InputSanitizer.sanitize_query(request.query)
    return await runtime.broadcast(query)


@app.post("/queue",
          dependencies=[Depends(verify_api_key), Depends(check_rate_limit)])
async def queue_task(request: QueueTaskRequest):
    """Add a task to the priority queue for background processing."""
    from runtime import TaskPriority
    query = InputSanitizer.sanitize_query(request.query)
    slot_id = _find_slot_by_name(request.agent_name)

    priority_map = {
        "low": TaskPriority.LOW,
        "normal": TaskPriority.NORMAL,
        "high": TaskPriority.HIGH,
        "critical": TaskPriority.CRITICAL,
    }
    priority = priority_map.get(request.priority, TaskPriority.NORMAL)

    task_id = await runtime.task_queue.enqueue(slot_id, query, priority)
    return {"task_id": task_id, "priority": request.priority, "status": "queued"}


# --- Status Endpoints ---

@app.get("/task/{task_id}", dependencies=[Depends(verify_api_key)])
async def get_task(task_id: str):
    """Get task status and results."""
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskStatus(**tasks[task_id])


@app.get("/tasks", dependencies=[Depends(verify_api_key)])
async def list_tasks():
    """List all tasks."""
    return [TaskStatus(**t) for t in tasks.values()]


@app.get("/status", dependencies=[Depends(verify_api_key)])
async def get_status():
    """Get comprehensive runtime status (CPU, RAM, disk, network, agents, cache)."""
    return runtime.get_status()


@app.get("/health")
async def health():
    """Health check."""
    return {
        "status": "ok",
        "agents": len(runtime._slots) if runtime else 0,
        "runtime": runtime._running if runtime else False,
    }


@app.delete("/cache",
            dependencies=[Depends(verify_api_key)])
async def clear_cache():
    """Clear the shared memory pool cache."""
    runtime.memory_pool.clear()
    return {"cleared": True}


@app.get("/cache/stats", dependencies=[Depends(verify_api_key)])
async def cache_stats():
    """Get memory pool cache statistics."""
    return runtime.memory_pool.stats


def start_server():
    """Start the API server with multiple workers."""
    import uvicorn
    rt_config = RuntimeConfig()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    uvicorn.run(
        "api:app",
        host=rt_config.api_host,
        port=rt_config.api_port,
        workers=1,  # Single worker since we use async; scale with max_agents instead
        log_level="info",
    )


if __name__ == "__main__":
    start_server()
