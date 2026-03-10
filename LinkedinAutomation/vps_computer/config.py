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
from pathlib import Path

from dotenv import load_dotenv

# Load .env from same directory as this config file
load_dotenv(Path(__file__).parent / ".env")


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
    max_agents: int = int(os.environ.get("MAX_AGENTS", "5"))
    memory_pool_mb: int = int(os.environ.get("MEMORY_POOL_MB", "4096"))  # 4GB default for laptop
    worker_processes: int = int(os.environ.get("WORKER_PROCESSES", "0"))  # 0 = auto (cores/4)
    task_queue_size: int = 1000
    task_timeout_seconds: int = 600  # 10 min
    max_retries: int = 3
    # Per-agent limits
    agent_memory_limit_mb: int = 1024  # 1GB per agent on laptop
    agent_max_pages: int = 20
    agent_max_concurrent_requests: int = 5
    # Uvicorn workers
    api_workers: int = int(os.environ.get("API_WORKERS", "2"))
    api_host: str = os.environ.get("API_HOST", "0.0.0.0")
    api_port: int = int(os.environ.get("API_PORT", "8000"))


@dataclass
class AgentConfig:
    max_loop_iterations: int = 5  # More iterations for deeper research
    llm_provider: str = "ollama"  # "ollama" or "anthropic"
    llm_model: str = os.environ.get("LLM_MODEL", "qwen3:8b")
    llm_api_key: str = field(default_factory=lambda: os.environ.get("ANTHROPIC_API_KEY", ""))
    ollama_host: str = os.environ.get("OLLAMA_HOST", "http://10.0.0.200:11434")
    browser: BrowserConfig = field(default_factory=BrowserConfig)
    search: SearchConfig = field(default_factory=SearchConfig)
    scraper: ScraperConfig = field(default_factory=ScraperConfig)
    api_host: str = "0.0.0.0"
    api_port: int = 8000
