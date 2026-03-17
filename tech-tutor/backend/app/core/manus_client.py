"""Async client for the Manus AI REST API (https://api.manus.im/v1).

Creates research tasks, polls for completion, and extracts results.
Used as an additional deep-research source alongside Gemini and NotebookLM.
"""

import asyncio
import logging
from typing import Any

import httpx

from app.core.config import MANUS_API_KEY

logger = logging.getLogger(__name__)

BASE_URL = "https://api.manus.im/v1"
POLL_INTERVAL_SECONDS = 2
MAX_POLL_SECONDS = 120  # 2-minute timeout — fail fast, don't block the pipeline


def _headers() -> dict[str, str]:
    if not MANUS_API_KEY:
        raise RuntimeError("MANUS_API_KEY is not configured in .env")
    return {
        "API_KEY": MANUS_API_KEY,
        "Content-Type": "application/json",
    }


async def create_task(prompt: str) -> dict[str, Any]:
    """Create a new Manus research task. Returns the task object."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{BASE_URL}/tasks",
            headers=_headers(),
            json={"prompt": prompt},
        )
        resp.raise_for_status()
        return resp.json()


async def get_task(task_id: str) -> dict[str, Any]:
    """Get the current status and result of a task."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{BASE_URL}/tasks/{task_id}",
            headers=_headers(),
        )
        resp.raise_for_status()
        return resp.json()


async def run_research(query: str, timeout_seconds: int = MAX_POLL_SECONDS) -> str:
    """Create a Manus research task, poll until done, and return the result text.

    Raises TimeoutError if the task doesn't complete within the timeout.
    Raises RuntimeError for API errors or task failures.
    """
    logger.info(f"Manus: creating research task ({len(query)} chars)")
    task = await create_task(query)

    task_id = task.get("id") or task.get("task_id")
    if not task_id:
        raise RuntimeError(f"Manus API returned no task ID: {task}")

    logger.info(f"Manus: task {task_id} created, polling for completion...")

    elapsed = 0
    while elapsed < timeout_seconds:
        await asyncio.sleep(POLL_INTERVAL_SECONDS)
        elapsed += POLL_INTERVAL_SECONDS

        status = await get_task(task_id)
        state = status.get("status", "").lower()

        if state in ("completed", "done", "finished", "success"):
            # Extract result — Manus may use different field names
            result = (
                status.get("result")
                or status.get("output")
                or status.get("data", {}).get("result")
                or status.get("data", {}).get("output")
                or status.get("content")
                or ""
            )
            if isinstance(result, dict):
                result = result.get("text") or result.get("content") or str(result)
            logger.info(f"Manus: task {task_id} completed ({len(str(result))} chars)")
            return str(result)

        if state in ("failed", "error", "cancelled"):
            error = status.get("error") or status.get("message") or str(status)
            raise RuntimeError(f"Manus task {task_id} failed: {error}")

        logger.debug(f"Manus: task {task_id} status={state}, elapsed={elapsed}s")

    raise TimeoutError(f"Manus task {task_id} did not complete within {timeout_seconds}s")


def is_configured() -> bool:
    """Check if Manus API key is available."""
    return bool(MANUS_API_KEY)
