# Stack Research

**Domain:** Web dashboard for Python automation system (single-user, VPS-deployed)
**Researched:** 2026-03-09
**Confidence:** HIGH

## Recommended Stack

This covers ONLY the new additions needed for the web dashboard. Existing Python automation stack (Playwright, Anthropic, Google APIs, Telegram, schedule, etc.) is validated and unchanged.

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| FastAPI | >=0.135.1 | Python backend API + WebSocket server | Same language as existing automation (37 Python modules). Native WebSocket support, async-first, Pydantic validation built-in. Created by same author as SQLModel. 2x JSON response performance in recent releases via Rust-backed Pydantic serialization. |
| React | >=19.2.4 | Frontend SPA for dashboard UI | Rich component ecosystem for dashboards. React 19 brings improved Suspense, Server Components readiness, and better concurrent rendering. Vite makes DX excellent. |
| Vite | >=7.3.1 | Frontend build tool + dev server | 5x faster builds than webpack, instant HMR. De facto React build tool in 2026 (CRA is dead). Vite 7 is stable; avoid Vite 8 beta (Rolldown bundler not production-ready). |
| TypeScript | >=5.7 | Type safety for frontend | Catches integration bugs between API types and UI. Use TS 5.x stable, not TS 6 RC or TS 7 native preview. |
| SQLModel | >=0.0.37 | ORM for SQLite (user preferences, intake answers, dashboard settings) | Created by FastAPI author -- models are simultaneously Pydantic models and SQLAlchemy models. Zero code duplication between DB schema and API validation. Perfect for FastAPI. |
| SQLite | (bundled with Python) | Local database for preferences/settings | No server process needed. Single file. Perfect for single-user VPS. Already supported by Python stdlib. |
| Tailwind CSS | >=4.2.0 | Utility-first styling | Required by shadcn/ui. 5x faster builds in v4. No custom CSS maintenance burden for a dashboard. |
| shadcn/ui | v4 (CLI) | UI component library | Copy-paste components you own (not a dependency). Includes Table, Card, Dialog, Form, Sheet, Tabs, Charts -- exactly what a dashboard needs. Default in React+Vite ecosystem. Tailwind-native. |

### Backend Libraries (Python -- add to requirements.txt)

| Library | Version | Purpose | Why This One |
|---------|---------|---------|--------------|
| uvicorn | >=0.41.0 | ASGI server for FastAPI | Lightning-fast ASGI server. HTTP/1.1 + WebSocket support. Production-ready with `--workers` for scaling. |
| pyjwt | >=2.9.0 | JWT token creation/verification | FastAPI's current official recommendation (replaced python-jose, which is abandoned). Lightweight, actively maintained. |
| pwdlib[argon2] | >=0.2.0 | Password hashing | FastAPI's current official recommendation (replaced passlib). Argon2 is memory-hard, resistant to GPU attacks. Modern replacement for bcrypt. |
| aiosqlite | >=0.21.0 | Async SQLite driver | Required for async FastAPI + SQLite. Runs SQLite operations in a background thread so they don't block the event loop. Used under the hood by SQLModel with async engines. |
| websockets | >=14.0 | WebSocket protocol support | Required by uvicorn for WebSocket connections. FastAPI's WebSocket support depends on this. |
| python-multipart | >=0.0.18 | Form data parsing | Required by FastAPI for OAuth2 password flow (login form). Not optional -- form-based auth needs it. |
| alembic | >=1.14.0 | Database migrations | Production-grade schema migration for SQLite. FastAPI docs explicitly recommend it over `create_all()` for production. Essential when schema evolves. |

### Frontend Libraries (npm)

| Library | Version | Purpose | Why This One |
|---------|---------|---------|--------------|
| @tanstack/react-query | >=5.90.0 | Server state management + caching | De facto standard for API data fetching in React. Auto-caching, background refetch, optimistic updates. Eliminates manual loading/error state management. |
| recharts | >=3.8.0 | Analytics charts (line, bar, area, pie) | React-native SVG charting. Composable components (not config objects). shadcn/ui has built-in Recharts wrappers. Perfect for dashboard datasets (<10K points). |
| zustand | >=5.0.0 | Client-side state (WebSocket connection state, UI preferences) | 1.16KB gzipped. No providers, no boilerplate. Perfect for global state like "is automation running" or "WebSocket connected". Overkill to use Redux for a single-user dashboard. |
| sonner | >=2.0.0 | Toast notifications | 2-3KB, zero dependencies. Default toast in shadcn/ui. Trigger from anywhere without hooks. Shows WebSocket events as toasts ("Job found!", "Application sent!"). |
| lucide-react | >=0.577.0 | Icons | Tree-shakeable SVG icons. Default icon set for shadcn/ui. Only icons you import get bundled. |
| react-router-dom | >=7.0.0 | Client-side routing | Standard React router. Needed for dashboard pages: /jobs, /analytics, /settings, /intake, /control. |
| date-fns | >=4.0.0 | Date formatting/manipulation | Lightweight, tree-shakeable. Format "applied 3 hours ago", parse Google Sheets date strings. No Moment.js (dead, 300KB). |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vite dev server | Frontend HMR + dev proxy | Proxy `/api/*` to FastAPI during development. Configure in `vite.config.ts`. |
| ESLint + typescript-eslint | Code quality | Use flat config (eslint.config.js). Catch type errors and unused imports. |
| Prettier | Code formatting | Consistent frontend code style. Integrates with Tailwind class sorting via `prettier-plugin-tailwindcss`. |

## Installation

### Backend (add to existing requirements.txt)

```bash
# Core web framework
pip install "fastapi>=0.135.1" "uvicorn[standard]>=0.41.0" "sqlmodel>=0.0.37"

# Auth
pip install "pyjwt>=2.9.0" "pwdlib[argon2]>=0.2.0" "python-multipart>=0.0.18"

# Async SQLite
pip install "aiosqlite>=0.21.0"

# Database migrations
pip install "alembic>=1.14.0"

# WebSocket support (pulled by uvicorn[standard], but explicit is better)
pip install "websockets>=14.0"
```

### Frontend (new package.json in dashboard/ directory)

```bash
# Scaffold project
npm create vite@latest dashboard -- --template react-ts
cd dashboard

# UI framework
npx shadcn@latest init

# Core libraries
npm install @tanstack/react-query recharts zustand sonner lucide-react react-router-dom date-fns

# Dev dependencies
npm install -D @types/react @types/react-dom typescript eslint prettier prettier-plugin-tailwindcss
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| FastAPI | Flask | Never for this project. Flask lacks native async, WebSocket support, and Pydantic integration. FastAPI is strictly superior for a dashboard backend. |
| SQLModel | Raw SQLAlchemy | If you need complex query patterns (multi-table joins, advanced ORM features). SQLModel covers 95% of what this single-user dashboard needs with less code. |
| SQLModel | Tortoise-ORM | If you want Django-style ORM. But SQLModel is by the FastAPI author and shares Pydantic models -- zero friction. |
| Recharts | Chart.js (react-chartjs-2) | If datasets exceed 10K points and you need Canvas rendering performance. For this dashboard (hundreds of job applications), SVG-based Recharts is cleaner and more React-idiomatic. |
| Recharts | Nivo | If you need more exotic chart types (treemaps, chord diagrams). Recharts covers line/bar/area/pie which is all a job analytics dashboard needs. |
| Zustand | Jotai | If you need atomic state with React Suspense integration. Zustand's store-based model is simpler for global flags like "automation running" or "websocket connected". |
| Zustand | Redux Toolkit | Never for a single-user dashboard. Redux is for teams coordinating on complex shared state. Zustand does the same with 90% less boilerplate. |
| shadcn/ui | MUI (Material UI) | If you want Material Design aesthetic. MUI is heavier (97KB+ vs shadcn's zero-runtime) and harder to customize. shadcn gives you the source -- total control. |
| shadcn/ui | Ant Design | If building a Chinese-market enterprise app. Ant Design is opinionated, heavy, and hard to customize outside its design system. |
| Sonner | react-hot-toast | If you need a headless toast API (useToaster hook). Sonner is simpler and is shadcn/ui's default. |
| PyJWT | python-jose | Never. python-jose is abandoned (no releases in 3+ years). FastAPI docs officially switched to PyJWT. |
| pwdlib[argon2] | passlib[bcrypt] | Never for new projects. passlib is unmaintained, depends on deprecated `crypt` module (removed in Python 3.13). pwdlib is the direct replacement. |
| Vite 7 | Vite 8 beta | Never yet. Vite 8 uses Rolldown bundler which is not production-stable. Stick with Vite 7 until Vite 8 reaches stable. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| python-jose | Abandoned, last release 3+ years ago, security risk | PyJWT (FastAPI's official recommendation) |
| passlib | Unmaintained, relies on deprecated crypt module | pwdlib[argon2] |
| Create React App (CRA) | Dead project, no longer maintained, extremely slow builds | Vite |
| Moment.js | Deprecated by its own authors, 300KB bundle | date-fns (tree-shakeable, modular) |
| Redux | Massive boilerplate for a single-user dashboard | Zustand (1.16KB, no providers) |
| Django REST Framework | Would require rewriting the entire automation pipeline | FastAPI (same Python, async-native) |
| Flask + SocketIO | Flask-SocketIO has compatibility issues with async code | FastAPI native WebSocket |
| Next.js / Remix | SSR frameworks -- unnecessary overhead for a SPA dashboard accessed via Tailscale | Vite + React (SPA) |
| MongoDB / PostgreSQL | Overkill for single-user preferences. Adds a server process dependency. | SQLite via SQLModel (single file, zero config) |
| Axios | Adds unnecessary dependency when fetch() API is built into all modern browsers | Native fetch() + TanStack Query |
| Vite 8 beta | Uses experimental Rolldown bundler, not production-ready | Vite 7.3.x |

## Architecture: How New Stack Integrates with Existing Code

### Backend Integration Pattern

The FastAPI backend wraps existing Python modules -- it does NOT replace them.

```
Existing Pipeline (unchanged):
  run_scheduler.py -> run_daily.py -> LinkedinAutomation/*.py

New Dashboard Layer:
  dashboard_api/
    main.py          (FastAPI app, mounts routes + WebSocket)
    routes/
      jobs.py        (GET/filter jobs via Google Sheets API)
      analytics.py   (aggregate job data for charts)
      settings.py    (CRUD user preferences via SQLModel)
      intake.py      (intake form answers via SQLModel)
      automation.py  (start/stop/pause scheduler)
      auth.py        (login/logout, JWT tokens)
    ws/
      events.py      (WebSocket manager, broadcast job events)
    models/
      preferences.py (SQLModel tables for settings, intake answers)
    services/
      sheets.py      (wraps existing log_to_sheets.py, setup_google_sheet.py)
      scheduler.py   (wraps existing run_scheduler.py control)
```

### Key Integration Points

1. **Google Sheets data**: Reuse `LinkedinAutomation.setup_google_sheet.get_sheets_service()` and read the same spreadsheet. Dashboard reads; automation writes.

2. **Scheduler control**: The existing `run_scheduler.py` uses the `schedule` library in a while-loop. The dashboard backend can manage it as a subprocess or refactor to use FastAPI's lifespan events.

3. **WebSocket bridge**: When the automation pipeline calls `log_to_sheets.log_job()` or `alert_user.alert()`, the dashboard backend intercepts these events and broadcasts them over WebSocket to the React frontend.

4. **Shared .env**: Both the automation pipeline and the dashboard backend read from the same `.env` file. Dashboard adds: `DASHBOARD_SECRET_KEY`, `DASHBOARD_PASSWORD_HASH`, `DASHBOARD_DB_PATH`.

### Frontend Structure

```
dashboard/
  src/
    components/     (shadcn/ui components + custom dashboard widgets)
    pages/          (Jobs, Analytics, Settings, Intake, Control)
    hooks/          (useWebSocket, useJobs, useAnalytics)
    stores/         (Zustand stores: automation state, ws connection)
    lib/            (API client using fetch + TanStack Query)
    types/          (TypeScript interfaces matching FastAPI Pydantic models)
  public/
  vite.config.ts    (proxy /api/* to FastAPI in dev)
```

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| FastAPI >=0.135.1 | Python >=3.10 | Dropped Python 3.8 support. The project uses Python 3.12, so fully compatible. |
| SQLModel >=0.0.37 | FastAPI >=0.103.2 | Maintained by same author. Pydantic v2 compatible. |
| SQLModel >=0.0.37 | aiosqlite >=0.21.0 | Use `sqlite+aiosqlite:///./dashboard.db` connection string for async. |
| React >=19.2.4 | Vite >=7.3.1 | Use `@vitejs/plugin-react` (not `plugin-react-swc` which may lag on React 19). |
| shadcn/ui v4 | Tailwind CSS >=4.0 | v4 CLI auto-configures Tailwind. Requires Tailwind v4+. |
| shadcn/ui v4 | React >=19.0 | Fully compatible. Uses Radix UI primitives under the hood. |
| Recharts >=3.8.0 | React >=18.0 | Recharts 3.x supports React 18 and 19. |
| TanStack Query >=5.90.0 | React >=18.0 | v5 is the current stable line for React. v6 is Svelte-only. |
| uvicorn >=0.41.0 | Python >=3.10 | Requires websockets package for WebSocket protocol support. |
| pwdlib[argon2] | Python >=3.9 | Replaces passlib. No conflict with existing dependencies. |
| PyJWT >=2.9.0 | Python >=3.8 | Lightweight, no dependency conflicts. |
| Alembic >=1.14.0 | SQLAlchemy >=1.4 | SQLModel uses SQLAlchemy 2.x under the hood; fully compatible. |

## What Does NOT Change (Existing Stack)

These remain untouched. The dashboard wraps them, never replaces them:

| Existing | Version | Stays Because |
|----------|---------|---------------|
| Playwright | >=1.44.0 | Browser automation engine. Dashboard monitors it, doesn't replace it. |
| anthropic | >=0.39.0 | Claude API for scoring/generation. Dashboard triggers it via API, doesn't replace it. |
| google-api-python-client | >=2.130.0 | Google Sheets/Drive API. Dashboard reuses the same service objects. |
| python-telegram-bot | >=20.0 | Telegram notifications continue alongside dashboard notifications. |
| schedule | >=1.2.0 | Scheduler loop. Dashboard sends start/stop commands; scheduler itself unchanged. |
| fpdf2 | >=2.7.0 | PDF generation. Dashboard triggers it, doesn't replace it. |
| python-docx | >=1.1.2 | Word doc generation. Dashboard triggers it, doesn't replace it. |
| python-dotenv | >=1.0.1 | .env loading. Both dashboard and automation use the same .env. |

## Sources

- [FastAPI Official Docs -- JWT Auth](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/) -- Confirmed PyJWT + pwdlib[argon2] as current recommendations (HIGH confidence)
- [FastAPI Official Docs -- SQL Databases](https://fastapi.tiangolo.com/tutorial/sql-databases/) -- Confirmed SQLModel as primary ORM recommendation (HIGH confidence)
- [FastAPI Official Docs -- WebSockets](https://fastapi.tiangolo.com/advanced/websockets/) -- Native WebSocket support pattern (HIGH confidence)
- [FastAPI Release Notes](https://fastapi.tiangolo.com/release-notes/) -- v0.135.1, Python >=3.10, 2x JSON performance (HIGH confidence)
- [FastAPI GitHub Discussion #11345](https://github.com/fastapi/fastapi/discussions/11345) -- Confirmed python-jose abandoned, PyJWT recommended (HIGH confidence)
- [PyPI: SQLModel](https://pypi.org/project/sqlmodel/) -- v0.0.37 (HIGH confidence)
- [PyPI: uvicorn](https://pypi.org/project/uvicorn/) -- v0.41.0 (HIGH confidence)
- [PyPI: aiosqlite](https://pypi.org/project/aiosqlite/) -- v0.21.0 (HIGH confidence)
- [React Versions](https://react.dev/versions) -- v19.2.4 (HIGH confidence)
- [Vite Releases](https://vite.dev/releases) -- v7.3.1 stable, v8 beta (HIGH confidence)
- [shadcn/ui Changelog](https://ui.shadcn.com/docs/changelog) -- CLI v4, March 2026 (HIGH confidence)
- [Tailwind CSS v4.2.0 Release](https://tailwindcss.com/blog) -- v4.2.0 (HIGH confidence)
- [npm: recharts](https://www.npmjs.com/package/recharts) -- v3.8.0 (HIGH confidence)
- [npm: @tanstack/react-query](https://www.npmjs.com/package/@tanstack/react-query) -- v5.90.21 (HIGH confidence)
- [npm: lucide-react](https://www.npmjs.com/package/lucide-react) -- v0.577.0 (HIGH confidence)
- [Zustand vs Jotai comparison](https://inhaq.com/blog/react-state-management-2026-redux-vs-zustand-vs-jotai.html) -- Zustand best for simple global state (MEDIUM confidence)
- [Sonner vs react-hot-toast](https://knock.app/blog/the-top-notification-libraries-for-react) -- Sonner is shadcn/ui default (MEDIUM confidence)

---
*Stack research for: Anti-gravity Job Automation Dashboard -- Web Dashboard Additions*
*Researched: 2026-03-09*
