# UniCredit (Stitch) -- Test Plan

**Version:** 3.0
**Date:** 2026-03-17
**Author:** Senior QA Engineer Agent
**Status:** Active

---

## 1. Overview

This test plan covers functional, security, edge case, error handling, and accessibility testing for the UniCredit (Stitch) v3.0 backend API and Flutter frontend. Tests are organized by epic/feature area as defined in `docs/user-stories.md`.

### Test Scope

| Layer | Tool | Coverage Target |
|-------|------|----------------|
| Unit (backend) | Jest | 80%+ services, validators, utils |
| Integration (backend) | Jest + Supertest | All key API flows |
| E2E (scenarios) | Documented scenarios | Critical user journeys |
| Security | Jest + manual | All OWASP Top 10 relevant |
| Frontend | Flutter test (future) | Widget + integration |

---

## 2. Epic 1: Authentication & Account Management

### 2.1 Registration (US-1.1)

**Functional Tests:**
- TC-1.1.1: Register with valid email, password, and name returns 201 with JWT token and user object
- TC-1.1.2: Register with valid email and password (no name) uses email prefix as display name
- TC-1.1.3: Returned user object contains id, name, email, balanceCents=0, tier="STANDARD", role="user"
- TC-1.1.4: JWT token is valid and contains userId and role claims
- TC-1.1.5: Password is stored as bcrypt hash with 12 rounds (not plaintext)

**Validation Tests:**
- TC-1.1.6: Missing email returns 400 VALIDATION_ERROR
- TC-1.1.7: Missing password returns 400 VALIDATION_ERROR
- TC-1.1.8: Invalid email format (no @) returns 400 VALIDATION_ERROR
- TC-1.1.9: Password less than 8 characters returns 400 VALIDATION_ERROR
- TC-1.1.10: Password longer than 128 characters returns 400 VALIDATION_ERROR
- TC-1.1.11: Email longer than 254 characters returns 400 VALIDATION_ERROR
- TC-1.1.12: Name longer than 100 characters returns 400 VALIDATION_ERROR
- TC-1.1.13: Duplicate email returns 409 CONFLICT

**Rate Limiting:**
- TC-1.1.14: 16th registration attempt within 15 minutes from same IP returns 429

**Security Tests:**
- TC-1.1.15: XSS payload in name is escaped (e.g., `<script>alert(1)</script>`)
- TC-1.1.16: SQL injection in email is rejected by email format validation
- TC-1.1.17: Response does not contain password_hash
- TC-1.1.18: Oversized JSON body (>1MB) is rejected

### 2.2 Login (US-1.2)

**Functional Tests:**
- TC-1.2.1: Login with valid credentials returns 200 with JWT token and user object
- TC-1.2.2: JWT token expires after 24 hours
- TC-1.2.3: last_login_at is updated on successful login

**Error Tests:**
- TC-1.2.4: Wrong password returns 401 INVALID_CREDENTIALS with generic message
- TC-1.2.5: Non-existent email returns 401 INVALID_CREDENTIALS (no email enumeration)
- TC-1.2.6: Suspended user login returns 401 with suspension message
- TC-1.2.7: Google OAuth user with no password attempting password login returns 401

**Rate Limiting:**
- TC-1.2.8: 16th login attempt within 15 minutes returns 429

### 2.3 Google OAuth (US-1.3)

**Functional Tests:**
- TC-1.3.1: Valid Google ID token for new user creates account and returns JWT
- TC-1.3.2: Valid Google ID token for existing user logs in and returns JWT
- TC-1.3.3: New Google user has auth_provider="google" and empty password_hash
- TC-1.3.4: Existing suspended Google user returns 401

**Error Tests:**
- TC-1.3.5: Invalid Google ID token returns 401 AUTH_FAILED
- TC-1.3.6: Missing idToken returns 400 VALIDATION_ERROR
- TC-1.3.7: Missing email returns 400 VALIDATION_ERROR

### 2.4 Password Reset (US-1.4)

**Functional Tests:**
- TC-1.4.1: Forgot password with existing email returns 200 and sends email
- TC-1.4.2: Forgot password with non-existent email returns same 200 (no enumeration)
- TC-1.4.3: Reset token is SHA-256 hashed before storage
- TC-1.4.4: Reset token expires after 1 hour
- TC-1.4.5: Valid reset token + new password updates password and invalidates token
- TC-1.4.6: Used reset token returns 400 INVALID_TOKEN (single-use)

**Error Tests:**
- TC-1.4.7: Expired reset token returns 400 INVALID_TOKEN
- TC-1.4.8: Invalid/random reset token returns 400 INVALID_TOKEN
- TC-1.4.9: Reset with password < 8 chars returns 400 VALIDATION_ERROR

**Rate Limiting:**
- TC-1.4.10: 6th forgot-password request within 1 hour returns 429

### 2.5 Change Password (US-1.5)

**Functional Tests:**
- TC-1.5.1: Valid current + new password updates password and returns success
- TC-1.5.2: Password is re-hashed with bcrypt 12 rounds

**Error Tests:**
- TC-1.5.3: Wrong current password returns 401 INVALID_CREDENTIALS
- TC-1.5.4: New password < 8 chars returns 400 VALIDATION_ERROR
- TC-1.5.5: Google OAuth user attempting change password returns 401
- TC-1.5.6: Unauthenticated request returns 401

### 2.6 Get Current User / Auto-Login (US-1.6)

**Functional Tests:**
- TC-1.6.1: GET /auth/me with valid JWT returns user profile
- TC-1.6.2: Response includes all expected fields (id, name, email, balanceCents, tier, role, photoUrl, authProvider, createdAt)

**Error Tests:**
- TC-1.6.3: Expired JWT returns 401 TOKEN_EXPIRED
- TC-1.6.4: Malformed JWT returns 401 AUTHENTICATION_REQUIRED
- TC-1.6.5: Missing Authorization header returns 401
- TC-1.6.6: Token with deleted userId returns 404

---

## 3. Epic 2: Wallet Management

### 3.1 Balance (US-2.1)

**Functional Tests:**
- TC-2.1.1: GET /wallet/balance returns balanceCents, displayBalance, tier
- TC-2.1.2: displayBalance is properly formatted (e.g., "$1,240.50")
- TC-2.1.3: Balance is integer cents (no floating point)

**Error Tests:**
- TC-2.1.4: Unauthenticated request returns 401
- TC-2.1.5: Deleted user returns 404

### 3.2 Transaction History (US-2.2)

**Functional Tests:**
- TC-2.2.1: GET /wallet/transactions returns paginated list in reverse chronological order
- TC-2.2.2: Each transaction has id, amountCents, displayAmount, type, description, category, createdAt
- TC-2.2.3: Credits show positive amountCents with "+" prefix in displayAmount
- TC-2.2.4: Debits show negative amountCents with "-" prefix in displayAmount
- TC-2.2.5: Pagination returns nextCursor and hasMore correctly
- TC-2.2.6: Default limit is 20; custom limit (1-100) is respected
- TC-2.2.7: Filter by category (gift_card, gift_sent, top_up) works correctly
- TC-2.2.8: Filter by type (credit, debit) works correctly

**Edge Cases:**
- TC-2.2.9: Empty transaction list returns empty array with hasMore=false
- TC-2.2.10: Invalid cursor returns empty results (not an error)
- TC-2.2.11: Limit > 100 is rejected or clamped

**IDOR Tests:**
- TC-2.2.12: User A cannot see User B's transactions (enforced by userId from JWT)

---

## 4. Epic 3: Gift Card Conversion

### 4.1 Convert Gift Card (US-3.1 - US-3.5)

**Functional Tests:**
- TC-3.1.1: Convert with valid merchant, cardNumber, amountCents returns credited amount
- TC-3.1.2: creditedCents = amountCents * exchangeRate (rounded to integer)
- TC-3.1.3: User balance is incremented by creditedCents
- TC-3.1.4: A credit transaction is created with category "gift_card"
- TC-3.1.5: Exchange rate defaults to 0.9 when no setting exists
- TC-3.1.6: Exchange rate from settings is used when available
- TC-3.1.7: Response includes newBalanceCents and displayBalance

**Validation Tests:**
- TC-3.1.8: Missing merchant returns 400
- TC-3.1.9: Missing cardNumber returns 400
- TC-3.1.10: amountCents = 0 returns 400
- TC-3.1.11: amountCents < 0 returns 400
- TC-3.1.12: amountCents > 5,000,000 returns 400
- TC-3.1.13: Non-integer amountCents returns 400
- TC-3.1.14: Invalid merchant name returns 400
- TC-3.1.15: Card number with special characters (except dashes) returns 400
- TC-3.1.16: Card number < 4 chars returns 400
- TC-3.1.17: Card number > 50 chars returns 400

**Rate Limiting:**
- TC-3.1.18: 11th conversion within 1 minute returns 429

**Security Tests:**
- TC-3.1.19: XSS in merchant name is sanitized before storage
- TC-3.1.20: Card number is not logged or returned in response

---

## 5. Epic 4: Gift Sending

### 5.1 Send Gift (US-4.1 - US-4.9)

**Functional Tests:**
- TC-4.1.1: Send gift with valid data debits sender, creates gift with status "pending"
- TC-4.1.2: Gift has a unique claim_token (UUID v4) and claim_token_hash (SHA-256)
- TC-4.1.3: Sender's balance is decremented atomically
- TC-4.1.4: A debit transaction is created with category "gift_sent"
- TC-4.1.5: Gift message defaults to "Enjoy your gift!" when not provided
- TC-4.1.6: Gift expires_at is set to created_at + 90 days (default)
- TC-4.1.7: Custom occasion is stored correctly
- TC-4.1.8: Scheduled gift has scheduledAt set

**Validation Tests:**
- TC-4.1.9: Missing recipientEmail returns 400
- TC-4.1.10: Invalid recipientEmail format returns 400
- TC-4.1.11: amountCents = 0 returns 400
- TC-4.1.12: amountCents > balance returns 400 INSUFFICIENT_BALANCE
- TC-4.1.13: amountCents > 5,000,000 returns 400
- TC-4.1.14: Message > 2000 chars returns 400
- TC-4.1.15: scheduledAt in the past returns 400
- TC-4.1.16: Invalid scheduledAt format returns 400

**Atomicity Tests:**
- TC-4.1.17: If gift creation fails, sender balance is NOT debited (transaction rollback)
- TC-4.1.18: Concurrent sends exceeding balance -- only one succeeds

**Security Tests:**
- TC-4.1.19: XSS in message is sanitized
- TC-4.1.20: XSS in occasion is sanitized
- TC-4.1.21: claim_token is never returned in list responses

### 5.2 Get Gift Details

- TC-4.2.1: Sender can view their sent gift
- TC-4.2.2: Recipient can view claimed gift
- TC-4.2.3: Other users get 403 ACCESS_DENIED (IDOR protection)
- TC-4.2.4: Non-existent giftId returns 404

### 5.3 Gift Media

- TC-4.3.1: Sender can attach videoKey to their gift
- TC-4.3.2: Sender can attach audioKey to their gift
- TC-4.3.3: Non-sender gets 403 when attaching media
- TC-4.3.4: videoKey not matching `gifts/{senderId}/*` pattern returns 400
- TC-4.3.5: audioKey not matching `gifts/{senderId}/*` pattern returns 400

---

## 6. Epic 5: Gift Receiving

### 6.1 Preview Gift (US-5.1, US-5.3)

**Functional Tests:**
- TC-5.1.1: GET /gifts/claim/:token with valid pending token returns gift preview
- TC-5.1.2: Preview includes senderName, amountCents, displayAmount, message, occasion, status, expiresAt
- TC-5.1.3: Preview does NOT include claim_token or sender_id

**Error Tests:**
- TC-5.1.4: Invalid token returns 404
- TC-5.1.5: Already claimed gift returns 400 ALREADY_CLAIMED
- TC-5.1.6: Expired gift returns 404

### 6.2 Claim Gift (US-5.2)

**Functional Tests:**
- TC-5.2.1: POST /gifts/claim/:token credits recipient and returns success
- TC-5.2.2: Gift status changes from "pending" to "claimed"
- TC-5.2.3: recipient_user_id and claimed_at are set
- TC-5.2.4: A credit transaction is created with category "gift_received"
- TC-5.2.5: Recipient's balance is incremented by gift amountCents

**Error Tests:**
- TC-5.2.6: Already claimed gift returns 400 ALREADY_CLAIMED
- TC-5.2.7: Expired gift returns 400 GIFT_EXPIRED
- TC-5.2.8: Invalid token returns 404
- TC-5.2.9: Unauthenticated claim attempt returns 401

**Atomicity Tests:**
- TC-5.2.10: Double claim (concurrent) -- only one succeeds (Firestore transaction)

### 6.3 Gift Expiration (US-5.4)

**Functional Tests:**
- TC-5.3.1: processExpiredGifts sets status to "expired" for past-due gifts
- TC-5.3.2: Sender's balance is refunded with amount_cents
- TC-5.3.3: A credit transaction with category "gift_refund" is created
- TC-5.3.4: Already claimed gifts are NOT expired

---

## 7. Epic 6: Payments & Credit

### 7.1 Stripe Prices (US-6.1)

- TC-6.1.1: GET /stripe/prices returns sorted price list
- TC-6.1.2: Each price has id, amountCents, displayAmount, currency
- TC-6.1.3: Stripe not configured returns 503

### 7.2 Checkout Session (US-6.2, US-6.3)

- TC-6.2.1: POST /stripe/create-checkout-session with valid priceId returns checkout URL
- TC-6.2.2: Session metadata contains userId from JWT
- TC-6.2.3: Missing priceId returns 400
- TC-6.2.4: Stripe not configured returns 503

### 7.3 Webhook (US-6.5)

**Functional Tests:**
- TC-6.3.1: Valid webhook with checkout.session.completed credits user
- TC-6.3.2: Duplicate session ID is NOT processed twice (idempotency)
- TC-6.3.3: Event without payment_status=paid is ignored
- TC-6.3.4: Event without userId metadata is ignored
- TC-6.3.5: Transaction record is created with category "top_up"

**Security Tests:**
- TC-6.3.6: Invalid Stripe signature returns 400 WEBHOOK_VERIFICATION_FAILED
- TC-6.3.7: Missing Stripe signature in production returns 400
- TC-6.3.8: Spoofed webhook payload without valid signature is rejected
- TC-6.3.9: Tampered userId in metadata (attempted via raw JSON) is rejected by signature check

### 7.4 Success Redirect (US-6.3)

- TC-6.4.1: GET /stripe/success with valid session_id returns HTML success page
- TC-6.4.2: Balance is credited via success handler (fallback mechanism)
- TC-6.4.3: Already-processed session is NOT credited again
- TC-6.4.4: Missing session_id returns 400

---

## 8. Epic 7: Admin Dashboard

### 8.1 Access Control (US-7.6)

- TC-7.0.1: Non-admin user receives 403 ADMIN_REQUIRED on all /admin/* endpoints
- TC-7.0.2: Unauthenticated request returns 401
- TC-7.0.3: Admin user with valid JWT can access all admin endpoints

### 8.2 Stats (US-7.1)

- TC-7.1.1: GET /admin/stats returns totalVolumeCents, totalUsers, totalTransactions, openFraudFlags
- TC-7.1.2: totalVolumeCents sums only positive transaction amounts
- TC-7.1.3: recentFraudFlags includes only open flags

### 8.3 User Management (US-7.5)

- TC-7.2.1: GET /admin/users returns paginated user list
- TC-7.2.2: Search by name (partial match) filters results
- TC-7.2.3: Search by email (partial match) filters results
- TC-7.2.4: Filter by status (active/suspended) works
- TC-7.2.5: GET /admin/users/:id returns user detail with transactions, gifts, fraud flags

### 8.4 Suspend/Reinstate (US-7.5)

- TC-7.3.1: PUT /admin/users/:id/suspend sets status to "suspended" with reason
- TC-7.3.2: Suspension is audit-logged
- TC-7.3.3: PUT /admin/users/:id/reinstate sets status to "active"
- TC-7.3.4: Reinstatement is audit-logged
- TC-7.3.5: Suspending non-existent user returns 404
- TC-7.3.6: Missing reason returns 400

### 8.5 Fraud Flags (US-7.2)

- TC-7.4.1: GET /admin/fraud-flags returns paginated flags filtered by status
- TC-7.4.2: PUT /admin/fraud-flags/:id/resolve sets status to "resolved"
- TC-7.4.3: Resolution is audit-logged with notes
- TC-7.4.4: PUT /admin/fraud-flags/:id/block suspends user AND resolves flag
- TC-7.4.5: Block action is audit-logged
- TC-7.4.6: Non-existent flag returns 404

### 8.6 Settings (US-7.3, US-7.4)

- TC-7.5.1: PUT /admin/settings/exchange_rate updates rate within 0.01-1.0
- TC-7.5.2: PUT /admin/settings/global_rate_lock toggles boolean
- TC-7.5.3: Setting change is audit-logged with before/after values
- TC-7.5.4: Invalid key returns 400
- TC-7.5.5: exchange_rate > 1.0 returns 400
- TC-7.5.6: exchange_rate < 0.01 returns 400
- TC-7.5.7: Non-boolean value for global_rate_lock returns 400

### 8.7 Audit Log

- TC-7.6.1: GET /admin/audit-log returns paginated entries in reverse chronological order
- TC-7.6.2: Filter by actorId works
- TC-7.6.3: Filter by targetType works
- TC-7.6.4: Each entry has actorId, actorEmail, action, targetType, targetId, beforeValue, afterValue, ipAddress, requestId, createdAt

---

## 9. Epic 8: User Profile

- TC-8.1.1: GET /users/:id returns user profile (own)
- TC-8.1.2: GET /users/:id for other user returns 403 (IDOR)
- TC-8.1.3: Admin can GET any user profile
- TC-8.2.1: PUT /users/:id updates name
- TC-8.2.2: PUT /users/:id updates email
- TC-8.2.3: PUT /users/:id for other user returns 403 (IDOR)
- TC-8.2.4: Admin can PUT any user profile
- TC-8.2.5: XSS in name is sanitized
- TC-8.2.6: Response never includes password_hash

---

## 10. Cross-Cutting Tests

### 10.1 Authentication Middleware

- TC-10.1.1: Missing Authorization header returns 401
- TC-10.1.2: Malformed Authorization header (not "Bearer ...") returns 401
- TC-10.1.3: Expired token returns 401 TOKEN_EXPIRED
- TC-10.1.4: Token signed with wrong secret returns 401
- TC-10.1.5: Empty Bearer token returns 401

### 10.2 Error Handling

- TC-10.2.1: All error responses follow `{ error: { code, message, requestId } }` format
- TC-10.2.2: Stack traces are never included in error responses
- TC-10.2.3: Unhandled exceptions return 500 with generic message
- TC-10.2.4: Invalid JSON body returns 400

### 10.3 Request ID

- TC-10.3.1: Every response includes X-Request-Id header
- TC-10.3.2: Client-provided X-Request-Id is used if present
- TC-10.3.3: Error responses include requestId field

### 10.4 CORS

- TC-10.4.1: Allowed origin receives CORS headers
- TC-10.4.2: Disallowed origin in production is rejected
- TC-10.4.3: No-origin requests (mobile, curl) are allowed

### 10.5 Health Checks

- TC-10.5.1: GET /health returns 200 with status, version, firebase, redis, stripe, timestamp
- TC-10.5.2: GET /health/live always returns 200 with { alive: true }
- TC-10.5.3: GET /health/ready returns 200 when all dependencies are up
- TC-10.5.4: GET /health/ready returns 503 when critical dependency is down

---

## 11. Security-Specific Tests

### 11.1 XSS Prevention

- TC-S.1.1: `<script>alert(1)</script>` in user name is escaped to `&lt;script&gt;...`
- TC-S.1.2: `<img src=x onerror=alert(1)>` in gift message is escaped
- TC-S.1.3: `javascript:alert(1)` in photoUrl is validated as URI
- TC-S.1.4: Backtick injection `` `${malicious}` `` is escaped

### 11.2 Injection Prevention

- TC-S.2.1: SQL injection strings in email field are rejected by email validation
- TC-S.2.2: NoSQL injection `{"$gt": ""}` in string fields is treated as literal string by Joi
- TC-S.2.3: Prototype pollution `__proto__` keys are stripped by Joi (stripUnknown)

### 11.3 IDOR Protection

- TC-S.3.1: User A cannot GET /users/{userB_id}
- TC-S.3.2: User A cannot PUT /users/{userB_id}
- TC-S.3.3: User A cannot GET /gifts/{userB_gift_id}
- TC-S.3.4: User A cannot view User B's transactions (enforced by JWT userId)
- TC-S.3.5: Admin CAN access any user's data

### 11.4 Rate Limit Enforcement

- TC-S.4.1: Auth endpoints enforce 15/15min per IP
- TC-S.4.2: Financial endpoints enforce 10/min per user
- TC-S.4.3: Password reset enforces 5/hour per IP
- TC-S.4.4: Rate limit headers (X-RateLimit-*) are returned

### 11.5 Webhook Security

- TC-S.5.1: Webhook without Stripe-Signature header is rejected in production
- TC-S.5.2: Webhook with invalid signature is rejected
- TC-S.5.3: Replay attack with old timestamp is rejected by Stripe SDK
- TC-S.5.4: Webhook body tampering is detected by signature mismatch

### 11.6 Credential Safety

- TC-S.6.1: No endpoint returns password_hash in response
- TC-S.6.2: Error responses do not leak internal state or stack traces
- TC-S.6.3: Logs do not contain Authorization header values (redacted)
- TC-S.6.4: JWT_SECRET is not "dev-secret-change-in-production" in production mode

---

## 12. Edge Cases & Boundary Tests

### 12.1 Currency Boundaries

- TC-E.1.1: amountCents = 1 (minimum, $0.01) is accepted
- TC-E.1.2: amountCents = 5,000,000 (maximum, $50,000) is accepted
- TC-E.1.3: amountCents = 5,000,001 is rejected
- TC-E.1.4: amountCents = 0 is rejected
- TC-E.1.5: amountCents = -1 is rejected
- TC-E.1.6: amountCents = 1.5 (float) is rejected
- TC-E.1.7: Exchange rate 0.9 * 1 cent = 1 cent (rounded from 0.9)
- TC-E.1.8: Exchange rate 0.9 * 3 cents = 3 cents (rounded from 2.7)

### 12.2 Pagination Boundaries

- TC-E.2.1: limit = 0 is rejected
- TC-E.2.2: limit = 101 is rejected
- TC-E.2.3: Invalid base64 cursor returns first page (graceful fallback)
- TC-E.2.4: Cursor from different user's data does not leak data

### 12.3 Concurrent Operations

- TC-E.3.1: Two concurrent gift sends that would overdraft -- only one succeeds
- TC-E.3.2: Two concurrent claims on the same gift -- only one succeeds
- TC-E.3.3: Webhook + success page processing same session -- only credited once

### 12.4 Input Extremes

- TC-E.4.1: Empty string body {} where fields required returns 400
- TC-E.4.2: Body with extra unknown fields -- stripped by Joi (allowUnknown: false)
- TC-E.4.3: Unicode characters in name and message are handled correctly
- TC-E.4.4: Very long valid email (254 chars) is accepted
- TC-E.4.5: Password with special characters (!@#$%^&*) is accepted

---

## 13. Accessibility Considerations

Note: These are SHOULD/COULD priority and documented for future implementation.

- AC-1: All interactive elements must have semantic labels (Flutter Semantics)
- AC-2: Color contrast ratio >= 4.5:1 for text
- AC-3: Touch targets >= 48x48dp
- AC-4: Error states are communicated via screen readers, not just color
- AC-5: Balance card announces balance to screen readers
- AC-6: Transaction amounts announce credit/debit distinction

---

## 14. Test Data Requirements

### 14.1 Fixtures

- Regular user: email="user@test.com", role="user", balance=10000 (100.00)
- Admin user: email="admin@test.com", role="admin", balance=50000 (500.00)
- Suspended user: email="suspended@test.com", status="suspended"
- Google user: email="google@test.com", auth_provider="google", password_hash=""
- Pending gift: sender_id=user1, recipient_email="recipient@test.com", amount_cents=5000, status="pending"
- Claimed gift: same as above but status="claimed"
- Expired gift: same but expires_at in the past
- Open fraud flag: user_id=user1, severity="high", status="open"

### 14.2 Mock Requirements

- Firebase Admin SDK (Firestore, Auth)
- Stripe SDK (checkout sessions, prices, webhooks)
- SendGrid (email sending)
- Redis (rate limiting, session dedup)
- Google OAuth (tokeninfo endpoint)

---

## 15. Test Execution Plan

| Phase | Tests | Timeline |
|-------|-------|----------|
| Unit (existing) | 495 tests, 18 suites | Continuous (CI) |
| Integration | ~60 tests, 8 suites | This sprint |
| E2E scenarios | 4 documented scenarios | Manual + automation backlog |
| Security | Covered in integration | This sprint |
| Regression | Full suite | Pre-release |
