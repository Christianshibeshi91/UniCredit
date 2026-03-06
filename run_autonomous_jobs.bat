@echo off
cd /d "C:\Users\chris\Downloads\Anti-gravity"
echo [%date% %time%] Starting job discovery run... >> daily_run.log
"C:\Users\chris\AppData\Local\Programs\Python\Python312\python.exe" run_daily.py --max-jobs 2 >> daily_run.log 2>&1
echo [%date% %time%] Run finished. >> daily_run.log
