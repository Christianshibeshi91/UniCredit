"""Scraper Module - Extracts structured data from webpages."""

import asyncio
import logging
import urllib.robotparser
from typing import Optional
from browser_controller import BrowserController
from config import ScraperConfig
from security import URLValidator

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
        safe_url = URLValidator.sanitize(url)
        if not safe_url:
            logger.warning("Blocked unsafe URL (SSRF): %s", url)
            return None
        url = safe_url

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
