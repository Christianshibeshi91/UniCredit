"""Google Sheets API setup and header verification."""

import os
from google.oauth2.credentials import Credentials  # pyre-ignore[21]
from google_auth_oauthlib.flow import InstalledAppFlow  # pyre-ignore[21]
from google.auth.transport.requests import Request  # pyre-ignore[21]
from googleapiclient.discovery import build  # pyre-ignore[21]

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
CREDS_PATH = os.path.join(BASE_DIR, "credentials.json")
TOKEN_PATH = os.path.join(BASE_DIR, "token.json")
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
]

HEADERS = [
    "Job Title", "Company", "Location", "Remote/Hybrid/Onsite", "Salary",
    "Job URL", "Cleaned Job Description", "Match Score (0-100)", "Match Grade (A-F)",
    "Matched Skills", "Missing Skills", "Leadership Opportunity Level",
    "Enterprise Relevance Score", "LinkedIn Connections at Company",
    "Best Person to Network With", "Tailored Resume Version",
    "Tailored Cover Letter", "Application Type (Easy/External)",
    "Application Status", "Date Logged", "Applied?",
    "Follow-Up Date", "Follow-Up Status",
]


def get_sheets_service():
    """Authenticate and return a Google Sheets API service object.

    Token refresh is fully automatic via the stored refresh_token.
    If the token is missing or revoked (no refresh_token), raises a clear
    error instead of opening a browser popup — so the automation never
    freezes waiting for interactive input during an unattended run.
    Run `python -m LinkedinAutomation.setup_google_sheet` manually once
    to re-authorize if you see the AuthRequired error.
    """
    creds = None
    if os.path.exists(TOKEN_PATH):
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            # Silent auto-refresh — no popup, no browser
            creds.refresh(Request())
            with open(TOKEN_PATH, "w") as token:
                token.write(creds.to_json())
        else:
            # Token is missing or refresh_token was revoked.
            # Do NOT open a browser during an unattended run.
            raise RuntimeError(
                "Google auth token is missing or expired with no refresh token.\n"
                "Fix: run this command once to re-authorize:\n"
                f"  python -m LinkedinAutomation.setup_google_sheet\n"
                f"  (token will be saved to: {TOKEN_PATH})"
            )

    return build("sheets", "v4", credentials=creds)


def reauthorize_interactive():
    """Run OAuth flow interactively to get a fresh token.
    Call this manually when the token is fully revoked or missing.
    """
    flow = InstalledAppFlow.from_client_secrets_file(CREDS_PATH, SCOPES)
    creds = flow.run_local_server(port=0)
    with open(TOKEN_PATH, "w") as token:
        token.write(creds.to_json())
    print(f"New token saved to {TOKEN_PATH}")
    return build("sheets", "v4", credentials=creds)


def ensure_headers(service, spreadsheet_id: str) -> None:
    """Verify that row 1 has the correct 21-column headers; write them if missing."""
    sheet = service.spreadsheets()
    result = sheet.values().get(
        spreadsheetId=spreadsheet_id, range="Sheet1!A1:W1"
    ).execute()
    existing = result.get("values", [[]])[0] if result.get("values") else []

    if existing != HEADERS:
        sheet.values().update(
            spreadsheetId=spreadsheet_id,
            range="Sheet1!A1:W1",
            valueInputOption="RAW",
            body={"values": [HEADERS]},
        ).execute()
        print("Headers written to Sheet1!A1:W1")
    else:
        print("Headers already correct.")


if __name__ == "__main__":
    from dotenv import load_dotenv  # pyre-ignore[21]
    load_dotenv(os.path.join(BASE_DIR, ".env"))
    sid = os.getenv("GOOGLE_SHEETS_SPREADSHEET_ID")
    if not sid:
        print("ERROR: GOOGLE_SHEETS_SPREADSHEET_ID not set in .env")
    else:
        print("Running interactive Google OAuth flow — a browser window will open...")
        svc = reauthorize_interactive()
        ensure_headers(svc, sid)
        print("Authorization complete. Token saved. setup_google_sheet module OK")
