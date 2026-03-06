---
goal: Log all job intelligence into the master Google Sheet
inputs:
  - all fields from job discovery, scoring, extraction, connection, resume, cover letter steps
outputs:
  - row_number: integer (the row where data was written)
scripts:
  - implementation/log_to_sheets.py
  - implementation/setup_google_sheet.py
---

# Rule: Google Sheets Logging

## Goal
Append one row per processed job to the master Google Sheet. All 20 columns must be populated. Never overwrite existing rows. Validate schema before write.

## Sheet Schema (20 Columns, Exact Order)

| Col | Header | Source |
|---|---|---|
| A | Job Title | job object |
| B | Company | job object |
| C | Location | job object |
| D | Remote/Hybrid/Onsite | extract_job_intelligence.py |
| E | Salary | job object or GPT-4o inference |
| F | Job URL | job object |
| G | Cleaned Job Description | cleaned text (no HTML) |
| H | Match Score (0–100) | score_job.py |
| I | Match Grade (A–F) | score_job.py |
| J | Matched Skills | score_job.py (comma-separated) |
| K | Missing Skills | score_job.py (comma-separated) |
| L | Leadership Opportunity Level | score_job.py (Low/Medium/High) |
| M | Enterprise Relevance Score | score_job.py (0–100) |
| N | LinkedIn Connections at Company | find_connections.py |
| O | Best Person to Network With | find_connections.py |
| P | Tailored Resume Version | tailor_resume.py (text or "See .tmp/") |
| Q | Tailored Cover Letter | generate_cover_letter.py (text or "See .tmp/") |
| R | Application Type | apply logic (Easy / External) |
| S | Application Status | initial: "Pending Review" |
| T | Date Logged | ISO timestamp (UTC) |

## Write Protocol
1. Authenticate using Google OAuth (`credentials.json` / `token.json`)
2. Verify spreadsheet exists and is accessible
3. Read current last row to determine append position
4. Validate row data — all 20 fields must be present (empty string OK, null NOT OK)
5. Append row using `spreadsheets.values.append` (not update)
6. Confirm write by reading back the new row
7. Return row number

## Idempotency Check
Before writing, check if `job_url` already exists in column F. If found, skip append and return existing row number. Log: `"Job already logged at row N"`.

## Auth Setup (One-Time)
1. Go to Google Cloud Console → Enable Sheets API
2. Create OAuth 2.0 credentials → Download as `credentials.json` in project root
3. On first run, browser will open for OAuth consent → generates `token.json`
4. Subsequent runs use `token.json` automatically

## Rate Limiting
- Google Sheets API: 100 requests per 100 seconds per user
- If rate limited: wait 60 seconds, retry up to 3 times

## Edge Cases
- Network failure mid-write: do not retry immediately — check if row was partially written first
- Column count mismatch: fail loudly, do not write partial rows
- Token expired: refresh automatically via `google-auth-oauthlib`

## Version History
- v1: 20-column append-only logging with idempotency check
