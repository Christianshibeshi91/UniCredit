"""Lightweight HTTP crawl worker.

Uses httpx instead of Playwright for static pages. This saves ~400MB per
worker compared to running Chromium. Falls back to browser automation only
for JavaScript-heavy pages.

Memory usage: ~20-50MB per worker vs ~400MB for Playwright.
"""

import asyncio
import hashlib
import logging
import re
import time
from typing import Optional
from urllib.parse import urljoin, urlparse

import httpx

from cluster_config import WorkerConfig

logger = logging.getLogger(__name__)

# Pages that definitely need JS rendering
JS_HEAVY_DOMAINS = {
    "linkedin.com", "indeed.com", "glassdoor.com",
    "twitter.com", "x.com", "facebook.com",
    "instagram.com", "tiktok.com",
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
}


def needs_browser(url: str) -> bool:
    """Check if a URL likely needs JavaScript rendering."""
    domain = urlparse(url).netloc.lower()
    for js_domain in JS_HEAVY_DOMAINS:
        if js_domain in domain:
            return True
    return False


def extract_text(html: str) -> str:
    """Extract readable text from HTML without heavy dependencies."""
    # Remove scripts, styles, and tags
    html = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r"<style[^>]*>.*?</style>", "", html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r"<[^>]+>", " ", html)
    # Clean whitespace
    html = re.sub(r"\s+", " ", html).strip()
    return html


def extract_title(html: str) -> str:
    """Extract page title from HTML."""
    match = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    return match.group(1).strip() if match else ""


def extract_links(html: str, base_url: str) -> list[str]:
    """Extract unique links from HTML."""
    links = set()
    for match in re.finditer(r'href=["\'](https?://[^"\']+)["\']', html):
        url = match.group(1)
        if urlparse(url).scheme in ("http", "https"):
            links.add(url)
    for match in re.finditer(r'href=["\'](/[^"\']+)["\']', html):
        links.add(urljoin(base_url, match.group(1)))
    return list(links)[:50]


class CrawlWorker:
    """Lightweight HTTP-only web crawler."""

    def __init__(self, config: WorkerConfig = None, worker_id: int = 0):
        self.config = config or WorkerConfig()
        self.worker_id = worker_id
        self._client: Optional[httpx.AsyncClient] = None
        self._running = False
        self.pages_crawled = 0
        self.errors = 0

    async def start(self):
        self._client = httpx.AsyncClient(
            headers=HEADERS,
            timeout=30.0,
            follow_redirects=True,
            limits=httpx.Limits(
                max_connections=10,
                max_keepalive_connections=5,
            ),
        )
        self._running = True
        logger.info("Crawl worker %d started", self.worker_id)

    async def stop(self):
        self._running = False
        if self._client:
            await self._client.aclose()

    async def crawl(self, url: str) -> Optional[dict]:
        """Crawl a single URL. Returns page data or None on failure."""
        if needs_browser(url):
            return {"url": url, "needs_browser": True}

        try:
            response = await self._client.get(url)
            response.raise_for_status()

            content_type = response.headers.get("content-type", "")
            if "text/html" not in content_type and "application/xhtml" not in content_type:
                return None

            html = response.text
            text = extract_text(html)
            title = extract_title(html)
            links = extract_links(html, url)

            self.pages_crawled += 1

            return {
                "url": url,
                "title": title,
                "content": text[:50000],  # Limit content size
                "links": links,
                "status_code": response.status_code,
                "content_length": len(text),
                "crawled_at": time.time(),
                "needs_browser": False,
            }

        except Exception as e:
            self.errors += 1
            logger.warning("Crawl worker %d failed on %s: %s",
                          self.worker_id, url, e)
            return None

    async def crawl_batch(self, urls: list[str]) -> list[dict]:
        """Crawl multiple URLs with rate limiting."""
        results = []
        browser_needed = []

        for url in urls[:self.config.max_pages]:
            if not self._running:
                break

            result = await self.crawl(url)
            if result:
                if result.get("needs_browser"):
                    browser_needed.append(url)
                else:
                    results.append(result)

            await asyncio.sleep(self.config.crawl_delay)

        if browser_needed:
            logger.info("Crawl worker %d: %d URLs need browser rendering",
                        self.worker_id, len(browser_needed))

        return results, browser_needed

    def get_status(self) -> dict:
        return {
            "worker_id": self.worker_id,
            "running": self._running,
            "pages_crawled": self.pages_crawled,
            "errors": self.errors,
        }
