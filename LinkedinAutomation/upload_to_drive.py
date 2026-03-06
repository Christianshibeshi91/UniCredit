"""Upload resume/cover letter files to Google Drive and return shareable links."""

import os
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

from LinkedinAutomation.setup_google_sheet import get_sheets_service  # reuse creds  # pyre-ignore[21]

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

# Folder name in Google Drive to store application files
DRIVE_FOLDER_NAME = "LinkedIn_Applications"

_folder_id_cache = None


def _get_drive_service():
    """Build Drive API service reusing the same credentials as Sheets."""
    from google.oauth2.credentials import Credentials
    token_path = os.path.join(BASE_DIR, "token.json")
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file",
    ]
    creds = Credentials.from_authorized_user_file(token_path, scopes)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            from google.auth.transport.requests import Request
            creds.refresh(Request())
    return build("drive", "v3", credentials=creds)


def _get_or_create_folder(service):
    """Get or create the LinkedIn_Applications folder in Drive root."""
    global _folder_id_cache
    if _folder_id_cache:
        return _folder_id_cache

    # Search for existing folder
    query = (
        f"name='{DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder'"
        " and trashed=false"
    )
    results = service.files().list(q=query, spaces="drive", fields="files(id)").execute()  # pyre-ignore[29]
    files = results.get("files", [])

    if files:
        _folder_id_cache = files[0]["id"]  # pyre-ignore[29]
        return _folder_id_cache

    # Create folder
    file_metadata = {
        "name": DRIVE_FOLDER_NAME,
        "mimeType": "application/vnd.google-apps.folder",
    }
    folder = service.files().create(body=file_metadata, fields="id").execute()  # pyre-ignore[29]
    _folder_id_cache = folder["id"]  # pyre-ignore[29]
    return _folder_id_cache


def upload_file(local_path: str, filename: str) -> str:
    """Upload a file to Google Drive and return a shareable web link.

    Returns empty string on failure (graceful fallback).
    """
    if not os.path.exists(local_path):
        return ""

    try:
        service = _get_drive_service()
        folder_id = _get_or_create_folder(service)

        # Detect MIME type from file extension
        if local_path.lower().endswith(".pdf"):
            mimetype = "application/pdf"
        elif local_path.lower().endswith(".txt"):
            mimetype = "text/plain"
        else:
            mimetype = "application/octet-stream"

        file_metadata = {
            "name": filename,
            "parents": [folder_id],
        }
        media = MediaFileUpload(local_path, mimetype=mimetype, resumable=False)
        uploaded = service.files().create(  # pyre-ignore[29]
            body=file_metadata, media_body=media, fields="id,webViewLink"
        ).execute()

        # Make viewable by anyone with the link
        service.permissions().create(  # pyre-ignore[29]
            fileId=uploaded["id"],
            body={"type": "anyone", "role": "reader"},
        ).execute()

        return uploaded.get("webViewLink", "")  # pyre-ignore[29]
    except Exception as e:
        print(f"Drive upload failed for {filename}: {e}")
        return ""


if __name__ == "__main__":
    # Quick test
    test_path = os.path.join(BASE_DIR, ".tmp", "test_upload.txt")
    os.makedirs(os.path.dirname(test_path), exist_ok=True)
    with open(test_path, "w") as f:
        f.write("Test upload from LinkedIn automation.")
    link = upload_file(test_path, "test_upload.txt")
    if link:
        print(f"Upload OK: {link}")
    else:
        print("Upload failed — check token.json has drive.file scope")
