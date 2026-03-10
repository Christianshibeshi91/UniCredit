"""Cluster configuration for 8GB laptop deployment.

Hardware: i7-6700HQ (4C/8T), 8GB RAM, 930GB storage
OS: WSL2 Ubuntu

Memory budget:
  WSL2 overhead:     ~800MB
  Ollama (loaded):   ~5.0GB
  Redis:              50MB
  Qdrant:            128MB
  Agent processes:   ~1.2GB
  -------------------------
  Total:             ~7.2GB (leaves ~800MB headroom)
"""

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env.cluster")


@dataclass
class OllamaConfig:
    host: str = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
    model: str = os.environ.get("LLM_MODEL", "qwen3:8b")
    keep_alive: str = os.environ.get("OLLAMA_KEEP_ALIVE", "5m")
    num_ctx: int = 4096
    num_predict: int = 1024
    temperature: float = 0.3


@dataclass
class RedisConfig:
    host: str = os.environ.get("REDIS_HOST", "localhost")
    port: int = int(os.environ.get("REDIS_PORT", "6379"))
    task_queue: str = "cluster:tasks"
    result_prefix: str = "cluster:result:"
    lock_prefix: str = "cluster:lock:"
    ttl_seconds: int = 3600


@dataclass
class QdrantConfig:
    host: str = os.environ.get("QDRANT_HOST", "localhost")
    port: int = int(os.environ.get("QDRANT_PORT", "6333"))
    collection: str = "research_data"
    embedding_dim: int = 384  # all-MiniLM-L6-v2


@dataclass
class WorkerConfig:
    max_crawl_workers: int = int(os.environ.get("MAX_CRAWL_WORKERS", "2"))
    max_browser_workers: int = int(os.environ.get("MAX_BROWSER_WORKERS", "1"))
    max_ai_workers: int = int(os.environ.get("MAX_AI_WORKERS", "1"))
    task_timeout: int = 300
    max_retries: int = 2
    crawl_delay: float = 1.0
    max_pages: int = 10
    max_concurrent_tabs: int = 2


@dataclass
class StorageConfig:
    data_dir: str = os.environ.get("DATA_DIR", "/opt/cluster/data")
    results_dir: str = os.environ.get("RESULTS_DIR", "/opt/cluster/results")
    max_disk_gb: int = 100


@dataclass
class MemoryConfig:
    pool_mb: int = int(os.environ.get("MEMORY_POOL_MB", "256"))
    pressure_threshold_mb: int = 500   # Pause work below this
    critical_threshold_mb: int = 200   # Kill browsers + unload model below this
    monitor_interval: int = 5          # Check every 5 seconds


@dataclass
class ClusterConfig:
    ollama: OllamaConfig = field(default_factory=OllamaConfig)
    redis: RedisConfig = field(default_factory=RedisConfig)
    qdrant: QdrantConfig = field(default_factory=QdrantConfig)
    worker: WorkerConfig = field(default_factory=WorkerConfig)
    storage: StorageConfig = field(default_factory=StorageConfig)
    memory: MemoryConfig = field(default_factory=MemoryConfig)
    api_host: str = os.environ.get("API_HOST", "0.0.0.0")
    api_port: int = int(os.environ.get("API_PORT", "8000"))
