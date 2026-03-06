#!/bin/bash

# Get absolute path to current directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Make scripts executable
chmod +x "$DIR/run_autonomous_jobs.sh"
chmod +x "$DIR/run_autonomous_reports.sh"

# Backup existing crontab
crontab -l > mycron 2>/dev/null || true

# Remove old jobs if they exist to avoid duplicates
sed -i '/run_autonomous_jobs.sh/d' mycron
sed -i '/run_autonomous_reports.sh/d' mycron

# Run every 15 minutes
echo "*/15 * * * * $DIR/run_autonomous_jobs.sh" >> mycron
# Run every 12 hours (at minute 0 past hour 0 and 12)
echo "0 0,12 * * * $DIR/run_autonomous_reports.sh" >> mycron

# Install new cron file
crontab mycron
rm mycron

echo "--------------------------------------------------------"
echo -e "\e[32mSUCCESS: Autonomous Cron Jobs Created!\e[0m"
echo -e "\e[36mTask 1: Job Discovery (Every 15 Minutes)\e[0m"
echo -e "\e[36mTask 2: Email Report  (Every 12 Hours)\e[0m"
echo "Logs:   daily_run.log & report_run.log"
echo "--------------------------------------------------------"
