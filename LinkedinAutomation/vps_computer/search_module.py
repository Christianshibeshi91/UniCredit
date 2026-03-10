"""Search Module - Generates and executes web search queries."""

import asyncio
import logging
import urllib.parse
from typing import Optional
from browser_controller import BrowserController
from config import SearchConfig

logger = logging.getLogger(__name__)


class SearchResult:
    """A single search result."""

    def __init__(self, title: str, url: str, snippet: str, rank: int):
        self.title = title
        self.url = url
        self.snippet = snippet
        self.rank = rank

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "url": self.url,
            "snippet": self.snippet,
            "rank": self.rank,
        }

    def __repr__(self):
        return f"SearchResult(title={self.title!r}, url={self.url!r})"


class SearchModule:
    """Performs web searches and returns structured results."""

    def __init__(self, browser: BrowserController, config: SearchConfig = None):
        self.browser = browser
        self.config = config or SearchConfig()

    async def search(self, query: str) -> list[SearchResult]:
        """Execute a search query and return results."""
        if self.config.search_engine == "duckduckgo":
            return await self._search_duckduckgo(query)
        return await self._search_google(query)

    async def _search_google(self, query: str) -> list[SearchResult]:
        """Search Google and extract results."""
        encoded = urllib.parse.quote_plus(query)
        url = f"https://www.google.com/search?q={encoded}&num={self.config.max_results_per_query}"

        await self.browser.goto(url)
        await asyncio.sleep(1)

        results = await self.browser._page.evaluate("""
            () => {
                const items = [];
                document.querySelectorAll('div.g').forEach((el, i) => {
                    const titleEl = el.querySelector('h3');
                    const linkEl = el.querySelector('a[href]');
                    const snippetEl = el.querySelector('div[data-sncf], div.VwiC3b, span.aCOpRe');
                    if (titleEl && linkEl) {
                        items.push({
                            title: titleEl.innerText,
                            url: linkEl.href,
                            snippet: snippetEl ? snippetEl.innerText : '',
                            rank: i + 1
                        });
                    }
                });
                return items;
            }
        """)

        search_results = [
            SearchResult(r["title"], r["url"], r["snippet"], r["rank"])
            for r in results[:self.config.max_results_per_query]
        ]
        logger.info("Google search '%s': %d results", query, len(search_results))
        return search_results

    async def _search_duckduckgo(self, query: str) -> list[SearchResult]:
        """Search DuckDuckGo and extract results."""
        encoded = urllib.parse.quote_plus(query)
        url = f"https://duckduckgo.com/?q={encoded}"

        await self.browser.goto(url)
        await asyncio.sleep(2)

        results = await self.browser._page.evaluate("""
            () => {
                const items = [];
                document.querySelectorAll('article[data-testid="result"]').forEach((el, i) => {
                    const titleEl = el.querySelector('h2 a');
                    const snippetEl = el.querySelector('span[data-testid="result-snippet"]');
                    if (titleEl) {
                        items.push({
                            title: titleEl.innerText,
                            url: titleEl.href,
                            snippet: snippetEl ? snippetEl.innerText : '',
                            rank: i + 1
                        });
                    }
                });
                return items;
            }
        """)

        search_results = [
            SearchResult(r["title"], r["url"], r["snippet"], r["rank"])
            for r in results[:self.config.max_results_per_query]
        ]
        logger.info("DuckDuckGo search '%s': %d results", query, len(search_results))
        return search_results

    async def multi_search(self, queries: list[str]) -> list[SearchResult]:
        """Execute multiple search queries and aggregate results."""
        all_results = []
        seen_urls = set()

        for query in queries[:self.config.max_search_queries]:
            results = await self.search(query)
            for r in results:
                if r.url not in seen_urls:
                    seen_urls.add(r.url)
                    all_results.append(r)
            await asyncio.sleep(self.config.max_results_per_query * 0.2)

        logger.info("Multi-search: %d unique results from %d queries",
                     len(all_results), len(queries))
        return all_results
