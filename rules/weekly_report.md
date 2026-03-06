---
goal: Generate a weekly analytics report from the master Google Sheet
inputs:
  - GOOGLE_SHEETS_SPREADSHEET_ID from .env
  - current week's data from master sheet
outputs:
  - new sheet tab named "Weekly Report — {ISO week}"
scripts:
  - implementation/generate_weekly_report.py
  - implementation/alert_user.py
---

# Rule: Weekly Report

## Goal
Every week, read all logged job data and compute analytics. Write a structured report to a new tab in the Google Sheet. Alert Christian when complete.

## Report Metrics

### 1. Volume Summary
- Total jobs discovered this week
- Total jobs scored
- Total jobs rejected (score < 70)
- Total applications staged (Easy Apply + External)
- Total applications submitted (status = "Submitted")

### 2. Score Analytics
- Average match score across all logged jobs this week
- Score distribution: count per grade (A, B, C, D, F)
- Highest scoring job (title + company + score)
- Lowest accepted job (score ≥ 70, title + company + score)

### 3. Salary Intelligence
- Salary ranges extracted: min, max, median
- Count of jobs with explicit salary vs. inferred
- % of jobs meeting $165k+ target

### 4. Top Required Skills (Frequency Table)
- Count how many times each skill appears in matched_skills across all jobs this week
- Sort descending
- Top 10 skills table

### 5. Skill Gap Analysis
- Count how many times each skill appears in missing_skills this week
- Top 5 gaps = skills Christian should prioritize developing or preparing to speak to

### 6. Interview Conversion
- Count of jobs in "Interview Scheduled" status (manual update by Christian)
- Interview rate = interviews / submissions × 100%

### 7. Remote Distribution
- Count: Remote / Hybrid / Onsite jobs encountered this week

## Output Format (New Sheet Tab)

Tab name: `Report — W{week_number} {YYYY}`  
Example: `Report — W09 2026`

Structure:
```
Row 1: "Weekly Job Search Report — Week {N}, {Year}"
Row 2: "Generated: {timestamp}"
Row 3: (blank)
Row 4–N: Metric sections as labeled rows with data
```

Each section header row: bold (via Sheets API formatting), yellow background.

## Scheduling Note
This script is designed to run once per week, typically Sunday evening.
Use Windows Task Scheduler to schedule: `python run_weekly_report.py`

## Edge Cases
- No data for the week: write report with all zeros, log warning
- Tab name collision: append `_v2` suffix if tab already exists

## Version History
- v1: 7-metric weekly report with Sheets tab output
