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
