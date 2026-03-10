"""Redis-backed distributed task queue.

Replaces the in-memory TaskQueue from runtime.py with a persistent,
distributed queue backed by Redis. Supports priority scheduling,
dead letter queue, and distributed locking.
"""

import asyncio
import json
import logging
import time
import uuid
from enum import Enum
from typing import Optional

import redis.asyncio as aioredis

from cluster_config import RedisConfig

logger = logging.getLogger(__name__)


class TaskState(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    DEAD = "dead"


class TaskPriority(Enum):
    LOW = 0
    NORMAL = 1
    HIGH = 2
    CRITICAL = 3


class RedisTaskQueue:
    """Distributed task queue using Redis sorted sets for priority ordering."""

    def __init__(self, config: RedisConfig = None):
        self.config = config or RedisConfig()
        self._redis: Optional[aioredis.Redis] = None
        self._running = False

    async def start(self):
        self._redis = aioredis.Redis(
            host=self.config.host,
            port=self.config.port,
            decode_responses=True,
        )
        self._running = True
        await self._redis.ping()
        logger.info("Redis task queue connected at %s:%d",
                     self.config.host, self.config.port)

    async def stop(self):
        self._running = False
        if self._redis:
            await self._redis.aclose()

    async def enqueue(self, query: str, agent_name: str = "default",
                      priority: TaskPriority = TaskPriority.NORMAL,
                      metadata: dict = None) -> str:
        """Add task to priority queue. Returns task_id."""
        task_id = str(uuid.uuid4())[:12]
        task = {
            "task_id": task_id,
            "query": query,
            "agent_name": agent_name,
            "priority": priority.value,
            "state": TaskState.PENDING.value,
            "created_at": time.time(),
            "retries": 0,
            "metadata": metadata or {},
        }

        # Store task data
        await self._redis.hset(f"task:{task_id}", mapping={
            k: json.dumps(v) if isinstance(v, (dict, list)) else str(v)
            for k, v in task.items()
        })

        # Add to priority sorted set (higher priority = higher score)
        score = priority.value * 1_000_000_000 + (1_000_000_000 - time.time())
        await self._redis.zadd(self.config.task_queue, {task_id: score})

        logger.info("Enqueued task %s: %s (priority=%s)", task_id, query, priority.name)
        return task_id

    async def dequeue(self, timeout: float = 5.0) -> Optional[dict]:
        """Get highest priority task. Returns None on timeout."""
        # Pop highest scored item
        result = await self._redis.zpopmax(self.config.task_queue, count=1)
        if not result:
            await asyncio.sleep(min(timeout, 1.0))
            return None

        task_id, _score = result[0]

        # Get full task data
        task_data = await self._redis.hgetall(f"task:{task_id}")
        if not task_data:
            return None

        # Mark as running
        await self._redis.hset(f"task:{task_id}", "state", TaskState.RUNNING.value)
        await self._redis.hset(f"task:{task_id}", "started_at", str(time.time()))

        # Parse metadata back
        task = {}
        for k, v in task_data.items():
            try:
                task[k] = json.loads(v)
            except (json.JSONDecodeError, TypeError):
                task[k] = v

        return task

    async def complete(self, task_id: str, result: dict):
        """Mark task as completed and store result."""
        await self._redis.hset(f"task:{task_id}", mapping={
            "state": TaskState.COMPLETED.value,
            "completed_at": str(time.time()),
        })
        # Store result with TTL
        await self._redis.setex(
            f"{self.config.result_prefix}{task_id}",
            self.config.ttl_seconds,
            json.dumps(result, default=str),
        )

    async def fail(self, task_id: str, error: str, max_retries: int = 2):
        """Mark task as failed. Re-enqueue if retries remain."""
        task_data = await self._redis.hgetall(f"task:{task_id}")
        retries = int(task_data.get("retries", 0))

        if retries < max_retries:
            # Re-enqueue with retry count
            await self._redis.hset(f"task:{task_id}", mapping={
                "state": TaskState.PENDING.value,
                "retries": str(retries + 1),
                "last_error": error,
            })
            priority = int(task_data.get("priority", 1))
            score = priority * 1_000_000_000 + (1_000_000_000 - time.time())
            await self._redis.zadd(self.config.task_queue, {task_id: score})
            logger.warning("Task %s retry %d/%d: %s", task_id, retries + 1, max_retries, error)
        else:
            # Dead letter
            await self._redis.hset(f"task:{task_id}", mapping={
                "state": TaskState.DEAD.value,
                "last_error": error,
            })
            await self._redis.lpush("cluster:dead_letters", task_id)
            logger.error("Task %s dead-lettered after %d retries: %s", task_id, max_retries, error)

    async def get_result(self, task_id: str) -> Optional[dict]:
        """Get task result if completed."""
        raw = await self._redis.get(f"{self.config.result_prefix}{task_id}")
        if raw:
            return json.loads(raw)
        return None

    async def get_task_state(self, task_id: str) -> Optional[dict]:
        """Get current state of a task."""
        data = await self._redis.hgetall(f"task:{task_id}")
        if not data:
            return None
        return data

    async def get_stats(self) -> dict:
        """Queue statistics."""
        pending = await self._redis.zcard(self.config.task_queue)
        dead = await self._redis.llen("cluster:dead_letters")
        return {
            "pending": pending,
            "dead_letters": dead,
        }

    async def acquire_lock(self, name: str, timeout: int = 30) -> bool:
        """Distributed lock for agent slot allocation."""
        key = f"{self.config.lock_prefix}{name}"
        return await self._redis.set(key, "1", nx=True, ex=timeout)

    async def release_lock(self, name: str):
        key = f"{self.config.lock_prefix}{name}"
        await self._redis.delete(key)
