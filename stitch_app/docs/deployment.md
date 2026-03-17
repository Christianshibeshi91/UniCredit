# Stitch Deployment Guide

Infrastructure, Docker, environment configuration, health checks, and CI/CD pipeline design
for the Stitch (UniCredit) backend API.

---

## 1. Architecture Overview

```
                   ┌──────────────┐
                   │   Flutter    │
                   │   Frontend   │
                   └──────┬───────┘
                          │ HTTPS
                   ┌──────▼───────┐
                   │   Backend    │
                   │  (Express)   │
                   │  Port 3000   │
                   └──┬───────┬───┘
                      │       │
              ┌───────▼──┐  ┌─▼──────────┐
              │   Redis  │  │  Firebase   │
              │ Port 6379│  │ (Firestore) │
              └──────────┘  └────────────┘
```

- **Backend:** Node.js 18 (Alpine) Express.js API
- **Database:** Firebase Firestore (managed by Google)
- **Cache/Queue:** Redis 7 (rate limiting, sessions, BullMQ job queues)
- **Payments:** Stripe (external API)
- **Email:** SendGrid (external API)

---

## 2. Docker Setup

### 2.1 Dockerfile (`backend/Dockerfile`)

Multi-stage build that produces a minimal production image:

**Stage 1 -- `deps`:** Installs production dependencies only.
```
FROM node:18-alpine AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
```

**Stage 2 -- `runner`:** Copies deps and application source, runs as non-root.
```
FROM node:18-alpine AS runner
RUN addgroup -g 1001 -S stitch && adduser -S stitch -u 1001 -G stitch
COPY --from=deps /app/node_modules ./node_modules
COPY src/ ./src/
COPY server.js ./server.js
USER stitch
CMD ["node", "server.js"]
```

Security characteristics:
- **Non-root user:** Runs as `stitch` (UID 1001) -- not root
- **Minimal image:** Alpine base, no dev dependencies
- **No build tools:** `--ignore-scripts` prevents post-install scripts
- **Layer caching:** Package manifests copied before source for efficient rebuilds

### 2.2 `.dockerignore` (`backend/.dockerignore`)

Excludes from the build context:
- `node_modules/` (fresh install in container)
- `.env`, `.env.*` (secrets injected at runtime)
- `.git/`, IDE configs, OS files
- `tests/`, `docs/`, `coverage/`

### 2.3 Docker Compose (`docker-compose.yml`)

Three services defined:

| Service             | Image              | Port  | Purpose                                |
|---------------------|--------------------|-------|----------------------------------------|
| `backend`           | Built from `./backend` | 3000  | Express.js API                         |
| `redis`             | `redis:7-alpine`   | 6379  | Rate limiting, sessions, job queues    |
| `firestore-emulator`| (commented out)    | 8081  | Local Firestore emulator (dev only)    |

**Network:** All services share `stitch-network` (bridge driver).

**Volumes:** `redis-data` persists Redis AOF data across container restarts.

**Startup order:** Backend depends on Redis with `condition: service_healthy`.

---

## 3. Environment Variables

### 3.1 Required in Production (fail-secure)

These variables must be set. The application crashes at startup if missing.

| Variable                 | Description                                      | Example                          |
|--------------------------|--------------------------------------------------|----------------------------------|
| `JWT_SECRET`             | JWT signing key (min 32 chars recommended)       | `$(openssl rand -base64 48)`     |
| `STRIPE_SECRET_KEY`      | Stripe API secret key                            | `sk_live_...`                    |
| `STRIPE_WEBHOOK_SECRET`  | Stripe webhook endpoint signing secret           | `whsec_...`                      |
| `GOOGLE_CLIENT_ID`       | Google OAuth 2.0 client ID                       | `xxxx.apps.googleusercontent.com`|
| `FIREBASE_PROJECT_ID`    | Firebase project identifier                      | `stitch-prod`                    |
| `FIREBASE_CLIENT_EMAIL`  | Firebase service account email                   | `firebase-adminsdk@...`          |
| `FIREBASE_PRIVATE_KEY`   | Firebase service account private key (PEM format)| `-----BEGIN PRIVATE KEY-----\n...`|
| `ALLOWED_ORIGINS`        | Comma-separated list of CORS-allowed origins     | `https://app.stitch.com`        |

### 3.2 Optional (with defaults)

| Variable          | Default                   | Description                          |
|-------------------|---------------------------|--------------------------------------|
| `NODE_ENV`        | `development`             | Runtime environment                  |
| `PORT`            | `3000`                    | API listen port                      |
| `API_PORT`        | `3000`                    | Host-side port mapping (Docker)      |
| `REDIS_URL`       | `redis://redis:6379`      | Redis connection URI                 |
| `REDIS_PORT`      | `6379`                    | Host-side Redis port (Docker)        |
| `SENDGRID_API_KEY`| (empty)                   | SendGrid email API key               |
| `SENTRY_DSN`      | (empty)                   | Sentry error tracking DSN            |

### 3.3 Flutter Frontend (compile-time)

The Flutter frontend uses `String.fromEnvironment()` for build-time constants:

| Variable           | Injection Method                  | Usage                     |
|--------------------|-----------------------------------|---------------------------|
| `GOOGLE_CLIENT_ID` | `--dart-define=GOOGLE_CLIENT_ID=` | Google Sign-In            |

```bash
flutter build apk --dart-define=GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
```

### 3.4 CORS Configuration

The CORS middleware (`backend/src/middleware/cors.js`) enforces origin whitelisting:

- **Production:** `ALLOWED_ORIGINS` is **required**. If not set, the server throws a fatal error and refuses to start (fail-secure).
- **Development:** Falls back to `localhost:8080`, `localhost:3000`, `localhost:5000`, `127.0.0.1:8080`.
- Requests with no `Origin` header (mobile apps, server-to-server, health checks) are always allowed.
- Blocked origins are logged with `console.warn`.

```
ALLOWED_ORIGINS=https://app.stitch.com,https://admin.stitch.com
```

---

## 4. Health Checks

### 4.1 Dockerfile Health Check

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
```

- Starts checking 10 seconds after container start
- Checks every 30 seconds
- Times out after 5 seconds per check
- Container marked unhealthy after 3 consecutive failures

### 4.2 Docker Compose Health Checks

**Backend:**
```yaml
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 10s
```

**Redis:**
```yaml
healthcheck:
  test: ["CMD", "redis-cli", "ping"]
  interval: 10s
  timeout: 3s
  retries: 5
```

### 4.3 Health Endpoint

The backend exposes `GET /api/health` which should return `200 OK` when the service is ready.

---

## 5. Logging

### 5.1 Logger Middleware (`backend/src/middleware/logger.js`)

Structured request/response logger with environment-aware output.

**Production output** -- JSON for log aggregation (ELK, Datadog, Splunk):
```json
{
  "level": "info",
  "timestamp": "2026-03-17T12:00:00.000Z",
  "requestId": "aB3cD4eF5gH6",
  "method": "GET",
  "url": "/api/wallet",
  "statusCode": 200,
  "duration": "12ms",
  "userAgent": "Dart/3.2",
  "ip": "10.0.0.1",
  "contentLength": "256"
}
```

**Development output** -- Color-coded human-readable:
```
GET /api/wallet 200 12ms [aB3cD4eF5gH6]
```

**Log levels:**
- `error`: status >= 500
- `warn`: status >= 400
- `info`: status < 400

**Security features:**
- Request IDs (12-char alphanumeric) attached to every request and response (`X-Request-Id` header)
- Sensitive headers **never logged**: `authorization`, `cookie`, `set-cookie`, `x-api-key`, `x-csrf-token`
- Response stream errors logged as structured JSON without stack traces

---

## 6. Deployment Commands

### 6.1 Local Development

```bash
# Start all services
docker compose up -d

# View backend logs
docker compose logs -f backend

# Rebuild after code changes
docker compose up -d --build backend

# Stop all services
docker compose down

# Stop and remove volumes (clean reset)
docker compose down -v
```

### 6.2 Production Build

```bash
# Build production image
docker build -t stitch-api:latest ./backend

# Tag for registry
docker tag stitch-api:latest registry.example.com/stitch-api:v3.0.0

# Push to registry
docker push registry.example.com/stitch-api:v3.0.0
```

### 6.3 Production Run (without Compose)

```bash
# Start Redis
docker run -d \
  --name stitch-redis \
  --restart unless-stopped \
  -p 6379:6379 \
  redis:7-alpine \
  redis-server --maxmemory 128mb --maxmemory-policy allkeys-lru --appendonly yes

# Start API
docker run -d \
  --name stitch-api \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env.production \
  --link stitch-redis:redis \
  stitch-api:latest
```

### 6.4 Flutter Build

```bash
# Android APK
flutter build apk --release \
  --dart-define=GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# iOS
flutter build ipa --release \
  --dart-define=GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# Web
flutter build web --release \
  --dart-define=GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

---

## 7. Redis Configuration

Docker Compose configures Redis with:

| Setting               | Value            | Purpose                              |
|-----------------------|------------------|--------------------------------------|
| `--maxmemory`         | `128mb`          | Memory cap                           |
| `--maxmemory-policy`  | `allkeys-lru`    | Evict least-recently-used on full    |
| `--appendonly`        | `yes`            | Append-only file for durability      |

Redis is used by the backend for:
- **Rate limiting** via `express-rate-limit` + `rate-limit-redis`
- **Job queues** via `bullmq` + `ioredis`
- **Session data** (optional)

---

## 8. CI/CD Pipeline Design

### 8.1 Recommended Pipeline Stages

```
┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
│   Lint    │───>│   Test    │───>│   Build   │───>│   Scan    │───>│  Deploy   │
└───────────┘    └───────────┘    └───────────┘    └───────────┘    └───────────┘
```

### 8.2 Stage Details

**Stage 1: Lint**
```yaml
- npm run lint        # ESLint on backend
- flutter analyze     # Dart analysis on frontend
```

**Stage 2: Test**
```yaml
- npm run test        # Jest with coverage (backend)
- flutter test        # Widget/unit tests (frontend)
```
Minimum coverage threshold: 80% (configurable in Jest config).

**Stage 3: Build**
```yaml
- docker build -t stitch-api:$SHA ./backend
- flutter build apk --release --dart-define=GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
```

**Stage 4: Security Scan**
```yaml
- npm audit --production    # Known CVE check
- trivy image stitch-api:$SHA  # Container vulnerability scan
```

**Stage 5: Deploy**
- Staging: Auto-deploy on merge to `develop`
- Production: Manual approval gate, deploy on tag `v*`

### 8.3 GitHub Actions Example

```yaml
name: CI/CD
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7-alpine
        ports: [6379:6379]
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: npm
          cache-dependency-path: backend/package-lock.json

      - run: cd backend && npm ci
      - run: cd backend && npm run lint
      - run: cd backend && npm test
        env:
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: ci-test-secret-not-for-production
          NODE_ENV: test

      - name: Build Docker image
        run: docker build -t stitch-api:${{ github.sha }} ./backend

      - name: Scan image
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: stitch-api:${{ github.sha }}
          severity: CRITICAL,HIGH

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.x'
          channel: stable

      - run: cd frontend && flutter pub get
      - run: cd frontend && flutter analyze
      - run: cd frontend && flutter test
```

### 8.4 Secrets Management

CI/CD secrets should be stored in the platform's secret store (GitHub Secrets, GitLab CI Variables, etc.), never in code or config files.

| Secret                   | CI/CD Variable Name        | Used In        |
|--------------------------|----------------------------|----------------|
| JWT signing key          | `JWT_SECRET`               | Backend        |
| Stripe secret key        | `STRIPE_SECRET_KEY`        | Backend        |
| Stripe webhook secret    | `STRIPE_WEBHOOK_SECRET`    | Backend        |
| Firebase project ID      | `FIREBASE_PROJECT_ID`      | Backend        |
| Firebase client email    | `FIREBASE_CLIENT_EMAIL`    | Backend        |
| Firebase private key     | `FIREBASE_PRIVATE_KEY`     | Backend        |
| Google OAuth client ID   | `GOOGLE_CLIENT_ID`         | Frontend build |
| SendGrid API key         | `SENDGRID_API_KEY`         | Backend        |
| Sentry DSN               | `SENTRY_DSN`               | Backend        |
| Docker registry password | `REGISTRY_PASSWORD`        | Image push     |

---

## 9. Security Checklist

Before deploying to production, verify:

- [ ] `ALLOWED_ORIGINS` is set to exact production domains (not wildcards)
- [ ] `JWT_SECRET` is cryptographically random (min 32 bytes)
- [ ] `NODE_ENV=production` is set (enables fail-secure CORS, JSON logging)
- [ ] No `.env` files are included in the Docker image (check `.dockerignore`)
- [ ] Container runs as non-root user (`stitch`, UID 1001)
- [ ] Redis is not exposed to the public internet (internal network only)
- [ ] HTTPS termination is handled by a reverse proxy (nginx, ALB, Cloudflare)
- [ ] Stripe webhook endpoint validates signatures via `STRIPE_WEBHOOK_SECRET`
- [ ] Firebase private key is injected via environment variable, not a file
- [ ] `GOOGLE_CLIENT_ID` is baked into Flutter binary via `--dart-define` (not hardcoded)
- [ ] Rate limiting is enabled via `express-rate-limit` backed by Redis
- [ ] Health check endpoint (`/api/health`) does not expose internal state
- [ ] Logger redacts `Authorization`, `Cookie`, `X-API-Key` headers
- [ ] Error responses do not leak stack traces or internal paths
