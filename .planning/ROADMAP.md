# Roadmap — v1.0 Job Automation Dashboard

## Phase Overview

| Phase | Name | Goal | Requirements |
|-------|------|------|-------------|
| 1 | Backend Foundation + Auth | Running FastAPI server with SQLite, JWT auth, health check, process architecture | FR-1 |
| 2 | Data Layer + Jobs Display | Google Sheets cache, jobs API, React frontend with job table and detail view | FR-2, FR-3 |
| 3 | Real-Time + Automation Control | WebSocket hub, event bus, subprocess automation control, live status feed | FR-4, FR-5 |
| 4 | Analytics + Follow-Ups | Stats summary, trend charts, follow-up management | FR-6, FR-7 |
| 5 | Settings + Intake Forms | Configuration panel, intake form editor, blocked companies | FR-8, FR-9 |
| 6 | AI Content + Error Management | Content regeneration, error log with retry, PDF download | FR-10, FR-11 |

---

## Phase 1: Backend Foundation + Auth

**Goal:** Establish the FastAPI server, SQLite database, JWT authentication, and process architecture that everything else depends on.

**Why first:** Every subsequent phase requires a running API server with auth. The three-process architecture (FastAPI, Telegram, Scheduler) must be defined early to prevent event loop conflicts — the #1 pitfall from research.

### Delivers
- FastAPI project structure in `dashboard/`
- SQLite database (`dashboard.db`) with Alembic migrations
- User model with Argon2-hashed password
- JWT auth: login endpoint, httpOnly cookie, 30-day remember-me refresh token
- Protected route middleware
- Health check endpoint (`/api/health`)
- CORS configuration for frontend dev server
- Project structure documentation

### Requirements Covered
- FR-1.1 through FR-1.5 (Authentication & Session)
- NFR-2.1 through NFR-2.6 (Security)
- NFR-4.2 (Process isolation — architecture defined)

### Success Criteria
- `POST /api/auth/login` returns JWT in httpOnly cookie
- `GET /api/health` returns 200 without auth
- All other endpoints return 401 without valid token
- SQLite database created with Alembic migration
- Password stored as Argon2 hash, never plaintext

### Pitfalls Addressed
- Pitfall 1: Event loop conflicts — process boundaries defined
- Pitfall 2: JSON race conditions — SQLite established as shared state
- Pitfall 3: Telegram conflict — separate process mandated

---

## Phase 2: Data Layer + Jobs Display

**Goal:** Cache Google Sheets data into SQLite and build the React frontend with a filterable job table and detail view.

**Why second:** The Sheets cache is the data foundation for every feature. Without it, the frontend has nothing to display. The 60-second sync eliminates API rate limit risk (Pitfall 4).

### Delivers
- SheetsService: background task syncing Sheets → SQLite every 60s
- Jobs SQLite table mirroring the 23-column Sheets schema
- REST API: `GET /api/jobs` (list with filter/sort/search/pagination)
- REST API: `GET /api/jobs/{id}` (detail with score breakdown)
- REST API: `POST /api/jobs/sync` (manual refresh trigger)
- React frontend scaffolded with Vite + shadcn/ui + Tailwind
- Login page
- Jobs table page with status filter chips, sort controls, search bar
- Job detail page with score visualization, skills match, resume/CL viewer
- Navigation layout (sidebar or top nav)

### Requirements Covered
- FR-2.1 through FR-2.8 (Job Status Dashboard)
- FR-3.1 through FR-3.4 (Google Sheets Data Layer)
- NFR-1.1 (< 500ms table load from SQLite)
- NFR-3.2 (Graceful Sheets API failure)

### Success Criteria
- Jobs table loads in < 500ms showing all jobs from Sheets
- Filter by status works (Applied, Failed, Pending, Interview, Skipped)
- Sort by score, date, company works
- Text search finds jobs by title/company/location
- Job detail shows 5-dimension score breakdown
- "Last synced" timestamp visible and updates every 60s
- Manual refresh button triggers immediate sync

### Pitfalls Addressed
- Pitfall 4: Sheets rate limiting — all reads from SQLite cache
- Pitfall 5: SQLite contention — WAL mode + async access

---

## Phase 3: Real-Time + Automation Control

**Goal:** Add WebSocket infrastructure for live updates and subprocess-based automation control (start/stop/pause).

**Why third:** Real-time status is what differentiates this dashboard from a static Sheets viewer. Automation control requires the WebSocket channel to provide feedback.

### Delivers
- WebSocket endpoint (`/ws`)
- ConnectionManager for client connections
- Event bus (asyncio.Queue-based pub/sub)
- AutomationController: manages scheduler as subprocess
- stdout streaming from subprocess → event bus → WebSocket
- React WebSocket hook with auto-reconnect (exponential backoff)
- Live status feed component ("Searching...", "Scored 85/100", "Applied to X")
- Start/Stop automation buttons
- Automation status indicator (running/stopped/idle)
- Toast notifications (Sonner) for key events
- Connection status indicator in header

### Requirements Covered
- FR-4.1 through FR-4.5 (Real-Time Updates)
- FR-5.1 through FR-5.5 (Automation Control)
- NFR-1.2 (< 200ms WebSocket latency)
- NFR-3.3 (Auto-reconnect)

### Success Criteria
- WebSocket connects on page load, reconnects on drop
- Starting automation shows real-time status messages
- Stop button kills the automation subprocess
- Cannot start a second automation while one is running
- Toast appears when a job is applied
- Connection indicator shows green/red based on WebSocket state

### Pitfalls Addressed
- Pitfall 1: Event loop — automation runs as subprocess, not in FastAPI's loop
- Pitfall 6: Memory — single-instance enforcement prevents concurrent Playwright

---

## Phase 4: Analytics + Follow-Ups

**Goal:** Add analytics dashboard with charts and follow-up reminder management.

**Why fourth:** Analytics compute over cached job data (Phase 2). Follow-ups read from the same cache. These complete the core feature set for a daily-driveable dashboard.

### Delivers
- REST API: `GET /api/analytics/summary` (today's stats)
- REST API: `GET /api/analytics/trends` (30-day time series)
- REST API: `GET /api/analytics/platforms` (platform breakdown)
- REST API: `GET /api/analytics/scores` (score distribution)
- REST API: `GET /api/follow-ups` (jobs needing follow-up)
- REST API: `POST /api/follow-ups/{id}/complete` (mark as followed-up)
- React analytics page with Recharts visualizations
- Today's summary cards (found, applied, avg score, follow-ups due)
- Applications over time line chart
- Score distribution histogram
- Platform breakdown pie/bar chart
- Follow-up reminders list with mark-as-done
- Follow-up count badge in navigation

### Requirements Covered
- FR-6.1 through FR-6.5 (Analytics & Reporting)
- FR-7.1 through FR-7.3 (Follow-Up Management)

### Success Criteria
- Analytics page shows today's stats matching Telegram daily report
- Line chart shows 30 days of application history
- Score distribution shows histogram of all scored jobs
- Platform breakdown shows count per source
- Follow-up list shows jobs 7+ days old with no response
- Marking a follow-up updates Google Sheets

---

## Phase 5: Settings + Intake Forms

**Goal:** Add configuration panel for automation settings and intake form editor for ATS answers.

**Why fifth:** Settings and intake are CRUD operations that depend on the foundation but not on real-time features. High value — eliminates need to SSH and edit .env/JSON files.

### Delivers
- Settings SQLite table (key-value pairs)
- REST API: `GET/PUT /api/settings` (read/update settings)
- REST API: `GET/PUT /api/intake` (read/update intake answers)
- REST API: `GET/PUT /api/intake/learned` (read/update learned answers)
- REST API: `GET /api/intake/unanswered` (surface unanswered questions)
- REST API: `GET/POST/DELETE /api/settings/blocked-companies`
- React settings page with form controls
- Score threshold slider
- Platform toggle switches
- Daily application cap input
- Blocked companies list with add/remove
- Intake form editor (tabular view of questions + answers)
- Unanswered questions highlighted for user input

### Requirements Covered
- FR-8.1 through FR-8.5 (Settings & Configuration)
- FR-9.1 through FR-9.4 (Intake Form Management)

### Success Criteria
- Changing score threshold in UI persists to SQLite
- Changed settings apply on next automation cycle
- Blocked companies list reflects in next search run
- Intake form shows all current answers, editable inline
- New answers for unanswered questions are saved
- Learned answers viewable and editable

---

## Phase 6: AI Content + Error Management

**Goal:** Add AI content regeneration, error log with retry, and polish features.

**Why last:** AI generation wraps existing stateless functions (Phase 2 detail view must exist). Error log builds on the event bus (Phase 3). These are power features that elevate the dashboard.

### Delivers
- ContentService: wraps tailor_resume, generate_cover_letter, generate_pdf via run_in_executor
- REST API: `POST /api/jobs/{id}/regenerate-resume`
- REST API: `POST /api/jobs/{id}/regenerate-cover-letter`
- REST API: `POST /api/jobs/{id}/generate-follow-up-email`
- REST API: `GET /api/jobs/{id}/content/{type}/pdf` (download PDF)
- REST API: `GET /api/errors` (failed applications)
- REST API: `POST /api/errors/{id}/retry`
- React content generation UI on job detail page
- "Regenerate Resume" and "Regenerate Cover Letter" buttons
- "Generate Follow-Up Email" button
- Content preview panel before saving
- PDF download button
- Error log page with error details
- Retry button per failed application
- Error count badge in navigation
- Dark mode toggle (CSS, persisted in SQLite)

### Requirements Covered
- FR-10.1 through FR-10.5 (AI Content Generation)
- FR-11.1 through FR-11.3 (Error Log & Retry)

### Success Criteria
- Clicking "Regenerate Resume" produces a new tailored resume using Claude/Ollama
- Content preview shows before saving/uploading
- PDF download works for resume and cover letter
- Error log shows all failed applications with timestamps and error messages
- Retry button re-triggers the application process
- Dark mode toggle persists across sessions

---

## Dependency Graph

```
Phase 1 (Auth + Backend)
    └── Phase 2 (Data Layer + Jobs)
            ├── Phase 3 (Real-Time + Control)
            │       └── Phase 6 (AI Content + Errors) [partial]
            ├── Phase 4 (Analytics + Follow-Ups)
            └── Phase 5 (Settings + Intake)
                    └── Phase 6 (AI Content + Errors) [partial]
```

Phases 4 and 5 are independent of each other and could run in parallel.
Phase 6 has minor dependencies on both Phase 3 (event bus for errors) and Phase 5 (settings for AI model config).

---

## Risk Register

| Risk | Impact | Mitigation | Phase |
|------|--------|------------|-------|
| Event loop conflicts (asyncio.run) | Server crash | Subprocess isolation for automation | 1, 3 |
| Google Sheets rate limits (60/min) | Data stale, API errors | SQLite cache with 60s sync | 2 |
| JSON file race conditions | Corrupted state | SQLite for shared state, atomic writes | 1 |
| Playwright memory leaks on VPS | OOM kill | Single-instance enforcement | 3 |
| SQLite write contention | Slow writes | WAL mode + busy_timeout | 1 |
| OAuth token expiry on headless VPS | Sheets sync breaks | Monitor + alert, consider service account | 2 |

---
*Created: 2026-03-09*
*Phases: 6*
*Estimated completion: Phases 1-4 deliver a daily-driveable dashboard*
