"""Shared utilities for job search modules.

Common filtering, salary extraction, and Firecrawl result normalization
used by search_indeed_jobs, search_glassdoor_jobs, and search_firecrawl_jobs.
"""
from __future__ import annotations

import re

MUST_HAVE_KEYWORDS = ["power platform", "power apps", "powerapps"]

REJECT_TITLE_KEYWORDS = [
    "architect", "f&o", "finance and operations", "functional consultant",
    "functional", "operations", "d365 f&o",
]


def passes_filter(job: dict) -> bool:
    """Apply keyword filters — relaxed for Firecrawl snippets."""
    title = job.get("title", "").lower()
    desc = job.get("description", "").lower()
    url = job.get("job_url", "").lower()
    combined = title + " " + desc + " " + url

    if not any(kw in combined for kw in MUST_HAVE_KEYWORDS):
        return False
    if any(kw in title for kw in REJECT_TITLE_KEYWORDS):
        return False
    return True


def extract_salary(text: str) -> str:
    """Try to find a salary range in text."""
    m = re.search(
        r'\$[\d,]+(?:\.\d+)?(?:\s*[-/\u2013\u2014]\s*\$[\d,]+(?:\.\d+)?)?(?:\s*/\s*(?:yr|year|hr|hour))?',
        text,
    )
    return m.group(0) if m else ""


def normalize_firecrawl_item(item) -> dict:
    """Convert a Firecrawl SearchResultWeb or Document object to a plain dict."""
    if isinstance(item, dict):
        return item

    meta = getattr(item, "metadata", {})
    if not isinstance(meta, dict):
        meta = meta.__dict__ if hasattr(meta, "__dict__") else {}

    return {
        "url": getattr(item, "url", "") or meta.get("url", "") or meta.get("sourceURL", ""),
        "title": getattr(item, "title", "") or meta.get("title", ""),
        "markdown": getattr(item, "markdown", "") or getattr(item, "description", ""),
        "description": getattr(item, "description", ""),
        "metadata": meta,
    }


def extract_firecrawl_items(results) -> list:
    """Extract item list from Firecrawl SearchData response (handles v1/v2 + dicts)."""
    if isinstance(results, list):
        return results
    if hasattr(results, "web") and results.web:
        return results.web
    if hasattr(results, "data") and results.data:
        return results.data if isinstance(results.data, list) else []
    if isinstance(results, dict):
        return results.get("data", []) or results.get("web", [])
    return []
