"""Follow-up tracker — sends Telegram reminders for jobs applied 7+ days ago.

Scans Google Sheets for rows with Application Status = "Applied" or
"Approved - Manual Apply" where Date Logged is older than FOLLOW_UP_DAYS.
Sends a Telegram reminder and updates Follow-Up Status column.
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
    # Try formats: new MM/DD/YY then old DD/MM/YYYY
    for fmt in ["%m/%d/%y %I:%M %p", "%d/%m/%Y %I:%M %p"]:
        try:
            return datetime.strptime(clean, fmt).replace(tzinfo=PT)
        except ValueError:
            continue
    # Fallback: ISO format from old rows
    try:
        return datetime.fromisoformat(date_str)
    except (ValueError, TypeError):
        return None

from LinkedinAutomation.alert_user import alert  # pyre-ignore[21]
from LinkedinAutomation.setup_google_sheet import get_sheets_service  # pyre-ignore[21]
from LinkedinAutomation.telegram_bot import get_all_chat_ids  # pyre-ignore[21]

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

FOLLOW_UP_STATUSES = ("Applied", "Approved - Manual Apply")


def _get_spreadsheet_id() -> str:
    sid = os.getenv("GOOGLE_SHEETS_SPREADSHEET_ID")
    if not sid:
        raise ValueError("GOOGLE_SHEETS_SPREADSHEET_ID not set in .env")
    return sid


def _get_follow_up_days() -> int:
    return int(os.getenv("FOLLOW_UP_DAYS", "7"))


def _find_due_follow_ups(service, spreadsheet_id: str) -> list:
    """Find all rows that need a follow-up reminder."""
    result = service.spreadsheets().values().get(
        spreadsheetId=spreadsheet_id, range="Sheet1!A:W"
    ).execute()
    rows = result.get("values", [])
    if len(rows) <= 1:
        return []

    headers = rows[0]
    cutoff = datetime.now(timezone.utc) - timedelta(days=_get_follow_up_days())
    due = []

    for i, row in enumerate(rows[1:], start=2):
        row_dict = dict(zip(headers, row + [""] * (len(headers) - len(row))))
        status = row_dict.get("Application Status", "")

        if status not in FOLLOW_UP_STATUSES:
            continue

        # Skip if already followed up
        follow_up_status = row_dict.get("Follow-Up Status", "")
        if follow_up_status in ("Reminded", "Followed Up", "No Response - Closed"):
            continue

        # Check date
        date_str = row_dict.get("Date Logged", "")
        logged_date = _parse_date_logged(date_str)
        if logged_date and logged_date < cutoff:
            row_dict["_row_num"] = i  # pyre-ignore[29]
            due.append(row_dict)

    return due


def _build_reminder_message(row: dict) -> str:
    """Build a follow-up reminder Telegram message."""
    title = row.get("Job Title", "Unknown")
    company = row.get("Company", "Unknown")
    url = row.get("Job URL", "")
    date_logged = row.get("Date Logged", "")
    status = row.get("Application Status", "")
    best_contact = row.get("Best Person to Network With", "")

    logged = _parse_date_logged(date_logged)
    if logged:
        days_ago = (datetime.now(PT) - logged).days
    else:
        days_ago = "?"

    msg = (
        f"\U0001f514 <b>Follow-Up Reminder</b>\n"
        f"\n"
        f"<b>{title}</b> at {company}\n"
        f"Applied {days_ago} days ago \u2014 Status: {status}\n"
    )

    if best_contact:
        msg += f"\n\U0001f465 <b>Contact:</b> {best_contact}\n"

    msg += (
        f"\n\U0001f4dd <b>Suggested action:</b>\n"
        f"\u2022 Check application status on the company portal\n"
        f"\u2022 Send a follow-up email to the recruiter\n"
    )

    if best_contact and best_contact != "Manual Lookup Required":
        msg += f"\u2022 Reach out to {best_contact} on LinkedIn\n"

    if url:
        msg += f'\n<a href="{url}">\U0001f517 View Job</a>'

    return msg


def _update_follow_up_status(service, spreadsheet_id: str, row_num: int) -> None:
    """Set Follow-Up Status (column W) to 'Reminded' and Follow-Up Date (V) to now."""
    now = datetime.now(PT).strftime("%m/%d/%y %I:%M %p PST")
    service.spreadsheets().values().batchUpdate(
        spreadsheetId=spreadsheet_id,
        body={
            "valueInputOption": "RAW",
            "data": [
                {"range": f"Sheet1!V{row_num}", "values": [[now]]},
                {"range": f"Sheet1!W{row_num}", "values": [["Reminded"]]},
            ],
        },
    ).execute()


def check_follow_ups() -> int:
    """Check for and send follow-up reminders. Returns count of reminders sent."""
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    chat_ids = get_all_chat_ids()

    if not bot_token or not chat_ids:
        alert("Follow-Up", "Telegram not configured, skipping", "warning")
        return 0

    try:
        service = get_sheets_service()
        spreadsheet_id = _get_spreadsheet_id()

        due_jobs = _find_due_follow_ups(service, spreadsheet_id)

        if not due_jobs:
            alert("Follow-Up", "No follow-ups due today")
            return 0

        alert("Follow-Up", f"{len(due_jobs)} follow-up(s) due")
        api_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        sent = 0

        for row in due_jobs:
            message = _build_reminder_message(row)
            row_num = row["_row_num"]

            for chat_id in chat_ids:
                try:
                    resp = requests.post(api_url, json={
                        "chat_id": chat_id,
                        "text": message,
                        "parse_mode": "HTML",
                        "disable_web_page_preview": False,
                    }, timeout=10)
                    resp.raise_for_status()
                except Exception as e:
                    alert("Follow-Up Error", f"Send failed for {chat_id}: {e}", "error")

            # Mark as reminded in Sheet
            try:
                _update_follow_up_status(service, spreadsheet_id, row_num)
            except Exception as e:
                alert("Follow-Up", f"Sheet update failed for row {row_num}: {e}", "warning")

            sent += 1

        alert("Follow-Up", f"Sent {sent} follow-up reminders")
        return sent

    except Exception as e:
        alert("Follow-Up Error", f"Failed: {e}", "error")
        return 0


if __name__ == "__main__":
    count = check_follow_ups()
    print(f"Sent {count} follow-up reminder(s)")
