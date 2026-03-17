# UniCredit (Stitch) -- Technology Decisions

**Version:** 3.0
**Date:** 2026-03-17
**Author:** Teammate 3 (Senior Software Developer)
**Status:** Approved

---

## 1. Backend Framework: Express.js (Retained)

**Decision:** Retain Express.js; decompose monolithic `server.js` into modular architecture.

**Rationale:**
- Existing team expertise with Express eliminates framework migration risk.
- The root problem is organizational (1077-line monolith), not framework-related.
- `express.Router()` supports clean module boundaries with zero overhead.
- NestJS would add 2-3 weeks of learning curve and decorator-heavy boilerplate.
- Fastify's performance gains are irrelevant at current scale (< 1,000 concurrent users).

**Trade-offs:**
- No built-in dependency injection (mitigated by constructor injection in services).
- No decorator-based validation (mitigated by Joi middleware).

---

## 2. Input Validation: Joi

**Decision:** Use Joi for request validation schemas.

**Rationale:**
- Mature, battle-tested library (10+ years, 18M+ weekly downloads).
- Expressive schema API covers all validation needs (email, min/max, regex, custom).
- Integrates cleanly with Express via a reusable `validate()` middleware factory.
- Zod was considered but offers TypeScript-first benefits that don't apply to this plain JS codebase.

**Security benefit:** Validation happens at the middleware layer before any business logic executes, preventing malformed data from reaching services.

---

## 3. Database: Firebase Firestore (Retained, Optimized)

**Decision:** Stay with Firestore for MVP. Add composite indexes and cursor-based pagination.

**Rationale:**
- Firestore is already integrated and operational.
- PostgreSQL migration during MVP would consume 2-3 weeks with no user-facing benefit.
- Firestore's document model fits current access patterns (user lookup by ID, transactions by user_id).
- Google-managed replication eliminates database administration overhead.

**Optimizations applied:**
- Composite indexes for `(user_id, created_at DESC)` on transactions and gifts.
- Cursor-based pagination using `startAfter()` with document snapshots.
- `FieldValue.increment()` inside Firestore transactions for atomic balance updates.
- Settings cached in Redis with 5-minute TTL.

**Future:** Monitor costs and query complexity; migrate to PostgreSQL in v3.1 if needed.

---

## 4. Cache/State: Redis

**Decision:** Add Redis for all ephemeral server-side state.

**Rationale:**
- In-memory Maps in the old server.js do not survive restarts and cannot scale horizontally.
- Redis provides: distributed rate limiting, processed session deduplication, BullMQ job queues, and settings caching.

**Implementation:** `ioredis` client (preferred over `redis` for better API, built-in Sentinel/Cluster support, and Lua scripting).

**MVP:** Single Redis instance (Upstash free tier). Production: Redis Cluster or Memorystore.

---

## 5. Rate Limiting: express-rate-limit + rate-limit-redis

**Decision:** Redis-backed rate limiting with tiered windows.

**Tiers:**
| Tier | Window | Max | Key | Endpoints |
|------|--------|-----|-----|-----------|
| Auth | 15 min | 15 | IP | `/auth/login`, `/auth/register`, `/auth/google` |
| Password Reset | 1 hour | 5 | IP | `/auth/forgot-password` |
| Financial | 1 min | 10 | User ID | `/convert`, `/gifts/send`, `/stripe/create-checkout-session`, `/gifts/claim/:token` (POST) |
| General | 1 min | 100 | User ID | All other authenticated endpoints |
| Admin | 1 min | 60 | User ID | `/admin/*` |

**Security benefit:** Redis store survives restarts and works across multiple API instances.

---

## 6. Background Jobs: BullMQ

**Decision:** BullMQ for reliable background job processing.

**Rationale:**
- At-least-once delivery guarantees no missed gift expirations or notifications.
- Built-in retry with exponential backoff handles transient failures.
- Redis-backed persistence survives process restarts.
- Dashboard (Bull Board) available for job monitoring.

**Jobs implemented:**
1. **Gift Expiration:** Daily at 02:00 UTC. Expires unclaimed gifts, refunds senders.
2. **Scheduled Delivery:** Every 5 minutes. Sends notifications for scheduled gifts that are due.
3. **Session Cleanup:** Hourly. Safety net for orphaned BullMQ completed jobs.

**MVP:** Workers run in the same Node.js process. Post-MVP: separate worker container.

---

## 7. Currency: Integer Cents Throughout

**Decision:** ALL monetary values stored and transmitted as integer cents.

**Rationale:**
- Floating-point arithmetic introduces rounding errors in financial calculations.
- Integer cents eliminate the entire class of $0.30 + $0.10 != $0.40 bugs.
- Industry standard (Stripe, Square, Braintree all use integer cents).

**Implementation:**
- Database fields: `balance_cents`, `amount_cents` (integer).
- API fields: `balanceCents`, `amountCents` (integer) + `displayBalance`, `displayAmount` (formatted string, read-only convenience).
- Frontend state: `_balanceCents` (int).
- Display conversion: `centsToDisplay(1250)` returns `"$12.50"`.

---

## 8. Authentication: JWT + bcrypt

**Decision:** JWT tokens (24h expiry) with bcrypt password hashing (12 rounds).

**Rationale:**
- JWT is stateless and works across horizontally scaled instances.
- 24-hour expiry balances security with user convenience.
- bcrypt 12 rounds provides ~300ms hash time, sufficient to resist offline brute force.

**Security controls:**
- `JWT_SECRET` required at startup (fail-secure).
- Password reset tokens hashed with SHA-256, single-use, 1-hour expiry.
- Placeholder JWT_SECRET rejected in production.

---

## 9. Email: SendGrid

**Decision:** SendGrid for transactional email.

**Rationale:**
- Industry-leading deliverability rates.
- Dynamic template support for branded emails.
- Free tier (100 emails/day) sufficient for early MVP.
- Well-maintained Node.js SDK (`@sendgrid/mail`).

**Graceful degradation:** If `SENDGRID_API_KEY` is not set, email features log warnings but do not crash.

---

## 10. Logging: Pino

**Decision:** Pino for structured JSON logging.

**Rationale:**
- 5-10x faster than Winston in benchmark tests.
- JSON output integrates directly with log aggregation services (Datadog, CloudWatch, Stackdriver).
- Built-in request serializers and child loggers for request-scoped context.
- `pino-pretty` for human-readable development output.

---

## 11. Security Headers: Helmet.js

**Decision:** Helmet.js for HTTP security headers.

**Headers enabled:** CSP, HSTS, X-Frame-Options (DENY), X-Content-Type-Options (nosniff), Referrer-Policy, X-XSS-Protection.

---

## 12. Frontend Data Layer: Provider (Retained, Hardened)

**Decision:** Retain Provider + ChangeNotifier; add typed models and error handling.

**Improvements over current implementation:**
- `AuthStatus` enum (unknown, authenticated, unauthenticated) replaces boolean `_isLoggedIn`.
- All monetary values as `int` (cents) instead of `double`.
- `ApiResponse<T>` wrapper for typed error handling.
- Automatic 401 logout in centralized request handler.
- `FlutterSecureStorage` replaces `SharedPreferences` for token storage.

**Future:** Migrate to Riverpod if state complexity increases (e.g., offline support).

---

## 13. Testing: Jest

**Decision:** Jest for backend unit and integration tests.

**Rationale:**
- Built-in mocking, assertion library, and coverage reporting.
- First-class async/await support.
- `supertest` integration for HTTP endpoint testing.
- Target: 80%+ coverage on services and validators.

---

## 14. Dependency Audit

| Package | Weekly Downloads | Maintainers | CVEs | Risk |
|---------|-----------------|-------------|------|------|
| express | 35M+ | OpenJS Foundation | None active | Low |
| joi | 18M+ | Sideway (Walmart Labs) | None active | Low |
| bcryptjs | 4M+ | 1 (dcodeIO) | None active | Medium (single maintainer) |
| jsonwebtoken | 15M+ | Auth0 | None active | Low |
| ioredis | 5M+ | Multiple | None active | Low |
| bullmq | 800K+ | Taskforce.sh | None active | Low |
| helmet | 3M+ | Multiple | None active | Low |
| pino | 5M+ | Multiple | None active | Low |
| @sendgrid/mail | 1M+ | Twilio | None active | Low |
| stripe | 3M+ | Stripe | None active | Low |
| uuid | 50M+ | Multiple | None active | Low |

**Note:** `bcryptjs` has a single maintainer. Mitigation: it's a pure-JS implementation of a well-understood algorithm with no native dependencies. If maintenance becomes an issue, `bcrypt` (native bindings, multiple maintainers) is a drop-in replacement.
