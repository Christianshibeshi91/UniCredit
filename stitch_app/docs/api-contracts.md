# UniCredit (Stitch) -- API Contract Definitions

**Version:** 3.0
**Date:** 2026-03-17
**Status:** Draft
**Author:** Solution Architect Agent

---

## 1. Conventions

### 1.1 Base URL

```
Production:  https://api.unicredit.app/api/v1
Development: http://localhost:3000/api/v1
```

### 1.2 Versioning

URL prefix versioning: `/api/v1/`. Breaking changes result in a new version (`/api/v2/`). Non-breaking additions (new fields, new endpoints) are added to the current version.

### 1.3 Authentication

All endpoints except those marked **Public** require a Bearer token:

```
Authorization: Bearer <jwt_token>
```

Tokens are obtained from `/auth/login`, `/auth/register`, or `/auth/google`. Tokens expire after 24 hours.

### 1.4 Request Format

- Content-Type: `application/json`
- Exception: Stripe webhook uses `application/json` with raw body parsing

### 1.5 Response Format

**Success:**
```json
{
  "data": { ... }
}
```

**Error:**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message.",
    "requestId": "req-abc-123"
  }
}
```

### 1.6 Pagination (Cursor-Based)

Paginated endpoints accept:
- `cursor` (string, optional): Opaque cursor from previous response. Omit for first page.
- `limit` (integer, optional): Number of items. Default 20, max 100.

Paginated responses include:
```json
{
  "data": [ ... ],
  "pagination": {
    "nextCursor": "eyJjcmVhdGVkX2F0IjoiMjAyNi0wMy0xNyJ9",
    "hasMore": true,
    "limit": 20
  }
}
```

The cursor is a base64-encoded JSON object containing the last item's sort key (e.g., `created_at`). Clients treat it as opaque.

### 1.7 Currency

All monetary values are **integer cents**. Fields are suffixed with `Cents` (request/response) or `_cents` (database).

| API Field | Meaning | Example |
|-----------|---------|---------|
| `amountCents` | Amount in cents | `1250` = $12.50 |
| `balanceCents` | Balance in cents | `124050` = $1,240.50 |
| `displayAmount` | Formatted string (read-only, convenience) | `"$12.50"` |

### 1.8 Common Error Codes

| Code | HTTP Status | Meaning |
|------|------------|---------|
| `VALIDATION_ERROR` | 400 | Request body failed schema validation |
| `AUTHENTICATION_REQUIRED` | 401 | Missing or invalid auth token |
| `TOKEN_EXPIRED` | 401 | JWT has expired |
| `ACCESS_DENIED` | 403 | Insufficient permissions |
| `ADMIN_REQUIRED` | 403 | Admin role required |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Duplicate resource (e.g., email already registered) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | External service not configured/available |

---

## 2. Authentication Endpoints

### 2.1 POST /api/v1/auth/register

**Public** | Rate limit: 15/15min per IP

Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "Alex Rivers"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| email | string | Yes | Valid email, max 254 chars |
| password | string | Yes | Min 8, max 128 chars |
| name | string | No | Max 100 chars |

**Response (201 Created):**
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "abc123",
      "name": "Alex Rivers",
      "email": "user@example.com",
      "balanceCents": 0,
      "tier": "STANDARD",
      "role": "user",
      "createdAt": "2026-03-17T14:30:00.000Z"
    }
  }
}
```

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 400 | VALIDATION_ERROR | "Email and password required" |
| 400 | VALIDATION_ERROR | "Invalid email format" |
| 400 | VALIDATION_ERROR | "Password must be at least 8 characters" |
| 409 | CONFLICT | "Email already registered" |
| 429 | RATE_LIMIT_EXCEEDED | "Too many requests. Please try again later." |

---

### 2.2 POST /api/v1/auth/login

**Public** | Rate limit: 15/15min per IP

Log in with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "abc123",
      "name": "Alex Rivers",
      "email": "user@example.com",
      "balanceCents": 124050,
      "tier": "GOLD",
      "role": "user",
      "createdAt": "2026-03-17T14:30:00.000Z"
    }
  }
}
```

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 400 | VALIDATION_ERROR | "Email and password required" |
| 401 | INVALID_CREDENTIALS | "Invalid email or password" |
| 429 | RATE_LIMIT_EXCEEDED | "Too many requests. Please try again later." |

---

### 2.3 POST /api/v1/auth/google

**Public** | Rate limit: 15/15min per IP

Sign in or register with Google OAuth.

**Request:**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIs...",
  "email": "user@gmail.com",
  "displayName": "Alex Rivers",
  "photoUrl": "https://lh3.googleusercontent.com/..."
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| idToken | string | Yes | Google ID token |
| email | string | Yes | Valid email |
| displayName | string | No | Max 100 chars |
| photoUrl | string | No | Valid URL |

**Response (200 OK):** Same structure as login response.

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 400 | VALIDATION_ERROR | "Google ID token and email required" |
| 401 | AUTH_FAILED | "Google authentication failed" |

---

### 2.4 GET /api/v1/auth/me

**Authenticated** | Rate limit: General

Get the current user's profile.

**Response (200 OK):**
```json
{
  "data": {
    "id": "abc123",
    "name": "Alex Rivers",
    "email": "user@example.com",
    "balanceCents": 124050,
    "tier": "GOLD",
    "role": "user",
    "photoUrl": null,
    "authProvider": "email",
    "createdAt": "2026-03-17T14:30:00.000Z"
  }
}
```

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 401 | AUTHENTICATION_REQUIRED | "Authentication required" |
| 401 | TOKEN_EXPIRED | "Invalid or expired token" |
| 404 | NOT_FOUND | "User not found" |

---

### 2.5 POST /api/v1/auth/change-password

**Authenticated** | Rate limit: Auth (15/15min)

Change the current user's password.

**Request:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "success": true,
    "message": "Password updated successfully"
  }
}
```

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 400 | VALIDATION_ERROR | "Both current and new password required" |
| 400 | VALIDATION_ERROR | "New password must be at least 8 characters" |
| 401 | INVALID_CREDENTIALS | "Current password is incorrect" |

---

### 2.6 POST /api/v1/auth/forgot-password

**Public** | Rate limit: 5/hour per IP

Request a password reset email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "message": "If that email exists, reset instructions have been sent."
  }
}
```

Note: Always returns 200 regardless of whether the email exists (prevents email enumeration).

---

### 2.7 POST /api/v1/auth/reset-password

**Public** | Rate limit: Auth (15/15min)

Reset password using a token from the reset email.

**Request:**
```json
{
  "token": "reset-token-uuid",
  "newPassword": "newSecurePassword456"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "success": true,
    "message": "Password has been reset. Please log in."
  }
}
```

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 400 | VALIDATION_ERROR | "Token and new password required" |
| 400 | INVALID_TOKEN | "Reset token is invalid or has expired" |

---

## 3. User Endpoints

### 3.1 GET /api/v1/users/:id

**Authenticated** | Rate limit: General | IDOR Protected

Get a user's profile. Users can only access their own profile; admins can access any.

**Response (200 OK):**
```json
{
  "data": {
    "id": "abc123",
    "name": "Alex Rivers",
    "email": "user@example.com",
    "balanceCents": 124050,
    "tier": "GOLD",
    "role": "user",
    "photoUrl": null,
    "createdAt": "2026-03-17T14:30:00.000Z"
  }
}
```

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 403 | ACCESS_DENIED | "Access denied" |
| 404 | NOT_FOUND | "User not found" |

---

### 3.2 PUT /api/v1/users/:id

**Authenticated** | Rate limit: General | IDOR Protected

Update user profile. Users can only update their own profile.

**Request:**
```json
{
  "name": "Alex Rivers Updated"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| name | string | No | Max 100 chars, sanitized |
| email | string | No | Valid email (may require re-verification post-MVP) |

**Response (200 OK):**
```json
{
  "data": {
    "id": "abc123",
    "name": "Alex Rivers Updated",
    "email": "user@example.com",
    "balanceCents": 124050,
    "tier": "GOLD",
    "role": "user"
  }
}
```

---

## 4. Wallet Endpoints

### 4.1 GET /api/v1/wallet/balance

**Authenticated** | Rate limit: General

Get the current user's balance. Uses the authenticated user's ID from JWT.

**Response (200 OK):**
```json
{
  "data": {
    "balanceCents": 124050,
    "displayBalance": "$1,240.50",
    "tier": "GOLD"
  }
}
```

---

### 4.2 GET /api/v1/wallet/transactions

**Authenticated** | Rate limit: General | Paginated

Get the current user's transaction history.

**Query Parameters:**
| Param | Type | Default | Constraints |
|-------|------|---------|-------------|
| cursor | string | null | Opaque pagination cursor |
| limit | integer | 20 | 1-100 |
| category | string | null | Filter: gift_card, gift_sent, gift_received, gift_refund, top_up |
| type | string | null | Filter: credit, debit |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "tx_abc123",
      "amountCents": 50000,
      "displayAmount": "+$500.00",
      "type": "credit",
      "description": "Amazon Gift Card Conversion",
      "category": "gift_card",
      "referenceId": null,
      "createdAt": "2026-03-14T10:00:00.000Z"
    },
    {
      "id": "tx_def456",
      "amountCents": -10000,
      "displayAmount": "-$100.00",
      "type": "debit",
      "description": "Sent Gift to sarah@example.com",
      "category": "gift_sent",
      "referenceId": "gift_xyz789",
      "createdAt": "2026-03-15T14:30:00.000Z"
    }
  ],
  "pagination": {
    "nextCursor": "eyJjcmVhdGVkX2F0IjoiMjAyNi0wMy0xNFQxMDowMDowMC4wMDBaIn0=",
    "hasMore": true,
    "limit": 20
  }
}
```

---

## 5. Gift Card Conversion Endpoints

### 5.1 POST /api/v1/convert

**Authenticated** | Rate limit: Financial (10/min)

Convert a gift card to UniCredit balance.

**Request:**
```json
{
  "merchant": "Amazon",
  "cardNumber": "XXXX-XXXX-XXXX-1234",
  "pin": "1234",
  "amountCents": 5000
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| merchant | string | Yes | Must be in allowed merchant list |
| cardNumber | string | Yes | 4-50 chars, alphanumeric + dashes |
| pin | string | No | Max 20 chars |
| amountCents | integer | Yes | > 0, <= 5000000 |

**Response (200 OK):**
```json
{
  "data": {
    "success": true,
    "creditedCents": 4500,
    "displayCredited": "$45.00",
    "newBalanceCents": 128550,
    "displayBalance": "$1,285.50",
    "exchangeRate": 0.9
  }
}
```

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 400 | VALIDATION_ERROR | "Invalid amount. Must be between $0.01 and $50,000.00." |
| 400 | VALIDATION_ERROR | "Merchant and card number required" |
| 429 | RATE_LIMIT_EXCEEDED | "Too many requests. Please try again later." |

---

## 6. Gift Endpoints

### 6.1 POST /api/v1/gifts/send

**Authenticated** | Rate limit: Financial (10/min)

Send a UniCredit gift to a recipient via email.

**Request:**
```json
{
  "recipientEmail": "sarah@example.com",
  "amountCents": 10000,
  "message": "Happy Birthday! Hope you enjoy this treat on me.",
  "occasion": "Birthday",
  "scheduledAt": null
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| recipientEmail | string | Yes | Valid email |
| amountCents | integer | Yes | > 0, <= 5000000, <= sender's balance |
| message | string | No | Max 2000 chars, sanitized. Default: "Enjoy your gift!" |
| occasion | string | No | From allowed list or custom (max 100 chars) |
| scheduledAt | string (ISO 8601) | No | Must be in the future. Null = immediate |

**Response (200 OK):**
```json
{
  "data": {
    "success": true,
    "giftId": "gift_abc123",
    "newBalanceCents": 114050,
    "displayBalance": "$1,140.50"
  }
}
```

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 400 | VALIDATION_ERROR | "Recipient email and amount required" |
| 400 | VALIDATION_ERROR | "Invalid recipient email" |
| 400 | VALIDATION_ERROR | "Invalid amount. Must be between $0.01 and $50,000.00." |
| 400 | INSUFFICIENT_BALANCE | "Insufficient balance" |

---

### 6.2 GET /api/v1/gifts/:id

**Authenticated** | Rate limit: General

Get gift details. Accessible by sender or recipient.

**Response (200 OK):**
```json
{
  "data": {
    "id": "gift_abc123",
    "senderName": "Alex Rivers",
    "recipientEmail": "sarah@example.com",
    "amountCents": 10000,
    "displayAmount": "$100.00",
    "message": "Happy Birthday!",
    "occasion": "Birthday",
    "status": "pending",
    "videoUrl": "https://storage.googleapis.com/signed-url...",
    "audioUrl": null,
    "scheduledAt": null,
    "expiresAt": "2026-06-15T14:30:00.000Z",
    "claimedAt": null,
    "createdAt": "2026-03-17T14:30:00.000Z"
  }
}
```

---

### 6.3 GET /api/v1/gifts/claim/:token

**Public** | Rate limit: General

Preview a gift before claiming. The claim token is from the email link.

**Response (200 OK):**
```json
{
  "data": {
    "senderName": "Alex Rivers",
    "amountCents": 10000,
    "displayAmount": "$100.00",
    "message": "Happy Birthday!",
    "occasion": "Birthday",
    "videoUrl": "https://storage.googleapis.com/signed-url...",
    "audioUrl": null,
    "status": "pending",
    "expiresAt": "2026-06-15T14:30:00.000Z"
  }
}
```

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 404 | NOT_FOUND | "Gift not found or has expired" |
| 400 | ALREADY_CLAIMED | "This gift has already been claimed" |

---

### 6.4 POST /api/v1/gifts/claim/:token

**Authenticated** | Rate limit: Financial

Claim a gift and credit it to the authenticated user's wallet.

**Request:** Empty body (user identity from JWT).

**Response (200 OK):**
```json
{
  "data": {
    "success": true,
    "creditedCents": 10000,
    "displayCredited": "$100.00",
    "newBalanceCents": 10000,
    "displayBalance": "$100.00",
    "giftId": "gift_abc123",
    "senderName": "Alex Rivers",
    "occasion": "Birthday",
    "message": "Happy Birthday!"
  }
}
```

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 404 | NOT_FOUND | "Gift not found or has expired" |
| 400 | ALREADY_CLAIMED | "This gift has already been claimed" |
| 400 | GIFT_EXPIRED | "This gift has expired" |

---

### 6.5 PATCH /api/v1/gifts/:id/media

**Authenticated** | Rate limit: General

Attach media references to a gift. Only the sender can do this.

**Request:**
```json
{
  "videoKey": "gifts/abc123/uuid.mp4",
  "audioKey": "gifts/abc123/uuid.aac"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| videoKey | string | No | Must match `gifts/{userId}/*` pattern |
| audioKey | string | No | Must match `gifts/{userId}/*` pattern |

**Response (200 OK):**
```json
{
  "data": {
    "success": true
  }
}
```

---

## 7. Upload Endpoints

### 7.1 POST /api/v1/uploads/signed-url

**Authenticated** | Rate limit: General

Generate a signed URL for direct-to-GCS file upload.

**Request:**
```json
{
  "fileType": "video",
  "contentType": "video/mp4"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| fileType | string | Yes | "video" or "audio" |
| contentType | string | Yes | Must be in allowed MIME types per fileType |

**Response (200 OK):**
```json
{
  "data": {
    "signedUrl": "https://storage.googleapis.com/unicredit-media/...",
    "objectKey": "gifts/user_abc/550e8400-e29b.mp4",
    "expiresAt": "2026-03-17T15:00:00.000Z",
    "maxSizeBytes": 52428800
  }
}
```

---

## 8. Stripe Endpoints

### 8.1 GET /api/v1/stripe/prices

**Authenticated** | Rate limit: General

List available top-up price options from Stripe.

**Response (200 OK):**
```json
{
  "data": [
    { "id": "price_abc", "amountCents": 1000, "displayAmount": "$10", "currency": "usd" },
    { "id": "price_def", "amountCents": 2500, "displayAmount": "$25", "currency": "usd" },
    { "id": "price_ghi", "amountCents": 5000, "displayAmount": "$50", "currency": "usd" },
    { "id": "price_jkl", "amountCents": 10000, "displayAmount": "$100", "currency": "usd" },
    { "id": "price_mno", "amountCents": 20000, "displayAmount": "$200", "currency": "usd" },
    { "id": "price_pqr", "amountCents": 50000, "displayAmount": "$500", "currency": "usd" }
  ]
}
```

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 503 | SERVICE_UNAVAILABLE | "Stripe not configured" |

---

### 8.2 POST /api/v1/stripe/create-checkout-session

**Authenticated** | Rate limit: Financial (10/min)

Create a Stripe Checkout session for wallet top-up.

**Request:**
```json
{
  "priceId": "price_abc123"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "url": "https://checkout.stripe.com/c/pay/...",
    "sessionId": "cs_abc123"
  }
}
```

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 400 | VALIDATION_ERROR | "priceId required" |
| 503 | SERVICE_UNAVAILABLE | "Stripe not configured" |

---

### 8.3 GET /api/v1/stripe/success

**Public** (Stripe redirect)

Success redirect page after Stripe Checkout. Credits user via session metadata.

**Query Parameters:**
| Param | Type | Required |
|-------|------|----------|
| session_id | string | Yes |

**Response (200 OK):** HTML page confirming payment.

---

### 8.4 GET /api/v1/stripe/cancel

**Public** (Stripe redirect)

Cancel redirect page. No side effects.

**Response (200 OK):** HTML page with cancellation message.

---

### 8.5 POST /api/v1/stripe/webhook

**Public** (Stripe server-to-server) | No rate limit | **Signature verification mandatory**

Process Stripe webhook events.

**Headers:**
```
Stripe-Signature: t=1679045400,v1=abc123...
Content-Type: application/json
```

**Request:** Raw Stripe event JSON (parsed by `express.raw()`).

**Handled Events:**
| Event | Action |
|-------|--------|
| `checkout.session.completed` (payment_status: paid) | Credit user balance, create transaction |

**Response (200 OK):**
```json
{ "received": true }
```

**Errors:**
| Status | Code | Cause |
|--------|------|-------|
| 400 | WEBHOOK_VERIFICATION_FAILED | Invalid or missing signature |

---

## 9. Admin Endpoints

All admin endpoints require `role: admin` in the JWT.

### 9.1 GET /api/v1/admin/stats

**Admin** | Rate limit: Admin (60/min)

Get platform-wide metrics.

**Response (200 OK):**
```json
{
  "data": {
    "totalVolumeCents": 15000000,
    "displayVolume": "$150,000.00",
    "totalUsers": 1247,
    "totalTransactions": 8934,
    "openFraudFlags": 3,
    "recentFraudFlags": [
      {
        "id": "flag_abc",
        "userName": "Alex Johnson",
        "reason": "Multiple IP logins",
        "amountCents": 245000,
        "severity": "high",
        "status": "open",
        "createdAt": "2026-03-17T10:00:00.000Z"
      }
    ]
  }
}
```

---

### 9.2 GET /api/v1/admin/users

**Admin** | Rate limit: Admin | Paginated

List all users with search capability.

**Query Parameters:**
| Param | Type | Default | Constraints |
|-------|------|---------|-------------|
| cursor | string | null | Pagination cursor |
| limit | integer | 50 | 1-100 |
| search | string | null | Search by name or email (partial match) |
| status | string | null | Filter: active, suspended |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "user_abc",
      "name": "Alex Rivers",
      "email": "alex@example.com",
      "balanceCents": 124050,
      "tier": "GOLD",
      "role": "user",
      "status": "active",
      "createdAt": "2026-03-17T14:30:00.000Z",
      "lastLoginAt": "2026-03-17T14:30:00.000Z"
    }
  ],
  "pagination": {
    "nextCursor": "...",
    "hasMore": true,
    "limit": 50
  }
}
```

---

### 9.3 GET /api/v1/admin/users/:id

**Admin** | Rate limit: Admin

Get detailed user information including recent transactions.

**Response (200 OK):**
```json
{
  "data": {
    "user": {
      "id": "user_abc",
      "name": "Alex Rivers",
      "email": "alex@example.com",
      "balanceCents": 124050,
      "tier": "GOLD",
      "role": "user",
      "status": "active",
      "authProvider": "email",
      "createdAt": "2026-03-17T14:30:00.000Z",
      "lastLoginAt": "2026-03-17T14:30:00.000Z"
    },
    "recentTransactions": [ ... ],
    "sentGifts": [ ... ],
    "fraudFlags": [ ... ]
  }
}
```

---

### 9.4 PUT /api/v1/admin/users/:id/suspend

**Admin** | Rate limit: Admin

Suspend a user account. Audit-logged.

**Request:**
```json
{
  "reason": "Suspected fraudulent gift card submissions"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "success": true,
    "message": "User suspended"
  }
}
```

---

### 9.5 PUT /api/v1/admin/users/:id/reinstate

**Admin** | Rate limit: Admin

Reinstate a suspended user account. Audit-logged.

**Response (200 OK):**
```json
{
  "data": {
    "success": true,
    "message": "User reinstated"
  }
}
```

---

### 9.6 GET /api/v1/admin/fraud-flags

**Admin** | Rate limit: Admin | Paginated

List fraud flags.

**Query Parameters:**
| Param | Type | Default |
|-------|------|---------|
| status | string | "open" |
| cursor | string | null |
| limit | integer | 20 |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "flag_abc",
      "userId": "user_xyz",
      "userName": "Alex Johnson",
      "userEmail": "alex.j@example.com",
      "reason": "Multiple IP logins",
      "amountCents": 245000,
      "severity": "high",
      "status": "open",
      "createdAt": "2026-03-17T10:00:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

---

### 9.7 PUT /api/v1/admin/fraud-flags/:id/resolve

**Admin** | Rate limit: Admin

Mark a fraud flag as resolved. Audit-logged.

**Request:**
```json
{
  "notes": "Verified legitimate user with multiple devices"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "success": true,
    "message": "Fraud flag resolved"
  }
}
```

---

### 9.8 PUT /api/v1/admin/fraud-flags/:id/block

**Admin** | Rate limit: Admin

Block the flagged user (suspend account) and resolve the flag. Audit-logged.

**Request:**
```json
{
  "notes": "Confirmed fraudulent activity"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "success": true,
    "message": "User blocked and fraud flag resolved"
  }
}
```

---

### 9.9 PUT /api/v1/admin/settings/:key

**Admin** | Rate limit: Admin

Update a platform setting. Audit-logged.

**Request:**
```json
{
  "value": 0.85
}
```

| Key | Value Type | Constraints |
|-----|-----------|-------------|
| exchange_rate | number | 0.01 - 1.0 |
| global_rate_lock | boolean | true/false |
| standard_spread | number | 0 - 10000 (basis points) |
| gift_expiration_days | number | 1 - 365 |

**Response (200 OK):**
```json
{
  "data": {
    "success": true,
    "key": "exchange_rate",
    "value": 0.85,
    "previousValue": 0.9
  }
}
```

---

### 9.10 GET /api/v1/admin/audit-log

**Admin** | Rate limit: Admin | Paginated

View the audit log of admin actions.

**Query Parameters:**
| Param | Type | Default |
|-------|------|---------|
| cursor | string | null |
| limit | integer | 50 |
| actorId | string | null |
| targetType | string | null |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "audit_abc",
      "actorId": "admin_user",
      "actorEmail": "admin@unicredit.app",
      "action": "update_setting",
      "targetType": "setting",
      "targetId": "exchange_rate",
      "beforeValue": 0.9,
      "afterValue": 0.85,
      "ipAddress": "192.168.1.1",
      "requestId": "req-abc-123",
      "createdAt": "2026-03-17T14:30:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

---

## 10. Health Endpoints

### 10.1 GET /health

**Public** | No rate limit

Basic health check.

**Response (200 OK):**
```json
{
  "status": "ok",
  "version": "3.0.0",
  "firebase": true,
  "redis": true,
  "stripe": true,
  "timestamp": "2026-03-17T14:30:00.000Z"
}
```

### 10.2 GET /health/ready

**Public** | No rate limit

Readiness probe -- returns 503 if any critical dependency is down.

**Response (200 OK):**
```json
{ "ready": true }
```

**Response (503):**
```json
{
  "ready": false,
  "issues": ["redis: connection refused"]
}
```

### 10.3 GET /health/live

**Public** | No rate limit

Liveness probe -- always returns 200 if the process is running.

**Response (200 OK):**
```json
{ "alive": true }
```

---

## 11. Webhook Payload Definitions

### 11.1 Stripe Webhook (Inbound)

**Event: `checkout.session.completed`**

```json
{
  "id": "evt_abc123",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_abc123",
      "payment_status": "paid",
      "amount_total": 5000,
      "currency": "usd",
      "metadata": {
        "userId": "user_abc123"
      }
    }
  }
}
```

Processing rules:
1. Verify signature using `STRIPE_WEBHOOK_SECRET` (mandatory).
2. Check `payment_status === 'paid'`.
3. Extract `userId` from `metadata` (tamper-proof, set during session creation).
4. Check if `session.id` is already in Redis `processed_sessions` set.
5. If not processed: credit user, create transaction, add to processed set with 24h TTL.
6. If already processed: log skip, return 200.
