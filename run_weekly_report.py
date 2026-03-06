"""Weekly analytics report generator.

Usage:
    python run_weekly_report.py
"""

import os
import sys
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(__file__)
load_dotenv(os.path.join(BASE_DIR, ".env"))

sys.path.insert(0, BASE_DIR)

from LinkedinAutomation.alert_user import alert
from LinkedinAutomation.generate_weekly_report import generate
from LinkedinAutomation.send_email_report import send


def main():
    alert("Weekly Report", "Generating weekly analytics report...")

    spreadsheet_id = os.getenv("GOOGLE_SHEETS_SPREADSHEET_ID")
    if not spreadsheet_id:
        alert("Error", "GOOGLE_SHEETS_SPREADSHEET_ID not set in .env", "error")
        return

    try:
        report = generate(spreadsheet_id)
        if report:
            send(report)
            alert("Weekly Report", "Report generated and saved successfully!")
        else:
            alert("Weekly Report", "No report data generated.", "warning")
    except Exception as e:
        alert("Report Error", str(e), "error")


if __name__ == "__main__":
    main()
