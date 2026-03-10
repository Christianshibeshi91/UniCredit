"""Structured output — JSON, CSV, SQLite, Google Sheets, API, webhooks.

Beyond basic file output:
  - SQLite database output with auto-schema creation
  - Webhook delivery with retry
  - Deduplication across runs (hash-based)
  - Incremental saves (append mode)
  - JSONL streaming output for large datasets
  - Multi-format output (save to multiple formats at once)
"""

from __future__ import annotations

import csv
import hashlib
import json
import logging
import os
import sqlite3
import time
from typing import Any

import requests  # pyre-ignore[21]

log = logging.getLogger(__name__)

_BASE_DIR = os.path.dirname(os.path.dirname(__file__))
_DEDUP_DIR = os.path.join(_BASE_DIR, ".tmp", "scraper_dedup")
os.makedirs(_DEDUP_DIR, exist_ok=True)


# ---------------------------------------------------------------------------
# Deduplication
# ---------------------------------------------------------------------------

def _row_hash(row: dict) -> str:
    """Generate a deterministic hash for a row."""
    serialized = json.dumps(row, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(serialized.encode()).hexdigest()[:16]


class DeduplicationStore:
    """Track seen items across scraping runs to avoid duplicates."""

    def __init__(self, store_name: str = "default"):
        self._path = os.path.join(_DEDUP_DIR, f"{store_name}.json")
        self._hashes: set[str] = set()
        self._load()

    def _load(self):
        if os.path.exists(self._path):
            try:
                data = json.loads(open(self._path).read())
                self._hashes = set(data.get("hashes", []))
            except Exception:
                pass

    def _save(self):
        with open(self._path, "w") as f:
            json.dump({"hashes": list(self._hashes), "updated": time.time()}, f)

    def is_new(self, row: dict) -> bool:
        return _row_hash(row) not in self._hashes

    def mark_seen(self, row: dict):
        self._hashes.add(_row_hash(row))

    def deduplicate(self, data: list[dict]) -> list[dict]:
        """Return only new (unseen) rows and mark them as seen."""
        new_items = []
        for row in data:
            if self.is_new(row):
                new_items.append(row)
                self.mark_seen(row)
        self._save()
        if len(data) != len(new_items):
            log.info("Deduplication: %d -> %d items (removed %d duplicates)",
                     len(data), len(new_items), len(data) - len(new_items))
        return new_items

    @property
    def total_seen(self) -> int:
        return len(self._hashes)

    def clear(self):
        self._hashes.clear()
        self._save()


# ---------------------------------------------------------------------------
# JSON / JSONL
# ---------------------------------------------------------------------------

def save_json(data: list[dict], path: str, append: bool = False):
    """Write data to a JSON file."""
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)

    if append and os.path.exists(path):
        try:
            existing = json.loads(open(path).read())
            if isinstance(existing, list):
                data = existing + data
        except Exception:
            pass

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    log.info("Saved %d records to %s", len(data), path)


def save_jsonl(data: list[dict], path: str, append: bool = True):
    """Write data as JSON Lines (one JSON object per line). Great for streaming."""
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    mode = "a" if append else "w"
    with open(path, mode, encoding="utf-8") as f:
        for row in data:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    log.info("Saved %d records to %s (JSONL)", len(data), path)


# ---------------------------------------------------------------------------
# CSV
# ---------------------------------------------------------------------------

def save_csv(data: list[dict], path: str, append: bool = False):
    """Write data to a CSV file."""
    if not data:
        log.warning("No data to save to CSV")
        return
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)

    columns: list[str] = []
    for row in data:
        for k in row:
            if k not in columns:
                columns.append(k)

    write_header = not append or not os.path.exists(path)
    mode = "a" if append else "w"

    with open(path, mode, newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=columns, extrasaction="ignore")
        if write_header:
            writer.writeheader()
        writer.writerows(data)
    log.info("Saved %d records to %s", len(data), path)


# ---------------------------------------------------------------------------
# SQLite
# ---------------------------------------------------------------------------

def save_sqlite(data: list[dict], db_path: str, table_name: str = "scraped_data"):
    """Save data to a SQLite database with auto-schema creation."""
    if not data:
        return

    os.makedirs(os.path.dirname(db_path) or ".", exist_ok=True)

    # Collect all columns
    columns: list[str] = []
    for row in data:
        for k in row:
            if k not in columns:
                columns.append(k)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Create table if not exists
    col_defs = ", ".join(f'"{c}" TEXT' for c in columns)
    cursor.execute(f'CREATE TABLE IF NOT EXISTS "{table_name}" (id INTEGER PRIMARY KEY AUTOINCREMENT, scraped_at TEXT, {col_defs})')

    # Add any new columns that don't exist yet
    existing_cols = set()
    for info in cursor.execute(f'PRAGMA table_info("{table_name}")').fetchall():
        existing_cols.add(info[1])
    for col in columns:
        if col not in existing_cols:
            cursor.execute(f'ALTER TABLE "{table_name}" ADD COLUMN "{col}" TEXT')

    # Insert rows
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    placeholders = ", ".join("?" for _ in columns)
    col_names = ", ".join(f'"{c}"' for c in columns)
    insert_sql = f'INSERT INTO "{table_name}" (scraped_at, {col_names}) VALUES (?, {placeholders})'

    for row in data:
        values = [timestamp] + [str(row.get(c, "")) for c in columns]
        cursor.execute(insert_sql, values)

    conn.commit()
    conn.close()
    log.info("Saved %d records to SQLite %s (table: %s)", len(data), db_path, table_name)


# ---------------------------------------------------------------------------
# Google Sheets
# ---------------------------------------------------------------------------

def push_to_sheets(
    data: list[dict],
    spreadsheet_id: str,
    range_name: str = "Sheet1!A1",
    credentials_path: str = "",
):
    """Append data rows to a Google Sheet."""
    try:
        from google.oauth2.service_account import Credentials  # pyre-ignore[21]
        from googleapiclient.discovery import build  # pyre-ignore[21]
    except ImportError:
        log.error("google-api-python-client not installed — Sheets push skipped")
        return

    cred_path = credentials_path or os.getenv("GOOGLE_SHEETS_CREDENTIALS", "")
    if not cred_path or not os.path.exists(cred_path):
        log.error("Google Sheets credentials not found at %s", cred_path)
        return

    creds = Credentials.from_service_account_file(
        cred_path, scopes=["https://www.googleapis.com/auth/spreadsheets"],
    )
    service = build("sheets", "v4", credentials=creds)

    if not data:
        return

    columns = []
    for row in data:
        for k in row:
            if k not in columns:
                columns.append(k)

    values = [columns]
    for row in data:
        values.append([str(row.get(c, "")) for c in columns])

    service.spreadsheets().values().append(
        spreadsheetId=spreadsheet_id, range=range_name,
        valueInputOption="USER_ENTERED", insertDataOption="INSERT_ROWS",
        body={"values": values},
    ).execute()
    log.info("Pushed %d records to Google Sheet %s", len(data), spreadsheet_id)


# ---------------------------------------------------------------------------
# API / Webhook
# ---------------------------------------------------------------------------

def push_to_api(
    data: list[dict],
    endpoint: str,
    headers: dict[str, str] | None = None,
    batch_size: int = 50,
    retries: int = 3,
):
    """POST data to an API endpoint in batches with retry."""
    if not endpoint:
        log.error("No API endpoint specified")
        return

    headers = headers or {"Content-Type": "application/json"}

    for i in range(0, len(data), batch_size):
        batch = data[i : i + batch_size]
        for attempt in range(retries):
            try:
                r = requests.post(endpoint, json=batch, headers=headers, timeout=30)
                if r.status_code < 300:
                    log.info("Pushed batch %d–%d to %s", i, i + len(batch), endpoint)
                    break
                else:
                    log.warning("API push attempt %d failed (HTTP %d)", attempt + 1, r.status_code)
                    if attempt < retries - 1:
                        time.sleep(2 ** attempt)
            except Exception as e:
                log.warning("API push attempt %d error: %s", attempt + 1, e)
                if attempt < retries - 1:
                    time.sleep(2 ** attempt)


def send_webhook(
    data: list[dict],
    webhook_url: str,
    event: str = "scrape_complete",
    retries: int = 3,
):
    """Send webhook notification with scraped data."""
    payload = {
        "event": event,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "count": len(data),
        "data": data[:100],  # Cap at 100 items for webhook payload
    }

    for attempt in range(retries):
        try:
            r = requests.post(
                webhook_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=15,
            )
            if r.status_code < 300:
                log.info("Webhook sent: %s (%d items)", event, len(data))
                return True
            log.warning("Webhook attempt %d failed (HTTP %d)", attempt + 1, r.status_code)
        except Exception as e:
            log.warning("Webhook attempt %d error: %s", attempt + 1, e)
        if attempt < retries - 1:
            time.sleep(2 ** attempt)

    log.error("Webhook delivery failed after %d attempts", retries)
    return False


# ---------------------------------------------------------------------------
# Unified output router
# ---------------------------------------------------------------------------

def output_data(
    data: list[dict],
    format: str = "json",
    path: str = "",
    append: bool = False,
    sheets_id: str = "",
    sheets_range: str = "Sheet1!A1",
    api_endpoint: str = "",
    api_headers: dict[str, str] | None = None,
    webhook_url: str = "",
    db_path: str = "",
    db_table: str = "scraped_data",
    deduplicate: bool = False,
    dedup_store: str = "default",
):
    """Route data to the configured output(s). Supports multiple formats."""
    if not data:
        log.warning("No data to output")
        return

    # Deduplication
    if deduplicate:
        store = DeduplicationStore(dedup_store)
        data = store.deduplicate(data)
        if not data:
            log.info("All items were duplicates — nothing to output")
            return

    # Support comma-separated formats for multi-output
    formats = [f.strip() for f in format.split(",")]

    for fmt in formats:
        if fmt == "json":
            save_json(data, path or "output.json", append=append)
        elif fmt == "jsonl":
            save_jsonl(data, path or "output.jsonl", append=append)
        elif fmt == "csv":
            save_csv(data, path or "output.csv", append=append)
        elif fmt == "sqlite":
            save_sqlite(data, db_path or "scraper.db", table_name=db_table)
        elif fmt == "sheets":
            push_to_sheets(data, sheets_id, sheets_range)
        elif fmt == "api":
            push_to_api(data, api_endpoint, api_headers)
        elif fmt == "webhook":
            send_webhook(data, webhook_url)
        else:
            log.error("Unknown output format: %s", fmt)
