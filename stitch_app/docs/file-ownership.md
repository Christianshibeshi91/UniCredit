# UniCredit (Stitch) -- File Ownership Map

**Version:** 3.0
**Date:** 2026-03-17
**Status:** Draft
**Author:** Solution Architect Agent

---

## 1. Purpose

This document defines clear ownership boundaries between the two implementing teammates to prevent merge conflicts, enable parallel development, and establish accountability.

- **Teammate 3 (Senior Developer):** Business logic, API layer, data access, services, models.
- **Teammate 5 (DevOps & UI/UX):** UI components, screens, styles, design system, Dockerfile, CI/CD, infrastructure.

---

## 2. Backend Ownership

### 2.1 Teammate 3 (Senior Developer) -- Owns

All backend source code related to business logic, API contracts, and data access.

```
backend/
├── src/
│   ├── app.js                         # Express app setup
│   ├── server.js                      # Server startup, dependency validation
│   ├── config/
│   │   ├── env.js                     # Environment variable loading
│   │   ├── firebase.js                # Firebase Admin init
│   │   ├── stripe.js                  # Stripe client init
│   │   ├── redis.js                   # Redis client init
│   │   └── sendgrid.js                # SendGrid client init
│   ├── middleware/
│   │   ├── auth.js                    # JWT verification
│   │   ├── adminOnly.js               # Admin role check
│   │   ├── rateLimiter.js             # Rate limiting logic
│   │   ├── requestId.js               # Request ID generation
│   │   ├── errorHandler.js            # Global error handler
│   │   └── helmet.js                  # Security headers config
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── wallet.routes.js
│   │   ├── convert.routes.js
│   │   ├── gift.routes.js
│   │   ├── stripe.routes.js
│   │   ├── admin.routes.js
│   │   ├── upload.routes.js
│   │   └── health.routes.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── wallet.controller.js
│   │   ├── convert.controller.js
│   │   ├── gift.controller.js
│   │   ├── stripe.controller.js
│   │   ├── admin.controller.js
│   │   └── upload.controller.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── wallet.service.js
│   │   ├── gift.service.js
│   │   ├── conversion.service.js
│   │   ├── admin.service.js
│   │   ├── notification.service.js
│   │   ├── media.service.js
│   │   └── audit.service.js
│   ├── validators/
│   │   ├── auth.validator.js
│   │   ├── gift.validator.js
│   │   ├── convert.validator.js
│   │   ├── admin.validator.js
│   │   └── common.validator.js
│   ├── jobs/
│   │   ├── queue.js
│   │   ├── giftExpiration.job.js
│   │   ├── scheduledDelivery.job.js
│   │   └── sessionCleanup.job.js
│   ├── models/
│   │   ├── user.model.js
│   │   ├── transaction.model.js
│   │   ├── gift.model.js
│   │   ├── fraudFlag.model.js
│   │   ├── setting.model.js
│   │   └── auditLog.model.js
│   └── utils/
│       ├── currency.js
│       ├── sanitize.js
│       ├── errors.js
│       └── crypto.js
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── .env.example
├── .env.production.example
├── package.json
└── package-lock.json
```

### 2.2 Teammate 5 (DevOps & UI/UX) -- Owns

Backend infrastructure, deployment, and logging configuration.

```
backend/
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── nginx.conf                         # Reverse proxy config (if applicable)
├── src/
│   └── middleware/
│       ├── cors.js                    # CORS origin configuration
│       └── logger.js                  # Pino logger configuration + format
```

**Note:** Teammate 5 owns the CORS allowlist configuration and logging format/transport, but Teammate 3 owns the middleware integration (how it plugs into Express).

---

## 3. Frontend Ownership

### 3.1 Teammate 3 (Senior Developer) -- Owns

All frontend code related to API communication, state management, data models, and business logic.

```
frontend/lib/
├── config/
│   └── environment.dart               # API base URL, feature flags
├── models/
│   ├── user.dart                      # User data class
│   ├── transaction.dart               # Transaction data class
│   ├── gift.dart                      # Gift data class
│   └── api_response.dart              # API response wrapper
├── services/
│   ├── api_service.dart               # HTTP client, auth headers, error handling
│   ├── app_state.dart                 # Provider state management
│   ├── auth_service.dart              # Auth-specific API calls
│   ├── storage_service.dart           # SecureStorage abstraction
│   └── notification_service.dart      # FCM token registration
└── utils/
    ├── currency_formatter.dart        # Cents <-> display conversion
    ├── validators.dart                # Client-side input validation
    └── date_formatter.dart            # Date display utilities
```

### 3.2 Teammate 5 (DevOps & UI/UX) -- Owns

All frontend code related to UI rendering, styling, screen layout, and user interaction.

```
frontend/lib/
├── main.dart                          # App entry, routing, navigation
├── screens/
│   ├── login_screen.dart
│   ├── wallet_dashboard_screen.dart
│   ├── transaction_history_screen.dart
│   ├── convert_gift_card_screen.dart
│   ├── personalize_your_gift_screen.dart
│   ├── gift_reveal_experience_screen.dart
│   ├── gift_claim_screen.dart
│   ├── add_credit_screen.dart
│   ├── admin_overview_screen.dart
│   ├── admin_user_detail_screen.dart
│   ├── profile_screen.dart
│   └── password_reset_screen.dart
├── components/
│   ├── balance_card.dart
│   ├── transaction_item.dart
│   ├── merchant_grid.dart
│   ├── occasion_grid.dart
│   ├── media_capture.dart
│   ├── loading_button.dart
│   ├── error_banner.dart
│   └── empty_state.dart
└── theme/
    └── app_theme.dart                 # Design tokens, colors, typography
```

### 3.3 Teammate 5 Also Owns

```
frontend/
├── pubspec.yaml                       # Dependencies (coordinate additions with T3)
├── web/
│   ├── index.html
│   ├── manifest.json
│   └── icons/
├── test/                              # UI/widget tests
└── analysis_options.yaml
```

---

## 4. Infrastructure & DevOps (Teammate 5)

Teammate 5 has sole ownership of all deployment and infrastructure files.

```
stitch_app/
├── .github/
│   └── workflows/
│       ├── ci.yml                     # Lint + test on PR
│       ├── deploy-staging.yml         # Deploy to staging
│       └── deploy-production.yml      # Deploy to production
├── infra/                             # Infrastructure as code (if applicable)
│   ├── terraform/                     # Or Pulumi/CDK
│   └── k8s/                          # Kubernetes manifests (post-MVP)
├── scripts/
│   ├── migrate-to-cents.js            # Currency migration script (co-owned with T3)
│   ├── seed-dev-data.js               # Development seed data
│   └── healthcheck.sh                 # Container health check
└── monitoring/
    ├── sentry.config.js               # Sentry configuration
    └── alerts.yml                     # Alert definitions
```

---

## 5. Documentation (Shared)

```
stitch_app/docs/
├── PRD.md                             # Business Analyst (read-only for T3/T5)
├── user-stories.md                    # Business Analyst (read-only for T3/T5)
├── competitive-analysis.md            # Business Analyst (read-only for T3/T5)
├── architecture.md                    # Solution Architect (this agent)
├── tech-spec.md                       # Solution Architect (this agent)
├── api-contracts.md                   # Solution Architect → T3 implements
├── data-models.md                     # Solution Architect → T3 implements
├── file-ownership.md                  # Solution Architect (this document)
├── CHANGELOG.md                       # T3 + T5 (both update)
└── RUNBOOK.md                         # T5 creates (deployment procedures)
```

---

## 6. Shared Files & Coordination Protocol

### 6.1 Shared Files (Require Coordination)

These files are modified by both teammates. Changes must be coordinated to avoid conflicts.

| File | Primary Owner | Secondary | Coordination Method |
|------|--------------|-----------|-------------------|
| `backend/package.json` | T3 | T5 | T3 owns dependencies; T5 owns scripts. Merge conflicts resolved by discussing additions. |
| `frontend/pubspec.yaml` | T5 | T3 | T5 owns the file; T3 requests dependency additions via PR comment. |
| `backend/src/app.js` | T3 | T5 | T3 owns middleware registration order and route mounting. T5 may add CORS/logger config. |
| `.gitignore` | T5 | T3 | T5 owns; T3 can add entries via PR. |
| `docs/CHANGELOG.md` | Both | Both | Append-only; each adds entries for their own work. |

### 6.2 Coordination Protocol

1. **Feature branches:** Each teammate works on a dedicated branch (e.g., `feat/t3-auth-service`, `feat/t5-login-screen`).

2. **Shared interface contracts:**
   - T3 defines API response shapes in `api-contracts.md` BEFORE implementation.
   - T5 builds screens against those contracts, using mock data until the API is ready.
   - Changes to API contracts require a PR review from both teammates.

3. **Pull request rules:**
   - PRs that touch shared files must be reviewed by the other teammate.
   - PRs that touch ONLY owned files can be self-merged (after CI passes).
   - All PRs must pass linting and tests.

4. **Dependency additions:**
   - Backend (npm): T3 adds with justification in PR description.
   - Frontend (pub): T5 adds with justification in PR description.
   - Both review for supply chain risk (see CLAUDE.md security directives).

5. **Communication on breaking changes:**
   - If T3 changes an API response shape, T3 notifies T5 before merging.
   - If T5 changes the navigation structure, T5 notifies T3 (for deep link handling).
   - The `api-contracts.md` document is the source of truth for the interface.

---

## 7. Work Stream Mapping

### 7.1 Sprint 1 (Week 1-2): Foundation

| Task | Owner | Files Affected |
|------|-------|---------------|
| Create backend directory structure | T3 | `backend/src/**` |
| Extract middleware from server.js | T3 | `backend/src/middleware/**` |
| Extract auth routes + service | T3 | `backend/src/routes/auth.*`, `backend/src/services/auth.*` |
| Extract wallet routes + service | T3 | `backend/src/routes/wallet.*`, `backend/src/services/wallet.*` |
| Set up Dockerfile + docker-compose | T5 | `backend/Dockerfile`, `docker-compose.yml` |
| Set up CI pipeline | T5 | `.github/workflows/ci.yml` |
| Create design system components | T5 | `frontend/lib/components/**` |
| Extract reusable widgets from screens | T5 | `frontend/lib/components/**`, `frontend/lib/screens/**` |

### 7.2 Sprint 2 (Week 3-4): Core Features

| Task | Owner | Files Affected |
|------|-------|---------------|
| Integer currency migration script | T3 | `scripts/migrate-to-cents.js`, `backend/src/utils/currency.js` |
| Redis integration | T3 | `backend/src/config/redis.js`, `backend/src/middleware/rateLimiter.js` |
| Gift routes + service + claim flow | T3 | `backend/src/routes/gift.*`, `backend/src/services/gift.*` |
| Stripe webhook hardening | T3 | `backend/src/routes/stripe.*`, `backend/src/controllers/stripe.*` |
| Password reset flow (backend) | T3 | `backend/src/services/auth.service.js`, `backend/src/services/notification.service.js` |
| Login screen with Google Client ID from env | T5 | `frontend/lib/screens/login_screen.dart` |
| Gift claim screen (new) | T5 | `frontend/lib/screens/gift_claim_screen.dart` |
| Password reset screen (new) | T5 | `frontend/lib/screens/password_reset_screen.dart` |
| Frontend currency formatting (cents) | T3 | `frontend/lib/utils/currency_formatter.dart` |
| Update ApiService for cents | T3 | `frontend/lib/services/api_service.dart` |

### 7.3 Sprint 3 (Week 5-6): Admin & Media

| Task | Owner | Files Affected |
|------|-------|---------------|
| Admin routes + service (full) | T3 | `backend/src/routes/admin.*`, `backend/src/services/admin.*` |
| Media upload service (GCS signed URLs) | T3 | `backend/src/services/media.service.js`, `backend/src/routes/upload.*` |
| Notification service (SendGrid + FCM) | T3 | `backend/src/services/notification.service.js` |
| Audit logging service | T3 | `backend/src/services/audit.service.js`, `backend/src/models/auditLog.model.js` |
| Admin dashboard with real controls | T5 | `frontend/lib/screens/admin_overview_screen.dart` |
| Admin user detail screen (new) | T5 | `frontend/lib/screens/admin_user_detail_screen.dart` |
| Admin tab visibility (role-based) | T5 | `frontend/lib/main.dart` |
| Media capture + upload UI | T5 | `frontend/lib/components/media_capture.dart`, `frontend/lib/screens/personalize_your_gift_screen.dart` |

### 7.4 Sprint 4 (Week 7-8): Background Jobs & Polish

| Task | Owner | Files Affected |
|------|-------|---------------|
| BullMQ job setup | T3 | `backend/src/jobs/**` |
| Gift expiration job | T3 | `backend/src/jobs/giftExpiration.job.js` |
| Scheduled delivery job | T3 | `backend/src/jobs/scheduledDelivery.job.js` |
| Pagination on all list endpoints | T3 | `backend/src/controllers/**`, `backend/src/services/**` |
| Transaction history screen (paginated) | T5 | `frontend/lib/screens/transaction_history_screen.dart` |
| Gift reveal screen (real data) | T5 | `frontend/lib/screens/gift_reveal_experience_screen.dart` |
| Sentry integration | T5 | `monitoring/sentry.config.js`, `backend/src/middleware/errorHandler.js` |
| Deployment pipeline (staging + prod) | T5 | `.github/workflows/deploy-*.yml` |

### 7.5 Sprint 5 (Week 9-10): Testing & Launch

| Task | Owner | Files Affected |
|------|-------|---------------|
| Backend unit tests | T3 | `backend/tests/unit/**` |
| Backend integration tests | T3 | `backend/tests/integration/**` |
| Security audit | T3 | All backend files (review) |
| Frontend widget tests | T5 | `frontend/test/**` |
| End-to-end smoke tests | T5 | `frontend/test/integration/**` |
| Production deployment | T5 | Infrastructure files |
| Seed data removal verification | T3 + T5 | `backend/src/server.js` (remove `initializeFirestore` seed data) |

---

## 8. Conflict Prevention Rules

1. **T3 never modifies files in** `frontend/lib/screens/`, `frontend/lib/components/`, `frontend/lib/theme/`, `Dockerfile`, `.github/workflows/`.

2. **T5 never modifies files in** `backend/src/routes/`, `backend/src/controllers/`, `backend/src/services/`, `backend/src/models/`, `backend/src/validators/`, `backend/src/jobs/`.

3. **Both can modify** `backend/src/middleware/` (T3 owns logic, T5 owns configuration), `docs/` (append-only CHANGELOG), and files listed in the Shared Files table.

4. **Interface boundary:** The API contract (`docs/api-contracts.md`) is the single source of truth. T5 builds UI against these contracts. T3 implements the backend to satisfy these contracts. Neither changes the contract unilaterally.

5. **Merge order:** When both teammates have PRs touching shared files, T3 merges first (backend changes define the interface), then T5 rebases and merges (frontend adapts to the interface).

6. **Escalation:** If a file ownership conflict arises that is not covered by this document, the Solution Architect (this agent) arbitrates.
