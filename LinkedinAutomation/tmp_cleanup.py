"""Cleanup of .tmp artifacts to limit disk use and reduce exposure of PII in screenshots.

- Screenshots under .tmp/screenshots are deleted when older than SCREENSHOT_RETENTION_DAYS (default 7).
- Called at the start of run_daily and run_scheduler so each run prunes old files.
"""
from __future__ import annotations

import os
import time

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
SCREENSHOTS_DIR = os.path.join(BASE_DIR, ".tmp", "screenshots")
DEFAULT_RETENTION_DAYS = 7


def clean_old_screenshots(retention_days: int | None = None) -> int:
    """Delete screenshot files older than retention_days. Returns number of files deleted."""
    if retention_days is None:
        retention_days = int(os.environ.get("SCREENSHOT_RETENTION_DAYS", str(DEFAULT_RETENTION_DAYS)))
    if retention_days < 0:
        return 0
    if not os.path.isdir(SCREENSHOTS_DIR):
        return 0
    cutoff = time.time() - (retention_days * 24 * 3600)
    deleted = 0
    try:
        for name in os.listdir(SCREENSHOTS_DIR):
            path = os.path.join(SCREENSHOTS_DIR, name)
            if not os.path.isfile(path):
                continue
            if os.path.getmtime(path) < cutoff:
                try:
                    os.remove(path)
                    deleted += 1
                except OSError:
                    pass
    except OSError:
        pass
    return deleted
