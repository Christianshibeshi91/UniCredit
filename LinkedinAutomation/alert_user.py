"""Console logging + desktop notifications for the job automation pipeline."""

import logging
import os
import sys
from datetime import datetime
from zoneinfo import ZoneInfo

PT = ZoneInfo("America/Los_Angeles")

logger = logging.getLogger("LinkedinAutomation")


class _PTFormatter(logging.Formatter):
    """Formatter that shows timestamps in Pacific Time."""

    def formatTime(self, record, datefmt=None):
        dt = datetime.fromtimestamp(record.created, tz=PT)
        return dt.strftime("%I:%M %p PT")


def _ensure_logger():
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(
            _PTFormatter("[%(asctime)s] %(levelname)s  %(message)s")
        )
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)


def alert(title: str, message: str, level: str = "info") -> None:
    """Print to console and attempt a desktop notification via plyer."""
    _ensure_logger()
    msg = f"{title} -- {message}"
    if level == "error":
        logger.error(msg)
    elif level == "warning":
        logger.warning(msg)
    else:
        logger.info(msg)

    # Skip desktop notifications on headless Linux (plyer D-Bus timeout)
    if sys.platform != "linux" or os.environ.get("DISPLAY"):
        try:
            from plyer import notification  # pyre-ignore[21]
            notification.notify(  # pyre-ignore[16]
                title=title,
                message=message[:256],  # pyre-ignore[6]
                app_name="LinkedinAutomation",
                timeout=10,
            )
        except Exception:
            pass  # Desktop notification is best-effort


def confirm(prompt: str = "Press ENTER to continue...") -> None:
    """Block until the user presses ENTER -- human gate before Easy Apply submit."""
    _ensure_logger()
    logger.info(f">>> WAITING FOR USER: {prompt}")
    input(prompt)


if __name__ == "__main__":
    alert("Test", "LinkedinAutomation alert_user module is working!", "info")
    print("alert_user module OK")
