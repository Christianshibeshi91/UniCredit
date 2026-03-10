# Architecture

## Pattern

Pipeline orchestrator with plugin modules. `run_daily.py` is the single pipeline that
sequences all stages: search, dedup, score, tailor, generate, apply, log, notify. Each
stage is a standalone module in `LinkedinAutomation/` exposing one public function (e.g.
`score()`, `tailor()`, `generate()`, `find()`, `deduplicate()`). The scheduler
(`run_scheduler.py`) and unified service (`run_service.py`) invoke `run_daily.py` on a
timer. The Telegram bot (`telegram_bot.py`) runs as a parallel long-lived process for
interactive control.

## Layers

```
Layer 4 — Entry Points (process boundaries)
  run_daily.py          Single pipeline run (CLI)
  run_scheduler.py      30-min cron loop (subprocess spawns run_daily.py)
  run_service.py        24/7 daemon: scheduler thread + Telegram bot in main thread
  run_telegram_bot.py   Standalone Telegram bot process
  run_weekly_report.py  Weekly email report (standalone)

Layer 3 — Orchestration (run_daily.py owns this)
  Calls Layer 2 modules in sequence with ThreadPoolExecutor parallelism
  Manages run_state.json (daily counters, processed list, errors)

Layer 2 — Domain Modules (LinkedinAutomation/)
  Search:     search_aggregator.py -> search_linkedin_jobs.py, search_direct_scraper.py,
              search_indeed_jobs.py, search_glassdoor_jobs.py, search_firecrawl_jobs.py
  Filter:     deduplicate_jobs.py, mark_job_seen.py, extract_job_intelligence.py
  AI:         score_job.py, tailor_resume.py, generate_cover_letter.py, ollama_client.py
  Apply:      apply_easy_apply.py, apply_external_form.py, apply_external.py
  Output:     generate_pdf.py, upload_to_drive.py, log_to_sheets.py
  Notify:     telegram_bot.py, alert_user.py, send_job_email.py, send_email_report.py
  Track:      follow_up_tracker.py, interview_prep.py, generate_daily_report.py,
              generate_weekly_report.py
  Infra:      anti_detect.py, apply_security.py, save_linkedin_auth.py,
              setup_google_sheet.py, tmp_cleanup.py, search_utils.py

Layer 1 — Shared Utilities
  LinkedinAutomation/__init__.py   safe_job_id(), load_profile()
  alert_user.py                    Console logging + desktop notifications
  ollama_client.py                 Shared Ollama REST client (free local LLM)
  anti_detect.py                   Human-like delays, UA rotation, stealth JS
  apply_security.py                URL/path sanitization, SSRF protection
  search_utils.py                  Shared search filters and salary extraction

Layer 0 — External Services
  Ollama (localhost:11434)         Free local LLM (qwen3:4b) for scoring/writing
  Anthropic Claude API             Premium LLM for resume/cover letter/interview prep
  LinkedIn (guest API + auth)      Job search and Easy Apply
  Google Sheets API                Application tracking spreadsheet
  Google Drive API                 Resume/cover letter PDF storage
  Telegram Bot API                 Notifications, interactive approval, remote control
  Playwright (Chromium)            Browser automation for Easy Apply and ATS forms
  Apify API                        Fallback scraper for Indeed/Glassdoor
```

## Data Flow

```
1. SEARCH
   search_aggregator.aggregate_jobs()
     -> Parallel: search_linkedin_jobs.search()     [LinkedIn guest API]
                  search_direct_scraper.search()     [Playwright stealth: Indeed, Glassdoor,
                                                      Dice, RemoteOK, BuiltIn, etc.]
                  search_indeed_jobs.search()         [Apify API fallback]
                  search_glassdoor_jobs.search()      [Apify API fallback]
                  search_firecrawl_jobs.search()      [Firecrawl API fallback]
     -> Cross-platform fuzzy dedup (title+company)
     -> Returns: list[dict] with keys: job_id, title, company, location, salary,
                 job_url, description, source, is_easy_apply

2. DEDUPLICATE
   deduplicate_jobs.deduplicate(raw_jobs)
     -> SHA-256 hash of job_url against .tmp/seen_jobs.json
     -> Returns: unseen jobs only

3. PER-JOB PIPELINE (for each new job):
   a. extract_job_intelligence.extract(job)
      -> Regex: salary, remote_status, required_skills

   b. score_job.score(job, profile)
      -> Ollama JSON -> Claude API -> local keyword fallback
      -> Writes .tmp/score_{job_id}.json
      -> Returns: {score, grade, matched_skills, missing_skills, should_reject, ...}

   c. PARALLEL via ThreadPoolExecutor(3):
      - tailor_resume.tailor(job, score, profile)
        -> Claude API -> Ollama -> template fallback
        -> Writes .tmp/resume_{job_id}.txt
      - generate_cover_letter.generate(job, score, profile)
        -> Claude API -> Ollama -> template fallback
        -> Writes .tmp/cl_{job_id}.txt
      - find_connections.find(company, title)
        -> LinkedIn people search scrape
        -> Returns: {connection_name, outreach_message, ...}

   d. PARALLEL via ThreadPoolExecutor(2):
      - generate_pdf.generate_resume_pdf() -> .tmp/resume_{job_id}.pdf
      - generate_pdf.generate_cover_letter_pdf() -> .tmp/cl_{job_id}.pdf

   e. PARALLEL via ThreadPoolExecutor(2):
      - upload_to_drive.upload_file(resume_pdf) -> Drive link
      - upload_to_drive.upload_file(cl_pdf)     -> Drive link

   f. AUTO-APPLY:
      - Easy Apply: apply_easy_apply.apply()
        -> Playwright + saved LinkedIn auth -> multi-page form filling
        -> Reads candidate/intake_form.json + candidate/learned_answers.json
        -> Unknown fields -> ask admin via Telegram (blocking Q&A)
      - External: apply_external_form.apply_external()
        -> apply_external.extract_url() to get ATS URL
        -> Playwright stealth -> Workday/Greenhouse/Lever/iCIMS/etc.
        -> Same intake_form + learned_answers + Telegram Q&A

   g. log_to_sheets.log_job(log_data)
      -> Google Sheets API (idempotent, checks for duplicate job_url)
      -> 23-column row with Drive hyperlinks

   h. telegram_bot.send_job_notification(log_data)
      -> HTML-formatted card to admin + viewer chat IDs

   i. mark_job_seen.mark_seen(job_url)
      -> Append SHA-256 hash to .tmp/seen_jobs.json

4. POST-PIPELINE (after all jobs processed):
   - follow_up_tracker.check_follow_ups()
     -> Scans Sheets for "Applied" rows older than FOLLOW_UP_DAYS
     -> Sends Telegram reminders
   - interview_prep.check_interview_statuses()
     -> Scans Sheets for "Interview" status
     -> Generates STAR answers via Claude, sends via Telegram
   - generate_daily_report.send_daily_report()
     -> Reads Sheets data, computes stats, sends Telegram summary
```

## LLM Fallback Chain

Every AI-powered module follows the same 3-tier fallback:
1. **Claude API** (Anthropic) -- highest quality, costs money
2. **Ollama** (local, qwen3:4b) -- free, decent quality
3. **Local heuristic/template** -- free, no LLM needed, always works

This applies to: `score_job.py`, `tailor_resume.py`, `generate_cover_letter.py`.

## Key Abstractions

| Abstraction | Location | Purpose |
|---|---|---|
| `safe_job_id(id)` | `LinkedinAutomation/__init__.py` | Sanitize job IDs for file paths |
| `load_profile()` | `LinkedinAutomation/__init__.py` | Load `candidate/profile.json` with error handling |
| `alert(title, msg, level)` | `alert_user.py` | Unified console + desktop notification |
| `ollama_client` | `ollama_client.py` | Shared Ollama REST client with availability caching |
| `get_human_delay(action)` | `anti_detect.py` | Gaussian-distributed delays per action type |
| `sanitize_url(url)` | `apply_security.py` | SSRF protection for URLs opened in Playwright |
| `safe_resume_path(path)` | `apply_security.py` | Path traversal protection for file uploads |
| `get_sheets_service()` | `setup_google_sheet.py` | Google API auth with token refresh |
| `load_auth(browser)` | `save_linkedin_auth.py` | Playwright context from saved LinkedIn cookies |

## Entry Points

| File | Invocation | Purpose |
|---|---|---|
| `run_daily.py` | `python run_daily.py [--max-jobs N]` | One-shot pipeline run |
| `run_scheduler.py` | `python run_scheduler.py` | 30-min cron loop (subprocess) |
| `run_service.py` | `python run_service.py` or `systemctl start jobbot` | Production 24/7 daemon |
| `run_telegram_bot.py` | `python run_telegram_bot.py` | Standalone Telegram bot |
| `run_weekly_report.py` | `python run_weekly_report.py` | Weekly email analytics |
| `deploy_vps.sh` | `./deploy_vps.sh` | VPS systemd deployment |
| `start_vps_automation.ps1` | PowerShell | Windows VPS startup |
| `test_end_to_end.py` | `python test_end_to_end.py` | End-to-end integration tests |
| `test_real_job.py` | `python test_real_job.py` | Live job processing test |

## Threading Model

- **`run_scheduler.py`**: Single-threaded. Spawns `run_daily.py` as a subprocess.
- **`run_service.py`**: Two threads. Scheduler runs in a daemon thread; Telegram bot
  runs in the main thread (required for signal handling). The scheduler thread imports
  and calls `run_daily.main()` directly (in-process, not subprocess).
- **`run_daily.py`**: Uses `ThreadPoolExecutor` for parallel work within each job
  (resume + cover letter + connections in parallel; PDF generation in parallel; Drive
  uploads in parallel). Jobs are processed sequentially.
- **Telegram Q&A**: When an apply flow hits an unknown form field, it sets
  `_pending_question` in `telegram_bot.py` and blocks on a `threading.Event`. The
  Telegram message handler fills in the answer and signals the event.

## State Files

| File | Format | Owner | Purpose |
|---|---|---|---|
| `.tmp/run_state.json` | JSON | `run_daily.py` | Daily counter, processed job list, errors |
| `.tmp/seen_jobs.json` | JSON (list of SHA-256 hashes) | `mark_job_seen.py` | Dedup across runs |
| `.tmp/pending_approval.json` | JSON | `telegram_bot.py` | Jobs awaiting Telegram approval |
| `.tmp/interview_prep_sent.json` | JSON | `interview_prep.py` | Track sent prep materials |
| `candidate/intake_form.json` | JSON | `apply_easy_apply.py` | Pre-filled form answers |
| `candidate/learned_answers.json` | JSON | `apply_easy_apply.py` | Answers learned from Telegram Q&A |
| `candidate/profile.json` | JSON | Many modules | Candidate skills, experience, preferences |
| `linkedin_auth.json` | JSON | `save_linkedin_auth.py` | Playwright browser cookies |
| `token.json` | JSON | `setup_google_sheet.py` | Google OAuth2 token |

## Config

All configuration is via `.env` (loaded by `python-dotenv`). Key variables:

- `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` -- Claude API
- `OLLAMA_URL`, `OLLAMA_MODEL`, `OLLAMA_WRITING_MODEL` -- Local LLM
- `LINKEDIN_EMAIL`, `LINKEDIN_PASSWORD`, `LINKEDIN_LI_AT` -- LinkedIn auth
- `GOOGLE_SHEETS_SPREADSHEET_ID` -- Tracking sheet
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_IDS`, `TELEGRAM_VIEWER_CHAT_IDS`
- `MAX_APPLICATIONS_PER_DAY`, `MIN_SCORE_THRESHOLD` -- Caps
- `SEARCH_PLATFORMS` -- Comma-separated list of job boards
- `SCRAPER_MODE` -- `custom` (default), `firecrawl`, or `both`
- `FOLLOW_UP_DAYS`, `SCREENSHOT_RETENTION_DAYS` -- Maintenance

## Satellite Subsystems

### `web_scraper/` -- Universal Web Scraping Framework
Standalone pip-installable package. Provides `Scraper`, `BrowserEngine`, `CaptchaSolver`,
`ProxyRotator`, `SessionPool`, and output formatters. Used by `search_direct_scraper.py`
and `apply_external.py` for stealth browser automation. Has its own `pyproject.toml`.

### `LinkedinAutomation/vps_computer/` -- Multi-Agent VPS Runtime
FastAPI-based API server for high-performance VPS deployment. Includes `agent.py`
(controller), `runtime.py` (execution engine), `browser_controller.py`, `scraper.py`,
`task_queue.py`, `vector_store.py`, `orchestrator.py`, and cluster support. Dockerized
with its own `docker-compose.yml`. Not integrated into the main pipeline; intended for
future scale-out.

### `stitch_app/` -- Companion Web App (dormant)
Node.js backend (`server.js`) + Flutter frontend. Separate concern from the job
automation pipeline. Not referenced by any pipeline module.
