"""Data Processor - Filters, deduplicates, ranks, and structures results."""

import logging
from typing import Optional
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


class DataProcessor:
    """Processes and structures extracted data."""

    def deduplicate(self, results: list[dict]) -> list[dict]:
        """Remove duplicate results based on URL."""
        seen = set()
        unique = []
        for r in results:
            url = self._normalize_url(r.get("url", ""))
            if url and url not in seen:
                seen.add(url)
                unique.append(r)
        logger.info("Deduplicated: %d -> %d results", len(results), len(unique))
        return unique

    def _normalize_url(self, url: str) -> str:
        """Normalize URL for dedup."""
        parsed = urlparse(url)
        return f"{parsed.netloc}{parsed.path}".rstrip("/").lower()

    def rank_by_relevance(self, results: list[dict], query: str) -> list[dict]:
        """Simple keyword-based relevance ranking."""
        query_words = set(query.lower().split())

        for r in results:
            score = 0
            text = f"{r.get('title', '')} {r.get('summary', '')} {r.get('snippet', '')}".lower()

            for word in query_words:
                if word in text:
                    score += 1
                # Boost for title match
                if word in r.get("title", "").lower():
                    score += 2

            # Boost for having structured data
            if r.get("structured"):
                score += 3

            r["relevance_score"] = score

        results.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)
        return results

    def filter_results(self, results: list[dict],
                       min_content_length: int = 50,
                       required_fields: list[str] = None) -> list[dict]:
        """Filter out low-quality results."""
        filtered = []
        for r in results:
            content = r.get("content", "") or r.get("summary", "") or r.get("snippet", "")
            if len(content) < min_content_length:
                continue

            if required_fields:
                if all(r.get(f) for f in required_fields):
                    filtered.append(r)
            else:
                filtered.append(r)

        logger.info("Filtered: %d -> %d results", len(results), len(filtered))
        return filtered

    def merge_results(self, *result_sets: list[dict]) -> list[dict]:
        """Merge multiple result sets and deduplicate."""
        merged = []
        for result_set in result_sets:
            merged.extend(result_set)
        return self.deduplicate(merged)

    def truncate_content(self, results: list[dict], max_chars: int = 3000) -> list[dict]:
        """Truncate content fields to limit token usage for LLM."""
        for r in results:
            if "content" in r and len(r["content"]) > max_chars:
                r["content"] = r["content"][:max_chars] + "..."
            if "raw_content" in r and len(r["raw_content"]) > max_chars:
                r["raw_content"] = r["raw_content"][:max_chars] + "..."
        return results
