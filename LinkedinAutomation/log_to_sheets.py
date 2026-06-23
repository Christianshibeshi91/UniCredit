"""Append a job row to the Google Sheet (idempotent — skips if job_url exists)."""
from __future__ import annotations

import os
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from LinkedinAutomation.setup_google_sheet import get_sheets_service, ensure_headers, HEADERS  # pyre-ignore[21]

PT = ZoneInfo("America/Los_Angeles")

BASE_DIR = os.path.dirname(os.path.dirname(__file__))


def _get_spreadsheet_id() -> str:
    from dotenv import load_dotenv  # pyre-ignore[21]
    load_dotenv(os.path.join(BASE_DIR, ".env"))
    sid = os.getenv("GOOGLE_SHEETS_SPREADSHEET_ID")
    if not sid:
        raise ValueError("GOOGLE_SHEETS_SPREADSHEET_ID not set in .env")
    return sid


def _check_duplicate(service, spreadsheet_id: str, job_url: str) -> int | None:
    """Check column F for existing job_url. Return row number if found, else None."""
    result = service.spreadsheets().values().get(
        spreadsheetId=spreadsheet_id, range="Sheet1!F:F"
    ).execute()
    rows = result.get("values", [])
    for i, row in enumerate(rows):
        if row and row[0] == job_url:
            return i + 1  # 1-indexed
    return None


def log_job(job_data: dict) -> int:
    """Append a 21-column row. Returns the row number. Skips if job_url already exists."""
    spreadsheet_id = _get_spreadsheet_id()
    service = get_sheets_service()
    ensure_headers(service, spreadsheet_id)

    job_url = job_data.get("job_url", "")
    existing_row = _check_duplicate(service, spreadsheet_id, job_url)
    if existing_row:
        print(f"Job already logged at row {existing_row}, skipping.")
        return existing_row

    # Build Drive hyperlinks if available, otherwise fall back to filename
    resume_link = job_data.get("resume_drive_link", "")
    resume_file = job_data.get("resume_file", "")
    if resume_link:
        resume_cell = f'=HYPERLINK("{resume_link}", "Download Resume")'
    else:
        resume_cell = resume_file

    cl_link = job_data.get("cover_letter_drive_link", "")
    cl_file = job_data.get("cover_letter_file", "")
    if cl_link:
        cl_cell = f'=HYPERLINK("{cl_link}", "Download Cover Letter")'
    else:
        cl_cell = cl_file

    row = [
        job_data.get("title", ""),
        job_data.get("company", ""),
        job_data.get("location", ""),
        job_data.get("remote_status", ""),
        job_data.get("salary", ""),
        job_data.get("job_url", ""),
        job_data.get("description", "")[:5000],  # Truncate long descriptions
        str(job_data.get("score", "")),
        job_data.get("grade", ""),
        ", ".join(job_data.get("matched_skills", [])),
        ", ".join(job_data.get("missing_skills", [])),
        job_data.get("leadership_opportunity_level", ""),
        str(job_data.get("enterprise_relevance_score", "")),
        job_data.get("connections_summary", ""),
        job_data.get("best_contact", ""),
        resume_cell,
        cl_cell,
        job_data.get("application_type", ""),
        job_data.get("application_status", "Pending Review"),
        datetime.now(PT).strftime("%m/%d/%y %I:%M %p ") + datetime.now(PT).strftime("%Z"),
        job_data.get("applied", "No"),
        "",  # Follow-Up Date (column V) — set by follow_up_tracker
        "",  # Follow-Up Status (column W) — set by follow_up_tracker
    ]

    # Use USER_ENTERED so =HYPERLINK() formulas are parsed
    result = service.spreadsheets().values().append(
        spreadsheetId=spreadsheet_id,
        range="Sheet1!A:W",
        valueInputOption="USER_ENTERED",
        insertDataOption="INSERT_ROWS",
        body={"values": [row]},
    ).execute()

    updated_range = result.get("updates", {}).get("updatedRange", "")
    # Extract row number from range like "Sheet1!A42:U42"
    try:
        row_num = int(updated_range.split("!")[1].split(":")[0][1:])
    except (IndexError, ValueError):
        row_num = -1
    print(f"Job logged to row {row_num}")
    return row_num


def update_job_status(row_num: int, status: str, applied: str) -> None:
    """Update Application Status (col S) and Applied? (col U) for a given row."""
    spreadsheet_id = _get_spreadsheet_id()
    service = get_sheets_service()

    # Update Application Status (column S) and Applied? (column U)
    service.spreadsheets().values().batchUpdate(
        spreadsheetId=spreadsheet_id,
        body={
            "valueInputOption": "RAW",
            "data": [
                {"range": f"Sheet1!S{row_num}", "values": [[status]]},
                {"range": f"Sheet1!U{row_num}", "values": [[applied]]},
            ],
        },
    ).execute()
    print(f"Row {row_num} updated: status={status}, applied={applied}")


def get_rows_by_status(status: str) -> list:
    """Return all rows matching a given Application Status (col S)."""
    spreadsheet_id = _get_spreadsheet_id()
    service = get_sheets_service()

    result = service.spreadsheets().values().get(
        spreadsheetId=spreadsheet_id, range="Sheet1!A:W"
    ).execute()
    rows = result.get("values", [])
    if len(rows) <= 1:
        return []

    headers = rows[0]
    matches = []
    for i, row in enumerate(rows[1:], start=2):
        row_dict = dict(zip(headers, row + [""] * (len(headers) - len(row))))
        if row_dict.get("Application Status", "") == status:
            row_dict["_row_num"] = str(i)
            matches.append(row_dict)
    return matches


if __name__ == "__main__":
    print("log_to_sheets module loaded OK (run with job_data dict to test)")
