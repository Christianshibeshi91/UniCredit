# Feature Research

**Domain:** Single-user job automation dashboard (web UI wrapping existing Python pipeline)
**Researched:** 2026-03-09
**Confidence:** HIGH

## Feature Landscape

This dashboard is not a typical job tracker (Teal, Huntr, Simplify). Those products help users manually save jobs and track status. This system already automates discovery, scoring, tailoring, and application -- the dashboard surfaces and controls an existing 37-module pipeline. That distinction drives every feature decision below.

### Table Stakes (Users Expect These)

Features that make the dashboard worth opening instead of checking Google Sheets or Telegram.

| Feature | Why Expected | Complexity | Existing Module Dependency |
|---------|--------------|------------|---------------------------|
| **Job list with status filtering** | Core reason to open the dashboard. Must show all jobs from Google Sheets with filter by status (Applied, Failed, Pending, Interview, etc.) | MEDIUM | `log_to_sheets.py` (23-column schema), `setup_google_sheet.py` (HEADERS constant) |
| **Job detail view** | Clicking a job must show score breakdown (5 dimensions), matched/missing skills, tailored resume, cover letter, Drive links, connection info | LOW | Score JSON files in `.tmp/score_*.json`, resume/CL files in `.tmp/` |
| **Real-time automation status** | User must see "Searching...", "Scoring job 3/7...", "Applied to X" without refreshing. Without this, the dashboard adds no value over Google Sheets | HIGH | `alert_user.py` (must emit WebSocket events), `run_daily.py` (pipeline steps) |
| **Automation start/stop/pause** | Dashboard must control the scheduler. Start a cycle, pause mid-run, stop for the day | MEDIUM | `run_scheduler.py` (subprocess-based, needs process management) |
| **Score breakdown visualization** | Show the 5-dimension radar/bar: Technical Fit (0-40), Enterprise Alignment (0-20), Compensation (0-15), Leadership (0-15), Remote (0-10) | LOW | `score_job.py` (dimension_scores dict) |
| **Secure login** | Single-user password auth with persistent session. VPS is Tailscale-only but auth still needed | LOW | None (new; single-user, no OAuth needed) |
| **Basic analytics summary** | Today's stats: jobs found, applied, avg score, follow-ups due. Mirrors the Telegram daily report | MEDIUM | `generate_daily_report.py` (_compute_stats function) |
| **Follow-up reminders list** | Show which applications need follow-up (7+ days with no response), mark as followed-up | LOW | `follow_up_tracker.py` (_find_due_follow_ups reads Sheet1!A:W) |
| **Search/sort on job table** | Text search across title, company, location. Sort by score, date, grade, status | LOW | Google Sheets data (all columns available) |
| **Resume and cover letter viewer** | View the tailored resume and cover letter for each job inline, with link to Drive PDF | LOW | `.tmp/resume_*.txt`, `.tmp/cl_*.txt`, Drive links in Sheets |

### Differentiators (Competitive Advantage)

Features that make this dashboard genuinely better than Sheets + Telegram.

| Feature | Value Proposition | Complexity | Existing Module Dependency |
|---------|-------------------|------------|---------------------------|
| **Live pipeline visualization** | Show the automation pipeline as a visual flow: Search -> Dedup -> Score -> Tailor -> Apply. Each step lights up in real-time as the automation runs. No competitor has this because no competitor automates the full pipeline. | HIGH | `run_daily.py` (step sequence), `alert_user.py` (events) |
| **Intake form management** | Edit intake_form.json and learned_answers.json through the UI. When automation hits an unknown ATS question, dashboard shows it with a form field instead of blocking Telegram | MEDIUM | `candidate/intake_form.json`, `candidate/learned_answers.json`, `apply_external_form.py` (ask_callback mechanism) |
| **AI content regeneration** | "Regenerate resume" / "Regenerate cover letter" buttons on a job detail page. Lets user tweak and re-generate without touching CLI | MEDIUM | `tailor_resume.py` (tailor function), `generate_cover_letter.py` (generate function), `generate_pdf.py` |
| **Score threshold and filter tuning** | Adjust MIN_SCORE_THRESHOLD, SEARCH_PLATFORMS, MAX_APPLICATIONS_PER_DAY, BLOCKED_COMPANIES from the UI instead of editing .env | MEDIUM | `.env` file, `run_daily.py` (reads env vars) |
| **Interview prep hub** | When a job status changes to "Interview", display the AI-generated STAR answers, company research, and prep materials in a dedicated section | MEDIUM | `interview_prep.py` (generate_prep function, prep files in .tmp/) |
| **Analytics charts with trends** | Weekly trends: applications over time, score distribution, success rate by platform (LinkedIn vs Indeed vs Dice), skill gap frequency chart | MEDIUM | `generate_weekly_report.py` (compute metrics), `generate_daily_report.py` (stats + trends) |
| **Error log and retry** | When an application fails (Easy Apply timeout, ATS form stuck), show the error with a "Retry" button instead of just logging to scheduler.log | MEDIUM | `run_state.json` (errors array), `.tmp/scheduler.log` |
| **Blocked company management** | Add/remove companies from the BLOCKED_COMPANIES list through the UI | LOW | `run_daily.py` (BLOCKED_COMPANIES list, currently hardcoded) |
| **Dark mode** | Single-user personal tool used at all hours. Dark mode is table stakes for personal dashboards in 2026 | LOW | None (frontend only, CSS) |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for this specific project.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Multi-user support** | "What if my friend wants to use it?" | Massively increases complexity (auth, data isolation, profile management). This is a personal tool on a private Tailscale network. Multi-user = different product. | Keep single-user. If someone else wants it, they fork and deploy their own instance. |
| **Kanban board for job status** | Every competitor (Huntr, Teal, JobTracker) has one | Kanban makes sense for manually-tracked jobs where the user drags cards. This system auto-applies -- jobs move through stages automatically. Kanban adds drag-drop complexity for a workflow the user does not manually manage. | Filterable table with status badges. Status is set by automation, not dragged by user. |
| **Chrome extension for saving jobs** | Teal and Huntr use this as primary input | The system already discovers jobs automatically from 8 platforms. Manual saving defeats the purpose of automation. Adding a Chrome extension is a second codebase with its own deployment. | If user finds a manual job, provide a "Add Job URL" input on the dashboard that feeds it to the scoring pipeline. |
| **Email integration (Gmail inbox parsing)** | "Parse recruiter emails for status updates" | Requires Gmail OAuth, complex email parsing, false positive risk. Scope creep that solves a different problem. | Manual status update on the dashboard, or a Telegram command. |
| **Mobile native app** | "I check my phone more than laptop" | Separate codebase (React Native/Flutter), app store deployment, maintenance burden. Tailscale access from phone already works. | Responsive web design. The dashboard is already accessible via phone browser over Tailscale. |
| **Real-time everything (live Google Sheets sync)** | "Dashboard should always show latest Sheet data" | Google Sheets API has rate limits (60 requests/min per user). Polling every second will hit limits. Full sync on every page load is expensive. | Cache Sheet data on backend with 2-5 minute refresh interval. Manual "Refresh" button for immediate sync. WebSocket pushes updates only when automation actually runs. |
| **Notifications via email/SMS** | "What if Telegram is down?" | Adding SendGrid/Twilio is scope creep. Telegram works, is already built, and the user monitors it. | Keep Telegram as the notification channel. Dashboard shows the same info in the web UI. |
| **Resume template editor** | "Let me edit the PDF template in the browser" | PDF generation uses ReportLab with specific ATS formatting. A WYSIWYG editor for PDFs is enormously complex and fragile. | Show a preview of the generated PDF. Allow re-generation with different parameters. Edit the source text, not the template. |
| **Job recommendation engine** | "Suggest jobs I should apply to" | The system already scores every discovered job 0-100 with 5 dimensions. A separate recommendation engine duplicates the scoring module. | Show jobs sorted by score. The score IS the recommendation. |
| **Undo/rollback for applications** | "Oops, I applied to the wrong job" | You cannot un-apply to a job. Once submitted on LinkedIn/Workday, it is done. | Add a confirmation step before auto-apply (the Telegram approval flow already does this). Port approval flow to dashboard. |

## Feature Dependencies

```
[Secure Login]
    +-- all other features require auth

[Google Sheets Data Layer]
    +-- [Job List with Filtering]
    |       +-- [Job Detail View]
    |       |       +-- [Score Breakdown Visualization]
    |       |       +-- [Resume/Cover Letter Viewer]
    |       |       +-- [AI Content Regeneration]
    |       +-- [Search/Sort]
    |       +-- [Follow-up Reminders List]
    +-- [Basic Analytics Summary]
    |       +-- [Analytics Charts with Trends]
    +-- [Interview Prep Hub]

[WebSocket Infrastructure]
    +-- [Real-time Automation Status]
    |       +-- [Live Pipeline Visualization]
    +-- [Intake Form Management] (question prompts push via WS)
    +-- [Error Log and Retry]

[Automation Control Panel]
    +-- [Start/Stop/Pause]
    +-- [Score Threshold and Filter Tuning]
    +-- [Blocked Company Management]

[Intake Form Management]
    +-- requires: [WebSocket Infrastructure]
    +-- requires: [Job Detail View]
```

### Dependency Notes

- **Everything requires Secure Login:** No feature is accessible without authentication. Build it first.
- **Google Sheets Data Layer is the foundation:** The existing 23-column schema is the source of truth. The backend must read and cache this data before any job-related feature works. This is the single most critical dependency.
- **WebSocket Infrastructure enables real-time features:** Without WebSocket, the dashboard is just a static Sheets viewer. The real-time pipeline status, intake form prompts, and error notifications all depend on bidirectional communication.
- **Analytics depends on the data layer:** Charts and trends compute over the same Sheet data. Build the data layer first, analytics second.
- **AI Content Regeneration requires Job Detail View:** You regenerate a resume/cover letter from the job detail page. The detail view must exist first.
- **Live Pipeline Visualization enhances Real-time Status:** The pipeline view is a visual upgrade to the text-based status feed. Build the status feed first, then add the visual flow.

## MVP Definition

### Launch With (v1.0)

The minimum set that makes the dashboard worth using instead of Google Sheets + Telegram.

- [ ] **Secure login** -- Gate everything behind a password. Single-user, session-based.
- [ ] **Job list table with status filtering** -- Show all jobs from Sheets, filterable by status (Applied, Failed, Pending, Interview). Sortable by score, date, company.
- [ ] **Job detail view** -- Click a job to see score dimensions, matched/missing skills, resume text, cover letter text, Drive links.
- [ ] **Real-time automation status** -- WebSocket feed showing what the automation is doing right now. "Searching Indeed...", "Scored 85/100", "Applied to Contoso".
- [ ] **Automation start/stop** -- Button to trigger a cycle, button to stop the scheduler.
- [ ] **Basic analytics** -- Today's numbers: jobs found, applied, avg score, follow-ups due.
- [ ] **Follow-up reminders** -- List of jobs needing follow-up with mark-as-done button.

### Add After Validation (v1.x)

Features to add once the core dashboard is stable and daily-driveable.

- [ ] **Intake form management** -- Edit intake_form.json answers through UI. Surface unanswered ATS questions.
- [ ] **Score threshold and filter tuning** -- Adjust MIN_SCORE_THRESHOLD, SEARCH_PLATFORMS, MAX_APPLICATIONS_PER_DAY from UI.
- [ ] **AI content regeneration** -- Regenerate resume/cover letter from job detail page.
- [ ] **Analytics charts with trends** -- Line charts for applications over time, score distributions, platform breakdown.
- [ ] **Error log with retry** -- Show failed applications with error details and retry button.
- [ ] **Blocked company management** -- Add/remove companies from block list via UI.
- [ ] **Interview prep hub** -- Display AI-generated STAR answers and prep materials when status = Interview.
- [ ] **Dark mode** -- CSS toggle, persist preference in SQLite.

### Future Consideration (v2+)

Features to defer until v1.x is mature.

- [ ] **Live pipeline visualization** -- Animated step-by-step flow diagram. High visual impact but HIGH complexity. Defer until the WebSocket event system is stable.
- [ ] **Manual job URL input** -- "Add a job URL" field that runs it through the scoring/tailoring pipeline. Useful but requires careful integration with the existing dedup and Sheets logging.
- [ ] **Profile editor** -- Edit candidate/profile.json through the UI. Risky because a bad edit breaks scoring for all subsequent jobs.
- [ ] **Telegram bridge** -- Show Telegram conversation in the dashboard. Low value since user already has Telegram open.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Secure login | HIGH | LOW | P1 |
| Job list with status filtering | HIGH | MEDIUM | P1 |
| Job detail view | HIGH | LOW | P1 |
| Real-time automation status (WS) | HIGH | HIGH | P1 |
| Automation start/stop | HIGH | MEDIUM | P1 |
| Basic analytics summary | MEDIUM | MEDIUM | P1 |
| Follow-up reminders list | MEDIUM | LOW | P1 |
| Search/sort on job table | MEDIUM | LOW | P1 |
| Resume/cover letter viewer | MEDIUM | LOW | P1 |
| Score breakdown visualization | MEDIUM | LOW | P1 |
| Intake form management | HIGH | MEDIUM | P2 |
| Score/filter tuning | HIGH | MEDIUM | P2 |
| AI content regeneration | MEDIUM | MEDIUM | P2 |
| Analytics charts with trends | MEDIUM | MEDIUM | P2 |
| Error log with retry | MEDIUM | MEDIUM | P2 |
| Blocked company management | LOW | LOW | P2 |
| Interview prep hub | MEDIUM | MEDIUM | P2 |
| Dark mode | LOW | LOW | P2 |
| Live pipeline visualization | MEDIUM | HIGH | P3 |
| Manual job URL input | LOW | MEDIUM | P3 |
| Profile editor | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch -- these 10 features make the dashboard a usable replacement for Sheets+Telegram
- P2: Should have, add in v1.x -- these 8 features elevate the dashboard from functional to powerful
- P3: Nice to have, future consideration -- these are polish/expansion features

## Competitor Feature Analysis

| Feature | Teal HQ | Huntr | Simplify | JobSync (OSS) | This Dashboard |
|---------|---------|-------|----------|---------------|----------------|
| Job discovery | Manual (Chrome ext) | Manual (Chrome ext) | Manual (Chrome ext) | Manual | **Automated (8 platforms)** |
| AI scoring | No | No | No | Yes (basic) | **Yes (5-dimension, Claude/Ollama)** |
| Resume tailoring | Yes (AI rewrite) | No | Yes (autofill) | Yes (AI review) | **Yes (full ATS-optimized rewrite)** |
| Cover letter gen | Yes | No | No | No | **Yes (4-paragraph strategic)** |
| Auto-apply | No | No | Yes (autofill) | No | **Yes (Easy Apply + ATS forms)** |
| Status tracking | Kanban board | Kanban board | List view | Kanban board | Filterable table (status is automated) |
| Analytics | Basic stats | Job metrics | No | Activity dashboard | Charts + trends + platform breakdown |
| Follow-up reminders | Yes (manual) | Yes (manual) | No | Yes (manual) | **Automated (7-day triggers)** |
| Interview prep | No | No | No | No | **AI-generated STAR answers + research** |
| Real-time pipeline | No | No | No | No | **WebSocket live status** |
| Self-hosted | No (SaaS) | No (SaaS) | No (SaaS) | Yes | **Yes (VPS + Tailscale)** |
| Multi-platform search | No | No | No | No | **Yes (LinkedIn, Indeed, Glassdoor, Dice, etc.)** |

The key differentiator: competitors are manual trackers with some AI. This is an automated pipeline with a monitoring dashboard. The dashboard is an ops console, not a to-do list.

## Sources

- [Teal HQ Job Tracker](https://www.tealhq.com/tools/job-tracker) -- Feature set and UX patterns
- [Huntr Job Tracker](https://huntr.co) -- Kanban-style tracking, analytics approach
- [Simplify Job Tracker](https://simplify.jobs/job-application-tracker) -- Auto-apply features, list view
- [JobSync (open source)](https://github.com/Gsync/jobsync) -- Self-hosted reference with AI matching
- [Teal Dashboard Documentation](https://help.tealhq.com/en/articles/9524944-exploring-the-dashboard) -- Dashboard grid layout patterns
- [Track Job Applications in 2026](https://pitchmeai.com/blog/track-job-applications-like-a-pro) -- Industry overview of tracking tools
- [CareerSwift Top 10 Job Search Automation Tools 2026](https://careerswift.ai/blog/top-10-job-search-automation-tools-in-2026-tested-on-real-applications) -- Automation tool landscape
- [FastAPI + WebSockets for Real-Time Dashboards](https://testdriven.io/blog/fastapi-postgres-websockets/) -- WebSocket implementation patterns
- [WebSocket/SSE with FastAPI](https://blog.greeden.me/en/2025/10/28/weaponizing-real-time-websocket-sse-notifications-with-fastapi-connection-management-rooms-reconnection-scale-out-and-observability/) -- Connection management and rooms

---
*Feature research for: Anti-gravity Job Automation Dashboard*
*Researched: 2026-03-09*
