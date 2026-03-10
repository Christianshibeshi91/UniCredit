# install.ps1 - Self-contained installer for AI Computer Agent on Windows VPS
# Run as Administrator: powershell -ExecutionPolicy Bypass -File install.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$installDir = "C:\ai-agent"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  AI Computer Agent - VPS Installer" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# --- Step 1: Create install directory ---
Write-Host "[1/9] Creating $installDir ..." -ForegroundColor Yellow
if (Test-Path $installDir) {
    Write-Host "  Directory already exists, cleaning..." -ForegroundColor DarkYellow
    Remove-Item -Recurse -Force "$installDir\*" -ErrorAction SilentlyContinue
} else {
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
}
Write-Host "  Done." -ForegroundColor Green

# --- Step 2: Write all source files ---
Write-Host "[2/9] Writing source files ..." -ForegroundColor Yellow

# --- config.py ---
$configPy = @'
"""Configuration for AI Computer Agent - Optimized for high-performance VPS.

Target spec:
  CPU:     32-64 physical cores (64-128 vCPU)
  RAM:     128-512 GB ECC
  Storage: 1-4 TB NVMe SSD
  Network: 10-25 Gbps
  OS:      Ubuntu Server / Debian
"""

import os
from dataclasses import dataclass, field


@dataclass
class BrowserConfig:
    headless: bool = True
    slow_mo: int = 0  # No delay on high-perf hardware
    timeout: int = 30000  # 30s page timeout
    viewport_width: int = 1920
    viewport_height: int = 1080
    user_agent: str = (
        "Mozilla/5.0 (X11; Linux x86_64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    )


@dataclass
class SearchConfig:
    max_results_per_query: int = 20
    max_search_queries: int = 5
    search_engine: str = "google"  # google, duckduckgo


@dataclass
class ScraperConfig:
    max_pages_per_task: int = 50  # More pages with 10-25Gbps bandwidth
    request_delay: float = 0.5   # Faster with high bandwidth
    max_content_length: int = 200000  # 200K chars - RAM is cheap
    respect_robots_txt: bool = True


@dataclass
class RuntimeConfig:
    """Runtime-level config for the VPS environment."""
    max_agents: int = int(os.environ.get("MAX_AGENTS", "50"))
    memory_pool_mb: int = int(os.environ.get("MEMORY_POOL_MB", "65536"))  # 64GB default
    worker_processes: int = int(os.environ.get("WORKER_PROCESSES", "0"))  # 0 = auto (cores/2)
    task_queue_size: int = 10000
    task_timeout_seconds: int = 600  # 10 min
    max_retries: int = 3
    # Per-agent limits
    agent_memory_limit_mb: int = 4096  # 4GB per agent
    agent_max_pages: int = 50
    agent_max_concurrent_requests: int = 10
    # Uvicorn workers
    api_workers: int = int(os.environ.get("API_WORKERS", "8"))
    api_host: str = os.environ.get("API_HOST", "0.0.0.0")
    api_port: int = int(os.environ.get("API_PORT", "8000"))


@dataclass
class AgentConfig:
    max_loop_iterations: int = 5  # More iterations for deeper research
    llm_provider: str = "ollama"  # "ollama" or "anthropic"
    llm_model: str = "qwen3:4b"
    llm_api_key: str = field(default_factory=lambda: os.environ.get("ANTHROPIC_API_KEY", ""))
    ollama_host: str = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434")
    browser: BrowserConfig = field(default_factory=BrowserConfig)
    search: SearchConfig = field(default_factory=SearchConfig)
    scraper: ScraperConfig = field(default_factory=ScraperConfig)
    api_host: str = "0.0.0.0"
    api_port: int = 8000
'@
Set-Content -Path "$installDir\config.py" -Value $configPy -Encoding UTF8
Write-Host "  config.py" -ForegroundColor DarkGray

# --- api.py ---
$apiPy = @'
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


@app.get("/agents")
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

@app.get("/task/{task_id}")
async def get_task(task_id: str):
    """Get task status and results."""
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskStatus(**tasks[task_id])


@app.get("/tasks")
async def list_tasks():
    """List all tasks."""
    return [TaskStatus(**t) for t in tasks.values()]


@app.get("/status")
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


@app.get("/cache/stats")
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
'@
Set-Content -Path "$installDir\api.py" -Value $apiPy -Encoding UTF8
Write-Host "  api.py" -ForegroundColor DarkGray

# --- agent.py ---
$agentPy = @'
"""Agent Controller - Core reasoning and planning engine.

Supports both Ollama (local LLM) and Anthropic (cloud) backends.
Default: Ollama with Qwen 3.4B at http://127.0.0.1:11434
"""

import asyncio
import json
import logging
import httpx
from typing import Optional

from config import AgentConfig
from browser_controller import BrowserController
from search_module import SearchModule, SearchResult
from scraper import Scraper, PageData
from data_processor import DataProcessor
from output_formatter import OutputFormatter

logger = logging.getLogger(__name__)


class AgentController:
    """
    Main AI agent that orchestrates research tasks.
    Implements a reasoning loop: Plan -> Search -> Scrape -> Analyze -> Output.
    """

    def __init__(self, config: AgentConfig = None):
        self.config = config or AgentConfig()
        self.browser = BrowserController(self.config.browser)
        self.search = SearchModule(self.browser, self.config.search)
        self.scraper = Scraper(self.browser, self.config.scraper)
        self.processor = DataProcessor()
        self.formatter = OutputFormatter()
        self._http_client = httpx.AsyncClient(timeout=120.0)
        self._running = False

    async def start(self):
        """Initialize the agent and browser."""
        await self.browser.start()
        self._running = True
        logger.info("Agent started (provider=%s, model=%s, host=%s)",
                     self.config.llm_provider, self.config.llm_model,
                     self.config.ollama_host)

    async def stop(self):
        """Shut down the agent."""
        self._running = False
        await self.browser.stop()
        await self._http_client.aclose()
        logger.info("Agent stopped")

    async def research(self, query: str) -> dict:
        """
        Main entry point: execute a full research task.
        Returns structured JSON results.
        """
        logger.info("Starting research: %s", query)

        # Step 1: Plan
        plan = await self._create_plan(query)
        logger.info("Plan: %s", json.dumps(plan, indent=2))

        all_results = []

        for iteration in range(self.config.max_loop_iterations):
            logger.info("Research loop iteration %d/%d",
                        iteration + 1, self.config.max_loop_iterations)

            # Step 2: Search
            search_results = await self.search.multi_search(plan["search_queries"])

            # Step 3: Select pages to scrape
            urls_to_scrape = await self._select_urls(
                query, search_results, plan
            )

            # Step 4: Scrape selected pages
            page_data_list = await self.scraper.scrape_multiple(urls_to_scrape)

            # Step 5: Extract and process data
            extracted = await self._extract_data(query, page_data_list, plan)
            all_results.extend(extracted)

            # Step 6: Check if we have enough results
            assessment = await self._assess_results(query, all_results, plan)
            if assessment["sufficient"]:
                logger.info("Results sufficient, ending research loop")
                break

            # Update plan for next iteration
            if assessment.get("new_queries"):
                plan["search_queries"] = assessment["new_queries"]
                logger.info("Refining search with new queries: %s",
                            assessment["new_queries"])

        # Step 7: Final processing
        all_results = self.processor.deduplicate(all_results)
        all_results = self.processor.rank_by_relevance(all_results, query)
        all_results = self.processor.filter_results(all_results)

        # Step 8: Generate summary
        summary = await self._generate_summary(query, all_results)

        # Step 9: Format output
        output = self.formatter.format_json(
            query=query,
            results=all_results,
            summary=summary,
            metadata={
                "plan": plan,
                "iterations": iteration + 1,
                "pages_scraped": len(page_data_list),
            }
        )

        logger.info("Research complete: %d results", len(all_results))
        return output

    # --- LLM Backend ---

    async def _llm_call(self, system: str, prompt: str,
                        max_tokens: int = 2000) -> str:
        """Make a call to the LLM (Ollama or Anthropic)."""
        if self.config.llm_provider == "ollama":
            return await self._ollama_call(system, prompt)
        else:
            return await self._anthropic_call(system, prompt, max_tokens)

    async def _ollama_call(self, system: str, prompt: str) -> str:
        """Call Ollama API at the remote host."""
        url = f"{self.config.ollama_host}/api/chat"
        payload = {
            "model": self.config.llm_model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            "stream": False,
            "options": {
                "temperature": 0.3,
                "num_predict": 2000,
            },
        }

        response = await self._http_client.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        return data["message"]["content"]

    async def _anthropic_call(self, system: str, prompt: str,
                              max_tokens: int = 2000) -> str:
        """Call Anthropic API (fallback)."""
        import anthropic
        client = anthropic.Anthropic(api_key=self.config.llm_api_key)
        response = client.messages.create(
            model=self.config.llm_model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text

    async def _llm_json(self, system: str, prompt: str,
                        max_tokens: int = 2000) -> dict:
        """Make an LLM call and parse JSON from response."""
        text = await self._llm_call(system, prompt, max_tokens)
        # Extract JSON from response (handle markdown code blocks)
        text = text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1])
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Try to find JSON in the text
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(text[start:end])
            raise

    # --- Research Steps ---

    async def _create_plan(self, query: str) -> dict:
        """Use LLM to create a research plan."""
        system = (
            "You are a research planning assistant. Create a research plan "
            "for the given query. Return JSON only."
        )
        prompt = f"""Create a research plan for this query:
"{query}"

Return JSON with:
{{
    "search_queries": ["list of 2-3 search queries to execute"],
    "data_type": "job|product|article|general",
    "key_fields": ["fields to extract from results"],
    "criteria": ["filtering criteria from the query"],
    "strategy": "brief description of approach"
}}"""

        return await self._llm_json(system, prompt)

    async def _select_urls(self, query: str,
                           search_results: list[SearchResult],
                           plan: dict) -> list[str]:
        """Use LLM to select the most relevant URLs to scrape."""
        results_text = "\n".join(
            f"{i+1}. {r.title} - {r.url}\n   {r.snippet}"
            for i, r in enumerate(search_results[:20])
        )

        system = "You select the most relevant URLs to visit for research. Return JSON only."
        prompt = f"""Query: "{query}"
Strategy: {plan.get('strategy', '')}

Search results:
{results_text}

Select the most relevant URLs to visit (max {self.config.scraper.max_pages_per_task}).
Return JSON: {{"urls": ["url1", "url2", ...]}}"""

        result = await self._llm_json(system, prompt, max_tokens=1000)
        urls = result.get("urls", [])
        logger.info("Selected %d URLs to scrape", len(urls))
        return urls

    async def _extract_data(self, query: str,
                            pages: list[PageData],
                            plan: dict) -> list[dict]:
        """Use LLM to extract relevant data from scraped pages."""
        extracted = []

        for page in pages:
            content = page.content[:8000]  # Limit for token budget
            data_type = plan.get("data_type", "general")
            key_fields = plan.get("key_fields", [])

            system = (
                "You extract structured data from webpage content. "
                "Return JSON only."
            )
            prompt = f"""Extract {data_type} data from this webpage.

URL: {page.url}
Title: {page.title}

Content:
{content}

Query: "{query}"
Fields to extract: {key_fields}

Return JSON:
{{
    "items": [
        {{
            "title": "...",
            "url": "{page.url}",
            "summary": "brief summary",
            ... other relevant fields
        }}
    ]
}}

If no relevant data found, return {{"items": []}}"""

            try:
                result = await self._llm_json(system, prompt, max_tokens=3000)
                items = result.get("items", [])
                for item in items:
                    item.setdefault("url", page.url)
                    item.setdefault("source_title", page.title)
                extracted.extend(items)
            except Exception as e:
                logger.error("Failed to extract from %s: %s", page.url, e)
                # Fallback: add raw page data
                extracted.append({
                    "title": page.title,
                    "url": page.url,
                    "summary": content[:500],
                    "content": content,
                })

        logger.info("Extracted %d items from %d pages", len(extracted), len(pages))
        return extracted

    async def _assess_results(self, query: str, results: list[dict],
                              plan: dict) -> dict:
        """Assess if current results are sufficient or need more research."""
        if not results:
            return {
                "sufficient": False,
                "new_queries": plan.get("search_queries", []),
            }

        results_summary = json.dumps(
            [{"title": r.get("title", ""), "url": r.get("url", "")}
             for r in results[:20]],
            indent=2
        )

        system = "You assess research completeness. Return JSON only."
        prompt = f"""Query: "{query}"
Criteria: {plan.get('criteria', [])}
Results so far ({len(results)} items):
{results_summary}

Are these results sufficient to answer the query?
Return JSON:
{{
    "sufficient": true/false,
    "reason": "why sufficient or not",
    "new_queries": ["optional new search queries if not sufficient"]
}}"""

        try:
            return await self._llm_json(system, prompt, max_tokens=500)
        except Exception:
            # Default: consider sufficient after getting some results
            return {"sufficient": len(results) >= 5}

    async def _generate_summary(self, query: str,
                                results: list[dict]) -> str:
        """Generate a natural language summary of the results."""
        truncated = self.processor.truncate_content(results.copy())
        results_text = json.dumps(truncated[:15], indent=2, default=str)

        system = "You summarize research findings concisely."
        prompt = f"""Summarize these research results for the query: "{query}"

Results:
{results_text}

Write a clear 2-4 paragraph summary of the key findings.
Include specific data points (numbers, names, etc.) where available."""

        return await self._llm_call(system, prompt, max_tokens=1000)
'@
Set-Content -Path "$installDir\agent.py" -Value $agentPy -Encoding UTF8
Write-Host "  agent.py" -ForegroundColor DarkGray

# --- browser_controller.py ---
$browserControllerPy = @'
"""Browser Controller - Handles all Playwright browser automation."""

import asyncio
import logging
import os
from typing import Optional
from playwright.async_api import async_playwright, Browser, BrowserContext, Page
from config import BrowserConfig

logger = logging.getLogger(__name__)


class BrowserController:
    """Controls a Playwright browser for autonomous web navigation."""

    def __init__(self, config: BrowserConfig = None):
        self.config = config or BrowserConfig()
        self._playwright = None
        self._browser: Optional[Browser] = None
        self._context: Optional[BrowserContext] = None
        self._page: Optional[Page] = None

    async def start(self):
        """Launch browser."""
        self._playwright = await async_playwright().start()
        # Detect Docker/container environment
        chromium_args = []
        if os.path.exists("/.dockerenv") or os.environ.get("CONTAINER"):
            chromium_args = [
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
            ]

        self._browser = await self._playwright.chromium.launch(
            headless=self.config.headless,
            slow_mo=self.config.slow_mo,
            args=chromium_args,
        )
        self._context = await self._browser.new_context(
            viewport={
                "width": self.config.viewport_width,
                "height": self.config.viewport_height,
            },
            user_agent=self.config.user_agent,
        )
        self._page = await self._context.new_page()
        self._page.set_default_timeout(self.config.timeout)
        logger.info("Browser started (headless=%s)", self.config.headless)

    async def stop(self):
        """Close browser."""
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()
        self._browser = None
        self._context = None
        self._page = None
        logger.info("Browser stopped")

    async def goto(self, url: str) -> str:
        """Navigate to URL. Returns page title."""
        try:
            await self._page.goto(url, wait_until="domcontentloaded")
            title = await self._page.title()
            logger.info("Navigated to %s (%s)", url, title)
            return title
        except Exception as e:
            logger.error("Failed to navigate to %s: %s", url, e)
            raise

    async def get_page_content(self) -> str:
        """Get the visible text content of the current page."""
        return await self._page.evaluate("""
            () => {
                // Remove script/style/nav/footer elements
                const remove = document.querySelectorAll(
                    'script, style, nav, footer, header, iframe, noscript, svg'
                );
                const clone = document.body.cloneNode(true);
                const removeFromClone = clone.querySelectorAll(
                    'script, style, nav, footer, header, iframe, noscript, svg'
                );
                removeFromClone.forEach(el => el.remove());
                return clone.innerText.replace(/\\n{3,}/g, '\\n\\n').trim();
            }
        """)

    async def get_page_html(self) -> str:
        """Get the HTML of the current page."""
        return await self._page.content()

    async def get_links(self) -> list[dict]:
        """Get all links on the current page."""
        return await self._page.evaluate("""
            () => {
                return Array.from(document.querySelectorAll('a[href]'))
                    .map(a => ({
                        text: a.innerText.trim().substring(0, 200),
                        href: a.href
                    }))
                    .filter(l => l.text && l.href.startsWith('http'));
            }
        """)

    async def click(self, selector: str):
        """Click an element."""
        await self._page.click(selector)
        await self._page.wait_for_load_state("domcontentloaded")

    async def fill(self, selector: str, text: str):
        """Fill a form field."""
        await self._page.fill(selector, text)

    async def press(self, key: str):
        """Press a key."""
        await self._page.keyboard.press(key)

    async def scroll_down(self):
        """Scroll down the page."""
        await self._page.evaluate("window.scrollBy(0, window.innerHeight)")
        await asyncio.sleep(0.5)

    async def screenshot(self, path: str = "screenshot.png") -> str:
        """Take a screenshot."""
        await self._page.screenshot(path=path)
        return path

    async def wait_for_selector(self, selector: str, timeout: int = 10000):
        """Wait for a selector to appear."""
        await self._page.wait_for_selector(selector, timeout=timeout)

    async def get_current_url(self) -> str:
        """Get current page URL."""
        return self._page.url

    async def go_back(self):
        """Navigate back."""
        await self._page.go_back(wait_until="domcontentloaded")

    async def new_page(self) -> Page:
        """Open a new tab."""
        page = await self._context.new_page()
        page.set_default_timeout(self.config.timeout)
        return page

    async def close_page(self, page: Page):
        """Close a specific page/tab."""
        await page.close()
'@
Set-Content -Path "$installDir\browser_controller.py" -Value $browserControllerPy -Encoding UTF8
Write-Host "  browser_controller.py" -ForegroundColor DarkGray

# --- cli.py ---
$cliPy = @'
"""CLI Interface for AI Computer Agent."""

import asyncio
import argparse
import json
import logging
import sys

from config import AgentConfig
from agent import AgentController
from output_formatter import OutputFormatter


def setup_logging(verbose: bool = False):
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )


async def run_research(query: str, config: AgentConfig,
                       output_format: str = "human") -> str:
    """Run a research query and return formatted output."""
    agent = AgentController(config)
    formatter = OutputFormatter()

    try:
        await agent.start()
        results = await agent.research(query)

        if output_format == "json":
            return json.dumps(results, indent=2, default=str)
        elif output_format == "markdown":
            return formatter.format_markdown(
                results["query"],
                results["results"],
                results.get("summary", ""),
            )
        else:
            return formatter.format_human(
                results["query"],
                results["results"],
                results.get("summary", ""),
            )
    finally:
        await agent.stop()


async def interactive_mode(config: AgentConfig):
    """Run in interactive REPL mode."""
    agent = AgentController(config)
    formatter = OutputFormatter()

    try:
        await agent.start()
        print("\nAI Computer Agent - Interactive Mode")
        print("Type 'quit' to exit, 'help' for commands\n")

        while True:
            try:
                query = input("Query> ").strip()
            except (EOFError, KeyboardInterrupt):
                break

            if not query:
                continue
            if query.lower() in ("quit", "exit", "q"):
                break
            if query.lower() == "help":
                print("Commands:")
                print("  <query>     - Research a topic")
                print("  quit        - Exit")
                print("  headless    - Toggle headless mode")
                continue
            if query.lower() == "headless":
                config.browser.headless = not config.browser.headless
                print(f"Headless mode: {config.browser.headless}")
                continue

            print(f"\nResearching: {query}\n")
            try:
                results = await agent.research(query)
                output = formatter.format_human(
                    results["query"],
                    results["results"],
                    results.get("summary", ""),
                )
                print(output)
                print()
            except Exception as e:
                print(f"Error: {e}\n")

    finally:
        await agent.stop()


def main():
    parser = argparse.ArgumentParser(
        description="AI Computer Agent - Autonomous Web Research"
    )
    parser.add_argument(
        "query", nargs="?", help="Research query (omit for interactive mode)"
    )
    parser.add_argument(
        "-f", "--format",
        choices=["human", "json", "markdown"],
        default="human",
        help="Output format (default: human)",
    )
    parser.add_argument(
        "-o", "--output", help="Output file path"
    )
    parser.add_argument(
        "--headless", action="store_true", default=True,
        help="Run browser in headless mode (default)",
    )
    parser.add_argument(
        "--visible", action="store_true",
        help="Run browser in visible mode",
    )
    parser.add_argument(
        "-v", "--verbose", action="store_true",
        help="Enable verbose logging",
    )
    parser.add_argument(
        "--model", default="claude-sonnet-4-6",
        help="LLM model to use",
    )
    parser.add_argument(
        "--max-pages", type=int, default=15,
        help="Maximum pages to scrape per query",
    )
    parser.add_argument(
        "--max-loops", type=int, default=3,
        help="Maximum research loop iterations",
    )
    parser.add_argument(
        "--search-engine", choices=["google", "duckduckgo"],
        default="google", help="Search engine to use",
    )

    args = parser.parse_args()
    setup_logging(args.verbose)

    config = AgentConfig()
    config.llm_model = args.model
    config.max_loop_iterations = args.max_loops
    config.browser.headless = not args.visible
    config.scraper.max_pages_per_task = args.max_pages
    config.search.search_engine = args.search_engine

    if not config.llm_api_key:
        print("Error: ANTHROPIC_API_KEY environment variable not set")
        sys.exit(1)

    if args.query:
        output = asyncio.run(run_research(args.query, config, args.format))
        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                f.write(output)
            print(f"Results saved to {args.output}")
        else:
            print(output)
    else:
        asyncio.run(interactive_mode(config))


if __name__ == "__main__":
    main()
'@
Set-Content -Path "$installDir\cli.py" -Value $cliPy -Encoding UTF8
Write-Host "  cli.py" -ForegroundColor DarkGray

# --- data_processor.py ---
$dataProcessorPy = @'
"""Data Processor - Filters, deduplicates, ranks, and structures results."""

import logging
from typing import Optional
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


class DataProcessor:
    """Processes and structures extracted data."""

    def deduplicate(self, results: list[dict]) -> list[dict]:
        """Remove duplicate results based on URL."""
        seen = set()
        unique = []
        for r in results:
            url = self._normalize_url(r.get("url", ""))
            if url and url not in seen:
                seen.add(url)
                unique.append(r)
        logger.info("Deduplicated: %d -> %d results", len(results), len(unique))
        return unique

    def _normalize_url(self, url: str) -> str:
        """Normalize URL for dedup."""
        parsed = urlparse(url)
        return f"{parsed.netloc}{parsed.path}".rstrip("/").lower()

    def rank_by_relevance(self, results: list[dict], query: str) -> list[dict]:
        """Simple keyword-based relevance ranking."""
        query_words = set(query.lower().split())

        for r in results:
            score = 0
            text = f"{r.get('title', '')} {r.get('summary', '')} {r.get('snippet', '')}".lower()

            for word in query_words:
                if word in text:
                    score += 1
                # Boost for title match
                if word in r.get("title", "").lower():
                    score += 2

            # Boost for having structured data
            if r.get("structured"):
                score += 3

            r["relevance_score"] = score

        results.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)
        return results

    def filter_results(self, results: list[dict],
                       min_content_length: int = 50,
                       required_fields: list[str] = None) -> list[dict]:
        """Filter out low-quality results."""
        filtered = []
        for r in results:
            content = r.get("content", "") or r.get("summary", "") or r.get("snippet", "")
            if len(content) < min_content_length:
                continue

            if required_fields:
                if all(r.get(f) for f in required_fields):
                    filtered.append(r)
            else:
                filtered.append(r)

        logger.info("Filtered: %d -> %d results", len(results), len(filtered))
        return filtered

    def merge_results(self, *result_sets: list[dict]) -> list[dict]:
        """Merge multiple result sets and deduplicate."""
        merged = []
        for result_set in result_sets:
            merged.extend(result_set)
        return self.deduplicate(merged)

    def truncate_content(self, results: list[dict], max_chars: int = 3000) -> list[dict]:
        """Truncate content fields to limit token usage for LLM."""
        for r in results:
            if "content" in r and len(r["content"]) > max_chars:
                r["content"] = r["content"][:max_chars] + "..."
            if "raw_content" in r and len(r["raw_content"]) > max_chars:
                r["raw_content"] = r["raw_content"][:max_chars] + "..."
        return results
'@
Set-Content -Path "$installDir\data_processor.py" -Value $dataProcessorPy -Encoding UTF8
Write-Host "  data_processor.py" -ForegroundColor DarkGray

# --- output_formatter.py ---
$outputFormatterPy = @'
"""Output Formatter - Formats results for human and machine consumption."""

import json
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class OutputFormatter:
    """Formats research results into human-readable and machine-readable formats."""

    def format_json(self, query: str, results: list[dict],
                    summary: str = "", metadata: dict = None) -> dict:
        """Format results as structured JSON."""
        output = {
            "query": query,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "summary": summary,
            "result_count": len(results),
            "results": [self._clean_result(r) for r in results],
        }
        if metadata:
            output["metadata"] = metadata
        return output

    def _clean_result(self, result: dict) -> dict:
        """Clean a result dict for JSON output."""
        clean = {}
        keep_fields = [
            "title", "url", "summary", "snippet", "relevance_score",
            "company", "salary", "location", "price", "author",
            "publication_date", "key_insights", "type",
        ]
        for field in keep_fields:
            if field in result and result[field]:
                clean[field] = result[field]

        # Include any structured data
        if "structured" in result:
            clean["structured_data"] = result["structured"]

        return clean

    def format_human(self, query: str, results: list[dict],
                     summary: str = "") -> str:
        """Format results as human-readable text."""
        lines = []
        lines.append(f"Research Results: {query}")
        lines.append("=" * 60)

        if summary:
            lines.append("")
            lines.append("Summary:")
            lines.append(summary)
            lines.append("")

        lines.append(f"Found {len(results)} results:")
        lines.append("-" * 40)

        for i, r in enumerate(results, 1):
            lines.append(f"\n{i}. {r.get('title', 'Untitled')}")
            if r.get("url"):
                lines.append(f"   URL: {r['url']}")
            if r.get("summary") or r.get("snippet"):
                text = r.get("summary") or r.get("snippet")
                lines.append(f"   {text[:300]}")
            if r.get("salary"):
                lines.append(f"   Salary: {r['salary']}")
            if r.get("company"):
                lines.append(f"   Company: {r['company']}")
            if r.get("price"):
                lines.append(f"   Price: {r['price']}")
            if r.get("relevance_score"):
                lines.append(f"   Relevance: {r['relevance_score']}/10")

        lines.append("")
        lines.append(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
        return "\n".join(lines)

    def format_markdown(self, query: str, results: list[dict],
                        summary: str = "") -> str:
        """Format results as Markdown."""
        lines = []
        lines.append(f"# Research: {query}\n")

        if summary:
            lines.append(f"## Summary\n{summary}\n")

        lines.append(f"## Results ({len(results)} found)\n")

        for i, r in enumerate(results, 1):
            title = r.get("title", "Untitled")
            url = r.get("url", "")
            lines.append(f"### {i}. [{title}]({url})\n")

            if r.get("summary") or r.get("snippet"):
                lines.append(f"{r.get('summary') or r.get('snippet')}\n")

            details = []
            for field in ["company", "salary", "location", "price", "author"]:
                if r.get(field):
                    details.append(f"- **{field.title()}**: {r[field]}")
            if details:
                lines.append("\n".join(details) + "\n")

        return "\n".join(lines)
'@
Set-Content -Path "$installDir\output_formatter.py" -Value $outputFormatterPy -Encoding UTF8
Write-Host "  output_formatter.py" -ForegroundColor DarkGray

# --- runtime.py ---
$runtimePy = @'
"""Runtime Manager - High-performance multi-agent execution environment.

Designed for:
  CPU:     32-64 cores (64-128 vCPU)
  RAM:     128-512 GB ECC
  Storage: 1-4 TB NVMe SSD
  Network: 10-25 Gbps

Supports 50+ concurrent AI agents with isolated browser contexts,
a 64GB shared memory pool, process-level worker isolation, and
a persistent task queue with priority scheduling.
"""

import asyncio
import logging
import multiprocessing
import os
import psutil
import time
import uuid
from collections import deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

from config import AgentConfig, RuntimeConfig
from agent import AgentController

logger = logging.getLogger(__name__)


class AgentStatus(Enum):
    IDLE = "idle"
    RUNNING = "running"
    PAUSED = "paused"
    FAILED = "failed"
    COMPLETED = "completed"


class TaskPriority(Enum):
    LOW = 0
    NORMAL = 1
    HIGH = 2
    CRITICAL = 3


@dataclass
class AgentSlot:
    """A slot for a running agent instance."""
    slot_id: str
    name: str
    agent: Optional[AgentController] = None
    status: AgentStatus = AgentStatus.IDLE
    config: AgentConfig = field(default_factory=AgentConfig)
    created_at: float = field(default_factory=time.time)
    tasks_completed: int = 0
    tasks_failed: int = 0
    current_task: Optional[str] = None
    memory_mb: float = 0.0
    cpu_affinity: Optional[list[int]] = None  # Pin to specific cores
    errors: list = field(default_factory=list)
    task_history: deque = field(default_factory=lambda: deque(maxlen=100))


@dataclass
class ResourceLimits:
    """Resource limits per agent slot."""
    max_memory_mb: int = 4096   # 4GB per agent (can fit 32-128 agents in 128-512GB)
    max_pages: int = 50
    max_concurrent_requests: int = 10
    task_timeout_seconds: int = 600  # 10 min per task
    max_retries: int = 3


class MemoryPool:
    """
    High-capacity in-process memory pool (default 64GB).
    LRU eviction, thread-safe, with namespace isolation per agent.
    """

    def __init__(self, max_size_mb: int = 65536):
        self.max_size_mb = max_size_mb
        self._cache: dict[str, Any] = {}
        self._access_times: dict[str, float] = {}
        self._size_bytes: int = 0
        self._hits: int = 0
        self._misses: int = 0
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        async with self._lock:
            if key in self._cache:
                self._access_times[key] = time.time()
                self._hits += 1
                return self._cache[key]
            self._misses += 1
            return None

    async def put(self, key: str, value: Any, size_bytes: int = 0):
        async with self._lock:
            estimated = size_bytes or len(str(value))
            # Evict LRU if over limit
            while (self._size_bytes + estimated) > self.max_size_mb * 1024 * 1024:
                if not self._cache:
                    break
                oldest_key = min(self._access_times, key=self._access_times.get)
                self._evict(oldest_key)

            self._cache[key] = value
            self._access_times[key] = time.time()
            self._size_bytes += estimated

    def _evict(self, key: str):
        if key in self._cache:
            val = self._cache.pop(key)
            self._access_times.pop(key, None)
            self._size_bytes -= len(str(val))
            self._size_bytes = max(0, self._size_bytes)

    async def get_or_compute(self, key: str, compute_fn, ttl_seconds: int = 3600) -> Any:
        """Get from cache or compute and store."""
        cached = await self.get(key)
        if cached is not None:
            # Check TTL
            age = time.time() - self._access_times.get(key, 0)
            if age < ttl_seconds:
                return cached

        result = await compute_fn()
        await self.put(key, result)
        return result

    async def invalidate_namespace(self, namespace: str):
        """Remove all entries matching a namespace prefix."""
        async with self._lock:
            keys_to_remove = [k for k in self._cache if k.startswith(namespace)]
            for key in keys_to_remove:
                self._evict(key)

    def clear(self):
        self._cache.clear()
        self._access_times.clear()
        self._size_bytes = 0
        self._hits = 0
        self._misses = 0

    @property
    def stats(self) -> dict:
        hit_rate = (self._hits / max(1, self._hits + self._misses)) * 100
        return {
            "entries": len(self._cache),
            "size_mb": round(self._size_bytes / (1024 * 1024), 2),
            "max_size_mb": self.max_size_mb,
            "hit_rate_pct": round(hit_rate, 1),
            "hits": self._hits,
            "misses": self._misses,
        }


class TaskQueue:
    """Priority task queue with configurable size."""

    def __init__(self, max_size: int = 10000):
        self._queue: asyncio.PriorityQueue = None
        self.max_size = max_size
        self._pending: int = 0
        self._processed: int = 0

    async def start(self):
        self._queue = asyncio.PriorityQueue(maxsize=self.max_size)

    async def enqueue(self, slot_id: str, query: str,
                      priority: TaskPriority = TaskPriority.NORMAL,
                      callback=None) -> str:
        """Add task to queue. Returns task_id."""
        task_id = str(uuid.uuid4())[:12]
        item = (
            -priority.value,  # Negative for max-priority-first
            time.time(),
            {
                "task_id": task_id,
                "slot_id": slot_id,
                "query": query,
                "callback": callback,
            }
        )
        await self._queue.put(item)
        self._pending += 1
        return task_id

    async def dequeue(self) -> dict:
        """Get next task from queue."""
        _, _, task = await self._queue.get()
        self._pending -= 1
        self._processed += 1
        return task

    @property
    def stats(self) -> dict:
        return {
            "pending": self._pending,
            "processed": self._processed,
            "max_size": self.max_size,
        }


class Runtime:
    """
    High-performance multi-agent runtime.

    Manages 50+ concurrent AI agents with:
    - Isolated browser contexts per agent
    - 64GB shared LRU memory pool
    - Priority task queue (10K capacity)
    - CPU core affinity for agents
    - Per-agent memory tracking
    - Process-level resource monitoring
    - Auto-restart on agent failure
    """

    def __init__(self, config: RuntimeConfig = None):
        self.config = config or RuntimeConfig()
        self.memory_pool = MemoryPool(max_size_mb=self.config.memory_pool_mb)
        self.task_queue = TaskQueue(max_size=self.config.task_queue_size)
        self.default_limits = ResourceLimits(
            max_memory_mb=self.config.agent_memory_limit_mb,
            max_pages=self.config.agent_max_pages,
            max_concurrent_requests=self.config.agent_max_concurrent_requests,
            task_timeout_seconds=self.config.task_timeout_seconds,
            max_retries=self.config.max_retries,
        )
        self._slots: dict[str, AgentSlot] = {}
        self._running = False
        self._lock = asyncio.Lock()
        self._semaphore: asyncio.Semaphore = None
        self._queue_workers: list[asyncio.Task] = []
        self._total_cores = multiprocessing.cpu_count()

    async def start(self):
        """Start the runtime and queue workers."""
        self._running = True
        self._semaphore = asyncio.Semaphore(self.config.max_agents)
        await self.task_queue.start()

        # Start queue worker coroutines (one per 4 cores)
        num_workers = self.config.worker_processes or max(1, self._total_cores // 4)
        for i in range(num_workers):
            worker = asyncio.create_task(self._queue_worker(i))
            self._queue_workers.append(worker)

        logger.info(
            "Runtime started: max_agents=%d, pool=%dMB, cores=%d, workers=%d",
            self.config.max_agents,
            self.config.memory_pool_mb,
            self._total_cores,
            num_workers,
        )

    async def stop(self):
        """Stop all agents, workers, and shut down."""
        self._running = False

        # Cancel queue workers
        for worker in self._queue_workers:
            worker.cancel()
        self._queue_workers.clear()

        # Stop all agents
        for slot_id in list(self._slots.keys()):
            await self.remove_agent(slot_id)

        self.memory_pool.clear()
        logger.info("Runtime stopped")

    async def _queue_worker(self, worker_id: int):
        """Background worker that processes tasks from the queue."""
        logger.info("Queue worker %d started", worker_id)
        while self._running:
            try:
                task = await asyncio.wait_for(
                    self.task_queue.dequeue(), timeout=5.0
                )
                slot_id = task["slot_id"]
                query = task["query"]
                callback = task.get("callback")

                try:
                    result = await self.run_task(slot_id, query)
                    if callback:
                        await callback(task["task_id"], result, None)
                except Exception as e:
                    logger.error("Worker %d task failed: %s", worker_id, e)
                    if callback:
                        await callback(task["task_id"], None, str(e))

            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Worker %d error: %s", worker_id, e)
                await asyncio.sleep(1)

    async def create_agent(self, name: str,
                           config: AgentConfig = None,
                           cpu_cores: list[int] = None) -> str:
        """
        Create a new agent slot. Returns slot_id.
        Optionally pin to specific CPU cores for performance isolation.
        """
        async with self._lock:
            if len(self._slots) >= self.config.max_agents:
                raise RuntimeError(
                    f"Max agents ({self.config.max_agents}) reached. "
                    "Remove an agent first."
                )

            slot_id = str(uuid.uuid4())[:8]
            config = config or AgentConfig()
            agent = AgentController(config)

            slot = AgentSlot(
                slot_id=slot_id,
                name=name,
                agent=agent,
                config=config,
                cpu_affinity=cpu_cores,
            )
            self._slots[slot_id] = slot

        await agent.start()
        slot.status = AgentStatus.IDLE

        # Set CPU affinity if specified (Linux only)
        if cpu_cores and hasattr(os, "sched_setaffinity"):
            try:
                os.sched_setaffinity(0, cpu_cores)
            except OSError:
                pass

        logger.info("Agent '%s' created (slot=%s, cores=%s)",
                     name, slot_id, cpu_cores)
        return slot_id

    async def remove_agent(self, slot_id: str):
        """Stop and remove an agent."""
        async with self._lock:
            slot = self._slots.get(slot_id)
            if not slot:
                return

            if slot.agent:
                try:
                    await slot.agent.stop()
                except Exception as e:
                    logger.error("Error stopping agent %s: %s", slot_id, e)
            del self._slots[slot_id]

        # Clean agent's cache namespace
        await self.memory_pool.invalidate_namespace(f"result:{slot_id}:")
        logger.info("Agent '%s' removed (slot=%s)", slot.name, slot_id)

    async def run_task(self, slot_id: str, query: str,
                       use_cache: bool = True) -> dict:
        """Run a research task on a specific agent with caching."""
        slot = self._slots.get(slot_id)
        if not slot:
            raise ValueError(f"Agent slot {slot_id} not found")

        if slot.status == AgentStatus.RUNNING:
            raise RuntimeError(f"Agent '{slot.name}' is already running a task")

        # Check cache first
        cache_key = f"result:{slot_id}:{hash(query)}"
        if use_cache:
            cached = await self.memory_pool.get(cache_key)
            if cached is not None:
                logger.info("Cache hit for '%s' on agent '%s'", query, slot.name)
                return cached

        async with self._semaphore:
            slot.status = AgentStatus.RUNNING
            slot.current_task = query
            start_time = time.time()

            try:
                result = await asyncio.wait_for(
                    slot.agent.research(query),
                    timeout=self.default_limits.task_timeout_seconds,
                )
                elapsed = time.time() - start_time
                slot.tasks_completed += 1
                slot.status = AgentStatus.IDLE
                slot.current_task = None
                slot.task_history.append({
                    "query": query,
                    "duration_s": round(elapsed, 1),
                    "status": "ok",
                    "timestamp": time.time(),
                })

                # Cache result
                await self.memory_pool.put(cache_key, result)

                # Track memory usage
                process = psutil.Process(os.getpid())
                slot.memory_mb = round(process.memory_info().rss / (1024 * 1024), 1)

                return result

            except asyncio.TimeoutError:
                slot.status = AgentStatus.FAILED
                slot.tasks_failed += 1
                slot.errors.append(f"Timeout on: {query}")
                slot.current_task = None
                raise RuntimeError(
                    f"Task timed out after {self.default_limits.task_timeout_seconds}s"
                )

            except Exception as e:
                slot.status = AgentStatus.FAILED
                slot.tasks_failed += 1
                slot.errors.append(str(e))
                slot.current_task = None

                # Auto-restart agent on failure
                if slot.tasks_failed <= self.default_limits.max_retries:
                    logger.warning("Auto-restarting agent '%s' after failure", slot.name)
                    try:
                        await slot.agent.stop()
                        await slot.agent.start()
                        slot.status = AgentStatus.IDLE
                    except Exception as restart_err:
                        logger.error("Failed to restart agent '%s': %s",
                                     slot.name, restart_err)
                raise

    async def run_parallel(self, tasks: list[dict]) -> list[dict]:
        """
        Run multiple research tasks in parallel across agents.
        tasks: [{"agent": slot_id, "query": "..."}, ...]
        With 64+ vCPUs this can run dozens of agents simultaneously.
        """
        coros = [
            self.run_task(t["agent"], t["query"])
            for t in tasks
        ]
        results = await asyncio.gather(*coros, return_exceptions=True)

        output = []
        for task, result in zip(tasks, results):
            if isinstance(result, Exception):
                output.append({
                    "agent": task["agent"],
                    "query": task["query"],
                    "error": str(result),
                })
            else:
                output.append({
                    "agent": task["agent"],
                    "query": task["query"],
                    "result": result,
                })
        return output

    async def broadcast(self, query: str) -> list[dict]:
        """Send the same query to ALL idle agents simultaneously."""
        idle_slots = [
            slot for slot in self._slots.values()
            if slot.status == AgentStatus.IDLE
        ]
        if not idle_slots:
            raise RuntimeError("No idle agents available")

        tasks = [
            {"agent": slot.slot_id, "query": query}
            for slot in idle_slots
        ]
        return await self.run_parallel(tasks)

    def get_status(self) -> dict:
        """Get comprehensive runtime status."""
        process = psutil.Process(os.getpid())
        mem = process.memory_info()
        sys_mem = psutil.virtual_memory()
        disk = psutil.disk_usage("/") if os.name != "nt" else psutil.disk_usage("C:\\")
        net = psutil.net_io_counters()

        agents_by_status = {}
        for slot in self._slots.values():
            status = slot.status.value
            agents_by_status[status] = agents_by_status.get(status, 0) + 1

        return {
            "running": self._running,
            "agents": {
                slot_id: {
                    "name": slot.name,
                    "status": slot.status.value,
                    "tasks_completed": slot.tasks_completed,
                    "tasks_failed": slot.tasks_failed,
                    "current_task": slot.current_task,
                    "memory_mb": slot.memory_mb,
                    "cpu_affinity": slot.cpu_affinity,
                    "recent_errors": slot.errors[-5:],
                    "recent_tasks": list(slot.task_history)[-5:],
                }
                for slot_id, slot in self._slots.items()
            },
            "agents_summary": agents_by_status,
            "system": {
                "cpu_cores_physical": psutil.cpu_count(logical=False),
                "cpu_cores_logical": psutil.cpu_count(logical=True),
                "cpu_percent": psutil.cpu_percent(interval=0.1),
                "cpu_freq_mhz": getattr(psutil.cpu_freq(), "current", 0) if psutil.cpu_freq() else 0,
            },
            "memory": {
                "process_mb": round(mem.rss / (1024 * 1024), 1),
                "system_total_gb": round(sys_mem.total / (1024**3), 1),
                "system_available_gb": round(sys_mem.available / (1024**3), 1),
                "system_used_pct": sys_mem.percent,
            },
            "storage": {
                "total_gb": round(disk.total / (1024**3), 1),
                "free_gb": round(disk.free / (1024**3), 1),
                "used_pct": disk.percent,
            },
            "network": {
                "bytes_sent_gb": round(net.bytes_sent / (1024**3), 3),
                "bytes_recv_gb": round(net.bytes_recv / (1024**3), 3),
            },
            "runtime": {
                "agent_count": len(self._slots),
                "max_agents": self.config.max_agents,
                "memory_pool": self.memory_pool.stats,
                "task_queue": self.task_queue.stats,
                "queue_workers": len(self._queue_workers),
            },
        }

    def list_agents(self) -> list[dict]:
        """List all agents."""
        return [
            {
                "slot_id": slot_id,
                "name": slot.name,
                "status": slot.status.value,
                "tasks_completed": slot.tasks_completed,
                "tasks_failed": slot.tasks_failed,
                "memory_mb": slot.memory_mb,
            }
            for slot_id, slot in self._slots.items()
        ]
'@
Set-Content -Path "$installDir\runtime.py" -Value $runtimePy -Encoding UTF8
Write-Host "  runtime.py" -ForegroundColor DarkGray

# --- scraper.py ---
$scraperPy = @'
"""Scraper Module - Extracts structured data from webpages."""

import asyncio
import logging
import urllib.robotparser
from typing import Optional
from browser_controller import BrowserController
from config import ScraperConfig

logger = logging.getLogger(__name__)


class PageData:
    """Extracted data from a single webpage."""

    def __init__(self, url: str, title: str, content: str,
                 metadata: dict = None, links: list = None):
        self.url = url
        self.title = title
        self.content = content
        self.metadata = metadata or {}
        self.links = links or []

    def to_dict(self) -> dict:
        return {
            "url": self.url,
            "title": self.title,
            "content": self.content[:2000],  # Truncate for output
            "metadata": self.metadata,
        }


class Scraper:
    """Extracts content and structured data from webpages."""

    def __init__(self, browser: BrowserController, config: ScraperConfig = None):
        self.browser = browser
        self.config = config or ScraperConfig()
        self._robots_cache: dict[str, urllib.robotparser.RobotFileParser] = {}

    async def _check_robots_txt(self, url: str) -> bool:
        """Check if we're allowed to scrape this URL per robots.txt."""
        if not self.config.respect_robots_txt:
            return True

        from urllib.parse import urlparse
        parsed = urlparse(url)
        base = f"{parsed.scheme}://{parsed.netloc}"

        if base not in self._robots_cache:
            rp = urllib.robotparser.RobotFileParser()
            rp.set_url(f"{base}/robots.txt")
            try:
                rp.read()
                self._robots_cache[base] = rp
            except Exception:
                # If we can't read robots.txt, allow by default
                return True

        return self._robots_cache[base].can_fetch("*", url)

    async def scrape_page(self, url: str) -> Optional[PageData]:
        """Navigate to a URL and extract its content."""
        if not await self._check_robots_txt(url):
            logger.warning("Blocked by robots.txt: %s", url)
            return None

        try:
            title = await self.browser.goto(url)
            await asyncio.sleep(self.config.request_delay)

            content = await self.browser.get_page_content()
            if len(content) > self.config.max_content_length:
                content = content[:self.config.max_content_length]

            metadata = await self._extract_metadata()
            links = await self.browser.get_links()

            page_data = PageData(
                url=url,
                title=title,
                content=content,
                metadata=metadata,
                links=links[:50],  # Limit links
            )
            logger.info("Scraped: %s (%d chars)", url, len(content))
            return page_data

        except Exception as e:
            logger.error("Failed to scrape %s: %s", url, e)
            return None

    async def _extract_metadata(self) -> dict:
        """Extract meta tags and structured data from current page."""
        return await self.browser._page.evaluate("""
            () => {
                const meta = {};

                // Standard meta tags
                document.querySelectorAll('meta[name], meta[property]').forEach(el => {
                    const key = el.getAttribute('name') || el.getAttribute('property');
                    const val = el.getAttribute('content');
                    if (key && val) meta[key] = val;
                });

                // JSON-LD structured data
                const jsonLd = [];
                document.querySelectorAll('script[type="application/ld+json"]').forEach(el => {
                    try {
                        jsonLd.push(JSON.parse(el.textContent));
                    } catch(e) {}
                });
                if (jsonLd.length) meta['json_ld'] = jsonLd;

                return meta;
            }
        """)

    async def scrape_multiple(self, urls: list[str]) -> list[PageData]:
        """Scrape multiple pages sequentially with delay."""
        results = []
        for i, url in enumerate(urls[:self.config.max_pages_per_task]):
            page_data = await self.scrape_page(url)
            if page_data:
                results.append(page_data)
            if i < len(urls) - 1:
                await asyncio.sleep(self.config.request_delay)
        return results

    async def extract_structured_data(self, page_data: PageData, data_type: str) -> dict:
        """
        Extract specific structured data from page content.
        data_type: 'job', 'product', 'article'
        Returns a dict with extracted fields.
        This is a simple heuristic extractor - the LLM-based extraction
        happens in the agent's reasoning step.
        """
        result = {
            "type": data_type,
            "url": page_data.url,
            "title": page_data.title,
            "raw_content": page_data.content[:5000],
        }

        # Check for JSON-LD structured data which is the most reliable source
        json_ld = page_data.metadata.get("json_ld", [])
        for item in json_ld:
            if isinstance(item, dict):
                item_type = item.get("@type", "").lower()
                if data_type == "job" and "job" in item_type:
                    result["structured"] = item
                elif data_type == "product" and "product" in item_type:
                    result["structured"] = item
                elif data_type == "article" and "article" in item_type:
                    result["structured"] = item

        return result
'@
Set-Content -Path "$installDir\scraper.py" -Value $scraperPy -Encoding UTF8
Write-Host "  scraper.py" -ForegroundColor DarkGray

# --- search_module.py ---
$searchModulePy = @'
"""Search Module - Generates and executes web search queries."""

import asyncio
import logging
import urllib.parse
from typing import Optional
from browser_controller import BrowserController
from config import SearchConfig

logger = logging.getLogger(__name__)


class SearchResult:
    """A single search result."""

    def __init__(self, title: str, url: str, snippet: str, rank: int):
        self.title = title
        self.url = url
        self.snippet = snippet
        self.rank = rank

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "url": self.url,
            "snippet": self.snippet,
            "rank": self.rank,
        }

    def __repr__(self):
        return f"SearchResult(title={self.title!r}, url={self.url!r})"


class SearchModule:
    """Performs web searches and returns structured results."""

    def __init__(self, browser: BrowserController, config: SearchConfig = None):
        self.browser = browser
        self.config = config or SearchConfig()

    async def search(self, query: str) -> list[SearchResult]:
        """Execute a search query and return results."""
        if self.config.search_engine == "duckduckgo":
            return await self._search_duckduckgo(query)
        return await self._search_google(query)

    async def _search_google(self, query: str) -> list[SearchResult]:
        """Search Google and extract results."""
        encoded = urllib.parse.quote_plus(query)
        url = f"https://www.google.com/search?q={encoded}&num={self.config.max_results_per_query}"

        await self.browser.goto(url)
        await asyncio.sleep(1)

        results = await self.browser._page.evaluate("""
            () => {
                const items = [];
                document.querySelectorAll('div.g').forEach((el, i) => {
                    const titleEl = el.querySelector('h3');
                    const linkEl = el.querySelector('a[href]');
                    const snippetEl = el.querySelector('div[data-sncf], div.VwiC3b, span.aCOpRe');
                    if (titleEl && linkEl) {
                        items.push({
                            title: titleEl.innerText,
                            url: linkEl.href,
                            snippet: snippetEl ? snippetEl.innerText : '',
                            rank: i + 1
                        });
                    }
                });
                return items;
            }
        """)

        search_results = [
            SearchResult(r["title"], r["url"], r["snippet"], r["rank"])
            for r in results[:self.config.max_results_per_query]
        ]
        logger.info("Google search '%s': %d results", query, len(search_results))
        return search_results

    async def _search_duckduckgo(self, query: str) -> list[SearchResult]:
        """Search DuckDuckGo and extract results."""
        encoded = urllib.parse.quote_plus(query)
        url = f"https://duckduckgo.com/?q={encoded}"

        await self.browser.goto(url)
        await asyncio.sleep(2)

        results = await self.browser._page.evaluate("""
            () => {
                const items = [];
                document.querySelectorAll('article[data-testid="result"]').forEach((el, i) => {
                    const titleEl = el.querySelector('h2 a');
                    const snippetEl = el.querySelector('span[data-testid="result-snippet"]');
                    if (titleEl) {
                        items.push({
                            title: titleEl.innerText,
                            url: titleEl.href,
                            snippet: snippetEl ? snippetEl.innerText : '',
                            rank: i + 1
                        });
                    }
                });
                return items;
            }
        """)

        search_results = [
            SearchResult(r["title"], r["url"], r["snippet"], r["rank"])
            for r in results[:self.config.max_results_per_query]
        ]
        logger.info("DuckDuckGo search '%s': %d results", query, len(search_results))
        return search_results

    async def multi_search(self, queries: list[str]) -> list[SearchResult]:
        """Execute multiple search queries and aggregate results."""
        all_results = []
        seen_urls = set()

        for query in queries[:self.config.max_search_queries]:
            results = await self.search(query)
            for r in results:
                if r.url not in seen_urls:
                    seen_urls.add(r.url)
                    all_results.append(r)
            await asyncio.sleep(self.config.max_results_per_query * 0.2)

        logger.info("Multi-search: %d unique results from %d queries",
                     len(all_results), len(queries))
        return all_results
'@
Set-Content -Path "$installDir\search_module.py" -Value $searchModulePy -Encoding UTF8
Write-Host "  search_module.py" -ForegroundColor DarkGray

# --- security.py ---
$securityPy = @'
"""Security Module - Request validation, rate limiting, sandboxing."""

import hashlib
import hmac
import logging
import time
from collections import defaultdict
from dataclasses import dataclass, field
from functools import wraps
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class RateLimitConfig:
    requests_per_minute: int = 30
    requests_per_hour: int = 500
    burst_limit: int = 10  # max concurrent


class RateLimiter:
    """Token bucket rate limiter."""

    def __init__(self, config: RateLimitConfig = None):
        self.config = config or RateLimitConfig()
        self._requests: dict[str, list[float]] = defaultdict(list)
        self._active: dict[str, int] = defaultdict(int)

    def check(self, client_id: str = "default") -> bool:
        """Check if request is allowed. Returns True if allowed."""
        now = time.time()
        reqs = self._requests[client_id]

        # Clean old entries
        reqs[:] = [t for t in reqs if now - t < 3600]

        # Check burst
        if self._active[client_id] >= self.config.burst_limit:
            logger.warning("Rate limit: burst exceeded for %s", client_id)
            return False

        # Check per-minute
        recent_minute = sum(1 for t in reqs if now - t < 60)
        if recent_minute >= self.config.requests_per_minute:
            logger.warning("Rate limit: per-minute exceeded for %s", client_id)
            return False

        # Check per-hour
        if len(reqs) >= self.config.requests_per_hour:
            logger.warning("Rate limit: per-hour exceeded for %s", client_id)
            return False

        reqs.append(now)
        return True

    def acquire(self, client_id: str = "default"):
        self._active[client_id] += 1

    def release(self, client_id: str = "default"):
        self._active[client_id] = max(0, self._active[client_id] - 1)


class URLValidator:
    """Validates and sanitizes URLs before browsing."""

    BLOCKED_PATTERNS = [
        "localhost", "127.0.0.1", "0.0.0.0", "::1",
        "169.254.",  # Link-local
        "10.",       # Private
        "192.168.",  # Private
        "172.16.", "172.17.", "172.18.", "172.19.",
        "172.20.", "172.21.", "172.22.", "172.23.",
        "172.24.", "172.25.", "172.26.", "172.27.",
        "172.28.", "172.29.", "172.30.", "172.31.",
        "file://", "ftp://", "data:", "javascript:",
    ]

    BLOCKED_EXTENSIONS = [
        ".exe", ".msi", ".bat", ".cmd", ".ps1", ".sh",
        ".dmg", ".pkg", ".deb", ".rpm",
    ]

    @classmethod
    def is_safe(cls, url: str) -> bool:
        """Check if URL is safe to visit."""
        url_lower = url.lower().strip()

        # Must be http/https
        if not url_lower.startswith(("http://", "https://")):
            return False

        # Check blocked patterns
        for pattern in cls.BLOCKED_PATTERNS:
            if pattern in url_lower:
                logger.warning("Blocked URL (pattern %s): %s", pattern, url)
                return False

        # Check file downloads
        for ext in cls.BLOCKED_EXTENSIONS:
            if url_lower.endswith(ext):
                logger.warning("Blocked URL (extension %s): %s", ext, url)
                return False

        return True

    @classmethod
    def sanitize(cls, url: str) -> Optional[str]:
        """Sanitize URL. Returns None if unsafe."""
        url = url.strip()
        if cls.is_safe(url):
            return url
        return None


class APIKeyAuth:
    """Simple API key authentication for the API server."""

    def __init__(self, api_keys: list[str] = None):
        # Hash stored keys for comparison
        self._key_hashes = set()
        if api_keys:
            for key in api_keys:
                self._key_hashes.add(self._hash_key(key))

    def _hash_key(self, key: str) -> str:
        return hashlib.sha256(key.encode()).hexdigest()

    def validate(self, key: str) -> bool:
        """Validate an API key."""
        if not self._key_hashes:
            return True  # No keys configured = open access
        return self._hash_key(key) in self._key_hashes

    def add_key(self, key: str):
        self._key_hashes.add(self._hash_key(key))

    def revoke_key(self, key: str):
        h = self._hash_key(key)
        self._key_hashes.discard(h)


class InputSanitizer:
    """Sanitize user inputs to prevent injection attacks."""

    MAX_QUERY_LENGTH = 2000

    @classmethod
    def sanitize_query(cls, query: str) -> str:
        """Sanitize a research query."""
        # Truncate
        query = query[:cls.MAX_QUERY_LENGTH]
        # Remove potential script injection
        query = query.replace("<script", "").replace("</script>", "")
        query = query.replace("javascript:", "")
        return query.strip()

    @classmethod
    def sanitize_selector(cls, selector: str) -> str:
        """Sanitize a CSS selector."""
        # Prevent XPath injection or script execution via selectors
        dangerous = ["javascript:", "data:", "vbscript:"]
        for d in dangerous:
            selector = selector.replace(d, "")
        return selector.strip()
'@
Set-Content -Path "$installDir\security.py" -Value $securityPy -Encoding UTF8
Write-Host "  security.py" -ForegroundColor DarkGray

# --- requirements.txt ---
$requirementsTxt = @'
httpx>=0.27.0
playwright>=1.48.0
fastapi>=0.115.0
uvicorn>=0.32.0
pydantic>=2.0.0
psutil>=6.0.0
anthropic>=0.40.0  # optional: only needed if using llm_provider=anthropic
'@
Set-Content -Path "$installDir\requirements.txt" -Value $requirementsTxt -Encoding UTF8
Write-Host "  requirements.txt" -ForegroundColor DarkGray

Write-Host "  All 12 files written." -ForegroundColor Green

# --- Step 3: Download and install Ollama ---
Write-Host "[3/9] Downloading and installing Ollama ..." -ForegroundColor Yellow
$ollamaInstaller = "$env:TEMP\OllamaSetup.exe"
try {
    Invoke-WebRequest -Uri "https://ollama.com/download/OllamaSetup.exe" -OutFile $ollamaInstaller -UseBasicParsing
    Write-Host "  Downloaded OllamaSetup.exe" -ForegroundColor DarkGray
    Start-Process -FilePath $ollamaInstaller -ArgumentList "/VERYSILENT", "/NORESTART" -Wait
    Write-Host "  Ollama installed." -ForegroundColor Green
} catch {
    Write-Host "  WARNING: Ollama download/install failed. Install manually from https://ollama.com/download" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
}

# --- Step 4: Set OLLAMA_HOST env var (machine-level) ---
Write-Host "[4/9] Setting OLLAMA_HOST=0.0.0.0 (machine-level) ..." -ForegroundColor Yellow
[System.Environment]::SetEnvironmentVariable("OLLAMA_HOST", "0.0.0.0", [System.EnvironmentVariableTarget]::Machine)
$env:OLLAMA_HOST = "0.0.0.0"
Write-Host "  Done." -ForegroundColor Green

# --- Step 5: Pull qwen3:4b model ---
Write-Host "[5/9] Pulling qwen3:4b model (this may take a while) ..." -ForegroundColor Yellow
# Ensure Ollama service is running before pulling
Start-Sleep -Seconds 5

# Try to start Ollama service if not already running
try {
    $ollamaExe = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
    if (-not (Test-Path $ollamaExe)) {
        # Try common install paths
        $ollamaExe = (Get-Command ollama -ErrorAction SilentlyContinue).Source
    }
    if ($ollamaExe) {
        # Start ollama serve in background
        Start-Process -FilePath $ollamaExe -ArgumentList "serve" -WindowStyle Hidden -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 5
    }
} catch {
    Write-Host "  Note: Could not auto-start Ollama service. It may already be running." -ForegroundColor DarkYellow
}

try {
    & ollama pull qwen3:4b
    Write-Host "  qwen3:4b pulled successfully." -ForegroundColor Green
} catch {
    Write-Host "  WARNING: Failed to pull model. Run 'ollama pull qwen3:4b' manually after Ollama is running." -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
}

# --- Step 6: Install Python dependencies ---
Write-Host "[6/9] Installing Python dependencies ..." -ForegroundColor Yellow
try {
    Push-Location $installDir
    & pip install -r requirements.txt
    Pop-Location
    Write-Host "  Dependencies installed." -ForegroundColor Green
} catch {
    Write-Host "  WARNING: pip install failed. Ensure Python and pip are on PATH." -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
}

# --- Step 7: Install Playwright Chromium ---
Write-Host "[7/9] Installing Playwright Chromium browser ..." -ForegroundColor Yellow
try {
    & python -m playwright install chromium
    Write-Host "  Playwright Chromium installed." -ForegroundColor Green
} catch {
    Write-Host "  WARNING: Playwright install failed. Run 'python -m playwright install chromium' manually." -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
}

# --- Step 8: Open firewall ports 8000 and 11434 ---
Write-Host "[8/9] Opening firewall ports 8000 (API) and 11434 (Ollama) ..." -ForegroundColor Yellow
try {
    New-NetFirewallRule -DisplayName "AI Agent API (8000)" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow -ErrorAction SilentlyContinue | Out-Null
    New-NetFirewallRule -DisplayName "Ollama (11434)" -Direction Inbound -Protocol TCP -LocalPort 11434 -Action Allow -ErrorAction SilentlyContinue | Out-Null
    Write-Host "  Firewall rules created." -ForegroundColor Green
} catch {
    Write-Host "  WARNING: Could not create firewall rules. Run as Administrator or add them manually." -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
}

# --- Step 9: Start the API server ---
Write-Host "[9/9] Starting API server ..." -ForegroundColor Yellow
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Installation Complete!" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Files:    $installDir" -ForegroundColor White
Write-Host "  API:      http://0.0.0.0:8000" -ForegroundColor White
Write-Host "  Ollama:   http://127.0.0.1:11434" -ForegroundColor White
Write-Host "  Model:    qwen3:4b" -ForegroundColor White
Write-Host "  Docs:     http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "Starting server now..." -ForegroundColor Yellow
Write-Host ""

Set-Location $installDir
& python api.py
