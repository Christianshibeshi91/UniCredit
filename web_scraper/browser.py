"""Stealth Playwright browser engine — superior to Apify's browser pool.

Capabilities beyond Apify/Firecrawl/raw Playwright:
  - Full fingerprint-based identity (not just UA rotation)
  - Concurrent browser contexts with independent identities
  - Request interception: block images/CSS/fonts for 3-5x speed
  - Network HAR recording for debugging
  - CAPTCHA detection + auto-solving integration
  - Resource usage tracking per context
  - Automatic session persistence
  - Geolocation spoofing per identity
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import random
import time
from pathlib import Path
from urllib.parse import urlparse

from web_scraper.session import SessionPool, Session, generate_fingerprint, BrowserFingerprint

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Cookie persistence
# ---------------------------------------------------------------------------
_COOKIE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".tmp", "web_scraper_cookies")
os.makedirs(_COOKIE_DIR, exist_ok=True)


def _cookie_path(domain: str) -> str:
    safe = domain.replace(".", "_").replace("/", "_")
    return os.path.join(_COOKIE_DIR, f"{safe}.json")


async def _save_cookies(context, domain: str):
    cookies = await context.cookies()
    Path(_cookie_path(domain)).write_text(json.dumps(cookies, indent=2))


async def _load_cookies(context, domain: str):
    path = _cookie_path(domain)
    if os.path.exists(path):
        try:
            cookies = json.loads(Path(path).read_text())
            await context.add_cookies(cookies)
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Resource blocking lists
# ---------------------------------------------------------------------------
_BLOCK_RESOURCE_TYPES = {"image", "media", "font", "texttrack", "eventsource", "websocket", "manifest"}
_BLOCK_URL_PATTERNS = [
    "google-analytics.com", "googletagmanager.com", "facebook.net",
    "doubleclick.net", "adsense", "adservice", "analytics",
    "hotjar.com", "clarity.ms", "newrelic.com", "sentry.io",
    "intercom.io", "crisp.chat", "hubspot.com",
]


# ---------------------------------------------------------------------------
# Browser engine
# ---------------------------------------------------------------------------
class BrowserEngine:
    """Manages stealth Playwright browser instances with full fingerprint control."""

    def __init__(
        self,
        headless: bool = True,
        proxy: dict[str, str] | None = None,
        user_data_dir: str = "",
        viewport_width: int = 1920,
        viewport_height: int = 1080,
        timeout: int = 30000,
        block_resources: bool = False,
        record_har: bool = False,
        har_path: str = "",
        fingerprint: BrowserFingerprint | None = None,
        session: Session | None = None,
    ):
        self.headless = headless
        self.proxy = proxy
        self.user_data_dir = user_data_dir
        self.viewport = {"width": viewport_width, "height": viewport_height}
        self.timeout = timeout
        self.block_resources = block_resources
        self.record_har = record_har
        self.har_path = har_path
        self.fingerprint = fingerprint or generate_fingerprint()
        self.session = session

        self._playwright = None
        self._browser = None
        self._context = None
        self._page = None
        self._pages: list = []  # all open pages
        self._request_count = 0
        self._bytes_received = 0
        self._blocked_count = 0
        self._start_time = 0.0

    async def start(self):
        """Launch browser and create a stealth context with full fingerprint."""
        from playwright.async_api import async_playwright  # pyre-ignore[21]

        self._playwright = await async_playwright().start()
        self._start_time = time.time()

        launch_args = {
            "headless": self.headless,
            "args": [
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage",
                "--no-sandbox",
                "--disable-web-security",
                "--disable-features=IsolateOrigins,site-per-process",
                "--disable-infobars",
                "--disable-background-timer-throttling",
                "--disable-renderer-backgrounding",
                f"--window-size={self.fingerprint.screen[0]},{self.fingerprint.screen[1]}",
            ],
        }
        if self.proxy:
            launch_args["proxy"] = self.proxy

        self._browser = await self._playwright.chromium.launch(**launch_args)

        context_args = {
            "viewport": self.fingerprint.viewport,
            "user_agent": self.fingerprint.user_agent,
            "locale": self.fingerprint.locale,
            "timezone_id": self.fingerprint.timezone,
            "permissions": ["geolocation"],
            "color_scheme": "light",
            "screen": {"width": self.fingerprint.screen[0], "height": self.fingerprint.screen[1]},
        }

        # HAR recording
        if self.record_har and self.har_path:
            os.makedirs(os.path.dirname(self.har_path) or ".", exist_ok=True)
            context_args["record_har_path"] = self.har_path
            context_args["record_har_url_filter"] = "**/*"

        self._context = await self._browser.new_context(**context_args)
        self._context.set_default_timeout(self.timeout)

        # Inject fingerprint-specific stealth JS
        await self._context.add_init_script(self.fingerprint.stealth_js())

        # Resource blocking via route interception
        if self.block_resources:
            await self._context.route("**/*", self._intercept_route)

        # Load session cookies
        if self.session:
            cookies = SessionPool().load_cookies(self.session)
            if cookies:
                await self._context.add_cookies(cookies)

        self._page = await self._context.new_page()
        self._pages.append(self._page)

        # Track network usage
        self._page.on("response", self._track_response)

        return self._page

    async def _intercept_route(self, route):
        """Block unnecessary resources for speed."""
        req = route.request
        resource_type = req.resource_type

        # Block by resource type
        if resource_type in _BLOCK_RESOURCE_TYPES:
            self._blocked_count += 1
            await route.abort()
            return

        # Block by URL pattern (analytics, ads, trackers)
        url = req.url.lower()
        if any(pat in url for pat in _BLOCK_URL_PATTERNS):
            self._blocked_count += 1
            await route.abort()
            return

        await route.continue_()

    def _track_response(self, response):
        """Track network stats."""
        self._request_count += 1
        try:
            headers = response.headers
            size = int(headers.get("content-length", 0))
            self._bytes_received += size
        except Exception:
            pass

    @property
    def page(self):
        return self._page

    @property
    def context(self):
        return self._context

    @property
    def stats(self) -> dict:
        elapsed = time.time() - self._start_time if self._start_time else 0
        return {
            "requests": self._request_count,
            "bytes_received": self._bytes_received,
            "blocked_requests": self._blocked_count,
            "elapsed_seconds": round(elapsed, 1),
            "pages_open": len(self._pages),
        }

    async def new_page(self):
        """Open a new tab in the same context."""
        self._page = await self._context.new_page()
        self._page.on("response", self._track_response)
        self._pages.append(self._page)
        return self._page

    async def close_page(self, page=None):
        """Close a specific page or the current one."""
        target = page or self._page
        if target in self._pages:
            self._pages.remove(target)
            await target.close()
        if self._pages:
            self._page = self._pages[-1]

    async def goto(self, url: str, wait_until: str = "domcontentloaded") -> bool:
        """Navigate to URL with CAPTCHA detection and solving."""
        from web_scraper.captcha import detect_captcha_type, CaptchaSolver

        try:
            await self._page.goto(url, wait_until=wait_until)

            # Check for CAPTCHA
            info = await detect_captcha_type(self._page)
            if info.detected:
                log.warning("CAPTCHA detected at %s: %s", url, info.captcha_type)
                solver = CaptchaSolver()
                if solver.has_solver:
                    solved = await solver.solve(self._page, info)
                    if solved:
                        log.info("CAPTCHA solved successfully")
                        return True
                    log.warning("CAPTCHA solving failed")
                    return False
                elif info.captcha_type == "cloudflare":
                    return await solver._handle_cloudflare(self._page)
                return False

            return True
        except Exception as e:
            log.error("Navigation error: %s", e)
            return False

    async def save_cookies(self, domain: str):
        await _save_cookies(self._context, domain)
        if self.session:
            cookies = await self._context.cookies()
            SessionPool().save_cookies(self.session, cookies)

    async def load_cookies(self, domain: str):
        await _load_cookies(self._context, domain)

    async def screenshot(self, path: str, full_page: bool = True):
        """Take a screenshot of the current page."""
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        await self._page.screenshot(path=path, full_page=full_page)

    # --- Human-like interactions ---

    async def human_delay(self, min_s: float = 0.5, max_s: float = 2.0):
        """Wait a human-like random duration using Gaussian distribution."""
        mean = (min_s + max_s) / 2
        stddev = (max_s - min_s) / 4
        delay = max(min_s * 0.5, random.gauss(mean, stddev))
        await asyncio.sleep(delay)

    async def human_type(self, selector: str, text: str):
        """Type text character-by-character with realistic timing."""
        el = await self._page.query_selector(selector)
        if not el:
            try:
                await self._page.wait_for_selector(selector, timeout=5000)
                el = await self._page.query_selector(selector)
            except Exception:
                pass
        if not el:
            raise ValueError(f"Element not found: {selector}")

        await el.click()
        await asyncio.sleep(random.uniform(0.1, 0.3))
        await el.fill("")

        for i, ch in enumerate(text):
            await self._page.keyboard.type(ch)
            delay = max(0.02, random.gauss(0.08, 0.025))
            if random.random() < 0.04:
                delay += random.uniform(0.3, 0.7)
            if ch == " ":
                delay += random.uniform(0.03, 0.08)
            if i > 0 and text[i - 1] == " ":
                delay += random.uniform(0.01, 0.05)
            await asyncio.sleep(delay)

    async def human_click(self, selector: str):
        """Move mouse realistically then click."""
        el = await self._page.query_selector(selector)
        if not el:
            try:
                await self._page.wait_for_selector(selector, state="visible", timeout=5000)
                el = await self._page.query_selector(selector)
            except Exception:
                pass
        if not el:
            raise ValueError(f"Element not found: {selector}")

        box = await el.bounding_box()
        if not box:
            await el.click()
            return

        tx = box["x"] + random.uniform(box["width"] * 0.2, box["width"] * 0.8)
        ty = box["y"] + random.uniform(box["height"] * 0.2, box["height"] * 0.8)
        await self._page.mouse.move(tx, ty, steps=random.randint(8, 20))
        await asyncio.sleep(random.uniform(0.05, 0.15))
        await self._page.mouse.click(tx, ty)

    async def smooth_scroll(self, distance: int = 800, steps: int = 5):
        """Scroll down smoothly in increments."""
        step_size = distance // steps
        for _ in range(steps):
            actual_step = step_size + random.randint(-30, 30)
            await self._page.evaluate(f"window.scrollBy(0, {actual_step})")
            await asyncio.sleep(random.uniform(0.08, 0.25))

    async def scroll_to_bottom(self, max_scrolls: int = 50, idle_threshold: int = 3):
        """Scroll to page bottom for infinite-scroll pages."""
        prev_height = 0
        idle_count = 0
        for i in range(max_scrolls):
            if random.random() < 0.2:
                await self._page.evaluate(f"window.scrollBy(0, -{random.randint(100, 300)})")
                await asyncio.sleep(random.uniform(0.3, 0.8))

            await self._page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await asyncio.sleep(random.uniform(1.0, 2.5))

            cur_height = await self._page.evaluate("document.body.scrollHeight")
            if cur_height == prev_height:
                idle_count += 1
                if idle_count >= idle_threshold:
                    break
            else:
                idle_count = 0
            prev_height = cur_height

    # --- Network interception ---

    async def intercept_requests(self, url_pattern: str, handler):
        """Set up custom request interception for a URL pattern."""
        await self._context.route(url_pattern, handler)

    async def block_urls(self, patterns: list[str]):
        """Block requests matching any of the given URL patterns."""
        for pattern in patterns:
            await self._context.route(pattern, lambda route: route.abort())

    async def modify_headers(self, headers: dict[str, str]):
        """Add/override headers on all requests."""
        async def handler(route):
            existing = route.request.headers.copy()
            existing.update(headers)
            await route.continue_(headers=existing)
        await self._context.route("**/*", handler)

    # --- Page content ---

    async def get_html(self) -> str:
        return await self._page.content()

    async def get_text(self) -> str:
        try:
            return await self._page.inner_text("body")
        except Exception:
            return await self._page.content()

    async def get_url(self) -> str:
        return self._page.url

    async def wait_for_navigation(self, timeout: int = 30000):
        await self._page.wait_for_load_state("domcontentloaded", timeout=timeout)

    async def wait_for_idle(self, timeout: int = 10000):
        await self._page.wait_for_load_state("networkidle", timeout=timeout)

    # --- Cleanup ---

    async def close(self):
        try:
            if self._context:
                await self._context.close()
            if self._browser:
                await self._browser.close()
            if self._playwright:
                await self._playwright.stop()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Concurrent browser pool
# ---------------------------------------------------------------------------

class BrowserPool:
    """Manage multiple concurrent browser contexts for parallel scraping.

    Each context gets its own fingerprint and can run independently.
    """

    def __init__(
        self,
        pool_size: int = 3,
        headless: bool = True,
        block_resources: bool = True,
        session_pool: SessionPool | None = None,
    ):
        self.pool_size = pool_size
        self.headless = headless
        self.block_resources = block_resources
        self.session_pool = session_pool or SessionPool(pool_size=pool_size)
        self._engines: list[BrowserEngine] = []
        self._semaphore = asyncio.Semaphore(pool_size)

    async def acquire(self, proxy: dict[str, str] | None = None, domain: str = "") -> BrowserEngine:
        """Get a browser engine from the pool (blocks if full)."""
        await self._semaphore.acquire()

        session = self.session_pool.get_session(domain)
        engine = BrowserEngine(
            headless=self.headless,
            proxy=proxy,
            block_resources=self.block_resources,
            fingerprint=session.fingerprint,
            session=session,
        )
        await engine.start()
        self._engines.append(engine)
        return engine

    async def release(self, engine: BrowserEngine):
        """Return a browser engine to the pool."""
        if engine in self._engines:
            self._engines.remove(engine)
        await engine.close()
        self._semaphore.release()

    async def close_all(self):
        for engine in self._engines:
            await engine.close()
        self._engines.clear()

    @property
    def stats(self) -> dict:
        return {
            "active_engines": len(self._engines),
            "pool_size": self.pool_size,
            "session_stats": self.session_pool.stats,
            "engine_stats": [e.stats for e in self._engines],
        }
