"""Memory watchdog for constrained environments.

Monitors system RAM and publishes pressure events via Redis pub/sub.
On an 8GB laptop with Ollama, this prevents OOM kills by:
  - Pausing task processing when RAM is low
  - Killing browser workers under critical pressure
  - Unloading Ollama model as last resort
"""

import asyncio
import logging
import httpx
import psutil

import redis.asyncio as aioredis

from cluster_config import MemoryConfig, OllamaConfig

logger = logging.getLogger(__name__)

# Pub/sub channels
CHANNEL_PRESSURE = "cluster:memory:pressure"
CHANNEL_CRITICAL = "cluster:memory:critical"
CHANNEL_NORMAL = "cluster:memory:normal"


class MemoryMonitor:
    """Watches system memory and signals the orchestrator."""

    def __init__(self, memory_config: MemoryConfig = None,
                 ollama_config: OllamaConfig = None,
                 redis_host: str = "localhost", redis_port: int = 6379):
        self.config = memory_config or MemoryConfig()
        self.ollama = ollama_config or OllamaConfig()
        self._redis = None
        self._redis_host = redis_host
        self._redis_port = redis_port
        self._running = False
        self._state = "normal"  # normal, pressure, critical
        self._http = httpx.AsyncClient(timeout=10.0)

    async def start(self):
        self._redis = aioredis.Redis(
            host=self._redis_host,
            port=self._redis_port,
            decode_responses=True,
        )
        self._running = True
        logger.info("Memory monitor started (pressure=%dMB, critical=%dMB)",
                     self.config.pressure_threshold_mb,
                     self.config.critical_threshold_mb)

    async def stop(self):
        self._running = False
        if self._redis:
            await self._redis.aclose()
        await self._http.aclose()

    async def run(self):
        """Main monitoring loop."""
        await self.start()
        while self._running:
            try:
                await self._check()
            except Exception as e:
                logger.error("Monitor error: %s", e)
            await asyncio.sleep(self.config.monitor_interval)

    async def _check(self):
        mem = psutil.virtual_memory()
        available_mb = mem.available / (1024 * 1024)

        if available_mb < self.config.critical_threshold_mb:
            if self._state != "critical":
                self._state = "critical"
                logger.warning("CRITICAL: %dMB available. Unloading model + killing browsers.",
                             int(available_mb))
                await self._redis.publish(CHANNEL_CRITICAL, str(int(available_mb)))
                await self._unload_ollama()

        elif available_mb < self.config.pressure_threshold_mb:
            if self._state != "pressure":
                self._state = "pressure"
                logger.warning("PRESSURE: %dMB available. Pausing new tasks.",
                             int(available_mb))
                await self._redis.publish(CHANNEL_PRESSURE, str(int(available_mb)))

        else:
            if self._state != "normal":
                self._state = "normal"
                logger.info("NORMAL: %dMB available. Resuming.", int(available_mb))
                await self._redis.publish(CHANNEL_NORMAL, str(int(available_mb)))

    async def _unload_ollama(self):
        """Force Ollama to unload the model to free ~5GB."""
        try:
            url = f"{self.ollama.host}/api/generate"
            await self._http.post(url, json={
                "model": self.ollama.model,
                "keep_alive": 0,  # Unload immediately
            })
            logger.info("Ollama model unloaded to free memory")
        except Exception as e:
            logger.error("Failed to unload Ollama model: %s", e)

    def get_status(self) -> dict:
        mem = psutil.virtual_memory()
        return {
            "state": self._state,
            "available_mb": int(mem.available / (1024 * 1024)),
            "total_mb": int(mem.total / (1024 * 1024)),
            "used_pct": mem.percent,
            "thresholds": {
                "pressure_mb": self.config.pressure_threshold_mb,
                "critical_mb": self.config.critical_threshold_mb,
            },
        }
