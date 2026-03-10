"""Browser Controller - Handles all Playwright browser automation."""

import asyncio
import logging
import os
from typing import Optional
from playwright.async_api import async_playwright, Browser, BrowserContext, Page
from config import BrowserConfig

logger = logging.getLogger(__name__)


class BrowserController:
    """Controls a Playwright browser for autonomous web navigation."""

    def __init__(self, config: BrowserConfig = None):
        self.config = config or BrowserConfig()
        self._playwright = None
        self._browser: Optional[Browser] = None
        self._context: Optional[BrowserContext] = None
        self._page: Optional[Page] = None

    async def start(self):
        """Launch browser."""
        self._playwright = await async_playwright().start()
        # Detect Docker/container environment
        chromium_args = []
        if os.path.exists("/.dockerenv") or os.environ.get("CONTAINER"):
            chromium_args = [
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
            ]

        self._browser = await self._playwright.chromium.launch(
            headless=self.config.headless,
            slow_mo=self.config.slow_mo,
            args=chromium_args,
        )
        self._context = await self._browser.new_context(
            viewport={
                "width": self.config.viewport_width,
                "height": self.config.viewport_height,
            },
            user_agent=self.config.user_agent,
        )
        self._page = await self._context.new_page()
        self._page.set_default_timeout(self.config.timeout)
        logger.info("Browser started (headless=%s)", self.config.headless)

    async def stop(self):
        """Close browser."""
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()
        self._browser = None
        self._context = None
        self._page = None
        logger.info("Browser stopped")

    async def goto(self, url: str) -> str:
        """Navigate to URL. Returns page title."""
        try:
            await self._page.goto(url, wait_until="domcontentloaded")
            title = await self._page.title()
            logger.info("Navigated to %s (%s)", url, title)
            return title
        except Exception as e:
            logger.error("Failed to navigate to %s: %s", url, e)
            raise

    async def get_page_content(self) -> str:
        """Get the visible text content of the current page."""
        return await self._page.evaluate("""
            () => {
                // Remove script/style/nav/footer elements
                const remove = document.querySelectorAll(
                    'script, style, nav, footer, header, iframe, noscript, svg'
                );
                const clone = document.body.cloneNode(true);
                const removeFromClone = clone.querySelectorAll(
                    'script, style, nav, footer, header, iframe, noscript, svg'
                );
                removeFromClone.forEach(el => el.remove());
                return clone.innerText.replace(/\\n{3,}/g, '\\n\\n').trim();
            }
        """)

    async def get_page_html(self) -> str:
        """Get the HTML of the current page."""
        return await self._page.content()

    async def get_links(self) -> list[dict]:
        """Get all links on the current page."""
        return await self._page.evaluate("""
            () => {
                return Array.from(document.querySelectorAll('a[href]'))
                    .map(a => ({
                        text: a.innerText.trim().substring(0, 200),
                        href: a.href
                    }))
                    .filter(l => l.text && l.href.startsWith('http'));
            }
        """)

    async def click(self, selector: str):
        """Click an element."""
        await self._page.click(selector)
        await self._page.wait_for_load_state("domcontentloaded")

    async def fill(self, selector: str, text: str):
        """Fill a form field."""
        await self._page.fill(selector, text)

    async def press(self, key: str):
        """Press a key."""
        await self._page.keyboard.press(key)

    async def scroll_down(self):
        """Scroll down the page."""
        await self._page.evaluate("window.scrollBy(0, window.innerHeight)")
        await asyncio.sleep(0.5)

    async def screenshot(self, path: str = "screenshot.png") -> str:
        """Take a screenshot."""
        await self._page.screenshot(path=path)
        return path

    async def wait_for_selector(self, selector: str, timeout: int = 10000):
        """Wait for a selector to appear."""
        await self._page.wait_for_selector(selector, timeout=timeout)

    async def get_current_url(self) -> str:
        """Get current page URL."""
        return self._page.url

    async def go_back(self):
        """Navigate back."""
        await self._page.go_back(wait_until="domcontentloaded")

    async def new_page(self) -> Page:
        """Open a new tab."""
        page = await self._context.new_page()
        page.set_default_timeout(self.config.timeout)
        return page

    async def close_page(self, page: Page):
        """Close a specific page/tab."""
        await page.close()
