"""Google Sheets to SQLite sync service."""
import asyncio
import os
import re
import logging
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from sqlmodel import select, delete
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build

from app.core.config import (
    GOOGLE_SHEETS_SPREADSHEET_ID,
    GOOGLE_CREDENTIALS_PATH,
    GOOGLE_TOKEN_PATH,
    SHEETS_SYNC_INTERVAL_SECONDS,
)
from app.core.database import async_session
from app.models.job import Job

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

# Sync state
_sync_task: asyncio.Task | None = None
_last_synced: str | None = None
_syncing = False
_job_count = 0

SHEET_COLUMNS = [
    "title", "company", "location", "remote_status", "salary",
    "job_url", "description", "score", "grade", "matched_skills",
    "missing_skills", "leadership_level", "enterprise_score",
    "linkedin_connections", "best_contact", "resume_file",
    "cover_letter_file", "app_type", "app_status", "date_logged",
    "applied", "follow_up_date", "follow_up_status",
]


def _get_sheets_service():
    creds = None
    token_path = str(GOOGLE_TOKEN_PATH)
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(GoogleRequest())
            with open(token_path, "w") as f:
                f.write(creds.to_json())
        else:
            raise RuntimeError("Google token.json expired or missing. Re-auth required.")
    return build("sheets", "v4", credentials=creds)


def _fetch_rows():
    service = _get_sheets_service()
    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=GOOGLE_SHEETS_SPREADSHEET_ID, range="Sheet1!A2:W")
        .execute()
    )
    return result.get("values", [])


PT = ZoneInfo("America/Los_Angeles")


def _normalize_date(raw: str) -> str:
    """Convert any date format from the Sheet to a sortable ISO string."""
    if not raw:
        return ""
    # Already ISO — pass through
    try:
        dt = datetime.fromisoformat(raw)
        return dt.isoformat()
    except (ValueError, TypeError):
        pass
    # Strip timezone abbreviation (PST/PT/PDT/etc)
    cleaned = re.sub(r"\s+(PST|PDT|PT|EST|EDT|ET|UTC|GMT)$", "", raw, flags=re.IGNORECASE).strip()
    # MM/DD/YY HH:MM AM/PM
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{2})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$", cleaned, re.IGNORECASE)
    if m:
        year = 2000 + int(m.group(3))
        hour = int(m.group(4))
        ampm = m.group(6).upper()
        if ampm == "PM" and hour != 12:
            hour += 12
        if ampm == "AM" and hour == 12:
            hour = 0
        dt = datetime(year, int(m.group(1)), int(m.group(2)), hour, int(m.group(5)), tzinfo=PT)
        return dt.isoformat()
    # MM/DD/YYYY HH:MM AM/PM
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$", cleaned, re.IGNORECASE)
    if m:
        hour = int(m.group(4))
        ampm = m.group(6).upper()
        if ampm == "PM" and hour != 12:
            hour += 12
        if ampm == "AM" and hour == 12:
            hour = 0
        dt = datetime(int(m.group(3)), int(m.group(1)), int(m.group(2)), hour, int(m.group(5)), tzinfo=PT)
        return dt.isoformat()
    return raw  # Return as-is if unparseable


def _row_to_job(row: list, row_idx: int) -> Job:
    # Pad row to 23 columns
    padded = row + [""] * (23 - len(row))
    data = dict(zip(SHEET_COLUMNS, padded))
    # Parse score as int
    try:
        data["score"] = int(data["score"])
    except (ValueError, TypeError):
        data["score"] = 0
    # Normalize date_logged to ISO for consistent sorting
    data["date_logged"] = _normalize_date(str(data.get("date_logged", "")))
    data["sheet_row"] = row_idx + 2  # +2 for header + 0-indexed
    return Job(**data)


async def _do_sync():
    global _last_synced, _syncing, _job_count
    _syncing = True
    try:
        rows = await asyncio.get_event_loop().run_in_executor(None, _fetch_rows)
        jobs = [_row_to_job(row, i) for i, row in enumerate(rows)]

        async with async_session() as session:
            # Clear and replace (simple approach for single-user)
            await session.execute(delete(Job))
            for job in jobs:
                session.add(job)
            await session.commit()

        _job_count = len(jobs)
        _last_synced = datetime.now(timezone.utc).isoformat()
        logger.info(f"Synced {_job_count} jobs from Sheets")
    except Exception as e:
        logger.error(f"Sheets sync failed: {e}")
        # Stale cache still served
    finally:
        _syncing = False


async def _sync_loop():
    while True:
        await _do_sync()
        await asyncio.sleep(SHEETS_SYNC_INTERVAL_SECONDS)


async def start_sync():
    global _sync_task
    if _sync_task is None or _sync_task.done():
        _sync_task = asyncio.create_task(_sync_loop())
        logger.info("Sheets sync started")


async def stop_sync():
    global _sync_task
    if _sync_task and not _sync_task.done():
        _sync_task.cancel()
        _sync_task = None


async def trigger_sync():
    await _do_sync()


def get_sync_status():
    return {
        "last_synced": _last_synced,
        "job_count": _job_count,
        "syncing": _syncing,
    }
