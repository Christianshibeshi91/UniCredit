"""Entry point for the long-running Telegram approval bot.

Run this as a persistent process (e.g. in a screen/tmux session or systemd):
    python run_telegram_bot.py
"""

import os
import sys

BASE_DIR = os.path.dirname(__file__)
sys.path.insert(0, BASE_DIR)

from LinkedinAutomation.telegram_bot import run_bot  # pyre-ignore[21]

if __name__ == "__main__":
    run_bot()
