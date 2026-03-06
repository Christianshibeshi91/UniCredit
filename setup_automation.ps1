# Automation Setup Script for Christian Shibeshi's Job System
# This script creates a Windows Task Scheduler task to run the Job Discovery system daily at 8:00 AM.

$Action = New-ScheduledTaskAction -Execute 'C:\Users\chris\AppData\Local\Programs\Python\Python312\python.exe' `
    -Argument 'C:\Users\chris\Downloads\Anti-gravity\run_daily.py' `
    -WorkingDirectory 'C:\Users\chris\Downloads\Anti-gravity'

$Trigger = New-ScheduledTaskTrigger -Daily -At 8:00am

$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

$TaskName = "AI_Job_Discovery_Daily"

# Delete if exists to avoid errors on re-run
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Runs Christian's AI Job Discovery and Application system daily at 8 AM."

Write-Host "--------------------------------------------------------" -ForegroundColor Cyan
Write-Host "SUCCESS: Windows Task Scheduler Task Created!" -ForegroundColor Green
Write-Host "Task Name: $TaskName"
Write-Host "Schedule:  Daily at 8:00 AM"
Write-Host "--------------------------------------------------------"
Write-Host "NOTE: Ensure credentials.json is in your project folder."
Write-Host "--------------------------------------------------------"
