# Startup script for AI Job Automation VPS
# Run this to start the 24/7 automation in the background

$BASE_DIR = "c:\Users\chris\Downloads\Anti-gravity"
cd $BASE_DIR

# 1. Ensure Docker VPS is running
Write-Host "Ensuring Docker AI Agent VPS is running..." -ForegroundColor Cyan
& "C:\Program Files\Docker\Docker\resources\bin\docker.exe" compose -f "$BASE_DIR\LinkedinAutomation\vps_computer\docker-compose.yml" up -d

# 2. Start the Job Scheduler in the background
Write-Host "Starting Job Scheduler automation..." -ForegroundColor Cyan
# Using pythonw to run in background without a window
Start-Process -FilePath "pythonw.exe" -ArgumentList "run_scheduler.py" -WorkingDirectory $BASE_DIR

Write-Host "====================================================" -ForegroundColor Green
Write-Host "VPS AUTOMATION SUCCESSFUL" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
Write-Host "1. Automation is now running in the background."
Write-Host "2. Logs: .tmp/scheduler.log"
Write-Host "3. Dashboard: Open Docker Desktop to see AI Agents."
Write-Host "4. Remote: Access http://100.96.79.98:8000 from anywhere."
Write-Host "====================================================" -ForegroundColor Green
