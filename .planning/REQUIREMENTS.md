# Requirements — v1.0 Job Automation Dashboard

## Overview

Web-based operations console for the existing 37-module LinkedIn job automation pipeline. Single-user, deployed on VPS behind Tailscale. FastAPI backend + React/Vite frontend + SQLite for preferences + Google Sheets as job data source of truth.

## Functional Requirements

### FR-1: Authentication & Session

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| FR-1.1 | Single-user password login with Argon2 hashing | P1 | 1 |
| FR-1.2 | JWT access token in httpOnly cookie (30-min expiry) | P1 | 1 |
| FR-1.3 | "Remember me" refresh token (30-day expiry) | P1 | 1 |
| FR-1.4 | Protected routes — all endpoints require auth except /login and /health | P1 | 1 |
| FR-1.5 | Logout endpoint that clears tokens | P1 | 1 |

### FR-2: Job Status Dashboard

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| FR-2.1 | Job list table showing all jobs from Google Sheets cache | P1 | 2 |
| FR-2.2 | Filter by status: Applied, Failed, Pending, Interview, Skipped | P1 | 2 |
| FR-2.3 | Sort by score, date, company, grade | P1 | 2 |
| FR-2.4 | Text search across title, company, location | P1 | 2 |
| FR-2.5 | Job detail view: score dimensions, matched/missing skills, Drive links | P1 | 2 |
| FR-2.6 | Score breakdown visualization (5-dimension bar/radar) | P1 | 2 |
| FR-2.7 | Inline resume and cover letter text viewer | P1 | 2 |
| FR-2.8 | Pagination (50 jobs per page) | P1 | 2 |

### FR-3: Google Sheets Data Layer

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| FR-3.1 | SheetsService: sync Google Sheets data to SQLite every 60 seconds | P1 | 2 |
| FR-3.2 | Manual "Refresh" button for immediate sync | P1 | 2 |
| FR-3.3 | Last-synced timestamp displayed in UI | P1 | 2 |
| FR-3.4 | Graceful handling of Sheets API failures (serve stale cache) | P1 | 2 |

### FR-4: Real-Time Updates

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| FR-4.1 | WebSocket connection from React to FastAPI | P1 | 3 |
| FR-4.2 | Live status feed: "Searching...", "Scored 85/100", "Applied to X" | P1 | 3 |
| FR-4.3 | Auto-reconnect on connection drop (exponential backoff) | P1 | 3 |
| FR-4.4 | Toast notifications for key events (job applied, error, cycle complete) | P1 | 3 |
| FR-4.5 | Connection status indicator in UI header | P1 | 3 |

### FR-5: Automation Control

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| FR-5.1 | Start automation cycle button | P1 | 3 |
| FR-5.2 | Stop/kill automation button | P1 | 3 |
| FR-5.3 | Automation status indicator (running/stopped/idle) | P1 | 3 |
| FR-5.4 | Single-instance enforcement (prevent concurrent runs) | P1 | 3 |
| FR-5.5 | Scheduler mode: enable/disable 30-min auto-cycles | P1 | 3 |

### FR-6: Analytics & Reporting

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| FR-6.1 | Today's summary: jobs found, applied, avg score, follow-ups due | P1 | 4 |
| FR-6.2 | Applications over time (line chart, last 30 days) | P1 | 4 |
| FR-6.3 | Score distribution (histogram) | P1 | 4 |
| FR-6.4 | Platform breakdown (LinkedIn vs Indeed vs Dice etc.) | P1 | 4 |
| FR-6.5 | Success rate trends (applied vs responded vs interview) | P1 | 4 |

### FR-7: Follow-Up Management

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| FR-7.1 | List jobs needing follow-up (7+ days, no response) | P1 | 4 |
| FR-7.2 | Mark as followed-up (updates Google Sheet) | P1 | 4 |
| FR-7.3 | Follow-up count badge in navigation | P1 | 4 |

### FR-8: Settings & Configuration

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| FR-8.1 | Edit MIN_SCORE_THRESHOLD from UI | P1 | 5 |
| FR-8.2 | Toggle search platforms (LinkedIn, Indeed, Glassdoor, etc.) | P1 | 5 |
| FR-8.3 | Set MAX_APPLICATIONS_PER_DAY | P1 | 5 |
| FR-8.4 | Manage blocked companies list (add/remove) | P1 | 5 |
| FR-8.5 | Settings persisted to SQLite, applied on next automation cycle | P1 | 5 |

### FR-9: Intake Form Management

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| FR-9.1 | View/edit intake_form.json answers through UI | P1 | 5 |
| FR-9.2 | View/edit learned_answers.json through UI | P1 | 5 |
| FR-9.3 | Surface unanswered ATS questions with input fields | P1 | 5 |
| FR-9.4 | New answers saved and available for next automation cycle | P1 | 5 |

### FR-10: AI Content Generation

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| FR-10.1 | Regenerate tailored resume for a specific job | P1 | 6 |
| FR-10.2 | Regenerate cover letter for a specific job | P1 | 6 |
| FR-10.3 | Generate follow-up email for a specific job | P1 | 6 |
| FR-10.4 | Preview generated content before saving | P1 | 6 |
| FR-10.5 | Download as PDF | P1 | 6 |

### FR-11: Error Log & Retry

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| FR-11.1 | Display failed applications with error details | P1 | 6 |
| FR-11.2 | Retry button to re-attempt failed application | P1 | 6 |
| FR-11.3 | Error count badge in navigation | P1 | 6 |

## Non-Functional Requirements

### NFR-1: Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1.1 | Job table load time | < 500ms from SQLite cache |
| NFR-1.2 | WebSocket event latency | < 200ms from event to UI update |
| NFR-1.3 | Google Sheets sync | Every 60 seconds, < 5s per sync |
| NFR-1.4 | Frontend bundle size | < 500KB gzipped |

### NFR-2: Security

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-2.1 | Tailscale-only access (no public internet exposure) | Enforced by network |
| NFR-2.2 | Argon2 password hashing | pwdlib[argon2] |
| NFR-2.3 | httpOnly, Secure, SameSite cookies for JWT | Prevents XSS token theft |
| NFR-2.4 | No secrets in frontend bundle | All API keys server-side only |
| NFR-2.5 | Input validation on all API endpoints | Pydantic models |
| NFR-2.6 | CORS restricted to frontend origin | FastAPI CORS middleware |

### NFR-3: Reliability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-3.1 | Dashboard available even when automation is stopped | Always |
| NFR-3.2 | Sheets API failure degrades gracefully (serve stale cache) | Always |
| NFR-3.3 | WebSocket auto-reconnect on drop | Exponential backoff, max 30s |
| NFR-3.4 | SQLite WAL mode for concurrent access | Enabled at init |

### NFR-4: Deployment

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-4.1 | VPS deployment (srv1389107 on Tailscale) | Linux |
| NFR-4.2 | Three independent processes (FastAPI, Telegram bot, Scheduler) | Process isolation |
| NFR-4.3 | Process management via systemd or supervisor | Reliable restart |
| NFR-4.4 | Single `dashboard.db` SQLite file | Portable, backup-friendly |

## Technical Constraints

1. **Existing automation untouched** — Dashboard wraps the pipeline, never modifies `LinkedinAutomation/` modules or `run_daily.py`
2. **Google Sheets remains source of truth** — SQLite is a read cache; writes go through Sheets API
3. **Three separate processes** — FastAPI, Telegram bot, and scheduler cannot share an event loop (all use `asyncio.run()`)
4. **Subprocess isolation for automation** — Scheduler runs as child process via `asyncio.create_subprocess_exec`
5. **Direct import for AI functions only** — `tailor_resume.tailor()`, `generate_cover_letter.generate()`, `score_job.score()` are stateless and safe to call via `run_in_executor`
6. **SQLite WAL mode** — Required for concurrent reads from API + writes from Sheets sync
7. **No public internet exposure** — Tailscale VPN only, no need for rate limiting or DDoS protection

## Stack

### Backend (additions to requirements.txt)
- FastAPI >=0.135.1
- SQLModel >=0.0.37
- uvicorn >=0.41.0
- aiosqlite >=0.21.0
- PyJWT >=2.9.0
- pwdlib[argon2] >=0.2.0
- Alembic >=1.14.0

### Frontend (new npm project in dashboard/frontend/)
- React >=19.2
- Vite >=7.3
- TypeScript >=5.7
- shadcn/ui v4 + Tailwind CSS >=4.2
- TanStack Query >=5.90
- Recharts >=3.8
- Zustand >=5.0

## Success Criteria

The dashboard is successful when:
1. User can log in, see all jobs with filtering, and view job details — without opening Google Sheets
2. User can watch automation run in real-time via WebSocket — without SSH or Telegram
3. User can start/stop automation from the UI — without touching the command line
4. User can see analytics and trends — without running report scripts manually
5. User can manage settings and intake answers — without editing .env or JSON files
6. User can regenerate AI content — without running Python scripts

---
*Defined: 2026-03-09*
*Source: Research in .planning/research/ (STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md, SUMMARY.md)*
