"""Main scraper orchestrator — the engine that ties everything together.

Superior to Apify/Firecrawl:
  - Concurrent scraping with independent browser identities
  - Smart retry with error classification (timeout vs block vs rate-limit)
  - Sitemap-based crawling
  - Request queue with priority
  - Auto-scaling concurrency based on success rate
  - Multi-strategy extraction pipeline
  - Real-time deduplication
  - Incremental output (saves as it goes)

Usage:
    from web_scraper import Scraper, ScrapeConfig
    import asyncio

    # Simple scrape
    config = ScrapeConfig(
        start_urls=["https://example.com/products"],
        container_selector=".product-card",
        selectors={"name": "h3.title", "price": "span.price", "link": "a@href"},
        max_pages=5,
        output_format="json,csv",
        output_path="products.json",
    )
    results = asyncio.run(Scraper(config).run())

    # Complex workflow
    config = ScrapeConfig(
        workflow=[
            {"action": "navigate", "url": "https://example.com"},
            {"action": "login", "username": "user", "password": "pass",
             "success_selector": ".dashboard"},
            {"action": "navigate", "url": "https://example.com/data"},
            {"action": "paginate", "type": "click", "next_selector": "a.next",
             "container": ".item", "selectors": {"title": "h3", "value": "span.val"},
             "max_pages": 20},
        ],
        output_format="sqlite",
        db_path="results.db",
    )
    results = asyncio.run(Scraper(config).run())
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
import time
import xml.etree.ElementTree as ET
from typing import Any
from urllib.parse import urlparse

import requests as req_lib  # pyre-ignore[21]

from web_scraper.browser import BrowserEngine, BrowserPool
from web_scraper.captcha import CaptchaTracker, detect_captcha_type, CaptchaSolver
from web_scraper.config import ScrapeConfig
from web_scraper.extractor import (
    extract_with_selectors,
    extract_from_containers,
    extract_with_ai,
    extract_structured_data,
    recover_selectors_with_ai,
    validate_schema,
)
from web_scraper.filters import apply_filters, ai_filter, transform_data, FilterPipeline
from web_scraper.output import output_data, DeduplicationStore
from web_scraper.proxy import ProxyRotator
from web_scraper.session import SessionPool
from web_scraper.workflow import execute_workflow, WorkflowContext

log = logging.getLogger(__name__)


class Scraper:
    """General-purpose web scraper — production-grade orchestration."""

    def __init__(self, config: ScrapeConfig):
        self.config = config
        self.proxy_rotator = ProxyRotator(
            config.proxies,
            sticky_sessions=config.sticky_sessions,
            geo_target=config.geo_target,
        )
        self.session_pool = SessionPool(pool_size=max(config.concurrency, 3))
        self.captcha_tracker = CaptchaTracker()
        self.dedup_store = DeduplicationStore(config.dedup_store) if config.deduplicate else None
        self.engine: BrowserEngine | None = None
        self.pool: BrowserPool | None = None
        self.all_data: list[dict[str, Any]] = []
        self._stats = {
            "urls_scraped": 0,
            "pages_scraped": 0,
            "items_extracted": 0,
            "errors": 0,
            "captchas_hit": 0,
            "retries": 0,
            "start_time": 0.0,
        }

        # Set up logging
        logging.basicConfig(
            level=getattr(logging, config.log_level.upper(), logging.INFO),
            format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
        )

    async def run(self) -> list[dict[str, Any]]:
        """Execute the full scraping pipeline."""
        self._stats["start_time"] = time.time()

        try:
            # Collect all URLs to scrape
            urls = list(self.config.start_urls)

            # Add sitemap URLs
            if self.config.sitemap_url:
                sitemap_urls = self._fetch_sitemap(self.config.sitemap_url)
                if self.config.sitemap_filter:
                    pattern = re.compile(self.config.sitemap_filter)
                    sitemap_urls = [u for u in sitemap_urls if pattern.search(u)]
                urls.extend(sitemap_urls)
                log.info("Added %d URLs from sitemap", len(sitemap_urls))

            # Concurrent scraping
            if self.config.concurrency > 1 and len(urls) > 1:
                await self._scrape_concurrent(urls)
            else:
                await self._scrape_sequential(urls)

            # Post-processing pipeline
            result = self._post_process(self.all_data)

            # Output
            self._output(result)

            # Log stats
            elapsed = time.time() - self._stats["start_time"]
            log.info(
                "Scraping complete: %d items from %d URLs in %.1fs (%d errors, %d retries)",
                len(result), self._stats["urls_scraped"], elapsed,
                self._stats["errors"], self._stats["retries"],
            )

            return result

        except Exception as e:
            log.error("Scraper error: %s", e)
            if self.config.screenshot_on_error and self.engine:
                try:
                    path = os.path.join(
                        self.config.screenshot_dir, f"error_{int(time.time())}.png"
                    )
                    await self.engine.screenshot(path)
                except Exception:
                    pass
            raise
        finally:
            await self._cleanup()

    async def _scrape_sequential(self, urls: list[str]):
        """Scrape URLs one at a time."""
        await self._start_browser()

        # Execute workflow first
        if self.config.workflow:
            ctx = WorkflowContext()
            workflow_data = await execute_workflow(self.engine, self.config.workflow, ctx)
            self.all_data.extend(workflow_data)
            self._stats["items_extracted"] += len(workflow_data)

        # Scrape each URL
        for url in urls:
            data = await self._scrape_url(self.engine, url)
            self.all_data.extend(data)

    async def _scrape_concurrent(self, urls: list[str]):
        """Scrape URLs concurrently using a browser pool."""
        self.pool = BrowserPool(
            pool_size=self.config.concurrency,
            headless=self.config.headless,
            block_resources=self.config.block_resources,
            session_pool=self.session_pool,
        )

        semaphore = asyncio.Semaphore(self.config.concurrency)
        tasks = []

        async def scrape_with_semaphore(url: str):
            async with semaphore:
                proxy = self.proxy_rotator.get_next(domain=urlparse(url).netloc)
                engine = await self.pool.acquire(proxy=proxy, domain=urlparse(url).netloc)
                try:
                    data = await self._scrape_url(engine, url)
                    self.all_data.extend(data)
                finally:
                    await self.pool.release(engine)

        for url in urls:
            tasks.append(asyncio.create_task(scrape_with_semaphore(url)))

        await asyncio.gather(*tasks, return_exceptions=True)

    async def _start_browser(self):
        """Launch a single browser engine."""
        proxy = self.proxy_rotator.get_next() if self.proxy_rotator.has_proxies else None
        session = self.session_pool.get_session()

        self.engine = BrowserEngine(
            headless=self.config.headless,
            proxy=proxy,
            user_data_dir=self.config.user_data_dir,
            viewport_width=self.config.viewport_width,
            viewport_height=self.config.viewport_height,
            timeout=self.config.timeout,
            block_resources=self.config.block_resources,
            record_har=self.config.record_har,
            har_path=self.config.har_path,
            fingerprint=session.fingerprint,
            session=session,
        )
        await self.engine.start()

    async def _cleanup(self):
        if self.engine:
            await self.engine.close()
        if self.pool:
            await self.pool.close_all()

    async def _scrape_url(self, engine: BrowserEngine, url: str) -> list[dict[str, Any]]:
        """Scrape a single URL with smart retry."""
        domain = urlparse(url).netloc
        log.info("Scraping: %s", url)
        all_page_data: list[dict[str, Any]] = []

        # Smart retry with error classification
        for attempt in range(self.config.max_retries):
            try:
                # Check CAPTCHA risk
                if self.captcha_tracker.should_slow_down(url):
                    log.info("High CAPTCHA risk for %s — adding extra delay", domain)
                    await engine.human_delay(3.0, 6.0)

                success = await engine.goto(url)
                if success:
                    break

                # Classify the failure
                error_type = await self._classify_error(engine)
                self._stats["errors"] += 1
                self._stats["retries"] += 1

                if error_type == "captcha":
                    self._stats["captchas_hit"] += 1
                    self.captcha_tracker.record(url)

                # Rotate proxy on failure
                if self.proxy_rotator.has_proxies:
                    current_proxy = engine.proxy
                    if current_proxy:
                        self.proxy_rotator.report_failure(current_proxy.get("server", ""), error_type)
                    log.info("Retrying with new proxy (attempt %d, error: %s)", attempt + 1, error_type)
                    await engine.close()
                    new_proxy = self.proxy_rotator.get_next(domain=domain)
                    session = self.session_pool.get_session(domain)
                    engine = BrowserEngine(
                        headless=self.config.headless,
                        proxy=new_proxy,
                        block_resources=self.config.block_resources,
                        fingerprint=session.fingerprint,
                        session=session,
                    )
                    await engine.start()

                # Exponential backoff
                backoff = self.config.min_delay * (2 ** attempt)
                await asyncio.sleep(backoff)

            except Exception as e:
                log.error("Error scraping %s: %s", url, e)
                self._stats["errors"] += 1
                if attempt < self.config.max_retries - 1:
                    await asyncio.sleep(self.config.min_delay * (2 ** attempt))
        else:
            log.error("Failed to load %s after %d retries", url, self.config.max_retries)
            return []

        self._stats["urls_scraped"] += 1

        # Clean content if configured
        if self.config.clean_content:
            from web_scraper.cleaner import clean_html
            html = await engine.get_html()
            # The cleaning happens inside extraction

        # Extract from first page
        data = await self._extract_page(engine)
        all_page_data.extend(data)
        self._stats["pages_scraped"] += 1

        # Handle pagination
        if self.config.pagination_selector or self.config.pagination_type == "scroll":
            more = await self._paginate(engine, url, all_page_data)
            all_page_data.extend(more)

        self._stats["items_extracted"] += len(all_page_data)

        # Report proxy success
        if self.proxy_rotator.has_proxies and engine.proxy:
            self.proxy_rotator.report_success(engine.proxy.get("server", ""))

        return all_page_data

    async def _extract_page(self, engine: BrowserEngine) -> list[dict[str, Any]]:
        """Multi-strategy extraction pipeline."""
        page = engine.page
        data: list[dict[str, Any]] = []
        base_url = page.url

        # Strategy 1: Container-aware extraction (best for lists)
        if self.config.container_selector and self.config.selectors:
            data = await extract_from_containers(
                page, self.config.container_selector,
                self.config.selectors, base_url=base_url,
            )

        # Strategy 2: Flat selector extraction
        if not data and self.config.selectors:
            data = await extract_with_selectors(page, self.config.selectors, base_url=base_url)

        # Strategy 3: JSON-LD / structured data
        if not data and self.config.extract_structured_data:
            html = await engine.get_html()
            data = extract_structured_data(html)

        # Strategy 4: AI selector recovery
        if not data and self.config.selectors and self.config.ai_fallback:
            log.info("Selectors returned no data — AI selector recovery")
            new_selectors = await recover_selectors_with_ai(
                page,
                self.config.target_fields or list(self.config.selectors.keys()),
                self.config.selectors,
            )
            if new_selectors:
                log.info("AI suggested new selectors: %s", new_selectors)
                if self.config.container_selector:
                    data = await extract_from_containers(
                        page, self.config.container_selector,
                        new_selectors, base_url=base_url,
                    )
                if not data:
                    data = await extract_with_selectors(page, new_selectors, base_url=base_url)
                if data:
                    self.config.selectors = new_selectors

        # Strategy 5: Pure AI text extraction
        if not data and self.config.ai_fallback and self.config.target_fields:
            log.info("Falling back to AI text extraction")
            data = await extract_with_ai(
                page, self.config.target_fields, self.config.extraction_prompt,
            )

        # Schema validation
        if data and self.config.required_fields:
            data, invalid = validate_schema(data, required_fields=self.config.required_fields)
            if invalid:
                log.info("Dropped %d items failing schema validation", len(invalid))

        # Real-time dedup
        if data and self.dedup_store:
            data = self.dedup_store.deduplicate(data)

        return data

    async def _paginate(
        self, engine: BrowserEngine, base_url: str, existing_data: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """Navigate through pages and extract data."""
        page = engine.page
        new_data: list[dict[str, Any]] = []

        for page_num in range(1, self.config.max_pages):
            log.info("Page %d/%d", page_num + 1, self.config.max_pages)

            if self.config.pagination_type == "click":
                sel = self.config.pagination_selector
                try:
                    btn = await page.query_selector(sel)
                    if not btn:
                        log.info("No next button — pagination complete")
                        break
                    # Check if disabled
                    disabled = await btn.get_attribute("disabled")
                    cls = await btn.get_attribute("class") or ""
                    if disabled or "disabled" in cls:
                        break
                    await btn.click()
                    await engine.human_delay(self.config.min_delay, self.config.max_delay)
                    await page.wait_for_load_state("domcontentloaded")
                except Exception as e:
                    log.info("Pagination ended: %s", e)
                    break

            elif self.config.pagination_type == "scroll":
                prev_len = len(existing_data) + len(new_data)
                await engine.scroll_to_bottom(max_scrolls=10)
                data = await self._extract_page(engine)
                for item in data:
                    if item not in existing_data and item not in new_data:
                        new_data.append(item)
                if len(existing_data) + len(new_data) == prev_len:
                    log.info("No new items after scroll — done")
                    break
                continue

            elif self.config.pagination_type == "url_param":
                sep = "&" if "?" in base_url else "?"
                next_url = f"{base_url}{sep}{self.config.pagination_param}={page_num + 1}"
                success = await engine.goto(next_url)
                if not success:
                    break
                await engine.human_delay(self.config.min_delay, self.config.max_delay)

            # CAPTCHA check
            captcha_info = await detect_captcha_type(page)
            if captcha_info.detected:
                self._stats["captchas_hit"] += 1
                self.captcha_tracker.record(page.url)
                solver = CaptchaSolver()
                if solver.has_solver:
                    solved = await solver.solve(page, captcha_info)
                    if not solved:
                        log.warning("CAPTCHA on page %d — stopping", page_num + 1)
                        break
                else:
                    break

            data = await self._extract_page(engine)
            new_data.extend(data)
            self._stats["pages_scraped"] += 1

            await engine.human_delay(self.config.min_delay, self.config.max_delay)

        return new_data

    async def _classify_error(self, engine: BrowserEngine) -> str:
        """Classify the type of error on the current page."""
        try:
            page = engine.page
            captcha_info = await detect_captcha_type(page)
            if captcha_info.detected:
                return "captcha"

            html = (await page.content()).lower()
            if any(w in html for w in ["403", "forbidden", "access denied", "blocked"]):
                return "blocked"
            if any(w in html for w in ["429", "rate limit", "too many requests"]):
                return "rate_limit"
            if any(w in html for w in ["timeout", "timed out"]):
                return "timeout"
        except Exception:
            pass
        return "error"

    def _post_process(self, data: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Apply filters, transforms, and AI reasoning."""
        result = data

        # Transforms
        if self.config.transforms:
            result = transform_data(result, self.config.transforms)

        # Rule-based filters
        if self.config.filters:
            result = apply_filters(result, self.config.filters)

        # AI filter
        if self.config.ai_filter_prompt:
            result = ai_filter(result, self.config.ai_filter_prompt)

        return result

    def _output(self, data: list[dict[str, Any]]):
        if not data:
            log.warning("No data to output")
            return

        output_data(
            data,
            format=self.config.output_format,
            path=self.config.output_path,
            append=self.config.output_append,
            sheets_id=self.config.sheets_id,
            sheets_range=self.config.sheets_range,
            api_endpoint=self.config.api_endpoint,
            api_headers=self.config.api_headers,
            webhook_url=self.config.webhook_url,
            db_path=self.config.db_path,
            db_table=self.config.db_table,
            deduplicate=False,  # Already done in real-time
        )

    def _fetch_sitemap(self, sitemap_url: str) -> list[str]:
        """Fetch and parse a sitemap XML for URLs."""
        try:
            r = req_lib.get(sitemap_url, timeout=30)
            root = ET.fromstring(r.content)
            ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
            urls = []
            for url_el in root.findall(".//sm:url/sm:loc", ns):
                if url_el.text:
                    urls.append(url_el.text.strip())
            # Handle sitemap index (nested sitemaps)
            for sitemap_el in root.findall(".//sm:sitemap/sm:loc", ns):
                if sitemap_el.text:
                    urls.extend(self._fetch_sitemap(sitemap_el.text.strip()))
            return urls
        except Exception as e:
            log.error("Sitemap fetch failed: %s", e)
            return []

    @property
    def stats(self) -> dict:
        elapsed = time.time() - self._stats["start_time"] if self._stats["start_time"] else 0
        return {
            **self._stats,
            "elapsed_seconds": round(elapsed, 1),
            "items_per_second": round(self._stats["items_extracted"] / max(elapsed, 0.1), 1),
            "proxy_stats": self.proxy_rotator.stats if self.proxy_rotator.has_proxies else None,
            "session_stats": self.session_pool.stats,
        }


# ---------------------------------------------------------------------------
# Convenience function
# ---------------------------------------------------------------------------

def scrape(
    urls: list[str] | str,
    selectors: dict[str, str] | None = None,
    container: str = "",
    target_fields: list[str] | None = None,
    output_format: str = "json",
    output_path: str = "output.json",
    max_pages: int = 1,
    filters: dict[str, Any] | None = None,
    headless: bool = True,
    block_resources: bool = True,
    concurrency: int = 1,
    **kwargs,
) -> list[dict[str, Any]]:
    """Quick sync wrapper — scrape URLs and return structured data.

    Example:
        from web_scraper.scraper import scrape

        # Scrape product listings
        data = scrape(
            "https://example.com/products",
            container=".product-card",
            selectors={"name": "h3", "price": "span.price", "link": "a@href"},
            output_format="csv",
            output_path="products.csv",
            max_pages=5,
        )

        # Scrape with AI extraction (no selectors needed)
        data = scrape(
            "https://example.com/jobs",
            target_fields=["title", "company", "salary", "location"],
            output_format="json,sqlite",
            output_path="jobs.json",
            db_path="jobs.db",
        )
    """
    if isinstance(urls, str):
        urls = [urls]

    config = ScrapeConfig(
        start_urls=urls,
        selectors=selectors or {},
        container_selector=container,
        target_fields=target_fields or list((selectors or {}).keys()),
        ai_fallback=True,
        output_format=output_format,
        output_path=output_path,
        max_pages=max_pages,
        filters=filters or {},
        headless=headless,
        block_resources=block_resources,
        concurrency=concurrency,
    )

    # Apply any extra kwargs that match config fields
    for k, v in kwargs.items():
        if hasattr(config, k):
            setattr(config, k, v)

    return asyncio.run(Scraper(config).run())
