# UniCredit (Stitch) Backend - Bugs & Issues

**Reviewer:** Senior QA Engineer (Teammate 4)
**Date:** 2026-03-17
**Scope:** Full backend source code review + integration/E2E test findings

---

## Critical Severity

### BUG-001: Stripe Double-Crediting When Redis Unavailable

**Severity:** CRITICAL
**Files:** `backend/src/controllers/stripe.controller.js:84-111` (handleSuccess) and `:162-198` (handleWebhook)
**Impact:** Users can receive double wallet credits for a single Stripe payment

**Description:**
Both `handleSuccess` (redirect handler) and `handleWebhook` (webhook handler) independently credit the user's wallet. The idempotency check relies on Redis (`processed_session:{sessionId}`). When Redis is unavailable (`isRedisEnabled()` returns false), the `alreadyProcessed` variable defaults to `false` in both code paths, meaning both handlers will credit the wallet independently.

**Reproduction Steps:**
1. Configure Stripe but do NOT configure Redis.
2. User completes a Stripe checkout.
3. Stripe redirects user to `/api/v1/stripe/success?session_id=X`.
4. Stripe sends `checkout.session.completed` webhook.
5. Both handlers execute `walletService.creditBalance()` for the same session.

**Expected:** Single credit per session.
**Actual:** Double credit when Redis is down.

**Recommended Fix:** Use a Firestore-based idempotency check as fallback when Redis is unavailable. Store `processed_session` in a Firestore collection with the session ID as document key. Check this before crediting.

---

### BUG-002: JWT Role Not Re-Verified Against Database

**Severity:** CRITICAL
**Files:** `backend/src/middleware/auth.js:25-29`
**Impact:** Privilege escalation persists until token expiry after admin revokes a user's role

**Description:**
The `authMiddleware` extracts the `role` from the JWT payload and trusts it without verifying against the database. If an admin demotes a user or if a user's role is changed in Firestore, the change has no effect until the user's JWT expires (24 hours).

Similarly, if a user is suspended after they obtained a JWT, they can continue making API calls for up to 24 hours because the middleware does not check `status` in the database.

**Reproduction Steps:**
1. User logs in, receives JWT with `role: "admin"`.
2. Another admin demotes user to `role: "user"` in Firestore.
3. User continues using the same JWT -- still has admin access.

**Expected:** Role/status changes take effect immediately.
**Actual:** Changes take effect only after token expiry (24h).

**Recommended Fix:** Add optional database lookup for sensitive endpoints (admin routes, financial operations) or implement a token revocation list in Redis. At minimum, the `adminOnly` middleware should re-check the user's role from Firestore.

---

## High Severity

### BUG-003: notification.service.js References Non-Existent Field `sender_email`

**Severity:** HIGH
**Files:** `backend/src/services/notification.service.js:83`, `:150`
**Impact:** Gift-claimed and gift-expiring notifications are sent to empty string or silently fail

**Description:**
The functions `sendGiftClaimedEmail` (line 83) and `sendGiftExpiringWarning` (line 150) reference `gift.sender_email`, but the gift document schema (`backend/src/models/gift.model.js:33-52`) stores `sender_id` (user ID), not `sender_email`. The email field does not exist on the gift document.

The `||` fallback sends to empty string, which will fail silently at SendGrid.

**Reproduction Steps:**
1. Recipient claims a gift.
2. System attempts to call `sendGiftClaimedEmail(giftData, recipientName)`.
3. `gift.sender_email` is `undefined`, so `to:` becomes `''`.
4. Email is never delivered.

**Expected:** Sender receives email notification that their gift was claimed.
**Actual:** Email is never sent because `sender_email` is not a field on the gift document.

**Recommended Fix:** Look up sender email from `db.collection('users').doc(gift.sender_id)` before calling the notification function, or pass `senderEmail` as a parameter.

---

### BUG-004: gift.model.js toApiResponse References Non-Existent Fields

**Severity:** HIGH
**Files:** `backend/src/models/gift.model.js:72-73`, `:93-94`
**Impact:** API responses for gifts always have `videoUrl: null` and `audioUrl: null` even when media is attached

**Description:**
The `toApiResponse` function (line 72-73) and `toClaimPreviewResponse` (line 93-94) reference `data.video_url` and `data.audio_url`, but the document schema stores `video_key` and `audio_key`. These are storage object keys, not URLs. The API response should either map `video_key`/`audio_key` to signed URLs or use the correct field names.

**Code:**
```javascript
videoUrl: data.video_url || null,  // Should be data.video_key
audioUrl: data.audio_url || null,  // Should be data.audio_key
```

**Expected:** Gift API response includes video/audio URLs for gifts with attached media.
**Actual:** Always returns `null` because `video_url`/`audio_url` fields do not exist on the document.

**Recommended Fix:** Either generate signed URLs from `video_key`/`audio_key` using `media.service.js`, or rename the fields in the response to `videoKey`/`audioKey` and let the client generate URLs.

---

### BUG-005: Admin Stats Fetches ALL Transactions for Volume Calculation

**Severity:** HIGH
**Files:** `backend/src/services/admin.service.js:41-45`
**Impact:** Performance degradation and potential OOM at scale

**Description:**
The `getStats` function fetches the entire `transactions` collection into memory to calculate total volume:
```javascript
const txSnap = await db.collection('transactions').get();
let totalVolumeCents = 0;
txSnap.docs.forEach((d) => { ... });
```

This loads ALL transaction documents. At scale (100k+ transactions), this will cause high latency, memory pressure, and Firestore read cost spikes.

**Expected:** Efficient aggregation (e.g., maintain a running counter in a stats document).
**Actual:** Full collection scan on every admin stats request.

**Recommended Fix:** Maintain a `platform_stats` document in the `settings` collection that is updated atomically whenever a transaction is created (using `FieldValue.increment`). Read this single document in `getStats`.

---

## Medium Severity

### BUG-006: Unused Middleware Files (cors.js, logger.js)

**Severity:** MEDIUM
**Files:** `backend/src/middleware/cors.js`, `backend/src/middleware/logger.js`
**Impact:** Dead code confusion; maintained files not actually used

**Description:**
Both `cors.js` and `logger.js` exist as middleware files but are never imported or used by `app.js`. The app uses inline CORS configuration (via the `cors` npm package directly) and inline logging. These files provide more feature-rich implementations (the logger has structured JSON output, the CORS middleware has more detailed origin validation) but they are not wired in.

**Expected:** Either use these middleware files or remove them.
**Actual:** Dead code that may confuse future maintainers.

---

### BUG-007: Wallet Transactions Endpoint Lacks Joi Query Validation

**Severity:** MEDIUM
**Files:** `backend/src/routes/wallet.routes.js:14`
**Impact:** No validation on query parameters (cursor, limit, category, type)

**Description:**
The `GET /api/v1/wallet/transactions` endpoint does not use any Joi schema validation for query parameters. While the controller manually parses `limit` and passes other params through, there is no validation for:
- `limit` (could receive negative numbers, strings, or very large values)
- `cursor` (could receive malformed base64)
- `category` (no enumeration check)
- `type` (no enumeration check)

All other list endpoints (admin users, fraud flags, audit log) have Joi query validation.

**Expected:** Consistent validation across all paginated endpoints.
**Actual:** No query validation on the wallet transactions endpoint.

**Recommended Fix:** Create a `walletTransactionsQuery` schema in `validators/wallet.validator.js` and add `validate(walletTransactionsQuery)` to the route.

---

### BUG-008: HTML in Stripe Success Response Not Escaped

**Severity:** MEDIUM
**Files:** `backend/src/controllers/stripe.controller.js:114-118`
**Impact:** Potential reflected XSS via `displayAmount`

**Description:**
The `handleSuccess` handler generates HTML that includes `displayAmount` derived from `session.amount_total`. While `centsToDisplay` produces a safe format (`$X.XX`), the value flows from Stripe session metadata. If an attacker could manipulate the `amount_total` field (unlikely but defense-in-depth matters), the raw HTML template interpolation could allow XSS.

```javascript
res.send(`<html><body>...
  <p>${displayAmount} has been added to your wallet.</p>
</body></html>`);
```

**Expected:** All dynamic values in HTML responses should be HTML-entity-encoded.
**Actual:** Template literal interpolation without escaping.

**Recommended Fix:** Use `sanitizeString(displayAmount)` or a proper template engine for the HTML responses in stripe.controller.js.

---

### BUG-009: Rate Limiter State Not Isolated Between Integration Tests

**Severity:** MEDIUM (test infrastructure)
**Files:** `backend/src/middleware/rateLimiter.js`
**Impact:** Integration tests can fail due to rate limit accumulation

**Description:**
The `express-rate-limit` middleware uses an in-memory store that persists across the entire test run. Since all integration tests share the same Express app instance, requests from earlier tests count against the rate limit in later tests. This causes intermittent 429 failures in tests that make many requests to rate-limited endpoints (e.g., auth registration).

**Expected:** Each test starts with a clean rate limit state.
**Actual:** Rate limit counters accumulate across all tests.

**Recommended Fix:** Export a function to reset the rate limiter state for testing, or create the rate limiters lazily so they can be re-initialized. Alternatively, set very high limits when `NODE_ENV === 'test'`.

---

## Low Severity

### BUG-010: Health Routes Not Tested

**Severity:** LOW
**Files:** `backend/src/routes/health.routes.js`
**Impact:** 0% test coverage for health check endpoints

**Description:**
The health check routes (`/health`, `/ready`) have zero test coverage. While simple, they may include Firebase/Redis connectivity checks that should be verified.

---

### BUG-011: upload.controller.js and user.controller.js Have Very Low Coverage

**Severity:** LOW
**Files:** `backend/src/controllers/upload.controller.js` (25% coverage), `backend/src/controllers/user.controller.js` (14.7% coverage)
**Impact:** Upload and user profile update functionality is untested through integration tests

**Description:**
These controllers handle media uploads (signed URL generation) and user profile updates (notification preferences, FCM token registration). No integration tests exercise these endpoints.

---

### BUG-012: Google OAuth Token Verification Has Weak Error Handling

**Severity:** LOW
**Files:** `backend/src/services/auth.service.js:158-178`
**Impact:** Silent failure modes

**Description:**
The Google OAuth verification first tries the `oauth2.googleapis.com/tokeninfo` endpoint via raw `https.get`. If this fails, it falls through to Firebase Admin SDK `verifyIdToken`. Both failures are silently caught with empty `catch` blocks. While this is intentional for fallthrough logic, there is no logging or metrics for verification failures, making debugging difficult.

---

### BUG-013: `FieldValue.delete()` Returns `null` Instead of Sentinel

**Severity:** LOW (test infrastructure only)
**Files:** `tests/integration/setup.js:219`
**Impact:** Tests cannot properly simulate Firestore field deletion

**Description:**
The mock `FieldValue.delete()` returns `null` instead of a sentinel value. In the real Firestore, `FieldValue.delete()` removes the field entirely. The mock just sets it to `null`, which is a different behavior (field exists with null value vs. field does not exist).

---

## Informational Findings

### INFO-001: No CSRF Protection for Stripe Success Redirect

**Files:** `backend/src/controllers/stripe.controller.js:69-126`

The `handleSuccess` endpoint (`GET /api/v1/stripe/success?session_id=X`) credits the wallet based on the `session_id` query parameter without any CSRF token. While Stripe session IDs are opaque and the endpoint verifies payment status via the Stripe API, an attacker who obtains a session_id could trigger the credit by navigating the victim to this URL.

Mitigation: The Redis idempotency check prevents double-crediting. However, if Redis is down (see BUG-001), this endpoint is exploitable.

### INFO-002: Background Jobs Have 0% Test Coverage

**Files:** `backend/src/jobs/` (4 files)

The gift expiration, scheduled delivery, and session cleanup background jobs have zero test coverage. These handle critical business logic (gift refunds, delivery notifications).

### INFO-003: `media.service.js` and `notification.service.js` Have Low Integration Coverage

Both services gracefully degrade when their backing services (GCS, SendGrid) are not configured, which is appropriate. However, the integration tests only exercise the "not configured" path. The actual send/upload paths require mocking the external clients.
