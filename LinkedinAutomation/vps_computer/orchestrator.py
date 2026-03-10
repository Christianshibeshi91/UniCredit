"""Cluster orchestrator — coordinates all nodes on constrained hardware.

Manages phase-based execution to fit within 8GB RAM:
  Phase 1 (Crawl):   Ollama idle, crawl workers + browser active
  Phase 2 (AI):      Browser closed, Ollama loaded for analysis
  Phase 3 (Store):   Results stored in Qdrant, cache in Redis

Memory-aware: monitors RAM and adjusts workload dynamically.
"""

import asyncio
import json
import logging
import time
from enum import Enum
from typing import Optional

import httpx
import psutil
import redis.asyncio as aioredis

from cluster_config import ClusterConfig
from task_queue import RedisTaskQueue, TaskPriority
from vector_store import VectorStore
from memory_monitor import MemoryMonitor, CHANNEL_PRESSURE, CHANNEL_CRITICAL, CHANNEL_NORMAL
from crawl_worker import CrawlWorker
from agent import AgentController
from config import AgentConfig

logger = logging.getLogger(__name__)


class Phase(Enum):
    IDLE = "idle"
    CRAWL = "crawl"
    AI = "ai"
    STORE = "store"


class Orchestrator:
    """Main cluster coordinator."""

    def __init__(self, config: ClusterConfig = None):
        self.config = config or ClusterConfig()

        # Core components
        self.task_queue = RedisTaskQueue(self.config.redis)
        self.vector_store = VectorStore(self.config.qdrant)
        self.memory_monitor = MemoryMonitor(
            self.config.memory,
            self.config.ollama,
            self.config.redis.host,
            self.config.redis.port,
        )

        # Workers
        self.crawl_workers: list[CrawlWorker] = []
        self.agent: Optional[AgentController] = None

        # State
        self.phase = Phase.IDLE
        self._running = False
        self._paused = False
        self._redis: Optional[aioredis.Redis] = None
        self._http = httpx.AsyncClient(timeout=10.0)
        self._tasks_completed = 0
        self._tasks_failed = 0

    async def start(self):
        """Initialize all components."""
        # Connect Redis
        self._redis = aioredis.Redis(
            host=self.config.redis.host,
            port=self.config.redis.port,
            decode_responses=True,
        )
        await self._redis.ping()

        # Start task queue
        await self.task_queue.start()

        # Start vector store
        await self.vector_store.start()

        # Start crawl workers
        for i in range(self.config.worker.max_crawl_workers):
            worker = CrawlWorker(self.config.worker, worker_id=i)
            await worker.start()
            self.crawl_workers.append(worker)

        # Create AI agent (but don't start browser yet — save RAM)
        agent_config = AgentConfig(
            llm_provider="ollama",
            llm_model=self.config.ollama.model,
            ollama_host=self.config.ollama.host,
        )
        self.agent = AgentController(agent_config)

        self._running = True
        logger.info("Orchestrator started: %d crawl workers, vector store ready",
                     len(self.crawl_workers))

    async def stop(self):
        """Shut down all components."""
        self._running = False

        for worker in self.crawl_workers:
            await worker.stop()

        if self.agent:
            try:
                await self.agent.stop()
            except Exception:
                pass

        await self.vector_store.stop()
        await self.task_queue.stop()
        await self.memory_monitor.stop()
        await self._http.aclose()
        if self._redis:
            await self._redis.aclose()

        logger.info("Orchestrator stopped")

    async def run(self):
        """Main orchestrator loop — processes tasks from Redis queue."""
        # Start memory monitor in background
        monitor_task = asyncio.create_task(self.memory_monitor.run())
        # Subscribe to memory events
        listener_task = asyncio.create_task(self._listen_memory_events())

        try:
            while self._running:
                if self._paused:
                    await asyncio.sleep(1)
                    continue

                # Get next task from queue
                task = await self.task_queue.dequeue(timeout=2.0)
                if not task:
                    continue

                task_id = task.get("task_id", "unknown")
                query = task.get("query", "")
                logger.info("Processing task %s: %s", task_id, query)

                try:
                    result = await self._execute_research(query)
                    await self.task_queue.complete(task_id, result)
                    self._tasks_completed += 1
                    logger.info("Task %s completed", task_id)
                except Exception as e:
                    logger.error("Task %s failed: %s", task_id, e)
                    await self.task_queue.fail(task_id, str(e),
                                              self.config.worker.max_retries)
                    self._tasks_failed += 1

        finally:
            monitor_task.cancel()
            listener_task.cancel()

    async def _execute_research(self, query: str) -> dict:
        """Execute a full research task using phase-based approach."""
        start_time = time.time()

        # === Phase 1: CRAWL ===
        self.phase = Phase.CRAWL
        logger.info("Phase 1: CRAWL — planning and scraping")

        # Use LLM to plan (Ollama loads here)
        plan = await self.agent._create_plan(query)

        # Search for URLs
        search_queries = plan.get("search_queries", [query])

        # Start browser for search
        await self.agent.browser.start()
        search_results = await self.agent.search.multi_search(search_queries)

        # Select URLs via LLM
        urls = await self.agent._select_urls(query, search_results, plan)

        # Close browser to free RAM before crawling
        await self.agent.browser.stop()

        # Crawl with lightweight workers (no browser needed for most pages)
        all_crawled = []
        browser_urls = []
        for worker in self.crawl_workers:
            if urls:
                batch = urls[:5]
                urls = urls[5:]
                crawled, needs_browser = await worker.crawl_batch(batch)
                all_crawled.extend(crawled)
                browser_urls.extend(needs_browser)

        # Handle JS-heavy pages with browser (one at a time)
        if browser_urls:
            await self.agent.browser.start()
            browser_pages = await self.agent.scraper.scrape_multiple(browser_urls[:3])
            await self.agent.browser.stop()
            for page in browser_pages:
                all_crawled.append({
                    "url": page.url,
                    "title": page.title,
                    "content": page.content[:50000],
                    "needs_browser": True,
                })

        # === Phase 2: AI ===
        self.phase = Phase.AI
        logger.info("Phase 2: AI — extracting and analyzing %d pages", len(all_crawled))

        # Extract data from crawled pages using LLM
        extracted = []
        for page_data in all_crawled:
            content = page_data.get("content", "")[:8000]
            if not content:
                continue

            try:
                from scraper import PageData
                pd = PageData(
                    url=page_data["url"],
                    title=page_data.get("title", ""),
                    content=content,
                )
                items = await self.agent._extract_data(query, [pd], plan)
                extracted.extend(items)
            except Exception as e:
                logger.warning("Extraction failed for %s: %s", page_data["url"], e)

        # Deduplicate and rank
        extracted = self.agent.processor.deduplicate(extracted)
        extracted = self.agent.processor.rank_by_relevance(extracted, query)

        # Generate summary
        summary = await self.agent._generate_summary(query, extracted)

        # Unload Ollama model to free RAM
        await self._unload_ollama()

        # === Phase 3: STORE ===
        self.phase = Phase.STORE
        logger.info("Phase 3: STORE — saving %d results", len(extracted))

        # Store in vector DB for future semantic search
        await self.vector_store.store(extracted)

        # Cache in Redis
        result_key = f"research:{hash(query)}"
        await self._redis.setex(result_key, 3600, json.dumps({
            "query": query,
            "results": extracted[:50],
            "summary": summary,
        }, default=str))

        self.phase = Phase.IDLE
        elapsed = time.time() - start_time

        return {
            "query": query,
            "results": extracted,
            "summary": summary,
            "metadata": {
                "plan": plan,
                "pages_crawled": len(all_crawled),
                "items_extracted": len(extracted),
                "duration_seconds": round(elapsed, 1),
                "browser_pages": len(browser_urls),
            },
        }

    async def _unload_ollama(self):
        """Unload model to free ~5GB."""
        try:
            await self._http.post(
                f"{self.config.ollama.host}/api/generate",
                json={"model": self.config.ollama.model, "keep_alive": 0},
            )
        except Exception:
            pass

    async def _listen_memory_events(self):
        """Subscribe to memory pressure events from the monitor."""
        pubsub = self._redis.pubsub()
        await pubsub.subscribe(CHANNEL_PRESSURE, CHANNEL_CRITICAL, CHANNEL_NORMAL)

        async for message in pubsub.listen():
            if message["type"] != "message":
                continue

            channel = message["channel"]
            if channel == CHANNEL_CRITICAL:
                logger.warning("Memory CRITICAL — pausing all work")
                self._paused = True
                # Kill browser if running
                if self.agent and self.agent._running:
                    try:
                        await self.agent.browser.stop()
                    except Exception:
                        pass
            elif channel == CHANNEL_PRESSURE:
                logger.warning("Memory PRESSURE — pausing new tasks")
                self._paused = True
            elif channel == CHANNEL_NORMAL:
                logger.info("Memory NORMAL — resuming")
                self._paused = False

    # --- API methods for the FastAPI layer ---

    async def submit_task(self, query: str,
                          priority: str = "normal") -> str:
        """Submit a research task. Returns task_id."""
        prio_map = {
            "low": TaskPriority.LOW,
            "normal": TaskPriority.NORMAL,
            "high": TaskPriority.HIGH,
            "critical": TaskPriority.CRITICAL,
        }
        return await self.task_queue.enqueue(
            query=query,
            priority=prio_map.get(priority, TaskPriority.NORMAL),
        )

    async def get_task_status(self, task_id: str) -> Optional[dict]:
        """Get task state and result if available."""
        state = await self.task_queue.get_task_state(task_id)
        if not state:
            return None

        result = None
        if state.get("state") == "completed":
            result = await self.task_queue.get_result(task_id)

        return {"task": state, "result": result}

    async def semantic_search(self, query: str, top_k: int = 10) -> list[dict]:
        """Search across all stored research results."""
        return await self.vector_store.search(query, top_k)

    def get_status(self) -> dict:
        """Full cluster status."""
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage("/") if hasattr(psutil, "disk_usage") else None

        status = {
            "phase": self.phase.value,
            "paused": self._paused,
            "tasks_completed": self._tasks_completed,
            "tasks_failed": self._tasks_failed,
            "workers": {
                "crawl": [w.get_status() for w in self.crawl_workers],
            },
            "memory": self.memory_monitor.get_status(),
            "system": {
                "cpu_cores": psutil.cpu_count(logical=True),
                "cpu_percent": psutil.cpu_percent(interval=0.1),
                "ram_total_gb": round(mem.total / (1024 ** 3), 1),
                "ram_available_gb": round(mem.available / (1024 ** 3), 1),
                "ram_used_pct": mem.percent,
            },
        }

        if disk:
            status["storage"] = {
                "total_gb": round(disk.total / (1024 ** 3), 1),
                "free_gb": round(disk.free / (1024 ** 3), 1),
            }

        return status
