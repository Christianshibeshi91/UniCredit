@echo off
cd /d "C:\Users\chris\Downloads\Anti-gravity"
echo [%date% %time%] Sending 12h report... >> report_run.log
"C:\Users\chris\AppData\Local\Programs\Python\Python312\python.exe" implementation/send_email_report.py --hours 12 >> report_run.log 2>&1
echo [%date% %time%] Report sent. >> report_run.log
