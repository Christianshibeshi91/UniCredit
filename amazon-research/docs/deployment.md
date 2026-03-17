# Deployment Guide

**Version:** 1.0
**Date:** 2026-03-17

---

## 1. Local Development Setup

### Prerequisites

- Node.js 20+ (LTS recommended)
- npm 10+
- Firebase project with Firestore enabled
- Anthropic API key (optional for mock-data development)

### Setup Steps

```bash
# 1. Clone the repository
git clone <repo-url>
cd amazon-research

# 2. Install dependencies
npm ci

# 3. Create environment file
cp .env.local.example .env.local
# Edit .env.local with your credentials (see Environment Variables section)

# 4. Start development server
npm run dev
```

The app runs at `http://localhost:3000` with Turbopack hot reloading.

### Development without API Keys

The application functions with mock data when API keys are not configured:

- **No `ANTHROPIC_API_KEY`:** Claude analysis, suggestions, cost estimates, and intelligence pipeline fall back to mock responses.
- **No `FIREBASE_ADMIN_*`:** Firebase Admin SDK will crash on init (fail-secure). For UI-only development, pages use mock data imports directly.
- **No `AMAZON_SP_API_*`:** SP-API features are gated behind `AMAZON_SP_API_ENABLED=true` and fall back to mock data by default.

---

## 2. Docker Setup

### Build and Run

```bash
# Build and start with docker-compose
docker compose up --build

# Or build manually
docker build -t amazon-research .
docker run -p 3000:3000 --env-file .env.local amazon-research
```

### Multi-Stage Build

The Dockerfile uses a 3-stage build:

| Stage | Base | Purpose | Output |
|-------|------|---------|--------|
| `deps` | `node:20-alpine` | Install npm dependencies | `node_modules/` |
| `builder` | `node:20-alpine` | Build Next.js application | `.next/standalone`, `.next/static` |
| `runner` | `node:20-alpine` | Production runtime | Minimal image with `server.js` |

### Build Arguments

Public Firebase keys must be passed as build args since `NEXT_PUBLIC_*` variables are inlined at build time:

```bash
docker build \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY=your-key \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project \
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-bucket \
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id \
  -t amazon-research .
```

When using `docker compose`, these are read from your `.env.local` file automatically.

### Security Notes

- The production image runs as a non-root user (`nextjs:nodejs`, UID 1001).
- Private keys (`ANTHROPIC_API_KEY`, `FIREBASE_ADMIN_PRIVATE_KEY`, etc.) are injected at **runtime** via `env_file`, never baked into the image.
- The `.dockerignore` excludes `.env.*` files, `node_modules`, `.git`, and test files from the build context.

---

## 3. Vercel Deployment

### Initial Setup

1. Push the repository to GitHub.
2. Import the project in the [Vercel Dashboard](https://vercel.com/new).
3. Framework preset: **Next.js** (auto-detected).
4. Configure environment variables in Vercel project settings (see Environment Variables below).
5. Deploy.

### Cron Jobs

Five cron jobs are configured in `vercel.json`:

| Job | Schedule | Path |
|-----|----------|------|
| Sync Pricing | Daily 00:00 UTC | `/api/cron/sync-pricing` |
| Sync Catalog | Daily 03:00 UTC | `/api/cron/sync-catalog` |
| Sync Reviews | Daily 06:00 UTC | `/api/cron/sync-reviews` |
| Sync BSR | Daily 12:00 UTC | `/api/cron/sync-bsr` |
| Sync Fees | Daily 18:00 UTC | `/api/cron/sync-fees` |

**Note:** Vercel Hobby plan supports 2 cron jobs. Pro plan is required for all 5.

### Vercel Limitations

- **Max function duration:** 10s (Hobby) / 60s (Pro) / 300s (Enterprise). The intelligence pipeline requests 120s via `maxDuration`.
- **Stateless functions:** In-memory caches and report stores are per-invocation. Data does not persist between requests.
- **Cold starts:** ~500ms on first invocation after idle period.

### Production Checklist

- [ ] All environment variables configured in Vercel dashboard
- [ ] `CRON_SECRET` set for cron job authentication
- [ ] Firebase Auth providers enabled (Email/Password, Google)
- [ ] Firebase authorized domains include `*.vercel.app` and custom domain
- [ ] Anthropic API key has sufficient rate limits
- [ ] SP-API credentials configured (if using live data)

---

## 4. Environment Variables Reference

### Required (Core Functionality)

| Variable | Description | Where Used |
|----------|-------------|------------|
| `ANTHROPIC_API_KEY` | Claude API key for analysis, suggestions, intelligence | Server-side: `claudeClient.ts` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase client API key | Client-side: `firebase/client.ts` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | Client-side: `firebase/client.ts` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | Client-side: `firebase/client.ts` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | Client-side: `firebase/client.ts` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | Client-side: `firebase/client.ts` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID | Client-side: `firebase/client.ts` |
| `FIREBASE_ADMIN_PROJECT_ID` | Firebase Admin project ID | Server-side: `firebase/admin.ts` |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Firebase Admin service account email | Server-side: `firebase/admin.ts` |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Firebase Admin private key (PEM format) | Server-side: `firebase/admin.ts` |
| `CRON_SECRET` | Bearer token for cron job authentication | Server-side: cron + sync routes |

### Optional (Feature Flags)

| Variable | Default | Description |
|----------|---------|-------------|
| `AMAZON_SP_API_ENABLED` | `"false"` | Enable SP-API integration |
| `AMAZON_SP_API_CLIENT_ID` | — | SP-API OAuth client ID |
| `AMAZON_SP_API_CLIENT_SECRET` | — | SP-API OAuth client secret |
| `AMAZON_SP_API_REFRESH_TOKEN` | — | SP-API OAuth refresh token |

### Security Rules

- **Never** commit `.env.local` or any `.env.*` file (except `.env.local.example`).
- `NEXT_PUBLIC_*` variables are embedded in the client bundle at build time. Only Firebase client keys (which are inherently public) use this prefix.
- All private keys (`ANTHROPIC_API_KEY`, `FIREBASE_ADMIN_PRIVATE_KEY`, `CRON_SECRET`, SP-API credentials) are server-only and must never be exposed to the client.
- `FIREBASE_ADMIN_PRIVATE_KEY` contains newlines. In Vercel, paste the raw PEM string. In Docker/shell, wrap in quotes and use `\n` for newlines.

---

## 5. Health Checks

### Docker Health Check

The Dockerfile includes a built-in health check:

```
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1
```

### Manual Health Verification

```bash
# Check app is responding
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/

# Check API routes (returns product data or empty array)
curl -s http://localhost:3000/api/products | head -c 200

# Check SP-API status
curl -s http://localhost:3000/api/live-data/status
```

### Monitoring Recommendations

- Use Vercel Analytics (built-in) for performance monitoring.
- Monitor Anthropic API usage via the Anthropic Console.
- Monitor Firebase usage via the Firebase Console (reads/writes/bandwidth).
- Set up alerting on the circuit breaker state (5 failures in 10 minutes triggers cooldown).
