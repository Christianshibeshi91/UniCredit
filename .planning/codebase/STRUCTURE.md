# Directory Structure

## Root Layout

```
Anti-gravity/
|-- .env                          # Live config (gitignored secrets)
|-- .env.example                  # Config template with all variables documented
|-- .gitignore
|-- requirements.txt              # Python dependencies (pip install -r)
|
|-- run_daily.py                  # PRIMARY ENTRY: single pipeline run
|-- run_scheduler.py              # 30-min cron loop (spawns run_daily.py)
|-- run_service.py                # Production daemon: scheduler + Telegram bot
|-- run_telegram_bot.py           # Standalone Telegram bot
|-- run_weekly_report.py          # Weekly email report
|
|-- test_end_to_end.py            # E2E integration tests
|-- test_real_job.py              # Live job processing test
|
|-- deploy_vps.sh                 # Linux VPS systemd deployment
|-- start_vps_automation.ps1      # Windows VPS startup
|-- jobbot.service                # systemd unit file
|
|-- credentials.json              # Google API OAuth client (DO NOT COMMIT)
|-- token.json                    # Google API OAuth token (DO NOT COMMIT)
|-- linkedin_auth.json            # Playwright cookies (DO NOT COMMIT)
|
|-- LinkedinAutomation/           # Core package (all domain logic)
|-- candidate/                    # Candidate data (profile, resume, answers)
|-- web_scraper/                  # Standalone scraping framework
|-- .tmp/                         # Runtime artifacts (generated files, state, screenshots)
|
|-- rules/                        # AI agent prompt rules (markdown)
|-- .agents/workflows/            # Agent workflow definitions
|-- .planning/                    # Architecture and planning docs (this directory)
|-- .claude/                      # Claude Code settings
|
|-- stitch_app/                   # Companion web app (Node+Flutter, dormant)
```

## `LinkedinAutomation/` -- Core Package

Place all new pipeline modules here. Follow the existing pattern: one module per
concern, one public function as the entry point.

```
LinkedinAutomation/
|-- __init__.py                   # safe_job_id(), load_profile()
|
|-- # --- Search ---
|-- search_aggregator.py          # Top-level: parallel multi-platform search + dedup
|-- search_linkedin_jobs.py       # LinkedIn guest API scraper
|-- search_direct_scraper.py      # Playwright stealth: Indeed, Glassdoor, Dice, etc.
|-- search_indeed_jobs.py         # Indeed via Apify API
|-- search_glassdoor_jobs.py      # Glassdoor via Apify API
|-- search_firecrawl_jobs.py      # Firecrawl API (legacy fallback)
|-- search_utils.py               # Shared: passes_filter(), extract_salary()
|
|-- # --- Filter / Dedup ---
|-- deduplicate_jobs.py           # SHA-256 URL dedup against seen_jobs.json
|-- mark_job_seen.py              # Read/write .tmp/seen_jobs.json
|-- extract_job_intelligence.py   # Regex: salary, remote status, skills
|
|-- # --- AI / LLM ---
|-- score_job.py                  # Job scoring (Ollama -> local keyword fallback)
|-- tailor_resume.py              # Resume tailoring (Claude -> Ollama -> template)
|-- generate_cover_letter.py      # Cover letter gen (Claude -> Ollama -> template)
|-- ollama_client.py              # Shared Ollama REST client
|
|-- # --- Apply ---
|-- apply_easy_apply.py           # LinkedIn Easy Apply (Playwright, multi-page forms)
|-- apply_external_form.py        # Generic ATS form filler (Workday, Greenhouse, etc.)
|-- apply_external.py             # Extract external apply URLs from LinkedIn pages
|-- apply_security.py             # URL/path sanitization, SSRF/traversal protection
|
|-- # --- Output ---
|-- generate_pdf.py               # Resume + cover letter PDF generation (fpdf2)
|-- upload_to_drive.py            # Google Drive upload, returns shareable links
|-- log_to_sheets.py              # Google Sheets logging (23-column row, idempotent)
|-- setup_google_sheet.py         # Google Sheets/Drive auth + header setup
|
|-- # --- Notifications ---
|-- alert_user.py                 # Console log + desktop notification (plyer)
|-- telegram_bot.py               # Telegram bot: commands, approval flow, Q&A, reports
|-- send_job_email.py             # Email notification for individual jobs
|-- send_email_report.py          # Email delivery for weekly reports
|
|-- # --- Tracking ---
|-- follow_up_tracker.py          # 7-day follow-up reminders via Telegram
|-- interview_prep.py             # STAR answers + company research via Claude
|-- generate_daily_report.py      # Daily analytics report via Telegram
|-- generate_weekly_report.py     # Weekly analytics report (for email)
|
|-- # --- Infrastructure ---
|-- anti_detect.py                # Human-like delays, UA rotation, stealth JS
|-- save_linkedin_auth.py         # Persist/restore Playwright browser cookies
|-- tmp_cleanup.py                # Delete old screenshots from .tmp/
|-- vps_headless_login.py         # One-time LinkedIn login for VPS (saves auth)
|
|-- vps_computer/                 # Multi-agent VPS runtime (FastAPI, Docker)
```

## `candidate/` -- Candidate Data

Place all candidate-specific data here. Never hardcode candidate info in modules.

```
candidate/
|-- profile.json                  # Skills, experience, preferences, ATS keywords
|-- gold_standard_resume.docx     # Master resume (source of truth for tailoring)
|-- Chris_Shibeshi_Resume.txt     # Plain text resume snapshot
|-- intake_form.json              # Pre-filled answers for job application forms
|-- learned_answers.json          # Answers learned from Telegram Q&A (auto-populated)
```

## `web_scraper/` -- Standalone Scraping Framework

Pip-installable package with its own `pyproject.toml`. Import via
`from web_scraper import Scraper, ScrapeConfig`.

```
web_scraper/
|-- __init__.py                   # Public API: Scraper, ScrapeConfig, scrape
|-- config.py                     # ScrapeConfig dataclass
|-- scraper.py                    # Main Scraper class + scrape() function
|-- browser.py                    # BrowserEngine, BrowserPool (Playwright stealth)
|-- session.py                    # SessionPool, fingerprint generation
|-- captcha.py                    # CaptchaSolver (detection + solving)
|-- proxy.py                      # ProxyRotator (residential proxy support)
|-- extractor.py                  # CSS/XPath extraction, container-based extraction
|-- cleaner.py                    # HTML cleaning, markdown conversion
|-- filters.py                    # Data filtering + transformation pipelines
|-- output.py                     # JSON, CSV, SQLite output formatters
|-- workflow.py                   # Multi-step scraping workflows
|-- ai.py                         # AI-powered extraction
|-- pyproject.toml                # Package metadata
|-- setup.py                      # Install shim
```

## `.tmp/` -- Runtime Artifacts (gitignored)

All generated files go here. Never write generated files to the project root or
`candidate/`.

```
.tmp/
|-- run_state.json                # Daily run counters and processed job list
|-- seen_jobs.json                # SHA-256 hashes of all processed job URLs
|-- pending_approval.json         # Jobs awaiting Telegram approval
|-- interview_prep_sent.json      # Track which jobs received interview prep
|-- scheduler.log                 # Scheduler log output
|-- service.log                   # Service (unified daemon) log output
|-- resume_{job_id}.txt           # Generated tailored resumes (text)
|-- resume_{job_id}.pdf           # Generated tailored resumes (PDF)
|-- cl_{job_id}.txt               # Generated cover letters (text)
|-- cl_{job_id}.pdf               # Generated cover letters (PDF)
|-- score_{job_id}.json           # Job scoring results
|-- screenshots/                  # Playwright screenshots (auto-cleaned)
```

## `rules/` -- AI Agent Prompts

Markdown files defining behavior rules for AI agents. Referenced by `.claude/settings.json`.

```
rules/
|-- ai_computer_agent.md          # VPS computer agent rules
|-- application_assist.md         # Application assistance rules
|-- connection_intelligence.md    # Connection finder rules
|-- cover_letter.md               # Cover letter generation rules
|-- google_sheets_logging.md      # Google Sheets logging rules
|-- job_discovery.md              # Job discovery rules
|-- job_scoring.md                # Job scoring rules
|-- resume_tailoring.md           # Resume tailoring rules
|-- weekly_report.md              # Weekly report rules
```

## `LinkedinAutomation/vps_computer/` -- Multi-Agent Runtime

FastAPI server for high-performance VPS. Not yet integrated into main pipeline.

```
vps_computer/
|-- api.py                        # FastAPI endpoints (tasks, agents)
|-- agent.py                      # AgentController
|-- runtime.py                    # Execution engine
|-- browser_controller.py         # Browser automation
|-- scraper.py                    # VPS-optimized scraper
|-- search_module.py              # Search integration
|-- data_processor.py             # Data processing
|-- output_formatter.py           # Output formatting
|-- config.py                     # AgentConfig, RuntimeConfig
|-- security.py                   # RateLimiter, APIKeyAuth, InputSanitizer
|-- task_queue.py                 # Task queue management
|-- vector_store.py               # Vector store for embeddings
|-- orchestrator.py               # Multi-agent orchestration
|-- cluster_api.py                # Cluster coordination API
|-- cluster_config.py             # Cluster configuration
|-- crawl_worker.py               # Distributed crawl worker
|-- memory_monitor.py             # Memory usage monitoring
|-- cli.py                        # CLI interface
|-- Dockerfile                    # Container build
|-- docker-compose.yml            # Single-node deployment
|-- docker-compose.cluster.yml    # Multi-node cluster deployment
|-- deploy.sh                     # Deployment script
|-- deploy_cluster.sh             # Cluster deployment
|-- requirements.txt              # Python dependencies
```

## Naming Conventions

| Convention | Example | Rule |
|---|---|---|
| Search modules | `search_linkedin_jobs.py` | `search_{platform}_jobs.py` |
| Public function | `search()`, `score()`, `tailor()` | Single verb, matches module purpose |
| Generated files | `resume_{job_id}.txt` | `{type}_{job_id}.{ext}` in `.tmp/` |
| State files | `seen_jobs.json` | Descriptive noun in `.tmp/` |
| Entry points | `run_daily.py` | `run_{purpose}.py` at project root |
| Test files | `test_end_to_end.py` | `test_{scope}.py` at project root |
| Rule files | `job_scoring.md` | `{feature_area}.md` in `rules/` |

## Where to Place New Code

| Type | Location | Pattern |
|---|---|---|
| New job board scraper | `LinkedinAutomation/search_{platform}_jobs.py` | Expose `search(max_jobs=N) -> list[dict]`, register in `search_aggregator.py` |
| New AI feature | `LinkedinAutomation/{feature}.py` | Follow 3-tier fallback (Claude -> Ollama -> local) |
| New notification channel | `LinkedinAutomation/{channel}_notify.py` | Follow `alert_user.py` pattern |
| New entry point | `run_{purpose}.py` at root | Load `.env`, import from `LinkedinAutomation/` |
| New test | `test_{scope}.py` at root | Use unittest or pytest |
| Generated artifacts | `.tmp/` | Never write to root or `candidate/` |
| Candidate data | `candidate/` | JSON for structured data, DOCX for documents |
| Config variable | `.env` + `.env.example` | Document in `.env.example` with comment |
| Agent rules | `rules/{feature}.md` | Markdown with structured prompts |
