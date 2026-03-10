import os
import subprocess
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent
load_dotenv(PROJECT_ROOT / ".env")

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is required in .env")

HOST = os.environ.get("TECH_TUTOR_HOST", "0.0.0.0")
PORT = int(os.environ.get("TECH_TUTOR_PORT", "8101"))
FRONTEND_URL = os.environ.get("TECH_TUTOR_FRONTEND_URL", "http://localhost:5174")


def get_tailscale_ip() -> str | None:
    """Fetch the local Tailscale IPv4 address, or None if unavailable."""
    try:
        result = subprocess.run(
            ["tailscale", "ip", "-4"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            return result.stdout.strip().splitlines()[0]
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    return None
