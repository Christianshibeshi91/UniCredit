#!/bin/bash
cd "$(dirname "$0")"
echo "[$(date)] Sending 12h report..." >> report_run.log
python3 implementation/send_email_report.py --hours 12 >> report_run.log 2>&1
echo "[$(date)] Report sent." >> report_run.log
