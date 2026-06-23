"""Save/restore mid-application browser state for Telegram Q&A pauses."""

from __future__ import annotations

import json
import os
import time

from playwright.async_api import Page, BrowserContext  # pyre-ignore[21]

from LinkedinAutomation.apply_security import restrict_file_permissions  # pyre-ignore[21]

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
SESSIONS_DIR = os.path.join(BASE_DIR, ".tmp", "sessions")


class SessionSnapshot:
    """Persist and restore browser state across Telegram Q&A pauses."""

    def __init__(self, job_id: str):
        self._job_id = job_id
        self._path = os.path.join(SESSIONS_DIR, f"{job_id}.json")

    # ------------------------------------------------------------------
    # Save
    # ------------------------------------------------------------------
    async def save(self, page: Page, filled_fields: dict, current_page: int) -> dict:
        """Save current browser state to disk. Returns the snapshot dict."""
        cookies = await page.context.cookies()
        snapshot = {
            "job_id": self._job_id,
            "url": page.url,
            "cookies": cookies,
            "filled_fields": filled_fields,
            "current_page": current_page,
            "saved_at": time.time(),
        }

        os.makedirs(SESSIONS_DIR, exist_ok=True)
        tmp_path = self._path + ".tmp"
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(snapshot, f, indent=2, ensure_ascii=False)
        os.replace(tmp_path, self._path)
        restrict_file_permissions(self._path)
        return snapshot

    # ------------------------------------------------------------------
    # Load
    # ------------------------------------------------------------------
    def load(self) -> dict | None:
        """Load saved snapshot from disk. Returns None if missing."""
        if not os.path.isfile(self._path):
            return None
        try:
            with open(self._path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return None

    # ------------------------------------------------------------------
    # Restore
    # ------------------------------------------------------------------
    async def restore(self, context: BrowserContext) -> tuple[Page, dict]:
        """Restore session into existing browser context.

        Returns (page, snapshot) or raises FileNotFoundError.
        """
        snapshot = self.load()
        if snapshot is None:
            raise FileNotFoundError(f"No session snapshot for job {self._job_id}")

        if snapshot.get("cookies"):
            await context.add_cookies(snapshot["cookies"])

        page = await context.new_page()
        await page.goto(snapshot["url"], wait_until="domcontentloaded", timeout=30_000)
        return page, snapshot

    # ------------------------------------------------------------------
    # Utilities
    # ------------------------------------------------------------------
    @staticmethod
    async def is_page_alive(page: Page) -> bool:
        """Check if page is still responsive."""
        try:
            await page.evaluate("1 + 1")
            return True
        except Exception:
            return False

    def delete(self) -> None:
        """Remove session file after successful completion."""
        try:
            os.remove(self._path)
        except FileNotFoundError:
            pass
