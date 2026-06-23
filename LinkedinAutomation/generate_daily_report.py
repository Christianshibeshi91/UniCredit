"""Generate and send a daily analytics report via Telegram.

Reads today's data from Google Sheets, computes stats, and sends
a formatted summary to all authorized Telegram chats.
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

import requests  # pyre-ignore[21]
from dotenv import load_dotenv  # pyre-ignore[21]

PT = ZoneInfo("America/Los_Angeles")


def _parse_date_logged(date_str: str) -> datetime | None:
    """Parse Date Logged — supports MM/DD/YY, DD/MM/YYYY, and ISO formats."""
    if not date_str:
        return None
    clean = date_str.replace(" PST", "").replace(" PT", "").strip()
    # New format: MM/DD/YY HH:MM AM/PM
    for fmt in ["%m/%d/%y %I:%M %p", "%d/%m/%Y %I:%M %p"]:
        try:
            return datetime.strptime(clean, fmt).replace(tzinfo=PT)
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(date_str)
    except (ValueError, TypeError):
        return None

from LinkedinAutomation.alert_user import alert  # pyre-ignore[21]
from LinkedinAutomation.setup_google_sheet import get_sheets_service  # pyre-ignore[21]
from LinkedinAutomation.telegram_bot import ADMIN_CHAT_IDS  # pyre-ignore[21]

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

RUN_STATE_PATH = os.path.join(BASE_DIR, ".tmp", "run_state.json")
REPORT_HISTORY_PATH = os.path.join(BASE_DIR, ".tmp", "report_history.json")


def _get_spreadsheet_id() -> str:
    sid = os.getenv("GOOGLE_SHEETS_SPREADSHEET_ID")
    if not sid:
        raise ValueError("GOOGLE_SHEETS_SPREADSHEET_ID not set in .env")
    return sid


def _load_report_history() -> dict:
    if os.path.exists(REPORT_HISTORY_PATH):
        with open(REPORT_HISTORY_PATH, "r") as f:
            try:
                return json.load(f)
            except (json.JSONDecodeError, TypeError):
                return {}
    return {}


def _save_report_history(data: dict) -> None:
    os.makedirs(os.path.dirname(REPORT_HISTORY_PATH), exist_ok=True)
    with open(REPORT_HISTORY_PATH, "w") as f:
        json.dump(data, f, indent=2)


def _get_today_rows(service, spreadsheet_id: str) -> list:
    """Get all rows logged today (by Date Logged column T)."""
    result = service.spreadsheets().values().get(
        spreadsheetId=spreadsheet_id, range="Sheet1!A:U"
    ).execute()
    rows = result.get("values", [])
    if len(rows) <= 1:
        return []

    headers = rows[0]
    today_pt = datetime.now(PT).date()

    today_rows = []
    for row in rows[1:]:
        row_dict = dict(zip(headers, row + [""] * (len(headers) - len(row))))
        date_logged = row_dict.get("Date Logged", "")
        parsed = _parse_date_logged(date_logged)
        if parsed and parsed.date() == today_pt:
            today_rows.append(row_dict)

    return today_rows


def _get_all_rows(service, spreadsheet_id: str) -> list:
    """Get all data rows."""
    result = service.spreadsheets().values().get(
        spreadsheetId=spreadsheet_id, range="Sheet1!A:U"
    ).execute()
    rows = result.get("values", [])
    if len(rows) <= 1:
        return []

    headers = rows[0]
    return [
        dict(zip(headers, row + [""] * (len(headers) - len(row))))
        for row in rows[1:]
    ]


def _compute_stats(today_rows: list, all_rows: list) -> dict:
    """Compute daily analytics from sheet data."""
    # Today's stats
    jobs_found = len(today_rows)
    scores = []
    applied_count = 0
    pending_count = 0
    skipped_count = 0
    easy_apply_count = 0
    external_count = 0

    for row in today_rows:
        try:
            s = int(row.get("Match Score (0-100)", "0"))
            scores.append(s)
        except (ValueError, TypeError):
            pass

        applied_val = row.get("Applied?", "")
        status = row.get("Application Status", "")

        if "Yes" in applied_val:
            applied_count += 1
        if "Pending" in status:
            pending_count += 1
        if "Skipped" in status:
            skipped_count += 1

        if row.get("Application Type (Easy/External)", "") == "Easy Apply":
            easy_apply_count += 1
        else:
            external_count += 1

    avg_score = int(sum(scores) / len(scores)) if scores else 0

    # Top matches (sorted by score descending)
    top_matches = sorted(today_rows, key=lambda r: int(r.get("Match Score (0-100)", "0") or "0"), reverse=True)[:5]

    # Follow-ups due (applied 7+ days ago, still "Applied")
    follow_ups_due = 0
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    for row in all_rows:
        status = row.get("Application Status", "")
        if status not in ("Applied", "Approved - Manual Apply"):
            continue
        date_str = row.get("Date Logged", "")
        logged_date = _parse_date_logged(date_str)
        if logged_date and logged_date < cutoff:
            follow_ups_due += 1

    # Total all-time stats
    total_jobs = len(all_rows)
    total_applied = sum(1 for r in all_rows if "Yes" in r.get("Applied?", ""))

    return {
        "jobs_found": jobs_found,
        "avg_score": avg_score,
        "applied_count": applied_count,
        "pending_count": pending_count,
        "skipped_count": skipped_count,
        "easy_apply_count": easy_apply_count,
        "external_count": external_count,
        "follow_ups_due": follow_ups_due,
        "top_matches": top_matches,
        "total_jobs": total_jobs,
        "total_applied": total_applied,
    }


def _build_trend(current: int, previous: int) -> str:
    """Build trend arrow string."""
    if previous == 0:
        return ""
    diff = current - previous
    if diff > 0:
        return f" (\u2191{diff})"
    elif diff < 0:
        return f" (\u2193{abs(diff)})"
    return " (\u2192 same)"


def _build_report_message(stats: dict, prev_stats: dict) -> str:
    """Build the daily report HTML message."""
    today = datetime.now(PT).strftime("%m/%d/%y %I:%M %p PST")

    jobs_trend = _build_trend(stats["jobs_found"], prev_stats.get("jobs_found", 0))
    applied_trend = _build_trend(stats["applied_count"], prev_stats.get("applied_count", 0))

    msg = (
        f"\U0001f4ca <b>Daily Job Report \u2014 {today}</b>\n"
        f"\n"
        f"\U0001f50d <b>Jobs Found:</b> {stats['jobs_found']}{jobs_trend}\n"
        f"\u2b50 <b>Avg Score:</b> {stats['avg_score']}/100\n"
        f"\u2705 <b>Applied:</b> {stats['applied_count']}{applied_trend}\n"
        f"\u23f3 <b>Pending Approval:</b> {stats['pending_count']}\n"
        f"\u274c <b>Skipped:</b> {stats['skipped_count']}\n"
        f"\U0001f514 <b>Follow-Ups Due:</b> {stats['follow_ups_due']}\n"
        f"\n"
        f"\U0001f4bc <b>Easy Apply:</b> {stats['easy_apply_count']} | <b>External:</b> {stats['external_count']}\n"
    )

    # Top matches
    if stats["top_matches"]:
        msg += f"\n\U0001f3c6 <b>Top Matches:</b>\n"
        for i, row in enumerate(stats["top_matches"][:5], 1):
            title = row.get("Job Title", "Unknown")
            company = row.get("Company", "Unknown")
            score = row.get("Match Score (0-100)", "?")
            grade = row.get("Match Grade (A-F)", "?")
            msg += f"{i}. {title} @ {company} \u2014 {score}/100 ({grade})\n"

    # All-time stats
    msg += (
        f"\n\U0001f4c8 <b>All-Time:</b> {stats['total_jobs']} jobs tracked, "
        f"{stats['total_applied']} applied\n"
    )

    return msg


def send_daily_report() -> bool:
    """Generate and send the daily analytics report to Telegram."""
    if os.getenv("DAILY_REPORT_ENABLED", "true").lower() != "true":
        alert("Daily Report", "Disabled via DAILY_REPORT_ENABLED=false")
        return False

    bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    chat_ids = ADMIN_CHAT_IDS

    if not bot_token or not chat_ids:
        alert("Daily Report", "Telegram not configured, skipping report", "warning")
        return False

    try:
        service = get_sheets_service()
        spreadsheet_id = _get_spreadsheet_id()

        today_rows = _get_today_rows(service, spreadsheet_id)
        all_rows = _get_all_rows(service, spreadsheet_id)

        stats = _compute_stats(today_rows, all_rows)

        # Load previous day stats for trends
        history = _load_report_history()
        prev_stats = history.get("last_stats", {})

        message = _build_report_message(stats, prev_stats)

        # Save current stats for tomorrow's comparison
        today_key = datetime.now(PT).strftime("%m/%d/%y")
        history["last_stats"] = stats
        history["last_stats"].pop("top_matches", None)  # Don't persist row dicts
        history["last_report_date"] = today_key
        _save_report_history(history)

        # Send to Telegram
        api_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        success = True

        for chat_id in chat_ids:
            try:
                resp = requests.post(api_url, json={
                    "chat_id": chat_id,
                    "text": message,
                    "parse_mode": "HTML",
                    "disable_web_page_preview": True,
                }, timeout=10)
                resp.raise_for_status()
            except Exception as e:
                alert("Report Error", f"Failed to send to {chat_id}: {e}", "error")
                success = False

        if success:
            alert("Daily Report", f"Report sent to {len(chat_ids)} chats")
        return success

    except Exception as e:
        alert("Daily Report Error", f"Failed to generate report: {e}", "error")
        return False


if __name__ == "__main__":
    send_daily_report()
