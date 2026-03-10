"""Configuration for scraping jobs."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any

from dotenv import load_dotenv  # pyre-ignore[21]

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3:4b")


@dataclass
class ScrapeConfig:
    """Full configuration for a scraping run."""

    # --- Target ---
    start_urls: list[str] = field(default_factory=list)

    # --- Extraction ---
    selectors: dict[str, str] = field(default_factory=dict)
    container_selector: str = ""  # e.g. ".product-card" — enables container-aware extraction
    ai_fallback: bool = True
    extraction_prompt: str = ""
    target_fields: list[str] = field(default_factory=list)
    extract_structured_data: bool = False  # also extract JSON-LD/microdata
    required_fields: list[str] = field(default_factory=list)  # schema validation

    # --- Workflow ---
    workflow: list[dict[str, Any]] = field(default_factory=list)

    # --- Pagination ---
    pagination_selector: str = ""
    pagination_type: str = "click"  # "click" | "scroll" | "url_param"
    pagination_param: str = "page"
    max_pages: int = 10

    # --- Proxy ---
    proxies: list[str] = field(default_factory=list)
    rotate_proxy_every: int = 5
    sticky_sessions: bool = False
    geo_target: str = ""  # Country code (e.g. "US", "GB")

    # --- Rate limiting ---
    min_delay: float = 1.0
    max_delay: float = 3.0
    max_retries: int = 3

    # --- Concurrency ---
    concurrency: int = 1  # number of parallel browser contexts
    max_concurrent_pages: int = 5

    # --- Output ---
    output_format: str = "json"  # "json" | "jsonl" | "csv" | "sqlite" | "sheets" | "api" | "webhook" | comma-separated
    output_path: str = ""
    output_append: bool = False
    sheets_id: str = ""
    sheets_range: str = "Sheet1!A1"
    api_endpoint: str = ""
    api_headers: dict[str, str] = field(default_factory=dict)
    webhook_url: str = ""
    db_path: str = ""
    db_table: str = "scraped_data"

    # --- Deduplication ---
    deduplicate: bool = False
    dedup_store: str = "default"

    # --- Filtering ---
    filters: dict[str, Any] = field(default_factory=dict)
    transforms: dict[str, Any] = field(default_factory=dict)
    ai_filter_prompt: str = ""

    # --- Content cleaning ---
    clean_content: bool = False  # remove boilerplate before extraction
    extract_markdown: bool = False  # convert HTML to markdown

    # --- Browser ---
    headless: bool = True
    user_data_dir: str = ""
    viewport_width: int = 1920
    viewport_height: int = 1080
    timeout: int = 30000
    block_resources: bool = False  # block images/CSS/fonts for speed
    record_har: bool = False
    har_path: str = ""

    # --- Sitemap crawling ---
    sitemap_url: str = ""  # crawl all URLs from a sitemap
    sitemap_filter: str = ""  # regex to filter sitemap URLs

    # --- Misc ---
    screenshot_on_error: bool = True
    screenshot_dir: str = os.path.join(BASE_DIR, ".tmp", "scraper_screenshots")
    log_level: str = "INFO"
