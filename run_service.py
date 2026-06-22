"""Unified 24/7 service: job scheduler + Telegram bot.

Runs both components in a single process for VPS deployment:
  - Job discovery scheduler (every 30 min, daily caps)
  - Telegram bot (long-running polling for commands + form Q&A)

Usage:
    python run_service.py          # Foreground (for testing)
    systemctl start jobbot         # As systemd service (production)
"""

import json
import logging
import os
import random
import signal
import sys
import threading
import time
from datetime import date, datetime

BASE_DIR = os.path.dirname(__file__)
sys.path.insert(0, BASE_DIR)

from dotenv import load_dotenv  # pyre-ignore[21]
load_dotenv(os.path.join(BASE_DIR, ".env"))

import schedule  # pyre-ignore[21]

from LinkedinAutomation.alert_user import alert  # pyre-ignore[21]
from LinkedinAutomation.anti_detect import get_human_delay  # pyre-ignore[21]
from LinkedinAutomation.generate_daily_report import send_daily_report  # pyre-ignore[21]

RUN_STATE_PATH = os.path.join(BASE_DIR, ".tmp", "run_state.json")
LOG_PATH = os.path.join(BASE_DIR, ".tmp", "service.log")

# Caps
MAX_PER_CYCLE = 3
MAX_PER_DAY = int(os.getenv("MAX_APPLICATIONS_PER_DAY", "15"))
CYCLE_MINUTES = 30

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
log = logging.getLogger("service")

_shutdown = threading.Event()


def _load_run_state():
    if os.path.exists(RUN_STATE_PATH):
        with open(RUN_STATE_PATH, "r") as f:
            return json.load(f)
    return {"run_date": "", "applications_today": 0, "jobs_processed": [], "errors": []}


def _get_today_count():
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
        from run_daily import main as daily_main
        original_argv = sys.argv
        sys.argv = ["run_daily.py", "--max-jobs", str(cycle_max)]
        try:
            daily_main()
        finally:
            sys.argv = original_argv

        new_count = _get_today_count()
        applied = new_count - today_count
        log.info(f"Cycle complete: {applied} new applications ({new_count}/{MAX_PER_DAY} today)")

        if new_count > 0 and new_count % random.randint(5, 8) == 0:
            coffee = get_human_delay("coffee_break")
            log.info(f"Coffee break: {coffee:.0f}s")
            time.sleep(coffee)

    except Exception as e:
        log.error(f"Cycle failed: {e}", exc_info=True)


def _send_report():
    """Send the 12-hour activity report to Telegram."""
    try:
        log.info("Sending scheduled activity report...")
        send_daily_report()
    except Exception as e:
        log.error(f"Report failed: {e}", exc_info=True)


def scheduler_loop():
    """Run the job scheduler loop (blocking)."""
    log.info("Scheduler thread started")

    # Run immediately on start
    run_cycle()

    schedule.every(CYCLE_MINUTES).minutes.do(run_cycle)

    # Send daily report once at 8 PM PT
    schedule.every().day.at("20:00").do(_send_report)
    log.info(f"Next cycle in {CYCLE_MINUTES} minutes, daily report at 8PM PT")

    while not _shutdown.is_set():
        schedule.run_pending()
        _shutdown.wait(timeout=30)

    log.info("Scheduler thread stopped")


def bot_loop():
    """Run the Telegram bot (blocking) with automatic supervisor restarts."""
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    if not bot_token:
        log.warning("TELEGRAM_BOT_TOKEN not set — bot disabled")
        return

    retry_delay = 10
    while not _shutdown.is_set():
        log.info("Starting Telegram bot thread...")
        try:
            from LinkedinAutomation.telegram_bot import run_bot  # pyre-ignore[21]
            run_bot()
            log.info("Telegram bot run_bot completed normally")
            break
        except Exception as e:
            log.error(f"Telegram bot crashed: {e}", exc_info=True)
            if not _shutdown.is_set():
                log.info(f"Restarting Telegram bot in {retry_delay} seconds...")
                _shutdown.wait(timeout=retry_delay)
                retry_delay = min(retry_delay * 2, 120)
            else:
                break


def _handle_signal(signum, frame):
    """Graceful shutdown on SIGTERM/SIGINT."""
    log.info(f"Received signal {signum}, shutting down...")
    _shutdown.set()


def main():
    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    log.info("=" * 60)
    log.info(f"AI Job Bot Service started at {datetime.now().isoformat()}")
    log.info(f"Scheduler: every {CYCLE_MINUTES}m, max {MAX_PER_CYCLE}/cycle, {MAX_PER_DAY}/day")
    log.info("=" * 60)

    alert("Service", "AI Job Bot service starting (scheduler + Telegram bot)")

    # Start scheduler in a daemon thread
    sched_thread = threading.Thread(target=scheduler_loop, name="scheduler", daemon=True)
    sched_thread.start()

    # Run Telegram bot in main thread (needs main thread for signal handling)
    try:
        bot_loop()
    except KeyboardInterrupt:
        log.info("Keyboard interrupt received")
    finally:
        _shutdown.set()
        log.info("Service stopped")
        alert("Service", "AI Job Bot service stopped")


if __name__ == "__main__":
    main()
