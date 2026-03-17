# UniCredit (Stitch) Backend - Test Results Report

**Tester:** Senior QA Engineer (Teammate 4)
**Date:** 2026-03-17
**Environment:** Node.js 18+, Jest 29.7.0, Windows 11, x64
**Branch:** main

---

## Executive Summary

All **623 tests pass** across 26 test suites. The test suite includes 495 existing unit tests and 128 new integration/E2E tests. Overall statement coverage is **68.36%** with critical business logic modules achieving 85-100% coverage. **13 bugs were identified** during code review, including 2 critical issues (Stripe double-crediting, JWT role not re-verified).

---

## Test Run Results

```
Test Suites: 26 passed, 26 total
Tests:       623 passed, 623 total
Snapshots:   0 total
Time:        ~12 seconds
```

### Breakdown by Category

| Category        | Suites | Tests | Status   |
|-----------------|--------|-------|----------|
| Unit Tests      | 17     | 495   | ALL PASS |
| Integration     | 7      | 103   | ALL PASS |
| E2E Scenarios   | 1      | 5     | ALL PASS |
| **Total**       | **26** | **623** | **ALL PASS** |

### Unit Test Suites (17 suites, 495 tests)

| Suite | Tests | Status |
|-------|-------|--------|
| validators/gift.validator.test.js | PASS | All |
| validators/auth.validator.test.js | PASS | All |
| validators/convert.validator.test.js | PASS | All |
| validators/admin.validator.test.js | PASS | All |
| middleware/validate.test.js | PASS | All |
| middleware/auth.test.js | PASS | All |
| middleware/errorHandler.test.js | PASS | All |
| services/admin.service.test.js | PASS | All |
| services/wallet.service.test.js | PASS | All |
| services/gift.service.test.js | PASS | All |
| services/conversion.service.test.js | PASS | All |
| services/auth.service.test.js | PASS | All |
| utils/errors.test.js | PASS | All |
| utils/crypto.test.js | PASS | All |
| utils/currency.test.js | PASS | All |
| utils/sanitize.test.js | PASS | All |
| models/transaction.model.test.js | PASS | All |
| models/setting.model.test.js | PASS | All |

### Integration Test Suites (7 suites, 103 tests)

| Suite | Tests | Focus |
|-------|-------|-------|
| auth.test.js | 22 | Registration, login, profile, password change, forgot/reset |
| conversion.test.js | 10 | Gift card conversion with exchange rate, balance updates |
| gift.test.js | 16 | Send, preview, claim, IDOR protection, media attachment |
| admin.test.js | 19 | Stats, user management, fraud flags, settings, audit log |
| wallet.test.js | 8 | Balance retrieval, transaction history, cross-user isolation |
| validation.test.js | 16 | XSS, injection, type confusion, oversized input, unknown fields |
| security.test.js | 18 | Auth bypass, escalation, IDOR, error leakage, security headers |

### E2E Test Scenarios (1 suite, 5 tests)

| Scenario | Tests | Description |
|----------|-------|-------------|
| New User Onboarding | 1 | register -> convert -> balance -> send gift -> verify transactions |
| Gift Lifecycle | 1 | send -> preview -> claim -> verify both wallets -> double-claim rejected |
| Admin Moderation | 1 | create users -> flag fraud -> resolve/block -> verify suspended login denied -> reinstate |
| Settings Impact | 1 | admin changes exchange rate -> user converts -> verify new rate applied |
| Password Recovery | 1 | register -> forgot password -> reset -> login with new password -> token consumed |

---

## Coverage Report

### Summary

| Metric | Coverage |
|--------|----------|
| **Statements** | **68.36%** |
| **Branches** | **59.48%** |
| **Functions** | **69.63%** |
| **Lines** | **68.90%** |

### Coverage by Module

| Module | Stmts | Branch | Funcs | Lines | Notes |
|--------|-------|--------|-------|-------|-------|
| **src/utils/** | **100%** | **98.33%** | **100%** | **100%** | Excellent - all utilities fully covered |
| **src/middleware/** | 61.15% | 53.26% | 60% | 60.74% | cors.js and logger.js unused (0%); active middleware at 100% |
| **src/routes/** | 87.5% | - | - | 87.5% | health.routes.js at 37.5%; all API routes at 100% |
| **src/models/** | 82.35% | 74.52% | 86.66% | 84.84% | Good coverage; user.model.calculateTier not exercised |
| **src/services/** | 75.53% | 64.05% | 71.87% | 76.57% | notification/media services low due to external dep mocking |
| **src/controllers/** | 53.77% | 29.16% | 68.57% | 53.35% | stripe/upload/user controllers have low coverage |
| **src/jobs/** | 0% | 0% | 0% | 0% | Background jobs not tested in integration |

### High-Coverage Modules (90%+)

- `src/utils/crypto.js` -- 100%
- `src/utils/currency.js` -- 100%
- `src/utils/errors.js` -- 100%
- `src/utils/sanitize.js` -- 100%
- `src/middleware/auth.js` -- 100%
- `src/middleware/adminOnly.js` -- 100%
- `src/middleware/errorHandler.js` -- 100%
- `src/middleware/validate.js` -- 100%
- `src/middleware/requestId.js` -- 100%
- `src/controllers/gift.controller.js` -- 100%
- `src/models/transaction.model.js` -- 100%
- `src/models/auditLog.model.js` -- 100%
- `src/models/gift.model.js` -- 100%
- `src/services/conversion.service.js` -- 94.44%
- `src/controllers/admin.controller.js` -- 92.68%
- `src/services/auth.service.js` -- 90.27%

### Low-Coverage Modules (<30%)

- `src/controllers/stripe.controller.js` -- 8.42% (requires Stripe mock)
- `src/controllers/user.controller.js` -- 14.7% (user profile update endpoints)
- `src/services/notification.service.js` -- 18.18% (SendGrid/FCM not mocked)
- `src/services/media.service.js` -- 22.22% (GCS not mocked)
- `src/controllers/upload.controller.js` -- 25% (GCS not mocked)
- `src/jobs/*` -- 0% (background job infrastructure)

---

## Bugs Found

See `docs/bugs.md` for full details with reproduction steps.

| ID | Severity | Title | File |
|----|----------|-------|------|
| BUG-001 | CRITICAL | Stripe double-crediting when Redis unavailable | stripe.controller.js |
| BUG-002 | CRITICAL | JWT role not re-verified against database | auth.js middleware |
| BUG-003 | HIGH | notification.service references non-existent `sender_email` | notification.service.js |
| BUG-004 | HIGH | gift.model.js toApiResponse references `video_url` instead of `video_key` | gift.model.js |
| BUG-005 | HIGH | Admin stats fetches ALL transactions for volume calculation | admin.service.js |
| BUG-006 | MEDIUM | Unused middleware files (cors.js, logger.js) | middleware/ |
| BUG-007 | MEDIUM | Wallet transactions endpoint lacks Joi query validation | wallet.routes.js |
| BUG-008 | MEDIUM | HTML in Stripe success response not escaped | stripe.controller.js |
| BUG-009 | MEDIUM | Rate limiter state not isolated between integration tests | rateLimiter.js |
| BUG-010 | LOW | Health routes not tested | health.routes.js |
| BUG-011 | LOW | upload/user controllers have very low coverage | controllers/ |
| BUG-012 | LOW | Google OAuth token verification has weak error handling | auth.service.js |
| BUG-013 | LOW | FieldValue.delete() mock returns null instead of sentinel | setup.js |

---

## Security Test Results

| Test Category | Tests | Result | Notes |
|---------------|-------|--------|-------|
| Authentication Bypass | 5 | PASS | Expired tokens, wrong secret, empty bearer all rejected |
| Authorization Escalation | 4 | PASS | Regular users blocked from all admin endpoints |
| IDOR Protection | 4 | PASS | Gift access, media attachment, balance, transactions all scoped |
| Error Information Leakage | 4 | PASS | No stack traces, no DB details, requestId in all errors |
| Anti-Enumeration | 1 | PASS | Login and forgot-password return same message for existing/non-existing emails |
| Security Headers | 2 | PASS | Helmet headers set, X-Request-Id present |
| XSS Prevention | 2 | PASS | HTML entity encoding applied to all user input |
| Injection Prevention | 3 | PASS | SQL/NoSQL injection and prototype pollution handled |
| Type Confusion | 4 | PASS | Array/number/float/negative all rejected where inappropriate |
| Oversized Input | 4 | PASS | Long email, password, message, name all rejected |
| Unknown Field Stripping | 2 | PASS | Extra fields (role, balance_cents) stripped from request body |

**FINDING (documented as BUG-002):** JWT role escalation is possible because the role claim in the JWT is trusted without database re-verification. A user with a valid token can forge admin access if they know the JWT_SECRET. More critically, role changes by an admin do not take effect until the user's token expires (24 hours).

---

## Risk Assessment

### Ship-Ready Assessment: CONDITIONAL PASS

The application is functional with a strong security posture for its maturity level. However, the following must be addressed before production:

**MUST FIX before production:**
1. **BUG-001 (CRITICAL):** Stripe double-crediting. Financial integrity risk.
2. **BUG-002 (CRITICAL):** JWT role not re-verified. Privilege escalation window.
3. **BUG-003 (HIGH):** Sender email lookup failure. Notification delivery broken.

**SHOULD FIX before production:**
4. **BUG-004 (HIGH):** Gift media URLs always null. Feature broken.
5. **BUG-005 (HIGH):** Stats full-table scan. Will degrade at scale.
6. **BUG-007 (MEDIUM):** Missing wallet transaction query validation.

**CAN FIX post-launch:**
7. **BUG-006, BUG-008, BUG-009:** Dead code, HTML escaping, test infra.
8. **BUG-010-013:** Low severity and informational findings.

### Strengths
- Strong input validation with Joi on all major endpoints
- Comprehensive HTML entity escaping for XSS prevention
- IDOR protection on all user-scoped resources
- Proper error handling that doesn't leak internals
- Anti-enumeration on login and password reset
- Atomic Firestore transactions for financial operations
- Integer cents for all currency (no floating-point money)
- Helmet security headers enabled

### Weaknesses
- External service integration testing is thin (Stripe, SendGrid, GCS, FCM)
- Background job logic has zero test coverage
- Rate limiter state accumulates across test runs (test infra issue)
- JWT-based auth lacks real-time revocation capability
- No request body size limit validation at the Joi level (relies on Express 1MB limit)

---

## Test Infrastructure

### Mock System (`tests/integration/setup.js`)

The integration test infrastructure provides:
- **In-memory Firestore mock** with full query support (where, orderBy, limit, startAfter, count)
- **Firebase Auth mock** (createUser, getUserByEmail, verifyIdToken, updateUser)
- **Redis mock** (disabled for tests)
- **Stripe mock** (disabled for tests)
- **SendGrid mock** (disabled for tests)
- **Test helpers:** `createTestUser`, `createTestGift`, `createTestFraudFlag`, `resetStores`

### Recommendations for Future Testing
1. Add Stripe mock to test checkout session creation and webhook processing
2. Add GCS mock to test media upload signed URL generation
3. Add background job unit tests for gift expiration and scheduled delivery logic
4. Consider using `jest-express-rate-limit-reset` or custom middleware to reset rate limits between tests
5. Add contract tests against the API specification in `docs/api-contracts.md`
