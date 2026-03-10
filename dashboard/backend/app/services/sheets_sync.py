"""Google Sheets to SQLite sync service."""
import asyncio
import os
import logging
from datetime import datetime, timezone

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


def _row_to_job(row: list, row_idx: int) -> Job:
    # Pad row to 23 columns
    padded = row + [""] * (23 - len(row))
    data = dict(zip(SHEET_COLUMNS, padded))
    # Parse score as int
    try:
        data["score"] = int(data["score"])
    except (ValueError, TypeError):
        data["score"] = 0
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
