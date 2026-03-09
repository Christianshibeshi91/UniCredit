# Project Research Summary

**Project:** Anti-gravity Job Automation Dashboard
**Domain:** Web dashboard for an existing single-user Python job automation pipeline (37 modules), deployed on a VPS behind Tailscale
**Researched:** 2026-03-09
**Confidence:** HIGH

## Executive Summary

This project adds a FastAPI + React web dashboard on top of a battle-tested Python automation pipeline that discovers, scores, tailors, and applies to jobs across 8 platforms. The existing system works -- it writes to Google Sheets, sends Telegram alerts, and runs on a 30-minute scheduler loop. The dashboard is an operations console, not a replacement. Experts build this pattern as a "wrapper layer": the new FastAPI backend reads the automation's outputs (Google Sheets, `.tmp/` JSON files), controls it via subprocess management, and pushes real-time status over WebSocket to a React SPA. The critical design constraint is that the automation pipeline must remain untouched -- the dashboard is a consumer, never a modifier.

The recommended approach uses FastAPI (same language as the automation, native async + WebSocket), React 19 with Vite 7 and shadcn/ui (rich dashboard components, zero-runtime overhead), and SQLite via SQLModel (single-user, no server process, shared Pydantic models with FastAPI). Google Sheets data is cached into SQLite on a 60-second sync loop, eliminating API rate limit concerns and giving sub-millisecond read latency. The automation runs as a managed subprocess, and AI content generation (resume tailoring, cover letter writing) reuses existing modules via direct import with `run_in_executor` to avoid blocking the event loop.

The top risks are (1) asyncio event loop conflicts -- the automation, Telegram bot, and FastAPI each need their own process since all three call `asyncio.run()`, (2) JSON state file race conditions -- the `.tmp/` directory has 8+ shared files with no locking, and adding a concurrent web server guarantees corruption without mitigation, and (3) Google Sheets API rate limits -- 60 reads/min will be exhausted in seconds if the dashboard polls Sheets directly. All three risks have well-understood mitigations (process isolation, SQLite migration for shared state, Sheets-to-SQLite cache layer) that must be implemented in the foundational phases, not deferred.

## Key Findings

### Recommended Stack

The stack splits cleanly into backend additions to the existing Python environment and a new frontend application. No existing dependencies change.

**Backend (Python -- additions to requirements.txt):**
- **FastAPI >=0.135.1**: API + WebSocket server -- same language as automation, Pydantic validation, 2x JSON perf via Rust-backed serialization
- **SQLModel >=0.0.37**: ORM for SQLite -- created by FastAPI author, models are simultaneously Pydantic schemas and SQLAlchemy tables (zero duplication)
- **uvicorn >=0.41.0**: ASGI server -- production-grade with WebSocket support
- **aiosqlite >=0.21.0**: Async SQLite driver -- prevents blocking FastAPI's event loop
- **PyJWT >=2.9.0 + pwdlib[argon2] >=0.2.0**: Auth -- FastAPI's current official recommendations (python-jose and passlib are abandoned)
- **Alembic >=1.14.0**: Database migrations -- essential for schema evolution in production

**Frontend (new npm project in frontend/ directory):**
- **React >=19.2.4 + Vite >=7.3.1**: SPA framework + build tool -- Vite 7 stable (avoid Vite 8 beta with experimental Rolldown bundler)
- **TypeScript >=5.7**: Type safety -- catches API/UI integration bugs (avoid TS 6 RC and TS 7 native preview)
- **shadcn/ui v4 + Tailwind CSS >=4.2.0**: UI components you own (copy-paste, not dependency) -- Table, Card, Dialog, Form, Charts included
- **TanStack Query >=5.90.0**: Server state management -- auto-caching, background refetch, optimistic updates
- **Recharts >=3.8.0**: Dashboard charts -- SVG-based, composable React components, shadcn/ui has built-in wrappers
- **Zustand >=5.0.0**: Client-side state -- 1.16KB, perfect for global flags like "automation running" or "WebSocket connected"

**What to avoid:** python-jose (abandoned), passlib (unmaintained), CRA (dead), Moment.js (deprecated, 300KB), Redux (overkill), Next.js/Remix (SSR unnecessary for SPA behind Tailscale), MongoDB/PostgreSQL (overkill for single-user), Vite 8 beta (Rolldown not stable).

### Expected Features

**Must have (table stakes -- makes dashboard worth opening instead of Sheets + Telegram):**
- Secure single-user login (JWT in httpOnly cookie)
- Job list table with status filtering and search/sort
- Job detail view with score breakdown, skills match, resume/CL viewer, Drive links
- Real-time automation status via WebSocket ("Searching...", "Scored 85/100", "Applied to X")
- Automation start/stop controls
- Basic analytics summary (today's stats: found, applied, avg score, follow-ups due)
- Follow-up reminders with mark-as-done

**Should have (v1.x -- elevates from functional to powerful):**
- Intake form management (edit ATS answers through UI, surface unanswered questions)
- Score threshold and filter tuning from UI (MIN_SCORE, platforms, daily cap, blocked companies)
- AI content regeneration ("Regenerate resume" / "Regenerate cover letter" buttons)
- Analytics charts with weekly trends (applications over time, score distribution, platform breakdown)
- Error log with retry button for failed applications
- Interview prep hub (STAR answers, company research when status = Interview)
- Dark mode

**Defer (v2+):**
- Live pipeline visualization (animated step-by-step flow -- HIGH complexity, needs stable WebSocket first)
- Manual job URL input (requires dedup + Sheets logging integration)
- Profile editor (risky -- bad edit breaks scoring for all jobs)

**Anti-features (do NOT build):**
- Multi-user support (different product entirely)
- Kanban board (automation moves jobs through stages, not the user)
- Chrome extension (system already discovers jobs automatically)
- Mobile native app (responsive web over Tailscale is sufficient)
- Real-time Sheets polling (rate limits will break everything)

### Architecture Approach

The system is three independent processes: (1) FastAPI server on port 8000 handling REST, WebSocket, and static file serving, (2) Telegram bot running independently, and (3) the automation scheduler managed as a subprocess by FastAPI. These processes communicate through SQLite (WAL mode for concurrent reads), the filesystem (`.tmp/` JSON files with atomic writes), and Google Sheets (long-term archive). An in-process asyncio event bus decouples internal state changes from WebSocket broadcast. Google Sheets data is cached into SQLite every 60 seconds; the frontend never touches the Sheets API.

**Major components:**
1. **FastAPI Server** -- HTTP/WebSocket gateway, auth, routing (port 8000)
2. **SheetsService** -- Google Sheets-to-SQLite cache with 60-second sync loop
3. **AutomationController** -- Manages scheduler as subprocess via `asyncio.create_subprocess_exec`, streams stdout to event bus
4. **WebSocket Hub + Event Bus** -- ConnectionManager broadcasts events to React clients; asyncio.Queue-based pub/sub decouples producers from consumers
5. **ContentService** -- Wraps existing AI modules (tailor_resume, generate_cover_letter, score_job) via `run_in_executor` for non-blocking calls
6. **SQLite DB** -- User preferences, intake answers, session tokens, Sheets cache (single file `dashboard.db`)
7. **React Frontend** -- SPA with shadcn/ui components, TanStack Query for data fetching, Zustand for global state, WebSocket for push updates

### Critical Pitfalls

1. **Nested asyncio.run() crashes** -- Existing automation modules use `asyncio.run()` as entry points. Calling them from FastAPI (which owns the event loop) raises `RuntimeError`. Mitigate by using subprocess isolation for automation triggers and `run_in_executor` only for stateless AI functions that do not call `asyncio.run()`.

2. **JSON state file race conditions** -- 8+ shared `.tmp/` files have no locking or atomic writes. Adding a concurrent web server guarantees corruption. Mitigate by migrating critical state (`run_state.json`, `pending_approval.json`, `seen_jobs.json`) to SQLite, and using atomic writes (write to temp file, then `os.rename()`) for remaining JSON files.

3. **Telegram bot event loop conflict** -- The Telegram bot calls `asyncio.run()` via `run_polling()`. It cannot share a process with FastAPI. Mitigate by running FastAPI, Telegram bot, and scheduler as three separate processes. Do not attempt to embed the bot into FastAPI via threading or background tasks.

4. **Google Sheets API rate limiting** -- 60 reads/min/user. Dashboard polling directly will exhaust quota in seconds and starve the automation. Mitigate by implementing the SQLite cache layer from day one -- the dashboard never reads from Sheets, only from the local cache.

5. **SQLite concurrent write contention** -- WAL mode solves read-write but not write-write. Mitigate by enabling WAL mode + `busy_timeout=10000ms`, batching Sheets sync inserts in a single transaction, and using `aiosqlite` for async access.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Backend Foundation + Auth

**Rationale:** Everything depends on the FastAPI server, SQLite database, and authentication. The process architecture (three independent processes) must be established before any features can be built. This phase addresses the three most critical pitfalls (event loop conflicts, file race conditions, process isolation).
**Delivers:** Running FastAPI server with SQLite schema, JWT auth, health check endpoint, database migrations via Alembic, process architecture documentation.
**Addresses:** Secure login (P1 feature), CORS configuration, process separation.
**Avoids:** Pitfalls 1 (nested asyncio.run), 2 (JSON race conditions -- establishes SQLite state management), 3 (Telegram event loop conflict -- defines process boundaries).

### Phase 2: Data Layer + Jobs Display

**Rationale:** The Google Sheets data cache is the foundation for every job-related feature. The SheetsService sync loop and SQLite cache must exist before the frontend can display anything meaningful. This phase tackles the Google Sheets rate limit pitfall head-on.
**Delivers:** SheetsService with 60-second sync, jobs REST API with filtering/sorting/pagination, job detail endpoint, React frontend scaffolding (Vite + shadcn/ui), jobs table page, job detail page.
**Addresses:** Job list with filtering (P1), job detail view (P1), search/sort (P1), score breakdown visualization (P1), resume/CL viewer (P1).
**Avoids:** Pitfall 4 (Sheets rate limiting -- all reads from SQLite), Pitfall 5 (SQLite contention -- WAL mode + proper connection management).

### Phase 3: Real-Time Infrastructure + Automation Control

**Rationale:** WebSocket infrastructure and automation control are tightly coupled -- the start/stop buttons need real-time feedback to be useful. The event bus, WebSocket hub, and AutomationController form a cohesive unit. This phase makes the dashboard a live ops console rather than a static data viewer.
**Delivers:** WebSocket hub with ConnectionManager, asyncio event bus, AutomationController (subprocess management), real-time status feed in React, start/stop/pause controls, toast notifications via Sonner.
**Addresses:** Real-time automation status (P1), automation start/stop (P1).
**Avoids:** Pitfall 6 (Playwright memory leaks -- single-instance constraint enforced), Pitfall 1 (subprocess isolation confirmed for all automation triggers).

### Phase 4: Analytics + Follow-Ups

**Rationale:** Analytics compute over cached job data (available after Phase 2) and are independent of real-time infrastructure. Follow-up reminders read from the same cache. These features complete the P1 feature set.
**Delivers:** Analytics summary endpoint (today's stats), follow-up reminders endpoint with mark-as-done, React analytics dashboard page, follow-up list component.
**Addresses:** Basic analytics summary (P1), follow-up reminders (P1).
**Avoids:** No critical pitfalls -- this phase uses patterns established in Phases 1-3.

### Phase 5: Settings + Intake Form Management

**Rationale:** Settings and intake management are CRUD operations against SQLite that depend on the foundation but have no dependency on real-time features. They are high-value P2 features that make the dashboard genuinely more useful than editing `.env` files and JSON by hand.
**Delivers:** Settings API (score threshold, platform config, daily cap, blocked companies), intake form API (view/edit/add answers, surface unanswered questions), React settings page, intake form page.
**Addresses:** Score threshold/filter tuning (P2), intake form management (P2), blocked company management (P2).
**Avoids:** No critical pitfalls -- standard CRUD against an established database.

### Phase 6: AI Content + Advanced Features

**Rationale:** AI content regeneration depends on the job detail view (Phase 2) and ContentService wrapping existing modules. Analytics charts build on the analytics summary (Phase 4). Error log with retry builds on the event bus (Phase 3). These are polish features that elevate the dashboard from functional to powerful.
**Delivers:** Resume/cover letter regeneration buttons, analytics charts with trends (Recharts), error log with retry, interview prep hub, dark mode toggle.
**Addresses:** AI content regeneration (P2), analytics charts (P2), error log with retry (P2), interview prep hub (P2), dark mode (P2).
**Avoids:** No new pitfalls -- all infrastructure is established.

### Phase Ordering Rationale

- **Dependency chain:** Auth -> Data Layer -> Real-Time -> Analytics -> Settings -> AI/Polish. Each phase unlocks the next.
- **Risk-first:** The three critical pitfalls (event loop conflicts, file race conditions, Sheets rate limits) are all addressed in Phases 1-2. If something fundamental is wrong with the architecture, it fails fast.
- **Value-first within constraints:** The P1 feature set (job table, detail view, real-time status, start/stop) is complete by Phase 4. The user has a daily-driveable dashboard after 4 phases.
- **Independence in later phases:** Phases 5 and 6 are largely independent of each other and could be reordered or done in parallel.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Real-Time + Automation Control):** WebSocket reconnection logic, subprocess stdout streaming patterns, and the exact event types/payloads need design. The event bus pattern is straightforward but the integration between AutomationController stdout parsing and structured events needs careful specification.
- **Phase 5 (Settings + Intake):** The mechanism for applying changed settings to the automation pipeline (e.g., updating MIN_SCORE_THRESHOLD in a running scheduler) is not fully specified. Need to determine if the scheduler re-reads `.env` each cycle or if a restart is required.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Backend Foundation):** FastAPI project setup, SQLite schema, JWT auth -- extremely well-documented with official FastAPI tutorials.
- **Phase 2 (Data Layer):** REST CRUD endpoints, Google Sheets API reads, SQLite caching -- standard patterns with abundant examples.
- **Phase 4 (Analytics + Follow-Ups):** Aggregation queries on SQLite, simple React components -- no novel patterns.
- **Phase 6 (AI Content + Advanced):** Wrapping existing Python functions, adding Recharts components -- standard integration work.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations from official documentation (FastAPI, React, Vite, shadcn/ui). Version compatibility verified. No bleeding-edge dependencies. |
| Features | HIGH | Based on competitor analysis (Teal, Huntr, Simplify, JobSync) and direct codebase analysis of existing module capabilities. Feature dependencies mapped to existing code. |
| Architecture | HIGH | Subprocess + cache pattern is well-established for dashboard-over-automation systems. Anti-patterns identified from existing codebase issues (commit 4ff1c9e event loop fix). |
| Pitfalls | HIGH | Top pitfalls derived from direct codebase analysis (specific line numbers cited). Recovery strategies verified against existing error patterns. |

**Overall confidence:** HIGH

### Gaps to Address

- **OAuth token refresh on VPS:** The Google Sheets OAuth token (`token.json`) expires periodically and requires a browser-based re-auth flow. On a headless VPS, this requires an SSH tunnel. Consider migrating to a Google service account during Phase 1 to eliminate this operational burden entirely.
- **Settings hot-reload mechanism:** It is unclear whether the scheduler re-reads `.env` and configuration on each 30-minute cycle or only at startup. This determines whether changed settings take effect immediately or require a scheduler restart. Needs verification during Phase 5 planning.
- **Sheets sync conflict resolution:** If the user updates a job status in the dashboard (write-through to Sheets) and the automation simultaneously updates the same row, which write wins? The current design assumes last-write-wins with eventual consistency via the next sync cycle. This is probably fine for single-user but should be explicitly tested.
- **Deployment orchestration:** The process architecture requires running three independent processes (FastAPI, Telegram bot, scheduler). The current VPS setup likely uses `nohup` or manual screen sessions. A `systemd` unit file or `supervisor` configuration should be designed during Phase 1 to manage all three processes reliably.

## Sources

### Primary (HIGH confidence)
- [FastAPI Official Docs -- JWT Auth, SQL Databases, WebSockets, Release Notes](https://fastapi.tiangolo.com/) -- Stack recommendations, auth patterns, WebSocket architecture
- [React 19.2.4 + Vite 7.3.1 official releases](https://react.dev/versions, https://vite.dev/releases) -- Version compatibility
- [shadcn/ui v4 Changelog](https://ui.shadcn.com/docs/changelog) -- Component library compatibility with Tailwind v4
- [Google Sheets API Usage Limits](https://developers.google.com/workspace/sheets/api/limits) -- Rate limit constraints (60 req/min/user)
- [SQLite WAL Mode Documentation](https://sqlite.org/wal.html) -- Concurrent access patterns
- [Python asyncio Subprocess Documentation](https://docs.python.org/3/library/asyncio-subprocess.html) -- Subprocess management patterns
- Direct codebase analysis of all 37 LinkedinAutomation modules, run_scheduler.py, run_daily.py

### Secondary (MEDIUM confidence)
- [Zustand vs Jotai comparison](https://inhaq.com/blog/react-state-management-2026-redux-vs-zustand-vs-jotai.html) -- State management selection
- [Sonner vs react-hot-toast](https://knock.app/blog/the-top-notification-libraries-for-react) -- Toast notification selection
- [Real-time Dashboard with FastAPI and WebSockets (TestDriven.io)](https://testdriven.io/blog/fastapi-postgres-websockets/) -- Dashboard architecture patterns
- [Teal HQ](https://www.tealhq.com/), [Huntr](https://huntr.co), [Simplify](https://simplify.jobs/) -- Competitor feature analysis

### Tertiary (LOW confidence)
- None. All findings are backed by official documentation or direct codebase analysis.

---
*Research completed: 2026-03-09*
*Ready for roadmap: yes*
