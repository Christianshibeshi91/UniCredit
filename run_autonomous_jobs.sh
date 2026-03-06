#!/bin/bash
cd "$(dirname "$0")"
echo "[$(date)] Starting job discovery run..." >> daily_run.log
python3 run_daily.py --max-jobs 2 >> daily_run.log 2>&1
echo "[$(date)] Run finished." >> daily_run.log
