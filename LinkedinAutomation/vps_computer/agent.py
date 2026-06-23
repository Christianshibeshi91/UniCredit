"""Agent Controller - Core reasoning and planning engine.

Uses Ollama with Qwen for local LLM inference.
"""
from __future__ import annotations

import asyncio
import json
import logging
import httpx
from typing import Optional

from config import AgentConfig
from browser_controller import BrowserController
from search_module import SearchModule, SearchResult
from scraper import Scraper, PageData
from data_processor import DataProcessor
from output_formatter import OutputFormatter

logger = logging.getLogger(__name__)


class AgentController:
    """
    Main AI agent that orchestrates research tasks.
    Implements a reasoning loop: Plan -> Search -> Scrape -> Analyze -> Output.
    """

    def __init__(self, config: AgentConfig = None):
        self.config = config or AgentConfig()
        self.browser = BrowserController(self.config.browser)
        self.search = SearchModule(self.browser, self.config.search)
        self.scraper = Scraper(self.browser, self.config.scraper)
        self.processor = DataProcessor()
        self.formatter = OutputFormatter()
        self._http_client = httpx.AsyncClient(timeout=120.0)
        self._running = False

    async def start(self):
        """Initialize the agent and browser."""
        await self.browser.start()
        self._running = True
        logger.info("Agent started (provider=%s, model=%s, host=%s)",
                     self.config.llm_provider, self.config.llm_model,
                     self.config.ollama_host)

    async def stop(self):
        """Shut down the agent."""
        self._running = False
        await self.browser.stop()
        await self._http_client.aclose()
        logger.info("Agent stopped")

    async def research(self, query: str) -> dict:
        """
        Main entry point: execute a full research task.
        Returns structured JSON results.
        """
        logger.info("Starting research: %s", query)

        # Step 1: Plan
        plan = await self._create_plan(query)
        logger.info("Plan: %s", json.dumps(plan, indent=2))

        all_results = []

        for iteration in range(self.config.max_loop_iterations):
            logger.info("Research loop iteration %d/%d",
                        iteration + 1, self.config.max_loop_iterations)

            # Step 2: Search
            search_results = await self.search.multi_search(plan["search_queries"])

            # Step 3: Select pages to scrape
            urls_to_scrape = await self._select_urls(
                query, search_results, plan
            )

            # Step 4: Scrape selected pages
            page_data_list = await self.scraper.scrape_multiple(urls_to_scrape)

            # Step 5: Extract and process data
            extracted = await self._extract_data(query, page_data_list, plan)
            all_results.extend(extracted)

            # Step 6: Check if we have enough results
            assessment = await self._assess_results(query, all_results, plan)
            if assessment["sufficient"]:
                logger.info("Results sufficient, ending research loop")
                break

            # Update plan for next iteration
            if assessment.get("new_queries"):
                plan["search_queries"] = assessment["new_queries"]
                logger.info("Refining search with new queries: %s",
                            assessment["new_queries"])

        # Step 7: Final processing
        all_results = self.processor.deduplicate(all_results)
        all_results = self.processor.rank_by_relevance(all_results, query)
        all_results = self.processor.filter_results(all_results)

        # Step 8: Generate summary
        summary = await self._generate_summary(query, all_results)

        # Step 9: Format output
        output = self.formatter.format_json(
            query=query,
            results=all_results,
            summary=summary,
            metadata={
                "plan": plan,
                "iterations": iteration + 1,
                "pages_scraped": len(page_data_list),
            }
        )

        logger.info("Research complete: %d results", len(all_results))
        return output

    # --- LLM Backend ---

    async def _llm_call(self, system: str, prompt: str,
                        max_tokens: int = 2000) -> str:
        """Make a call to Ollama LLM."""
        url = f"{self.config.ollama_host}/api/chat"
        payload = {
            "model": self.config.llm_model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            "stream": False,
            "options": {
                "temperature": 0.3,
                "num_predict": max_tokens,
            },
        }

        response = await self._http_client.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        return data["message"]["content"]

    async def _llm_json(self, system: str, prompt: str,
                        max_tokens: int = 2000) -> dict:
        """Make an LLM call and parse JSON from response."""
        text = await self._llm_call(system, prompt, max_tokens)
        # Extract JSON from response (handle markdown code blocks)
        text = text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1])
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Try to find JSON in the text
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(text[start:end])
            raise

    # --- Research Steps ---

    async def _create_plan(self, query: str) -> dict:
        """Use LLM to create a research plan."""
        system = (
            "You are a research planning assistant. Create a research plan "
            "for the given query. Return JSON only."
        )
        prompt = f"""Create a research plan for this query:
"{query}"

Return JSON with:
{{
    "search_queries": ["list of 2-3 search queries to execute"],
    "data_type": "job|product|article|general",
    "key_fields": ["fields to extract from results"],
    "criteria": ["filtering criteria from the query"],
    "strategy": "brief description of approach"
}}"""

        return await self._llm_json(system, prompt)

    async def _select_urls(self, query: str,
                           search_results: list[SearchResult],
                           plan: dict) -> list[str]:
        """Use LLM to select the most relevant URLs to scrape."""
        results_text = "\n".join(
            f"{i+1}. {r.title} - {r.url}\n   {r.snippet}"
            for i, r in enumerate(search_results[:20])
        )

        system = "You select the most relevant URLs to visit for research. Return JSON only."
        prompt = f"""Query: "{query}"
Strategy: {plan.get('strategy', '')}

Search results:
{results_text}

Select the most relevant URLs to visit (max {self.config.scraper.max_pages_per_task}).
Return JSON: {{"urls": ["url1", "url2", ...]}}"""

        result = await self._llm_json(system, prompt, max_tokens=1000)
        urls = result.get("urls", [])
        logger.info("Selected %d URLs to scrape", len(urls))
        return urls

    async def _extract_data(self, query: str,
                            pages: list[PageData],
                            plan: dict) -> list[dict]:
        """Use LLM to extract relevant data from scraped pages."""
        extracted = []

        for page in pages:
            content = page.content[:8000]  # Limit for token budget
            data_type = plan.get("data_type", "general")
            key_fields = plan.get("key_fields", [])

            system = (
                "You extract structured data from webpage content. "
                "Return JSON only."
            )
            prompt = f"""Extract {data_type} data from this webpage.

URL: {page.url}
Title: {page.title}

Content:
{content}

Query: "{query}"
Fields to extract: {key_fields}

Return JSON:
{{
    "items": [
        {{
            "title": "...",
            "url": "{page.url}",
            "summary": "brief summary",
            ... other relevant fields
        }}
    ]
}}

If no relevant data found, return {{"items": []}}"""

            try:
                result = await self._llm_json(system, prompt, max_tokens=3000)
                items = result.get("items", [])
                for item in items:
                    item.setdefault("url", page.url)
                    item.setdefault("source_title", page.title)
                extracted.extend(items)
            except Exception as e:
                logger.error("Failed to extract from %s: %s", page.url, e)
                # Fallback: add raw page data
                extracted.append({
                    "title": page.title,
                    "url": page.url,
                    "summary": content[:500],
                    "content": content,
                })

        logger.info("Extracted %d items from %d pages", len(extracted), len(pages))
        return extracted

    async def _assess_results(self, query: str, results: list[dict],
                              plan: dict) -> dict:
        """Assess if current results are sufficient or need more research."""
        if not results:
            return {
                "sufficient": False,
                "new_queries": plan.get("search_queries", []),
            }

        results_summary = json.dumps(
            [{"title": r.get("title", ""), "url": r.get("url", "")}
             for r in results[:20]],
            indent=2
        )

        system = "You assess research completeness. Return JSON only."
        prompt = f"""Query: "{query}"
Criteria: {plan.get('criteria', [])}
Results so far ({len(results)} items):
{results_summary}

Are these results sufficient to answer the query?
Return JSON:
{{
    "sufficient": true/false,
    "reason": "why sufficient or not",
    "new_queries": ["optional new search queries if not sufficient"]
}}"""

        try:
            return await self._llm_json(system, prompt, max_tokens=500)
        except Exception:
            # Default: consider sufficient after getting some results
            return {"sufficient": len(results) >= 5}

    async def _generate_summary(self, query: str,
                                results: list[dict]) -> str:
        """Generate a natural language summary of the results."""
        truncated = self.processor.truncate_content(results.copy())
        results_text = json.dumps(truncated[:15], indent=2, default=str)

        system = "You summarize research findings concisely."
        prompt = f"""Summarize these research results for the query: "{query}"

Results:
{results_text}

Write a clear 2-4 paragraph summary of the key findings.
Include specific data points (numbers, names, etc.) where available."""

        return await self._llm_call(system, prompt, max_tokens=1000)
