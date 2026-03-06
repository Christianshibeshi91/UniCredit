# AI Job Discovery & Assisted Application System
### For Christian Shibeshi — Power Platform Consultant

A production-grade, RBI-compliant system that discovers LinkedIn jobs, scores them with AI, generates tailored resumes & cover letters, logs everything to Google Sheets, and stages applications for human-confirmed submission.

---

## Quick Start

```powershell
# 1. Install dependencies
cd C:\Users\chris\Downloads\Anti-gravity
pip install -r requirements.txt
playwright install chromium

# 2. Setup Google Sheet headers (one-time)
python implementation/setup_google_sheet.py

# 3. Dry run (no real API calls)
python run_daily.py --dry-run --max-jobs 3

# 4. Live run
python run_daily.py
```

---

## Prerequisites

| Requirement | Details |
|---|---|
| Python 3.11+ | `python --version` |
| pip packages | `pip install -r requirements.txt` |
| Playwright browsers | `playwright install chromium` |
| Google OAuth | `credentials.json` in project root (see below) |

---

## Credentials (Already Configured in `.env`)

All credentials are stored in `.env`. They have been pre-configured:

```
OPENAI_API_KEY=...          ← GPT-4o for scoring, tailoring, letters
LINKEDIN_EMAIL=...          ← Easy Apply automation
LINKEDIN_PASSWORD=...       ← Easy Apply automation
GOOGLE_SHEETS_SPREADSHEET_ID=...  ← Your master job tracker sheet
```

---

## Google OAuth Setup (Required Once)

Google Sheets requires OAuth 2.0. Follow these steps:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Sheets API**
4. Go to `APIs & Services → Credentials`
5. Click `Create Credentials → OAuth 2.0 Client IDs`
6. Application type: **Desktop app**
7. Download the credential file
8. **Rename it to `credentials.json`** and place it in `C:\Users\chris\Downloads\Anti-gravity\`
9. On first run of any Sheets-connected script, a browser window will open for Google sign-in
10. After approval, `token.json` is created automatically for future runs

---

## Daily Workflow

```
run_daily.py
  │
  ├─ Searches LinkedIn (7 query variants via Playwright)
  ├─ Deduplicates against previous runs
  │
  └─ For each new job (max 15/day):
      ├─ Scores 0-100 with GPT-4o (rejects < 70)
      ├─ Extracts structured intelligence
      ├─ Finds LinkedIn connection + generates outreach
      ├─ Tailors resume to job description
      ├─ Generates executive cover letter
      ├─ Logs to Google Sheet
      └─ Stages application (STOPS before submit)
          → You confirm and manually click Submit
```

---

## Commands Reference

| Command | Purpose |
|---|---|
| `python run_daily.py` | Full daily run (live) |
| `python run_daily.py --dry-run` | Test without API calls |
| `python run_daily.py --max-jobs 5` | Limit to 5 jobs |
| `python run_daily.py --date-posted pastWeek` | Broader date filter |
| `python run_weekly_report.py` | Generate weekly analytics tab in Sheet |
| `python implementation/setup_google_sheet.py` | One-time: add headers to Sheet |
| `python implementation/alert_user.py success` | Test desktop notification |

---

## Google Sheet Structure

Your sheet at [Open Sheet](https://docs.google.com/spreadsheets/d/1XRA0h1ieEQS_ALAbttKfu_WCI1jv270eWqf7Oa5Ved4) has 20 columns:

| # | Column | Source |
|---|---|---|
| A | Job Title | LinkedIn |
| B | Company | LinkedIn |
| C | Location | LinkedIn |
| D | Remote/Hybrid/Onsite | GPT-4o extracted |
| E | Salary | LinkedIn or GPT-4o inferred |
| F | Job URL | LinkedIn |
| G | Cleaned Job Description | GPT-4o cleaned |
| H | Match Score (0–100) | GPT-4o scoring engine |
| I | Match Grade (A–F) | GPT-4o scoring engine |
| J | Matched Skills | GPT-4o scoring engine |
| K | Missing Skills | GPT-4o scoring engine |
| L | Leadership Opportunity Level | GPT-4o |
| M | Enterprise Relevance Score | GPT-4o |
| N | LinkedIn Connections at Company | Connection scout |
| O | Best Person to Network With | Connection scout |
| P | Tailored Resume Version | GPT-4o tailoring engine |
| Q | Tailored Cover Letter | GPT-4o cover letter engine |
| R | Application Type | Auto-detected (Easy/External) |
| S | Application Status | Updated per application |
| T | Date Logged | Auto-timestamp |

---

## Autonomous Local Logging (No-Touch Mode)

If Google Sheets `credentials.json` is missing or authorization fails, the system **automatically** switches to local logging. 

- **File:** `results_fallback.csv` (Project root)
- **Format:** Standard Excel-compatible CSV
- **Benefits:** Your job results are never lost. You can import this CSV into Excel or Google Sheets later.

---

## Scoring Model

| Dimension | Weight | Key Signals |
|---|---|---|
| Technical Fit | 40% | Power Platform, Dataverse, D365, Azure, APIs |
| Enterprise Alignment | 20% | Banking, finance, aerospace, telecom |
| Compensation Alignment | 15% | ≥ $165k preferred |
| Leadership Scope | 15% | Architect title, cross-team ownership |
| Remote Compatibility | 10% | Remote/Hybrid preferred |

**Grades:** A (90–100) · B (80–89) · C (70–79) · D (60–69, rejected) · F (<60, rejected)

---

## Application Modes

### Mode A: Easy Apply (Assisted)
1. Playwright opens LinkedIn in a visible browser
2. Fills known fields (name, email, location)
3. Uploads tailored resume
4. Pastes cover letter
5. **STOPS** — shows you the staged form
6. You manually review + click Submit
7. Press ENTER in terminal to log as submitted

### Mode B: External Apply
1. Extracts the external company career site URL
2. Logs it to Google Sheet
3. Sends you a desktop alert with the link
4. You apply manually on their site

---

## Safety Controls

| Control | Setting |
|---|---|
| Daily application cap | 15 max (configurable in `.env`) |
| Minimum score threshold | 70 (configurable) |
| Human gate | Always required before any submission |
| Deduplication | Never processes the same job twice |
| Randomized delays | 3–15 seconds between actions |

---

## Scheduling (Windows Task Scheduler)

To run automatically every day at 8:00 AM:

1. Open Task Scheduler → Create Basic Task
2. Name: `Job Discovery Daily`
3. Trigger: Daily at 8:00 AM
4. Action: Start a program
5. Program: `python`
6. Arguments: `C:\Users\chris\Downloads\Anti-gravity\run_daily.py`
7. Start in: `C:\Users\chris\Downloads\Anti-gravity`

For weekly report (Sundays at 7:00 PM):
- Same setup but with `run_weekly_report.py`

---

## File Structure

```
Anti-gravity/
├── run_daily.py               ← Main orchestrator (run this)
├── run_weekly_report.py       ← Weekly analytics runner
├── candidate/profile.json     ← Your authoritative resume data
├── rules/                     ← 8 SOP markdown files
├── implementation/            ← 13 Python scripts
├── .env                       ← Credentials (DO NOT SHARE)
├── .tmp/                      ← Temporary files (auto-created)
│   ├── seen_jobs.json         ← Deduplication store
│   ├── run_state.json         ← Run state persistence
│   ├── resume_*.txt           ← Tailored resumes per job
│   ├── cl_*.txt               ← Cover letters per job
│   └── screenshots/           ← Easy Apply screenshots
└── README.md
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| LinkedIn Auth error | Run save_linkedin_auth.py to refresh session |
| Google Sheets auth fails | Re-run `setup_google_sheet.py` and complete OAuth flow |
| LinkedIn security check | Complete it manually in the opened browser, press ENTER |
| `playwright` not found | Run `playwright install chromium` |
| Score always 0 | Check `OPENAI_API_KEY` is valid in `.env` |
| Rate limit on OpenAI | Wait 60s, re-run with `--max-jobs 5` |
