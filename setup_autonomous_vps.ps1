# AI Job System — Autonomous VPS Setup for Christian Shibeshi
# This script creates two Windows Task Scheduler tasks for zero-touch operation.

$JobsBatch = "C:\Users\chris\Downloads\Anti-gravity\run_autonomous_jobs.bat"
$ReportsBatch = "C:\Users\chris\Downloads\Anti-gravity\run_autonomous_reports.bat"

# 1. Task: Job Discovery (Every 15 Minutes)
$Action1 = New-ScheduledTaskAction -Execute $JobsBatch -WorkingDirectory "C:\Users\chris\Downloads\Anti-gravity"
$Trigger1 = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration (New-TimeSpan -Days 365)

$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 2)

$JobTaskName = "AI_Job_Discovery_15m"
Unregister-ScheduledTask -TaskName $JobTaskName -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $JobTaskName -Action $Action1 -Trigger $Trigger1 -Settings $Settings -Description "Runs AI job discovery every 15 minutes."

# 2. Task: Email Report (Every 12 Hours)
$Action2 = New-ScheduledTaskAction -Execute $ReportsBatch -WorkingDirectory "C:\Users\chris\Downloads\Anti-gravity"
$Trigger2 = New-ScheduledTaskTrigger -Once -At 8:00am -RepetitionInterval (New-TimeSpan -Hours 12) -RepetitionDuration (New-TimeSpan -Days 365)

$ReportTaskName = "AI_Job_Report_12h"
Unregister-ScheduledTask -TaskName $ReportTaskName -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $ReportTaskName -Action $Action2 -Trigger $Trigger2 -Settings $Settings -Description "Sends AI job status report every 12 hours."

Write-Host "--------------------------------------------------------" -ForegroundColor Cyan
Write-Host "SUCCESS: Autonomous Tasks Created!" -ForegroundColor Green
Write-Host "Task 1: AI_Job_Discovery_15m (Every 15 Minutes)"
Write-Host "Task 2: AI_Job_Report_12h    (Every 12 Hours)"
Write-Host "Logs:   daily_run.log & report_run.log"
Write-Host "--------------------------------------------------------"
