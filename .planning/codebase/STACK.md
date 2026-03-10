# Technology Stack

## Languages

- **Python 3.10+** -- Primary language for the job automation system (`LinkedinAutomation/`, `web_scraper/`, `run_daily.py`, `run_scheduler.py`)
- **Dart 3.x** -- Flutter mobile app (`stitch_app/frontend/`)
- **JavaScript (Node.js)** -- Express backend for Stitch app (`stitch_app/backend/server.js`)

## Runtime Environments

- **CPython** -- Use Python 3.10+ (required by `web_scraper/pyproject.toml`). Type hints use `X | None` syntax (3.10+)
- **Node.js** -- Use with Express 4.18 for the Stitch backend. Entry point: `stitch_app/backend/server.js`
- **Flutter SDK 3.x** -- Use SDK `>=3.0.0 <4.0.0` for the Stitch mobile frontend
- **Docker** -- Use for VPS agent deployment (`LinkedinAutomation/vps_computer/docker-compose.yml`, `docker-compose.cluster.yml`)

## Package Managers

- **pip** -- Use `requirements.txt` at project root and `LinkedinAutomation/vps_computer/requirements.txt`
- **npm** -- Use `stitch_app/backend/package.json`
- **pub** -- Use `stitch_app/frontend/pubspec.yaml`

## Python Dependencies (root `requirements.txt`)

| Package | Purpose |
|---|---|
| `anthropic>=0.39.0` | Claude API client for scoring, resume tailoring, cover letters, interview prep |
| `playwright>=1.44.0` | Headless Chromium browser automation (Easy Apply, external ATS forms, scraping) |
| `python-dotenv>=1.0.1` | Environment variable loading from `.env` |
| `google-api-python-client>=2.130.0` | Google Sheets API + Google Drive API |
| `google-auth-httplib2>=0.2.0` | Google API authentication transport |
| `google-auth-oauthlib>=1.2.0` | Google OAuth 2.0 flow (credentials.json -> token.json) |
| `python-telegram-bot>=20.0` | Telegram Bot API (notifications, interactive approval, admin controls) |
| `requests>=2.32.0` | HTTP client for LinkedIn scraping, Telegram API, Ollama REST API |
| `beautifulsoup4>=4.12.0` | HTML parsing for web scraper |
| `lxml>=5.0.0` | Fast HTML/XML parser backend for BeautifulSoup |
| `firecrawl-py>=1.0.0` | Firecrawl search API client (Indeed, Glassdoor, Dice, etc.) |
| `apify-client>=1.6.0` | Apify actor API client |
| `python-docx>=1.1.2` | Read gold standard resume from `.docx` |
| `fpdf2>=2.7.0` | Generate ATS-friendly PDF resumes and cover letters |
| `plyer>=2.1.0` | Desktop notifications (Windows toast, macOS, Linux) |
| `thefuzz>=0.22.1` | Fuzzy string matching for cross-platform job deduplication |
| `schedule>=1.2.0` | Cron-like task scheduling for `run_scheduler.py` |
| `tzdata>=2024.1` | IANA timezone data (used with `zoneinfo` for Pacific Time) |

## VPS Agent Dependencies (`LinkedinAutomation/vps_computer/requirements.txt`)

| Package | Purpose |
|---|---|
| `httpx>=0.27.0` | Async HTTP client for Ollama/Anthropic API calls |
| `fastapi>=0.115.0` | REST API framework for the VPS agent server |
| `uvicorn>=0.32.0` | ASGI server for FastAPI |
| `pydantic>=2.0.0` | Request/response validation models |
| `psutil>=6.0.0` | System resource monitoring (CPU, RAM, disk) |
| `playwright>=1.48.0` | Browser automation within Docker containers |

## VPS Cluster Dependencies (`LinkedinAutomation/vps_computer/requirements.cluster.txt`)

| Package | Purpose |
|---|---|
| `redis[hiredis]>=5.0.0` | Task queue and shared state between cluster nodes |
| `qdrant-client>=1.7.0` | Vector database client for semantic search |
| `sentence-transformers>=2.2.0` | Embedding model (`all-MiniLM-L6-v2`) for vector store |

## Web Scraper Dependencies (`web_scraper/pyproject.toml`)

Use `setuptools>=68.0` for build. Core dependencies mirror root requirements. Optional extras:
- `captcha`: `2captcha-python>=1.2.0`, `anticaptchaofficial>=1.0.0`
- `sheets`: Google Sheets/Drive client libraries

## Node.js Dependencies (`stitch_app/backend/package.json`)

| Package | Purpose |
|---|---|
| `express@^4.18.2` | HTTP server framework |
| `firebase-admin@^12.0.0` | Firebase Auth + Firestore server SDK |
| `stripe@^14.0.0` | Stripe Payments API (checkout sessions, webhooks) |
| `jsonwebtoken@^9.0.3` | JWT token signing and verification |
| `bcryptjs@^3.0.3` | Password hashing (12 rounds) |
| `cors@^2.8.5` | CORS middleware |
| `dotenv@^16.3.1` | Environment variable loading |
| `nodemon@^3.0.1` (dev) | Auto-restart on file changes |

## Flutter Dependencies (`stitch_app/frontend/pubspec.yaml`)

| Package | Purpose |
|---|---|
| `firebase_core@^3.0.0` | Firebase initialization |
| `firebase_auth@^5.0.0` | Firebase Authentication |
| `cloud_firestore@^5.0.0` | Firestore database client |
| `google_sign_in@^6.2.1` | Google OAuth sign-in |
| `provider@^6.1.5` | State management |
| `flutter_secure_storage@^10.0.0` | Encrypted local storage |
| `http@^1.1.0` | HTTP client for backend API calls |
| `url_launcher@^6.3.2` | Launch URLs (Stripe checkout) |
| `google_fonts@^8.0.2` | Custom fonts |
| `flutter_animate@^4.5.2` | Animation framework |
| `lottie@^3.1.0` | Lottie animation rendering |
| `cached_network_image@^3.4.1` | Image caching |
| `local_auth@^3.0.1` | Biometric authentication |
| `image_picker@^1.1.2` | Camera/gallery access |
| `intl@^0.20.2` | Date/number formatting |

## Configuration Files

- ``.env`` -- Main environment config (API keys, credentials, thresholds). Load via `python-dotenv`
- ``.env.example`` -- Template with all supported env vars documented
- ``credentials.json`` -- Google Cloud OAuth2 client credentials (Sheets + Drive scopes)
- ``token.json`` -- Google OAuth2 refresh token (auto-generated on first auth flow)
- ``linkedin_auth.json`` -- Playwright browser storage state (cookies/sessions for LinkedIn)
- ``candidate/profile.json`` -- Candidate profile data (skills, experience, preferences)
- ``candidate/gold_standard_resume.docx`` -- Source-of-truth resume for AI tailoring
- ``candidate/intake_form.json`` -- Pre-filled answers for ATS form automation
- ``candidate/learned_answers.json`` -- Answers learned from Telegram Q&A (auto-grows)
- ``stitch_app/backend/.env`` -- Stripe keys, Firebase service account JSON, JWT secret
- ``LinkedinAutomation/vps_computer/.env`` -- Anthropic API key, agent API keys
- ``LinkedinAutomation/vps_computer/.env.cluster`` -- Redis + Qdrant connection config

## Entry Points

| Script | Purpose |
|---|---|
| `run_daily.py` | Single-run job discovery pipeline (search, score, tailor, apply) |
| `run_scheduler.py` | 30-minute recurring scheduler wrapping `run_daily.py` |
| `run_telegram_bot.py` | Long-lived Telegram bot process (approval cards, commands, shell) |
| `run_service.py` | Combined scheduler + Telegram bot in one process |
| `run_weekly_report.py` | Generate weekly analytics report to Google Sheets |
| `test_end_to_end.py` | End-to-end integration test |
| `stitch_app/backend/server.js` | Stitch backend HTTP server |
| `start_vps_automation.ps1` | PowerShell launcher for VPS automation |

## Docker / Containerization

- `LinkedinAutomation/vps_computer/docker-compose.yml` -- Single-node agent container (Chromium + FastAPI, security-isolated with read-only FS, dropped capabilities, tmpfs-only storage)
- `LinkedinAutomation/vps_computer/docker-compose.cluster.yml` -- Multi-node cluster with Redis 7 (task queue) + Qdrant (vector store)

## LLM Provider Hierarchy

Use this fallback chain in scoring, resume tailoring, and cover letter generation:
1. **Claude API** (`anthropic` SDK) -- Primary when `ANTHROPIC_API_KEY` is set. Default model: `claude-sonnet-4-20250514`
2. **Ollama** (local REST API) -- Free local LLM at `http://localhost:11434`. Default model: `qwen3:4b`. Writing model configurable via `OLLAMA_WRITING_MODEL`
3. **Local keyword/template** -- Zero-dependency fallback with regex-based scoring and template-based document generation
