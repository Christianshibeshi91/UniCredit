# Pitfalls Research

**Domain:** Adding FastAPI+React web dashboard to existing Python automation pipeline
**Researched:** 2026-03-09
**Confidence:** HIGH (based on direct codebase analysis + verified external sources)

## Critical Pitfalls

### Pitfall 1: Nested asyncio.run() Crashes When FastAPI Calls Existing Automation Code

**What goes wrong:**
The existing automation modules (`apply_easy_apply.py`, `apply_external_form.py`, `apply_external.py`) all use `asyncio.run()` as their synchronous entry points (lines 735, 502, 241 respectively). FastAPI runs its own asyncio event loop. Calling `asyncio.run()` from within a running event loop raises `RuntimeError: This event loop is already running`. Any FastAPI endpoint that tries to invoke the existing automation code directly will crash.

**Why it happens:**
The existing code was designed as a CLI pipeline where `asyncio.run()` is the top-level entry point. FastAPI already owns the event loop via uvicorn/ASGI. Python does not allow nested `asyncio.run()` calls -- it is a hard constraint, not a configuration issue.

**How to avoid:**
Two options, in order of preference:
1. **Subprocess isolation (recommended for this project):** The scheduler already uses `subprocess.run()` to launch `run_daily.py` as a child process (line 84 of `run_scheduler.py`). The dashboard should follow this same pattern -- trigger automation cycles via subprocess, not direct Python import. This avoids all event loop conflicts.
2. **Refactor to async-native:** Extract the async internals (`_apply_async`, `_apply_external_async`) and call them directly with `await` from FastAPI endpoints. This is cleaner but requires touching every automation module and risks breaking the existing CLI pipeline.

**Warning signs:**
- `RuntimeError: This event loop is already running` in server logs
- `RuntimeError: asyncio.run() cannot be called from a running event loop`
- API endpoints that work in unit tests (no event loop) but crash in production (uvicorn running)

**Phase to address:**
Phase 1 (Backend Foundation) -- establish the subprocess-based automation control pattern before building any control endpoints.

---

### Pitfall 2: JSON State File Race Conditions Between Dashboard API and Automation Subprocess

**What goes wrong:**
The `.tmp/` directory contains at least 8 shared JSON state files (`run_state.json`, `pending_approval.json`, `seen_jobs.json`, `new_jobs.json`, `report_history.json`, plus per-job score/resume/CL files). The existing code reads and writes these with plain `open()` + `json.load()/json.dump()` (no file locking, no atomic writes). If the FastAPI server reads `pending_approval.json` while `run_daily.py` is mid-write, it gets truncated/corrupt JSON. If the dashboard updates `run_state.json` while the scheduler reads it, the scheduler makes wrong cap decisions.

**Why it happens:**
The original system is single-process (scheduler spawns `run_daily.py` sequentially via subprocess, so writes never overlap). Adding a web server introduces a second concurrent process that reads/writes the same files. The Telegram bot already shows awareness of this problem (`_pending_lock = threading.Lock()` on line 73), but that only protects within the same process -- it does nothing against the API server in a separate process.

**How to avoid:**
1. **Atomic writes pattern:** Write to a temp file, then `os.rename()` (atomic on both Linux and Windows NTFS). This prevents readers from seeing partial writes.
2. **File locking with `filelock` library:** Wrap all JSON read/write operations in `FileLock` context managers. Both the API server and automation process must use the same lock file.
3. **Migrate critical state to SQLite:** Move `run_state.json`, `pending_approval.json`, and `seen_jobs.json` into the SQLite database. SQLite handles concurrent access properly with WAL mode. Keep per-job artifact files (scores, resumes, cover letters) as JSON since they are write-once-read-many.

Option 3 is the strongest -- the project already plans to use SQLite for dashboard preferences, so extending it to replace the most contention-prone JSON files is natural.

**Warning signs:**
- `json.JSONDecodeError` in production logs (corrupt reads)
- Dashboard showing stale data after automation runs
- Scheduler daily cap counter getting reset unexpectedly
- `pending_approval.json` losing entries

**Phase to address:**
Phase 1 (Backend Foundation) -- implement the state management layer before building any features that depend on it.

---

### Pitfall 3: Telegram Bot Event Loop Conflicts With FastAPI's Event Loop

**What goes wrong:**
The Telegram bot (`telegram_bot.py`) runs its own asyncio event loop via `app.run_polling()` (line 1301). It stores this loop as `_bot_loop` (line 1278) and uses `asyncio.run_coroutine_threadsafe()` for cross-thread communication. If FastAPI and the Telegram bot run in the same process, they fight over the event loop. If they run in different threads within the same process, the cross-thread bridge code (`get_scheduler_ask_callback()`) becomes even more fragile.

**Why it happens:**
`python-telegram-bot` v20+ is fully async and calls `asyncio.run()` internally in `run_polling()`. You cannot have two `asyncio.run()` calls in the same process. The current architecture already accounts for this by running the bot as a separate process, but the dashboard introduces a third long-running process that needs to coordinate with both.

**How to avoid:**
Keep each long-running async service in its own process:
- **Process 1:** FastAPI server (uvicorn) -- handles API + WebSocket
- **Process 2:** Telegram bot (`run_bot()`) -- handles Telegram interactions
- **Process 3:** Scheduler (`run_scheduler.py`) -- spawns automation cycles

Inter-process communication via:
- SQLite (shared state, WAL mode for concurrent reads)
- WebSocket pub/sub from FastAPI to dashboard (no direct Telegram-to-dashboard bridge needed)
- JSON files for non-critical state (with atomic writes)

Do NOT try to embed the Telegram bot into the FastAPI process using background tasks or threading. This has been attempted in many projects and consistently fails due to event loop conflicts.

**Warning signs:**
- `RuntimeError: There is no current event loop in thread`
- `set_wakeup_fd` errors (commit 4ff1c9e already fixed one instance of this)
- Bot stops responding after API server restart
- WebSocket connections dropping when Telegram bot receives messages

**Phase to address:**
Phase 1 (Backend Foundation) -- define the process architecture and inter-process communication before building any features.

---

### Pitfall 4: Google Sheets API Rate Limiting Breaks Dashboard Polling

**What goes wrong:**
Google Sheets API enforces 60 reads per minute per user per project and 300 reads per minute per project total. The existing automation already uses reads heavily: `_check_duplicate()` reads column F on every job log, `get_rows_by_status()` reads all rows, `ensure_headers()` reads row 1. If the dashboard adds polling (every 5-10 seconds to refresh the job table), it will burn through the per-user quota in under a minute. At 60 req/min, you get one request per second -- a dashboard refresh cycle that fetches the sheet takes at least one request, leaving no headroom for the automation.

**Why it happens:**
Developers treat Google Sheets as a database and poll it like one. It is not a database -- it is a collaboration tool with API rate limits designed for occasional programmatic access, not real-time dashboard feeds.

**How to avoid:**
1. **Cache Google Sheets data in SQLite.** Sync Sheets data to a local SQLite table on a timer (every 2-5 minutes). Dashboard reads from SQLite (instant, no rate limits). Automation writes go to both Sheets and SQLite.
2. **Never poll Sheets from the frontend.** All frontend requests hit FastAPI endpoints backed by SQLite. Sheets is the long-term archive, not the real-time source.
3. **Batch Sheets reads.** When syncing, fetch the entire sheet in one `values().get()` call rather than multiple column reads.
4. **Implement exponential backoff.** When the automation gets a 429 from Sheets, back off and retry. The existing code has zero retry logic for Sheets API calls.

**Warning signs:**
- HTTP 429 errors in logs from `googleapiclient`
- Dashboard showing stale data but no error messages (silent quota exhaustion)
- Automation failing to log jobs to Sheets during dashboard active use
- Google Cloud Console showing quota exceeded alerts

**Phase to address:**
Phase 2 (Data Layer) -- implement the Sheets-to-SQLite sync before building any dashboard views that display job data.

---

### Pitfall 5: SQLite Concurrent Write Contention From API Server + Sync Worker

**What goes wrong:**
SQLite supports only one writer at a time. With WAL mode enabled, readers do not block the writer and the writer does not block readers -- but two simultaneous writes will cause one to get `SQLITE_BUSY`. If the FastAPI server writes user preferences while the Sheets sync worker writes job data, one write fails. Default SQLite timeout is 5 seconds, after which it raises `OperationalError: database is locked`.

**Why it happens:**
Developers assume SQLite with WAL mode is equivalent to PostgreSQL for concurrent writes. It is not. WAL mode solves read-write concurrency but NOT write-write concurrency.

**How to avoid:**
1. **Enable WAL mode explicitly** at database creation: `PRAGMA journal_mode=WAL;`
2. **Set a generous busy timeout**: `PRAGMA busy_timeout=10000;` (10 seconds). For a single-user dashboard, writes are infrequent enough that contention resolves within milliseconds.
3. **Use a single connection with a write queue** for all write operations (via a background task or dedicated writer coroutine in FastAPI).
4. **Never hold transactions open longer than necessary.** The Sheets sync should batch-insert rows in a single transaction, not one transaction per row.
5. **Use `aiosqlite` for async access** in FastAPI to avoid blocking the event loop during writes.

**Warning signs:**
- `OperationalError: database is locked` in API server logs
- Intermittent 500 errors on dashboard preference saves
- Sheets sync failing silently during heavy API usage

**Phase to address:**
Phase 2 (Data Layer) -- set up SQLite with WAL mode and proper connection management from the start.

---

### Pitfall 6: Playwright Browser Instances Leaking Memory on VPS

**What goes wrong:**
Playwright launches full Chromium browser instances for LinkedIn Easy Apply and external form filling. Each browser instance consumes 200-500MB of RAM. If the dashboard triggers automation runs more frequently than the scheduler's 30-min cycles (e.g., user clicks "Apply Now" repeatedly), or if browser instances are not properly closed on errors, the VPS runs out of memory. The existing code uses `async_playwright()` context managers but exception paths may not always close the browser.

**Why it happens:**
In the CLI workflow, if a browser leaks, the subprocess exits and the OS reclaims memory. With a long-running API server that can trigger automation, leaked browsers accumulate. The dashboard makes it easy to trigger many concurrent automation runs.

**How to avoid:**
1. **Enforce single-instance automation.** Only one automation cycle can run at a time. The dashboard should show "Automation running..." and disable the trigger button.
2. **Subprocess isolation for all Playwright work.** The automation subprocess exits after each cycle, guaranteeing browser cleanup.
3. **Add a browser instance counter/limit.** Before launching Playwright, check if another instance is already running.
4. **Monitor VPS memory from the dashboard.** Display RAM usage as a system health indicator.

**Warning signs:**
- VPS swap usage climbing over hours
- OOM killer terminating processes
- Browser automation becoming slower over time
- SSH sessions to VPS becoming unresponsive

**Phase to address:**
Phase 3 (Automation Control Panel) -- when implementing the start/stop/trigger UI, enforce the single-instance constraint.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Polling Google Sheets directly from dashboard | Simpler code, no sync layer | Hits rate limits at ~1 req/sec, breaks automation | Never -- implement SQLite cache from day one |
| Running Telegram bot and FastAPI in same process | Fewer processes to manage | Event loop conflicts, crashes, debugging nightmare | Never -- keep separate processes |
| Using `json.load()`/`json.dump()` without locking for shared state | Works in dev (no concurrency) | Corrupt state in production under load | MVP only, migrate to SQLite before going live |
| Storing JWT secret in `.env` alongside other secrets | Simple configuration | If `.env` leaks, auth is completely compromised | Acceptable for single-user Tailscale-only deployment |
| Using `localStorage` for auth tokens on frontend | Simple implementation | XSS vulnerability (but low risk since Tailscale-only) | Acceptable given Tailscale network isolation |
| Skipping HTTPS since Tailscale provides WireGuard encryption | No TLS certificate management | WebSocket connections may have issues with some clients | Acceptable -- Tailscale handles encryption at the network layer |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Google Sheets API | Creating a new `get_sheets_service()` per request (refreshes OAuth token each time) | Create service once at startup, refresh token only when expired. Store as a singleton. |
| Google Sheets API | Fetching individual columns/cells for dashboard display | Fetch entire sheet in one call, cache locally, serve from cache |
| Google Drive API | Uploading without checking Drive quota | Log Drive storage usage; PDFs are small but accumulate over months |
| Playwright (LinkedIn) | Sharing a browser context between FastAPI requests | Each automation run gets its own browser instance in a subprocess |
| Telegram Bot API | Sending WebSocket updates by importing from telegram_bot module | Write to shared SQLite, let FastAPI poll or use filesystem watchers |
| Claude/Ollama API | Making AI calls synchronously in FastAPI async endpoints | Use `asyncio.to_thread()` or `run_in_executor()` for synchronous AI SDK calls |
| SQLite | Using synchronous `sqlite3` in async FastAPI routes | Use `aiosqlite` or wrap in `run_in_executor()` to avoid blocking the event loop |
| WebSocket | Broadcasting every state change to all connected clients | Debounce updates (batch changes over 1-2 second windows), send diffs not full state |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fetching all Google Sheets rows on every dashboard page load | Page loads take 2-5 seconds, 429 errors | SQLite cache with periodic sync | Immediately, with >50 rows and any page refresh |
| WebSocket broadcasting full job list on every change | High bandwidth, frontend re-renders everything | Send targeted diffs (job ID + changed fields only) | >100 jobs in the tracker |
| Loading all `.tmp/` score JSON files to show job details | Disk I/O per request, slow with hundreds of jobs | Index key fields in SQLite on first load | >200 processed jobs |
| Frontend polling API every second for "real-time" feel | Unnecessary server load, battery drain on mobile | WebSocket push for changes, poll only as fallback | Immediately -- wasteful design |
| No pagination on job list API | Response payload grows linearly with total jobs | Add `?page=1&limit=25` from day one | >100 jobs (~2 weeks of active use) |
| Synchronous Sheets writes blocking the event loop | API response times spike to 1-3 seconds during automation | Queue Sheets writes in background tasks | First concurrent request during automation |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing Google OAuth `credentials.json` or `token.json` via API | Full access to user's Google Sheets and Drive | Ensure these files are outside the API's static file serving path; add to `.gitignore` |
| Dashboard endpoint that triggers `run_daily.py` without rate limiting | An errant browser tab refreshing could trigger 100s of automation runs | Rate limit: max 1 automation trigger per 5 minutes, enforce server-side |
| Storing `LINKEDIN_EMAIL`/`LINKEDIN_PASSWORD` readable via API | Account compromise | Never expose `.env` values through any API endpoint; use separate config for dashboard |
| WebSocket without authentication | Anyone on Tailscale network can connect and see job data | Require the same JWT/session token for WebSocket connections as for HTTP requests |
| Dashboard `/shell` endpoint (mirroring Telegram's `/shell` command) | Remote code execution if session is compromised | Do not build a shell endpoint in the dashboard. The Telegram bot's `/shell` is already risky enough. |
| No CSRF protection on state-mutating endpoints | Cross-site request forgery (lower risk on Tailscale, but still possible) | Use `SameSite` cookies or require custom headers that browsers won't send cross-origin |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Dashboard shows "Automation Running" with no progress detail | User has no idea if it is working or stuck | Show step-by-step progress: "Searching... Scoring job 2/5... Generating resume..." via WebSocket |
| Job list has no default sort | User sees oldest/test jobs first | Default sort by Date Logged DESC (newest first) |
| No visual distinction between automation-applied and manual-required jobs | User misses jobs that need manual action | Color-code: green (applied), yellow (needs review), red (failed), gray (skipped) |
| Error messages show Python tracebacks | Confusing, looks broken | Catch errors in API layer, return user-friendly messages, log tracebacks server-side |
| Dashboard goes blank when API server restarts | User thinks the system is broken | Frontend should show "Reconnecting..." overlay, auto-reconnect WebSocket with backoff |
| No indication of when data was last refreshed | User does not know if data is current | Show "Last synced: 2 minutes ago" timestamp on dashboard header |
| Intake form has no field validation | User submits empty/invalid answers that fail during automation | Validate required fields client-side and server-side before saving |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Auth system:** Often missing token refresh logic -- verify that expired JWTs trigger re-login, not a blank error page
- [ ] **WebSocket connection:** Often missing reconnection logic -- verify that closing the laptop and reopening reconnects automatically
- [ ] **Google Sheets sync:** Often missing error handling for expired OAuth tokens -- verify that token refresh works headlessly (no browser popup on VPS)
- [ ] **Job detail view:** Often missing loading states -- verify that clicking a job shows a skeleton/spinner while fetching, not a blank panel
- [ ] **Automation trigger:** Often missing feedback -- verify that clicking "Start Cycle" shows immediate confirmation, not silence until the cycle completes 5 minutes later
- [ ] **Process management:** Often missing health checks -- verify that the dashboard shows whether the scheduler and Telegram bot processes are actually running
- [ ] **SQLite database:** Often missing migrations -- verify that schema changes do not require deleting and recreating the database
- [ ] **CORS configuration:** Often missing WebSocket origins -- verify that both HTTP and WebSocket connections from the React dev server (port 5173) and production build work
- [ ] **Error boundaries:** Often missing on the React side -- verify that a single failed API call does not crash the entire dashboard

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| JSON state file corruption | LOW | Delete corrupted file; automation recreates on next cycle. Dashboard re-syncs from Sheets. |
| Google Sheets rate limit hit | LOW | Wait 60 seconds, retries will succeed. Implement exponential backoff to prevent recurrence. |
| SQLite database locked | LOW | Restart the process holding the lock. Set `busy_timeout` to prevent recurrence. |
| Playwright browser leak (OOM) | MEDIUM | SSH to VPS, `kill` chromium processes, restart automation. Add process monitoring to prevent recurrence. |
| Event loop conflict crash | HIGH | Requires architecture fix (separate processes). Cannot be patched at runtime. Design it right from Phase 1. |
| OAuth token expired on VPS | MEDIUM | Re-run `setup_google_sheet.py` with browser access (may need SSH tunnel). Consider using service account instead of OAuth to avoid this entirely. |
| WebSocket connections accumulating | LOW | Frontend auto-reconnects. Server should use heartbeat pings and close stale connections (60s timeout). |
| Dashboard and automation state diverge | MEDIUM | Force full re-sync from Google Sheets to SQLite. Add a "Force Sync" button in dashboard admin area. |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Nested `asyncio.run()` crashes | Phase 1: Backend Foundation | Automation trigger endpoint works without `RuntimeError` |
| JSON state file race conditions | Phase 1: Backend Foundation | Concurrent API read + automation write produces no corruption |
| Telegram + FastAPI event loop conflict | Phase 1: Backend Foundation | All three processes (API, bot, scheduler) run independently for 24h without crashes |
| Google Sheets rate limiting | Phase 2: Data Layer | Dashboard refresh does not make any direct Sheets API calls |
| SQLite write contention | Phase 2: Data Layer | Preferences save succeeds during active Sheets sync |
| Playwright memory leaks | Phase 3: Automation Control | VPS memory stays stable over 48h with regular automation cycles |
| CORS misconfiguration | Phase 1: Backend Foundation | React dev server on port 5173 can reach all API + WebSocket endpoints |
| Missing WebSocket reconnection | Phase 4: Real-time Features | Close laptop for 5 minutes, reopen -- dashboard reconnects and shows current data |
| No pagination on job list | Phase 2: Data Layer | API response time stays under 200ms with 500+ jobs in database |
| OAuth token expiry on VPS | Phase 1: Backend Foundation | Consider service account for Google APIs to avoid OAuth browser flow requirement |

## Sources

- Direct codebase analysis of `run_scheduler.py`, `run_daily.py`, `telegram_bot.py`, `apply_easy_apply.py`, `apply_external_form.py`, `apply_external.py`, `log_to_sheets.py`, `setup_google_sheet.py`
- [Playwright Sync API inside asyncio loop -- GitHub Issue #462](https://github.com/microsoft/playwright-python/issues/462)
- [FastAPI Concurrency and async/await documentation](https://fastapi.tiangolo.com/async/)
- [Google Sheets API Usage Limits](https://developers.google.com/workspace/sheets/api/limits) -- 60 req/min/user, 300 req/min/project
- [SQLite WAL Mode documentation](https://sqlite.org/wal.html)
- [SQLite Concurrent Write Transactions](https://oldmoe.blog/2024/07/08/the-write-stuff-concurrent-write-transactions-in-sqlite/)
- [FastAPI scheduling tasks discussion -- GitHub #9143](https://github.com/fastapi/fastapi/discussions/9143)
- [FastAPI blocking long-running requests -- GitHub #8842](https://github.com/fastapi/fastapi/discussions/8842)
- [python-telegram-bot async event loop -- Python.org discussion](https://discuss.python.org/t/two-sync-apis-playwright-and-procrastinate-cannot-use-asynctosync-in-the-same-thread-as-an-async-event-loop/81521)

---
*Pitfalls research for: Adding FastAPI+React dashboard to Anti-gravity LinkedIn automation system*
*Researched: 2026-03-09*
