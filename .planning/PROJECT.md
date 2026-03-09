# Anti-gravity Job Automation Dashboard

## What This Is

A web-based dashboard for managing an end-to-end LinkedIn job application automation system. Single-user interface deployed on a VPS, providing real-time visibility into job discovery, AI scoring, automated applications, and follow-up tracking. Wraps an existing 37-module Python automation pipeline with a polished, fully manageable web UI.

## Core Value

The user can monitor, control, and manage every step of their automated job search from a single web dashboard — without needing to SSH into the server, check Google Sheets, or interact through Telegram.

## Requirements

### Validated

<!-- Shipped and confirmed valuable — existing automation system. -->

- ✓ Multi-platform job search (LinkedIn, Indeed, Glassdoor, Dice, ZipRecruiter, SimplyHired, Monster, Built In) — existing
- ✓ AI job scoring with Claude/Ollama (0-100, A-F grades, 5 dimensions) — existing
- ✓ Resume tailoring with ATS keyword optimization — existing
- ✓ Cover letter generation (4-paragraph, strategic) — existing
- ✓ PDF generation (ATS-friendly, Navy/Gray styling) — existing
- ✓ LinkedIn Easy Apply automation — existing
- ✓ External ATS form filling (Workday, Greenhouse, Lever, iCIMS, Taleo) — existing
- ✓ Google Sheets logging (23-column tracker) — existing
- ✓ Google Drive PDF storage with shareable links — existing
- ✓ Telegram bot with approval cards and interactive Q&A — existing
- ✓ Follow-up tracking (7-day reminders) — existing
- ✓ Daily/weekly analytics reports — existing
- ✓ Anti-detection (human-like delays, UA rotation, stealth JS) — existing
- ✓ Scheduler (30-min cycles, daily caps, coffee breaks) — existing

### Active

<!-- Current scope — v1.0 web dashboard. -->

- [ ] Secure single-user login with persistent session
- [ ] Job status dashboard with filtering (pending/applied/failed/interview)
- [ ] Live Google Sheets data display with sorting and search
- [ ] Adjustable job filters and preferences via UI
- [ ] Intake form for unanswered application questions
- [ ] Real-time WebSocket notifications (job found, applied, errors)
- [ ] AI content generation UI (cover letters, resumes, follow-up emails)
- [ ] Follow-up scheduling and management
- [ ] Performance analytics dashboard (trends, success rates, charts)
- [ ] Automation control panel (start/stop/pause, configure cycles)

### Out of Scope

<!-- Explicit boundaries. -->

- Multi-user/multi-tenancy — Single user only, no registration system
- Mobile native app — Web-responsive is sufficient, accessed via Tailscale
- Payment/billing — Not a commercial SaaS, personal tool
- OAuth/social login — Simple password auth, single user
- Email service integration — Telegram notifications are sufficient

## Context

**Existing architecture:** Python automation pipeline (37 modules) with no web UI. All state in JSON files (.tmp/) + Google Sheets. Telegram bot provides mobile interaction. Scheduler runs 30-min cycles.

**Deployment target:** VPS (srv1389107 on Tailscale, 100.78.142.68, Linux). Automation already runs here or will be migrated.

**Access pattern:** Single user accesses via Tailscale from any device. Phone Connect (Node.js, port 3000) already runs for Antigravity editor access.

**Data flow:** Google Sheets is the source of truth for job data. SQLite stores user preferences, intake answers, and dashboard settings. The FastAPI backend bridges the React frontend to both the Google Sheets API and the automation pipeline.

## Constraints

- **Tech stack**: FastAPI (Python backend) + React/Vite (frontend) + SQLite (preferences) + Google Sheets (job data)
- **Single user**: No multi-tenancy complexity. Simple session-based auth.
- **Real-time**: WebSocket for live dashboard updates as automation runs.
- **Backward compatible**: Must not break existing automation pipeline. Dashboard wraps it, doesn't replace it.
- **Deployment**: VPS via Tailscale. No public internet exposure.
- **Existing integrations**: Google Sheets API, Google Drive API, Telegram Bot API, Claude/Ollama, Playwright must continue working.

## Current Milestone: v1.0 — Job Automation Dashboard

**Goal:** Build a complete web dashboard that provides full visibility and control over the automated job application pipeline.

**Target features:**
- Secure login + persistent preferences
- Real-time job status dashboard with WebSocket updates
- Google Sheets data display with live filtering
- Intake form for application questions
- AI content generation (resumes, cover letters, follow-ups)
- Analytics dashboard with charts and trends
- Full automation control panel

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| FastAPI + React/Vite | Python backend aligns with existing automation code; React provides rich dashboard components | — Pending |
| SQLite for preferences | Lightweight, no server needed, sufficient for single-user settings and intake answers | — Pending |
| Google Sheets stays as job tracker | Already integrated, 23-column schema works, avoid migration risk | — Pending |
| WebSocket for real-time | Instant feedback when jobs found/applied; better UX than polling | — Pending |
| Single-user, Tailscale-only | No public exposure reduces attack surface; Tailscale provides WireGuard encryption | — Pending |

---
*Last updated: 2026-03-09 after milestone v1.0 initialization*
