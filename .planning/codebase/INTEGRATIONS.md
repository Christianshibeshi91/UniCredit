# External Integrations

## AI / LLM APIs

### Anthropic Claude API
- **SDK**: `anthropic` Python package
- **Auth**: `ANTHROPIC_API_KEY` env var
- **Model**: `ANTHROPIC_MODEL` env var (default `claude-sonnet-4-20250514`)
- **Used in**:
  - `LinkedinAutomation/score_job.py` -- Job-candidate fit scoring (returns structured JSON with 5-dimension scores)
  - `LinkedinAutomation/tailor_resume.py` -- ATS-optimized resume tailoring from gold standard
  - `LinkedinAutomation/generate_cover_letter.py` -- 4-paragraph tailored cover letter generation
  - `LinkedinAutomation/interview_prep.py` -- STAR-format interview answers and company research
  - `LinkedinAutomation/vps_computer/agent.py` -- Research agent LLM backend (fallback from Ollama)
- **Endpoints**: `client.messages.create()` with structured prompts returning JSON or plain text

### Ollama (Local LLM)
- **Protocol**: REST API over HTTP
- **Auth**: None (local service)
- **Host**: `OLLAMA_URL` env var (default `http://localhost:11434`)
- **Models**: `OLLAMA_MODEL` (scoring, default `qwen3:4b`), `OLLAMA_WRITING_MODEL` (resume/CL, default `qwen3:4b`)
- **Used in**:
  - `LinkedinAutomation/ollama_client.py` -- Shared client with connection pooling, 5-min availability cache
  - `LinkedinAutomation/score_job.py` -- Preferred over Claude for scoring (free)
  - `LinkedinAutomation/tailor_resume.py` -- Resume generation fallback
  - `LinkedinAutomation/generate_cover_letter.py` -- Cover letter fallback
  - `LinkedinAutomation/vps_computer/agent.py` -- Primary LLM for VPS research agent
- **Endpoints**: `/api/tags` (health), `/api/generate` (completion), `/api/chat` (VPS agent)

## Google Cloud APIs

### Google Sheets API v4
- **SDK**: `google-api-python-client` (`build("sheets", "v4", ...)`)
- **Auth**: OAuth2 via `credentials.json` + auto-refreshed `token.json`
- **Scopes**: `https://www.googleapis.com/auth/spreadsheets`
- **Spreadsheet**: `GOOGLE_SHEETS_SPREADSHEET_ID` env var
- **Used in**:
  - `LinkedinAutomation/setup_google_sheet.py` -- Auth flow, header verification (23 columns A-W)
  - `LinkedinAutomation/log_to_sheets.py` -- Append job rows, update status/applied columns, query by status
  - `LinkedinAutomation/generate_weekly_report.py` -- Read all rows, compute analytics, write to new tab
  - `LinkedinAutomation/follow_up_tracker.py` -- Read rows by status, update follow-up date/status columns
  - `LinkedinAutomation/generate_daily_report.py` -- Read today's rows for daily stats
  - `LinkedinAutomation/interview_prep.py` -- Query rows with "Interview" status

### Google Drive API v3
- **SDK**: `google-api-python-client` (`build("drive", "v3", ...)`)
- **Auth**: Same OAuth2 token as Sheets
- **Scopes**: `https://www.googleapis.com/auth/drive.file`
- **Used in**:
  - `LinkedinAutomation/upload_to_drive.py` -- Upload resume/cover letter PDFs to `LinkedIn_Applications` folder, set public read permission, return shareable webViewLink
- **Operations**: `files().create()`, `files().list()`, `permissions().create()`

## Messaging / Notifications

### Telegram Bot API
- **Protocol**: HTTPS REST API + long-polling via `python-telegram-bot` SDK
- **Auth**: `TELEGRAM_BOT_TOKEN` env var (from @BotFather)
- **Recipients**: `TELEGRAM_CHAT_IDS` (all notifications), `TELEGRAM_ADMIN_CHAT_IDS` (interactive approval + shell), `TELEGRAM_VIEWER_CHAT_IDS` (read-only)
- **Used in**:
  - `LinkedinAutomation/telegram_bot.py` -- Full interactive bot:
    - Inline keyboard approval/skip cards for new jobs
    - `/status`, `/report`, `/run`, `/stop`, `/logs`, `/shell` commands
    - Background process management (start/stop scheduler)
    - Admin Q&A for unknown form fields during applications
    - Activity reports every 12 hours (8AM/8PM PT)
  - `LinkedinAutomation/send_job_email.py` -- Simple notification sender (HTML-formatted job alerts)
  - `LinkedinAutomation/generate_daily_report.py` -- Daily analytics summary via Telegram
  - `LinkedinAutomation/follow_up_tracker.py` -- Follow-up reminder messages
  - `LinkedinAutomation/interview_prep.py` -- Interview prep materials delivery
- **Endpoints**: `sendMessage`, `sendPhoto`, `answerCallbackQuery` via bot API

### Desktop Notifications (plyer)
- **SDK**: `plyer.notification`
- **Used in**: `LinkedinAutomation/alert_user.py` -- Windows toast / macOS / Linux notifications as best-effort supplement to console logging

## Job Board Integrations

### LinkedIn (Direct Scraping)
- **Protocol**: HTTP requests to LinkedIn's public guest API + authenticated page scraping
- **Auth**: Public endpoints need no auth. Authenticated features use `LINKEDIN_LI_AT` cookie or Playwright browser state from `linkedin_auth.json`
- **Used in**:
  - `LinkedinAutomation/search_linkedin_jobs.py` -- Guest search API (`/jobs-guest/jobs/api/seeMoreJobPostings/search`), detail page scraping with regex parsing
  - `LinkedinAutomation/find_connections.py` -- People search at target companies via `li_at` cookie
  - `LinkedinAutomation/apply_easy_apply.py` -- Playwright-driven multi-page Easy Apply form automation
  - `LinkedinAutomation/apply_external.py` -- Extract external application URLs from job pages
  - `LinkedinAutomation/save_linkedin_auth.py` -- Persist/restore Playwright browser state
- **Anti-detection**: User-Agent rotation, viewport randomization, Gaussian timing delays, stealth JS injection, random feed browsing between applications (`LinkedinAutomation/anti_detect.py`)

### Firecrawl API
- **SDK**: `firecrawl-py` (`Firecrawl` class)
- **Auth**: `FIRECRAWL_API_KEY` env var
- **Used in**:
  - `LinkedinAutomation/search_indeed_jobs.py` -- Indeed search via `site:indeed.com` queries
  - `LinkedinAutomation/search_glassdoor_jobs.py` -- Glassdoor search via `site:glassdoor.com` queries
  - `LinkedinAutomation/search_firecrawl_jobs.py` -- Generic search for Dice, ZipRecruiter, SimplyHired, Monster, BuiltIn
- **Endpoints**: `fc.search(query=..., limit=..., scrape_options={"formats": ["markdown"]}, tbs="qdr:w")`

### Apify
- **SDK**: `apify-client`
- **Auth**: `APIFY_API_TOKEN` env var
- **Status**: Listed in `requirements.txt` and `.env.example` as available integration

### Custom Stealth Web Scraper (Primary, Free)
- **Auth**: None (direct HTTP + Playwright)
- **Used in**: `LinkedinAutomation/search_direct_scraper.py` -- Zero-API-key scraper targeting Indeed, Glassdoor, Dice, RemoteOK, BuiltIn, Google Jobs, SimplyHired, ZipRecruiter, Monster
- **Features**: Per-domain cookie persistence, adaptive rate limiting with exponential backoff, CAPTCHA detection and skip, Canvas/WebGL/AudioContext noise injection, optional residential proxy via `SCRAPER_PROXY` env var
- **Selection**: Controlled by `SCRAPER_MODE` env var (`custom` default, `firecrawl`, or `both`)

## External ATS Form Automation

### Supported Platforms
- **Used in**: `LinkedinAutomation/apply_external_form.py` -- Generic ATS form filler handling:
  - Workday, Greenhouse, Lever, iCIMS, Taleo, SmartRecruiters
  - Multi-page form navigation with submit/next/skip detection
  - Field matching via regex patterns against `candidate/intake_form.json`
  - Unknown fields escalated to Telegram admin Q&A with screenshots
  - Answers persisted to `candidate/learned_answers.json` for future auto-fill

## Payments

### Stripe
- **SDK**: `stripe` npm package (Node.js)
- **Auth**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` env vars in `stitch_app/backend/.env`
- **Used in**: `stitch_app/backend/server.js`
  - `POST /api/stripe/create-checkout-session` -- Create Stripe Checkout sessions
  - `GET /api/stripe/prices` -- List active prices for a product
  - `GET /api/stripe/success` -- Handle successful payment, credit wallet
  - `POST /api/stripe/webhook` -- Webhook handler for `checkout.session.completed` events
- **Security**: Session metadata carries `userId` (tamper-proof). Idempotent processing via `processedSessions` map

## Databases / Storage

### Firebase Firestore
- **SDK**: `firebase-admin` (Node.js server), `cloud_firestore` (Flutter client)
- **Auth**: Service account JSON in `FIREBASE_SERVICE_ACCOUNT_JSON` env var (server), Firebase Auth tokens (client)
- **Project**: `unicredit-app-f14ab`
- **Collections**: `users`, `transactions`, `gifts`, `fraud_flags`, `settings`, `_meta`
- **Used in**: `stitch_app/backend/server.js` -- All CRUD operations with in-memory fallback when Firebase is unavailable

### Firebase Authentication
- **SDK**: `firebase-admin` (server), `firebase_auth` + `google_sign_in` (Flutter)
- **Methods**: Email/password, Google Sign-In
- **Used in**: `stitch_app/backend/server.js` -- User creation, token verification, password management

### Redis 7
- **Image**: `redis:7-alpine`
- **Used in**: `LinkedinAutomation/vps_computer/docker-compose.cluster.yml` -- Task queue and shared state for multi-node agent cluster
- **Config**: 50MB max memory, LRU eviction, no persistence (ephemeral queue)
- **Port**: 6379

### Qdrant Vector Database
- **Image**: `qdrant/qdrant:latest`
- **SDK**: `qdrant-client` Python package
- **Used in**:
  - `LinkedinAutomation/vps_computer/docker-compose.cluster.yml` -- Container with on-disk payloads
  - `LinkedinAutomation/vps_computer/vector_store.py` -- Semantic search over research results using `all-MiniLM-L6-v2` embeddings (384 dimensions, cosine distance)
- **Ports**: 6333 (REST), 6334 (gRPC)

### Local File Storage
- **Path**: `.tmp/` directory (gitignored)
- **Contents**: Job JSON files, scored results, tailored resumes (`.txt` + `.pdf`), cover letters, screenshots, scraper cookies, run state, scheduler logs
- **PII files**: `candidate/intake_form.json`, `candidate/learned_answers.json` -- Restricted to owner-only permissions via `LinkedinAutomation/apply_security.py`

## Authentication Patterns

| System | Method | Implementation |
|---|---|---|
| Google Sheets/Drive | OAuth2 (offline refresh) | `credentials.json` -> `token.json` auto-refresh in `LinkedinAutomation/setup_google_sheet.py` |
| LinkedIn (scraping) | Session cookies | `linkedin_auth.json` Playwright storage state; `LINKEDIN_LI_AT` cookie for API calls |
| LinkedIn (credentials) | Email/password | `LINKEDIN_EMAIL` + `LINKEDIN_PASSWORD` env vars for Easy Apply login |
| Telegram Bot | Bot token | `TELEGRAM_BOT_TOKEN` env var |
| Anthropic Claude | API key | `ANTHROPIC_API_KEY` env var |
| Firecrawl | API key | `FIRECRAWL_API_KEY` env var |
| Apify | API token | `APIFY_API_TOKEN` env var |
| VPS Agent API | API key header | `AGENT_API_KEYS` env var, validated via `X-API-Key` header |
| Stitch Backend | JWT (24h) + bcrypt | `JWT_SECRET` env var, 12-round bcrypt hashing |
| Stitch Stripe | Secret key + webhook secret | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` env vars |
| Stitch Firebase | Service account JSON | `FIREBASE_SERVICE_ACCOUNT_JSON` env var |
| Stitch Client | Firebase Auth + Google Sign-In | `firebase_auth` + `google_sign_in` Flutter packages |

## Webhooks

### Stripe Webhook
- **Endpoint**: `POST /api/stripe/webhook` in `stitch_app/backend/server.js`
- **Event**: `checkout.session.completed`
- **Verification**: `stripe.webhooks.constructEvent()` with `STRIPE_WEBHOOK_SECRET`
- **Action**: Credit user wallet balance, record transaction

## Scheduled Tasks

| Schedule | Script | Description |
|---|---|---|
| Every 30 minutes | `run_scheduler.py` | Job discovery cycles (max 3 per cycle, 15 per day) |
| Every 12 hours (8AM/8PM PT) | `LinkedinAutomation/telegram_bot.py` | Activity report sent to Telegram |
| Daily (via `run_daily.py`) | Follow-up tracker | Check for 7+ day old applications needing follow-up |
| Daily (via `run_daily.py`) | Interview prep check | Scan for "Interview" status rows, generate prep materials |
| Daily (via `run_daily.py`) | Screenshot cleanup | Delete `.tmp/screenshots/` files older than `SCREENSHOT_RETENTION_DAYS` |

## Rate Limiting / Anti-Detection

- **LinkedIn**: Gaussian-distributed delays (`LinkedinAutomation/anti_detect.py`): 45s between jobs, 3-min coffee breaks every 5-8 apps, 10% random skip rate
- **VPS Agent API**: 200 req/min, 5000 req/hr, burst limit 50 (`LinkedinAutomation/vps_computer/api.py`)
- **Stitch Backend**: 15 auth attempts per 15 min, 10 financial operations per minute (`stitch_app/backend/server.js`)
- **Web Scraper**: Per-domain exponential backoff, adaptive rate limiting (`LinkedinAutomation/search_direct_scraper.py`)

## Search Platforms (Configurable)

Use `SEARCH_PLATFORMS` env var (comma-separated). Available: `linkedin`, `indeed`, `glassdoor`, `dice`, `ziprecruiter`, `simplyhired`, `monster`, `builtin`. Default: all enabled. Scraper mode controlled by `SCRAPER_MODE` (`custom` = free stealth scraper, `firecrawl` = Firecrawl API, `both`).
