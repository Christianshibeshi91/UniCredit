# Architecture Research

**Domain:** Web dashboard integration with existing Python automation pipeline
**Researched:** 2026-03-09
**Confidence:** HIGH

## System Overview

```
+=====================================================================+
|                        FRONTEND (React/Vite)                        |
|  +-------------+  +------------+  +----------+  +-----------+       |
|  | Job Table   |  | Analytics  |  | Controls |  | Intake    |       |
|  | (GSheets)   |  | (Charts)   |  | (Start/  |  | (Q&A      |       |
|  |             |  |            |  |  Stop)   |  |  Form)    |       |
|  +------+------+  +-----+------+  +----+-----+  +-----+-----+       |
|         |               |              |              |              |
|  =======|===============|==============|==============|============  |
|         |          WebSocket           |         REST API            |
|  =======|===============|==============|==============|============  |
+=========|===============|==============|==============|==============+
          |               |              |              |
+=========|===============|==============|==============|==============+
|                      BACKEND (FastAPI on port 8000)                 |
|                                                                     |
|  +-------------------+  +------------------+  +------------------+  |
|  | REST API Routes   |  | WebSocket Hub    |  | Event Bus        |  |
|  | /api/jobs         |  | /ws              |  | (asyncio.Queue)  |  |
|  | /api/settings     |  | ConnectionMgr    |  | Pub/Sub in-proc  |  |
|  | /api/auth         |  | Broadcast        |  |                  |  |
|  | /api/automation   |  |                  |  |                  |  |
|  +--------+----------+  +--------+---------+  +--------+---------+  |
|           |                      |                      |           |
|  +--------+----------------------+----------------------+---------+ |
|  |                    Service Layer                                | |
|  |  +------------------+ +------------------+ +----------------+  | |
|  |  | SheetsService    | | AutomationCtrl   | | ContentService | | |
|  |  | (cache + bridge) | | (start/stop/     | | (AI gen via    | | |
|  |  |                  | |  monitor procs)  | |  existing mods)| | |
|  |  +--------+---------+ +--------+---------+ +-------+--------+ | |
|  +-----------|----------------------|----------------------|------+ |
|              |                      |                      |        |
|  +-----------+----------+ +---------+----------+ +--------+------+ |
|  | Google Sheets API    | | Subprocess Manager | | SQLite DB     | |
|  | (existing creds/     | | (asyncio.create_   | | (preferences, | |
|  |  token.json)         | |  subprocess_exec)  | |  intake,      | |
|  |                      | |                    | |  sessions)    | |
|  +----------------------+ +---------+----------+ +---------------+ |
|                                     |                               |
+=====================================|===============================+
                                      |
                  +-------------------+-------------------+
                  |    EXISTING AUTOMATION PIPELINE        |
                  |                                        |
                  |  run_scheduler.py -> run_daily.py      |
                  |    -> 37 LinkedinAutomation modules    |
                  |    -> Google Sheets, Drive, Telegram   |
                  |    -> Playwright, Claude/Ollama        |
                  +----------------------------------------+
```

## Critical Design Constraint: No Modification to Existing Pipeline

The existing automation runs as `run_scheduler.py` which spawns `run_daily.py` as a subprocess every 30 minutes. The Telegram bot runs in the main thread via `app.run_polling()`. These processes work and are battle-tested.

**The dashboard wraps the automation; it does not replace or refactor it.**

The FastAPI server is a NEW process that:
1. Reads the same data sources (Google Sheets, .tmp/ JSON files)
2. Controls the automation by spawning/stopping subprocesses
3. Imports existing modules for AI content generation (reuse, not rewrite)
4. Publishes real-time events over WebSocket when state changes

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| FastAPI Server | HTTP/WS gateway, auth, routing | `uvicorn` on port 8000, single worker (async) |
| WebSocket Hub | Real-time client push | `ConnectionManager` class with broadcast |
| Event Bus | Decouple pipeline events from WS delivery | `asyncio.Queue` with pub/sub pattern |
| SheetsService | Cache Google Sheets data, serve to frontend | Timed sync (60s) into SQLite cache table |
| AutomationController | Start/stop/pause scheduler, monitor status | `asyncio.create_subprocess_exec` + stdout streaming |
| ContentService | Generate resumes, cover letters, follow-up emails | Direct import of existing modules (tailor_resume, generate_cover_letter, etc.) |
| SQLite DB | User preferences, intake answers, session tokens, sheets cache | Single file `dashboard.db` in project root |
| React Frontend | Dashboard UI, real-time updates, user interaction | Vite dev server (port 5173), built to `static/` for prod |

## Recommended Project Structure

```
Anti-gravity/
├── LinkedinAutomation/         # EXISTING - do not modify for dashboard
│   ├── __init__.py
│   ├── score_job.py
│   ├── tailor_resume.py
│   ├── generate_cover_letter.py
│   ├── log_to_sheets.py
│   ├── setup_google_sheet.py
│   ├── telegram_bot.py
│   └── ... (37 modules)
├── dashboard/                  # NEW - all dashboard code lives here
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry point + lifespan
│   ├── config.py               # Dashboard settings, env loading
│   ├── auth.py                 # Single-user auth (JWT session)
│   ├── database.py             # SQLite setup + migrations
│   ├── models.py               # Pydantic models (request/response)
│   ├── events.py               # Event bus (asyncio pub/sub)
│   ├── websocket_hub.py        # ConnectionManager + broadcast
│   ├── services/
│   │   ├── __init__.py
│   │   ├── sheets_service.py   # Google Sheets bridge + cache
│   │   ├── automation_ctrl.py  # Start/stop/monitor scheduler
│   │   ├── content_service.py  # AI generation (wraps existing modules)
│   │   └── analytics_service.py # Compute stats from cached data
│   └── routes/
│       ├── __init__.py
│       ├── auth_routes.py      # POST /api/auth/login, /logout
│       ├── jobs_routes.py      # GET /api/jobs, PATCH /api/jobs/:id
│       ├── settings_routes.py  # GET/PUT /api/settings
│       ├── automation_routes.py # POST /api/automation/start, /stop
│       ├── content_routes.py   # POST /api/content/resume, /cover-letter
│       ├── intake_routes.py    # GET/POST /api/intake
│       ├── analytics_routes.py # GET /api/analytics
│       └── ws_routes.py        # WebSocket /ws endpoint
├── frontend/                   # NEW - React dashboard
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── api/                # API client + WebSocket hook
│   │   │   ├── client.ts       # Axios/fetch wrapper
│   │   │   └── useWebSocket.ts # React hook for WS connection
│   │   ├── components/
│   │   │   ├── JobsTable.tsx
│   │   │   ├── AnalyticsPanel.tsx
│   │   │   ├── AutomationControl.tsx
│   │   │   ├── IntakeForm.tsx
│   │   │   ├── ContentGenerator.tsx
│   │   │   └── NotificationToast.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Jobs.tsx
│   │   │   ├── Analytics.tsx
│   │   │   ├── Settings.tsx
│   │   │   └── Login.tsx
│   │   └── store/              # Zustand or React context
│   │       └── index.ts
│   └── dist/                   # Production build output
├── run_daily.py                # EXISTING - no changes
├── run_scheduler.py            # EXISTING - no changes
├── run_dashboard.py            # NEW - starts FastAPI + serves React
└── dashboard.db                # NEW - SQLite (auto-created)
```

### Structure Rationale

- **dashboard/ separate from LinkedinAutomation/:** The dashboard is a consumer of the automation pipeline, not part of it. Keeping them separate means the automation can run without the dashboard (backward compatible) and the dashboard can be developed independently.
- **services/ layer:** Each service owns one integration concern. SheetsService owns the Google Sheets cache. AutomationController owns subprocess lifecycle. ContentService wraps existing AI modules. This prevents route handlers from becoming bloated.
- **routes/ layer:** One file per API domain. Clean separation makes it easy to add middleware, auth checks, or rate limiting per domain.
- **frontend/ as sibling:** Standard monorepo layout. Vite builds to `frontend/dist/`, which FastAPI serves as static files in production.

## Architectural Patterns

### Pattern 1: Event Bus for Real-Time Updates

**What:** An in-process pub/sub system using `asyncio.Queue` that decouples event producers (sheets sync, automation monitor, API actions) from event consumers (WebSocket broadcast).

**When to use:** Any time the automation state changes and the frontend needs to know about it.

**Trade-offs:** Simple and reliable for single-process. No Redis needed since this is single-user. If we ever needed multi-process, we'd upgrade to Redis pub/sub.

**Example:**

```python
# dashboard/events.py
import asyncio
from typing import Callable, Any

class EventBus:
    def __init__(self):
        self._subscribers: dict[str, list[Callable]] = {}

    def subscribe(self, event_type: str, callback: Callable):
        self._subscribers.setdefault(event_type, []).append(callback)

    async def publish(self, event_type: str, data: Any):
        for callback in self._subscribers.get(event_type, []):
            if asyncio.iscoroutinefunction(callback):
                await callback(data)
            else:
                callback(data)

# Event types:
# "job.found"        - New job discovered by automation
# "job.applied"      - Application submitted
# "job.scored"       - Job scoring complete
# "job.failed"       - Application failed
# "automation.started" - Scheduler process started
# "automation.stopped" - Scheduler process stopped
# "automation.cycle"   - Cycle completed with stats
# "sheets.synced"    - Google Sheets cache refreshed
```

### Pattern 2: Subprocess-Based Automation Control

**What:** The FastAPI server manages `run_scheduler.py` as a child process using `asyncio.create_subprocess_exec`. It captures stdout/stderr and publishes events. The existing scheduler code is untouched.

**When to use:** For the Start/Stop/Pause automation controls in the dashboard.

**Trade-offs:** Subprocess isolation means the dashboard cannot crash the automation, and vice versa. The downside is that you cannot call automation functions in-process for real-time state (you read .tmp/ files instead). This is the right trade-off because the scheduler already writes state to JSON files.

**Example:**

```python
# dashboard/services/automation_ctrl.py
import asyncio
import sys
import os

class AutomationController:
    def __init__(self, event_bus, base_dir: str):
        self._process: asyncio.subprocess.Process | None = None
        self._event_bus = event_bus
        self._base_dir = base_dir

    async def start(self):
        if self._process and self._process.returncode is None:
            raise RuntimeError("Scheduler already running")

        self._process = await asyncio.create_subprocess_exec(
            sys.executable, os.path.join(self._base_dir, "run_scheduler.py"),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=self._base_dir,
        )
        # Stream stdout to event bus in background
        asyncio.create_task(self._stream_output())
        await self._event_bus.publish("automation.started", {})

    async def stop(self):
        if self._process and self._process.returncode is None:
            self._process.terminate()
            await self._process.wait()
            await self._event_bus.publish("automation.stopped", {})

    async def _stream_output(self):
        """Read stdout line-by-line and publish as events."""
        async for line in self._process.stdout:
            text = line.decode().strip()
            # Parse scheduler log lines for structured events
            if "Cycle complete" in text:
                await self._event_bus.publish("automation.cycle", {"log": text})

    async def get_status(self) -> dict:
        """Read .tmp/run_state.json for current automation state."""
        # ... read JSON file, return status dict
```

### Pattern 3: Google Sheets Cache with Timed Sync

**What:** Instead of hitting the Google Sheets API on every frontend request, a background task syncs the full sheet into a SQLite table every 60 seconds. The REST API reads from SQLite (fast, filterable, sortable). Write operations go through to Google Sheets first, then the next sync picks up the change.

**When to use:** For the Jobs table, analytics computations, and any read-heavy Google Sheets access.

**Trade-offs:** 60-second staleness is acceptable for a single-user dashboard (jobs don't appear faster than every 30 minutes via the scheduler). This eliminates Google Sheets API rate limit concerns and makes complex queries (filtering, sorting, aggregation) trivial via SQL. The automation pipeline continues writing directly to Google Sheets as it always has.

**Example:**

```python
# dashboard/services/sheets_service.py
import sqlite3
import asyncio
from LinkedinAutomation.setup_google_sheet import get_sheets_service, HEADERS

class SheetsService:
    def __init__(self, db_path: str, spreadsheet_id: str, event_bus):
        self._db_path = db_path
        self._spreadsheet_id = spreadsheet_id
        self._event_bus = event_bus
        self._sync_interval = 60  # seconds

    async def start_sync_loop(self):
        """Background task: sync Google Sheets -> SQLite every 60s."""
        while True:
            try:
                await asyncio.get_event_loop().run_in_executor(
                    None, self._sync_sheets_to_sqlite
                )
                await self._event_bus.publish("sheets.synced", {})
            except Exception as e:
                # Log but don't crash the sync loop
                pass
            await asyncio.sleep(self._sync_interval)

    def _sync_sheets_to_sqlite(self):
        """Sync all rows from Google Sheets into SQLite (blocking)."""
        service = get_sheets_service()
        result = service.spreadsheets().values().get(
            spreadsheetId=self._spreadsheet_id, range="Sheet1!A:W"
        ).execute()
        rows = result.get("values", [])
        # Write to SQLite jobs table (replace all rows)
        # ... INSERT OR REPLACE with proper column mapping

    def get_jobs(self, filters: dict) -> list[dict]:
        """Query cached jobs from SQLite with filters."""
        conn = sqlite3.connect(self._db_path)
        # Build SQL query from filters (status, score range, date range, etc.)
        # ... return list of job dicts
```

### Pattern 4: Direct Module Import for AI Content Generation

**What:** For generating resumes, cover letters, and follow-up emails, the dashboard backend imports existing modules directly (e.g., `from LinkedinAutomation.tailor_resume import tailor`) and runs them in a thread pool executor. No subprocess needed because these are pure functions (input data in, text out).

**When to use:** When the user clicks "Generate Resume" or "Generate Cover Letter" in the UI.

**Trade-offs:** Direct import is faster than subprocess and gives structured return values. The existing modules use blocking I/O (Anthropic API, Ollama HTTP), so they must run in `run_in_executor` to avoid blocking the FastAPI event loop. This works well because these modules are stateless -- they take a job dict and profile, return text.

**Example:**

```python
# dashboard/services/content_service.py
import asyncio
from LinkedinAutomation.tailor_resume import tailor
from LinkedinAutomation.generate_cover_letter import generate
from LinkedinAutomation.score_job import score
from LinkedinAutomation import load_profile

class ContentService:
    async def generate_resume(self, job: dict, score_data: dict) -> str:
        profile = load_profile()
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, tailor, job, score_data, profile
        )
        return result

    async def generate_cover_letter(self, job: dict, score_data: dict) -> str:
        profile = load_profile()
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, generate, job, score_data, profile
        )
        return result

    async def score_job(self, job: dict) -> dict:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, score, job)
        return result
```

## Data Flow

### Flow 1: Job Discovery Notification (Real-Time)

```
run_scheduler.py spawns run_daily.py
    |
    v
run_daily.py finds job, writes to Google Sheets + .tmp/
    |
    v
SheetsService sync loop detects new row (60s interval)
    |
    v
EventBus.publish("job.found", job_data)
    |
    v
WebSocket Hub broadcasts to connected React client
    |
    v
React frontend shows toast notification + updates Jobs table
```

### Flow 2: Manual Action from Dashboard (User-Triggered)

```
User clicks "Generate Resume" in dashboard
    |
    v
React POST /api/content/resume {job_id, ...}
    |
    v
FastAPI route -> ContentService.generate_resume()
    |     |
    |     v (run_in_executor)
    |   LinkedinAutomation.tailor_resume.tailor(job, score, profile)
    |     |
    |     v
    |   Returns resume text
    |
    v
EventBus.publish("content.generated", {...})
    |
    v
WebSocket broadcast -> React updates UI
    |
    v
HTTP response with resume text (REST fallback)
```

### Flow 3: Automation Control

```
User clicks "Start Automation" in dashboard
    |
    v
React POST /api/automation/start
    |
    v
AutomationController.start()
    |
    v
asyncio.create_subprocess_exec("python", "run_scheduler.py")
    |
    v
stdout streaming -> EventBus.publish("automation.cycle", ...)
    |
    v
WebSocket broadcast -> React shows live log/status
```

### Flow 4: Google Sheets Read Path

```
React GET /api/jobs?status=Applied&sort=score&order=desc
    |
    v
FastAPI route -> SheetsService.get_jobs(filters)
    |
    v
SQLite query (cached data, <1ms response)
    |
    v
JSON response -> React renders table
```

### Flow 5: Google Sheets Write Path

```
User updates job status in dashboard
    |
    v
React PATCH /api/jobs/42 {status: "Interview"}
    |
    v
FastAPI route -> SheetsService.update_job_status(row, status)
    |
    v
Google Sheets API update (direct, not cached) <- uses existing log_to_sheets.update_job_status()
    |
    v
EventBus.publish("job.updated", {...})
    |
    v
WebSocket broadcast -> React updates table row instantly
    |
    v
Next sync cycle will pick up the authoritative state from Sheets
```

### State Management Summary

| Data | Source of Truth | Dashboard Access Pattern |
|------|----------------|--------------------------|
| Job listings (23 columns) | Google Sheets | SQLite cache (60s sync) |
| Automation run state | `.tmp/run_state.json` | File read on demand |
| Pending approvals | `.tmp/pending_approval.json` | File read + watch |
| Score results | `.tmp/score_*.json` | File read on demand |
| User preferences | SQLite `dashboard.db` | Direct SQLite read/write |
| Intake answers | SQLite `dashboard.db` | Direct SQLite read/write |
| Session tokens | SQLite `dashboard.db` | Direct SQLite read/write |
| Scheduler logs | `.tmp/scheduler.log` | Tail file + stream |

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Google Sheets API | Existing `setup_google_sheet.get_sheets_service()` reused by SheetsService | Uses existing `token.json` + `credentials.json`. No new OAuth flow needed. |
| Google Drive API | Existing `upload_to_drive.upload_file()` reused | Only used during automation runs, not directly from dashboard |
| Telegram Bot API | Existing `telegram_bot.py` continues running independently | Dashboard does NOT replace Telegram. Both can coexist. |
| Claude / Anthropic API | Existing `tailor_resume.py`, `generate_cover_letter.py`, `score_job.py` | Imported directly into ContentService via `run_in_executor` |
| Ollama | Existing `ollama_client.py` | Falls through from Claude in existing modules |
| Phone Connect (Node.js) | Separate process on port 3000 | No interaction. Dashboard uses port 8000. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| FastAPI <-> React | REST + WebSocket on port 8000 | React built to `frontend/dist/`, served by FastAPI `StaticFiles` in prod. Vite proxy in dev. |
| FastAPI <-> run_scheduler.py | Subprocess stdio + `.tmp/` file system | Dashboard spawns scheduler, reads its stdout, and watches `.tmp/` files for state changes |
| FastAPI <-> Google Sheets | Google API client (existing credentials) | SheetsService reuses `get_sheets_service()` from existing code |
| FastAPI <-> SQLite | Direct `sqlite3` or `aiosqlite` | Single-user, no connection pooling needed. WAL mode for concurrent reads. |
| FastAPI <-> LinkedinAutomation modules | Direct Python import | For AI content generation. Modules are stateless functions. |
| Telegram Bot <-> Dashboard | None (independent processes) | Both read/write Google Sheets. Both can run simultaneously. Dashboard does not replace Telegram. |

## Port Allocation

| Service | Port | Notes |
|---------|------|-------|
| Phone Connect (Node.js) | 3000 | Already in use, do not conflict |
| FastAPI Dashboard Backend | 8000 | REST + WebSocket + static files |
| Vite Dev Server | 5173 | Development only, proxies /api to 8000 |

## Process Architecture on VPS

```
systemd or supervisor
    |
    +-- dashboard (FastAPI on port 8000)
    |       |
    |       +-- [background] SheetsService sync loop
    |       +-- [background] .tmp/ file watcher
    |       +-- [on-demand] run_scheduler.py subprocess
    |               |
    |               +-- [every 30m] run_daily.py subprocess
    |
    +-- telegram_bot.py (independent, runs in main thread)
```

The key insight: the dashboard's FastAPI server becomes the parent process that manages the scheduler. Previously, you would SSH in and run `python run_scheduler.py` manually. Now the dashboard starts/stops it via the UI. The Telegram bot continues to run as a separate independent process.

## Authentication Architecture

Single-user, Tailscale-only access. Authentication is minimal but present:

```python
# dashboard/auth.py
# 1. User logs in with password (stored as bcrypt hash in SQLite)
# 2. Server issues JWT token (HS256, 7-day expiry)
# 3. Token stored in httpOnly cookie (not localStorage)
# 4. FastAPI Depends(get_current_user) on all /api/ routes
# 5. WebSocket auth: token sent as query param on WS connect
```

No OAuth, no registration, no multi-tenancy. Tailscale provides WireGuard encryption at the network layer. The JWT is defense-in-depth against accidental Tailscale exposure.

## SQLite Schema (dashboard.db)

```sql
-- Cached Google Sheets data (refreshed every 60s)
CREATE TABLE IF NOT EXISTS jobs (
    row_num INTEGER PRIMARY KEY,
    title TEXT,
    company TEXT,
    location TEXT,
    remote_status TEXT,
    salary TEXT,
    job_url TEXT UNIQUE,
    description TEXT,
    score INTEGER,
    grade TEXT,
    matched_skills TEXT,    -- comma-separated
    missing_skills TEXT,    -- comma-separated
    leadership_level TEXT,
    enterprise_score TEXT,
    connections TEXT,
    best_contact TEXT,
    resume_link TEXT,
    cover_letter_link TEXT,
    application_type TEXT,
    application_status TEXT,
    date_logged TEXT,
    applied TEXT,
    follow_up_date TEXT,
    follow_up_status TEXT,
    synced_at TEXT           -- when this row was last synced
);

-- User settings and preferences
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT
);

-- Intake form answers (for application questions)
CREATE TABLE IF NOT EXISTS intake_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT UNIQUE,
    answer TEXT,
    category TEXT,           -- "personal", "work_history", "technical", etc.
    created_at TEXT,
    updated_at TEXT
);

-- Session management
CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    created_at TEXT,
    expires_at TEXT
);
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Refactoring the Automation Pipeline

**What people do:** Modify `run_daily.py` and `run_scheduler.py` to emit events, use shared state, or integrate tightly with the dashboard.

**Why it's wrong:** The automation pipeline is working in production. Modifying it introduces regressions, breaks the Telegram bot integration, and creates coupling that makes both systems harder to change independently.

**Do this instead:** Treat the automation as a black box. Read its outputs (`.tmp/` files, Google Sheets). Control it via subprocess start/stop. Import its stateless modules for content generation only.

### Anti-Pattern 2: Real-Time Google Sheets on Every Request

**What people do:** Call the Google Sheets API on every frontend request for fresh data.

**Why it's wrong:** Google Sheets API has rate limits (100 requests per 100 seconds per user). A dashboard refreshing tables, filters, and charts can easily exceed this. The API is also slow (200-500ms per call), making the UI feel laggy.

**Do this instead:** Sync to SQLite every 60 seconds. Serve reads from SQLite. Write-through for mutations (update Sheets directly, then let sync pick it up). This gives <1ms read latency and eliminates rate limit concerns.

### Anti-Pattern 3: Running FastAPI and Telegram Bot in Same Process

**What people do:** Try to run the Telegram bot's `app.run_polling()` inside the FastAPI event loop.

**Why it's wrong:** `run_polling()` takes over the event loop. It uses the python-telegram-bot library's own Application builder with its own event loop management. Combining them leads to event loop conflicts, `set_wakeup_fd` errors (already encountered -- see commit 4ff1c9e), and unpredictable behavior.

**Do this instead:** Run them as separate processes. The Telegram bot has its own entry point (`python -m LinkedinAutomation.telegram_bot`). The dashboard has its own (`python run_dashboard.py`). They share Google Sheets as a data source but do not share a process.

### Anti-Pattern 4: WebSocket for All Data Transfer

**What people do:** Send all job data through WebSocket instead of REST.

**Why it's wrong:** WebSocket is fire-and-forget. No request-response semantics, no HTTP caching, no standard error codes. Debugging is harder. Initial page load needs all data at once (REST is better for this).

**Do this instead:** Use REST for data fetching (GET /api/jobs, etc.) and WebSocket only for push notifications (new job found, automation status changed, etc.). The frontend fetches data via REST on mount, then listens on WebSocket for incremental updates.

### Anti-Pattern 5: Polling .tmp/ Files from the Frontend

**What people do:** Have the React frontend poll a "get status" endpoint every second.

**Why it's wrong:** Wasteful. Polling creates unnecessary load and still has latency (up to 1 second).

**Do this instead:** The backend watches `.tmp/` files (using `asyncio` file stat polling or `watchfiles` library), detects changes, and pushes events via WebSocket. The frontend never polls -- it receives push notifications.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Single user (current) | Single uvicorn worker, SQLite, in-process event bus. This is sufficient and correct. |
| 2-5 concurrent tabs | No changes needed. WebSocket ConnectionManager handles multiple connections. SQLite WAL mode handles concurrent reads. |
| Multiple users (NOT planned) | Would need: PostgreSQL instead of SQLite, Redis for event bus, proper multi-tenant auth. Out of scope. |

### Scaling Priorities

1. **First bottleneck:** Google Sheets API rate limits during heavy syncing. Mitigation: 60-second cache interval, batch reads (already designed).
2. **Second bottleneck:** Claude API latency during content generation. Mitigation: Already handled -- `run_in_executor` prevents blocking, frontend shows loading state.

## Technology Choices Rationale

| Decision | Why |
|----------|-----|
| FastAPI (not Flask/Django) | Already proven in `vps_computer/api.py`. Native async, WebSocket support, Pydantic validation, auto-docs. Python aligns with existing automation code. |
| SQLite (not PostgreSQL) | Single user. No network overhead. File-based means easy backup/restore. WAL mode gives concurrent read capability. |
| `asyncio.create_subprocess_exec` (not `subprocess.Popen`) | Native async integration. Non-blocking stdout streaming. Clean process lifecycle management within the FastAPI event loop. |
| Direct module import (not microservice) | Existing modules are stateless Python functions. Importing them is orders of magnitude simpler than wrapping them in another API layer. |
| In-process event bus (not Redis) | Single process, single user. Redis would be overengineering. The event bus is just async callbacks. |
| JWT in httpOnly cookie (not localStorage) | Prevents XSS from stealing the token. httpOnly cookies cannot be read by JavaScript. |

## Build Order (Dependencies)

This ordering reflects what must exist before other pieces can work:

1. **SQLite schema + database.py** -- Everything depends on the database being initialized.
2. **Auth (auth.py + login route)** -- All other routes depend on authentication.
3. **SheetsService + sync loop** -- The jobs table, analytics, and content generation all need cached job data.
4. **REST routes for jobs** -- Once data is cached, the frontend can display it.
5. **WebSocket hub + event bus** -- Real-time updates depend on having data flowing.
6. **AutomationController** -- Start/stop controls depend on WebSocket for status feedback.
7. **ContentService** -- AI generation depends on job data being available and is user-triggered.
8. **Intake form** -- Depends on SQLite being set up and is a standalone feature.
9. **Analytics routes** -- Computed from cached data, lowest dependency count.

## Sources

- [FastAPI WebSocket Documentation](https://fastapi.tiangolo.com/advanced/websockets/)
- [FastAPI Background Tasks](https://fastapi.tiangolo.com/tutorial/background-tasks/)
- [FastAPI Concurrency and Async](https://fastapi.tiangolo.com/async/)
- [Python asyncio Subprocess Documentation](https://docs.python.org/3/library/asyncio-subprocess.html)
- [Real-time Dashboard with FastAPI and WebSockets (TestDriven.io)](https://testdriven.io/blog/fastapi-postgres-websockets/)
- [WebSocket/SSE Notifications with FastAPI -- Connection Management and Rooms](https://blog.greeden.me/en/2025/10/28/weaponizing-real-time-websocket-sse-notifications-with-fastapi-connection-management-rooms-reconnection-scale-out-and-observability/)
- [Building a Broadcast System with FastAPI WebSockets](https://hexshift.medium.com/building-a-broadcast-system-with-fastapi-websockets-04aaca6c20c3)
- [APScheduler with FastAPI](https://github.com/danirus/async-apscheduler-fastapi)
- [Store Google Sheets Data into SQLite](https://www.geeksforgeeks.org/python/store-google-sheets-data-into-sqlite-database-using-python/)
- Existing codebase analysis: `run_daily.py`, `run_scheduler.py`, `LinkedinAutomation/telegram_bot.py`, `LinkedinAutomation/log_to_sheets.py`, `LinkedinAutomation/setup_google_sheet.py`, `LinkedinAutomation/vps_computer/api.py`

---
*Architecture research for: Anti-gravity Job Automation Dashboard*
*Researched: 2026-03-09*
