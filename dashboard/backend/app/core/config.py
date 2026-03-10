import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
PROJECT_ROOT = Path(__file__).resolve().parents[4]
load_dotenv(PROJECT_ROOT / ".env")

# Database
DATABASE_URL = f"sqlite+aiosqlite:///{PROJECT_ROOT / 'dashboard' / 'dashboard.db'}"
DATABASE_PATH = PROJECT_ROOT / "dashboard" / "dashboard.db"

# Auth
SECRET_KEY = os.environ.get("DASHBOARD_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("DASHBOARD_SECRET_KEY not set. Add it to .env")

ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 30
ALGORITHM = "HS256"

# Google Sheets
GOOGLE_SHEETS_SPREADSHEET_ID = os.environ.get("GOOGLE_SHEETS_SPREADSHEET_ID", "")
GOOGLE_CREDENTIALS_PATH = PROJECT_ROOT / "credentials.json"
GOOGLE_TOKEN_PATH = PROJECT_ROOT / "token.json"

# Sheets sync interval
SHEETS_SYNC_INTERVAL_SECONDS = 60

# Project paths
CANDIDATE_DIR = PROJECT_ROOT / "candidate"
TMP_DIR = PROJECT_ROOT / ".tmp"
AUTOMATION_DIR = PROJECT_ROOT / "LinkedinAutomation"

# CORS
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")

# Automation
AUTOMATION_ENTRY = PROJECT_ROOT / "run_daily.py"
SCHEDULER_ENTRY = PROJECT_ROOT / "run_scheduler.py"
