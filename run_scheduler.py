"""30-minute job discovery scheduler.

Runs the daily job pipeline every 30 minutes with caps:
  - Max 3 jobs per cycle
  - Max 15 jobs per day
  - Coffee breaks every 5-8 applications

Usage:
    python run_scheduler.py          # Run in foreground with console output
    pythonw.exe run_scheduler.py     # Run in background (no console window)
"""

import json
import logging
import os
import random
import subprocess
import sys
import time
from datetime import date, datetime

BASE_DIR = os.path.dirname(__file__)
sys.path.insert(0, BASE_DIR)

from dotenv import load_dotenv  # pyre-ignore[21]
load_dotenv(os.path.join(BASE_DIR, ".env"))

import schedule  # pyre-ignore[21]

from LinkedinAutomation.alert_user import alert  # pyre-ignore[21]
from LinkedinAutomation.anti_detect import get_human_delay  # pyre-ignore[21]
from LinkedinAutomation.tmp_cleanup import clean_old_screenshots  # pyre-ignore[21]

RUN_STATE_PATH = os.path.join(BASE_DIR, ".tmp", "run_state.json")
LOG_PATH = os.path.join(BASE_DIR, ".tmp", "scheduler.log")

# Caps
MAX_PER_CYCLE = 3
MAX_PER_DAY = int(os.getenv("MAX_APPLICATIONS_PER_DAY", "15"))

# Setup logging
os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_PATH),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("scheduler")


def _load_run_state():
    """Load run state or return fresh default."""
    if os.path.exists(RUN_STATE_PATH):
        with open(RUN_STATE_PATH, "r") as f:
            return json.load(f)
    return {"run_date": "", "applications_today": 0, "jobs_processed": [], "errors": []}


def _get_today_count():
    """Get number of applications submitted today."""
    state = _load_run_state()
    today = date.today().isoformat()
    if state.get("run_date") != today:
        return 0
    return state.get("applications_today", 0)


def run_cycle():
    """Run one job discovery + apply cycle."""
    today_count = _get_today_count()
    if today_count >= MAX_PER_DAY:
        log.info(f"Daily cap reached ({today_count}/{MAX_PER_DAY}). Skipping cycle.")
        return

    remaining = MAX_PER_DAY - today_count
    cycle_max = min(MAX_PER_CYCLE, remaining)

    log.info(f"Starting cycle: {today_count}/{MAX_PER_DAY} today, processing up to {cycle_max}")

    try:
        result = subprocess.run(
            [sys.executable, os.path.join(BASE_DIR, "run_daily.py"), "--max-jobs", str(cycle_max)],
            cwd=BASE_DIR,
            capture_output=True,
            text=True
        )

        if result.stdout:
            log.info(f"Child Output:\n{result.stdout}")
        if result.stderr:
            log.error(f"Child Error:\n{result.stderr}")

        new_count = _get_today_count()
        applied_this_cycle = new_count - today_count
        log.info(f"Cycle complete: {applied_this_cycle} new applications ({new_count}/{MAX_PER_DAY} today)")

        # Coffee break after every 5-8 applications
        if new_count > 0 and new_count % random.randint(5, 8) == 0:
            coffee = get_human_delay("coffee_break")
            log.info(f"Coffee break: {coffee:.0f}s")
            time.sleep(coffee)

    except Exception as e:
        log.error(f"Cycle failed: {e}", exc_info=True)


def main():
    """Start the scheduler."""
    log.info("=" * 60)
    log.info(f"Scheduler started at {datetime.now().isoformat()}")
    log.info(f"Cycle interval: 30 minutes")
    log.info(f"Max per cycle: {MAX_PER_CYCLE}, Max per day: {MAX_PER_DAY}")
    log.info("=" * 60)

    n = clean_old_screenshots()
    if n:
        log.info("Cleanup: removed %d old screenshot(s)", n)

    # Run immediately on start
    run_cycle()

    # Schedule every 30 minutes
    schedule.every(30).minutes.do(run_cycle)

    log.info("Scheduler running. Next cycle in 30 minutes...")

    while True:
        schedule.run_pending()
        time.sleep(30)  # Check every 30 seconds


if __name__ == "__main__":
    main()
