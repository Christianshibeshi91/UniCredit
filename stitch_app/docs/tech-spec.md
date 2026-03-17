# UniCredit (Stitch) -- Detailed Technical Specification

**Version:** 3.0
**Date:** 2026-03-17
**Status:** Draft
**Author:** Solution Architect Agent

---

## 1. Backend Module Breakdown

### 1.1 Routes

Each route file registers HTTP methods and paths on an `express.Router()`, applies route-specific middleware (validators, rate limiters), and delegates to controllers.

| Route File | Prefix | Endpoints |
|------------|--------|-----------|
| `auth.routes.js` | `/api/v1/auth` | POST `/register`, POST `/login`, POST `/google`, GET `/me`, POST `/change-password`, POST `/forgot-password`, POST `/reset-password` |
| `user.routes.js` | `/api/v1/users` | GET `/:id`, PUT `/:id` |
| `wallet.routes.js` | `/api/v1/wallet` | GET `/balance` (uses JWT userId) |
| `convert.routes.js` | `/api/v1/convert` | POST `/` |
| `gift.routes.js` | `/api/v1/gifts` | POST `/send`, GET `/claim/:token`, POST `/claim/:token`, GET `/:id`, PATCH `/:id/media` |
| `stripe.routes.js` | `/api/v1/stripe` | GET `/prices`, POST `/create-checkout-session`, GET `/success`, GET `/cancel`, POST `/webhook` |
| `admin.routes.js` | `/api/v1/admin` | GET `/stats`, GET `/users`, GET `/users/:id`, PUT `/users/:id/suspend`, PUT `/users/:id/reinstate`, GET `/fraud-flags`, PUT `/fraud-flags/:id/resolve`, PUT `/fraud-flags/:id/block`, GET `/settings`, PUT `/settings/:key`, GET `/audit-log` |
| `upload.routes.js` | `/api/v1/uploads` | POST `/signed-url` |
| `health.routes.js` | `/` | GET `/health`, GET `/health/ready`, GET `/health/live` |

### 1.2 Services

Each service encapsulates a domain of business logic. Services do NOT access `req`/`res` -- they receive typed arguments and return typed results or throw custom errors.

#### AuthService
```
register(email, password, name?) → {userId, token, user}
login(email, password) → {userId, token, user}
googleAuth(idToken, email, displayName?, photoUrl?) → {userId, token, user}
changePassword(userId, currentPassword, newPassword) → void
forgotPassword(email) → void  // Always succeeds (no enumeration)
resetPassword(token, newPassword) → void
validateToken(token) → {userId, role}
```

#### WalletService
```
getBalance(userId) → {balanceCents: number}
creditBalance(userId, amountCents, description, category) → {newBalanceCents}
debitBalance(userId, amountCents, description, category) → {newBalanceCents}
  // Throws InsufficientBalanceError if balance < amountCents
  // Uses Firestore transaction for atomicity
```

#### GiftService
```
sendGift(senderId, recipientEmail, amountCents, message, occasion, scheduledAt?) → {giftId, claimToken}
claimGift(claimToken, recipientUserId) → {gift, creditedCents}
getGift(giftId, requesterId) → gift
updateGiftMedia(giftId, senderId, videoKey?, audioKey?) → void
processExpiredGifts() → {expired: number, refunded: number}
processScheduledDeliveries() → {delivered: number}
```

#### ConversionService
```
convertGiftCard(userId, merchant, cardNumber, pin, amountCents) → {creditedCents, newBalanceCents}
getExchangeRate(merchant?) → {rate: number}
```

#### AdminService
```
getStats() → {totalVolumeCents, totalUsers, totalTransactions, fraudFlags[]}
getUsers(cursor?, limit?) → {users[], nextCursor}
getUserDetail(userId) → {user, transactions[], gifts[]}
suspendUser(adminId, targetUserId, reason) → void
reinstateUser(adminId, targetUserId) → void
updateSetting(adminId, key, value) → void
resolveFraudFlag(adminId, flagId) → void
blockFraudFlag(adminId, flagId) → void  // Suspend user + resolve flag
```

#### NotificationService
```
sendGiftNotificationEmail(gift, senderName) → void
sendGiftClaimedEmail(gift, recipientName) → void
sendPasswordResetEmail(email, resetToken) → void
sendPaymentConfirmationEmail(userId, amountCents) → void
sendGiftExpiringWarning(gift) → void
registerPushToken(userId, fcmToken) → void
sendPushNotification(userId, title, body, data?) → void
```

#### MediaService
```
generateUploadUrl(userId, fileType, contentType) → {signedUrl, objectKey, expiresAt}
generateDownloadUrl(objectKey) → {signedUrl, expiresAt}
deleteMedia(objectKey) → void
```

#### AuditService
```
log(actorId, action, targetType, targetId, beforeValue?, afterValue?, ipAddress?) → void
getAuditLog(filters?, cursor?, limit?) → {entries[], nextCursor}
```

### 1.3 Middleware

| Middleware | Applied To | Responsibility |
|------------|-----------|----------------|
| `requestId` | All requests | Generate UUID v4, attach to `req.requestId`, add to response headers |
| `logger` | All requests | Log method, path, status, response time using Pino |
| `helmet` | All requests | Security headers (CSP, HSTS, X-Frame-Options, etc.) |
| `cors` | All requests | Restrict to `ALLOWED_ORIGINS`; reject unknown in production |
| `auth` | `/api/v1/*` (except public paths) | Verify JWT, attach `req.userId` and `req.userRole` |
| `adminOnly` | `/api/v1/admin/*` | Verify `req.userRole === 'admin'` |
| `rateLimiter` | Per-route | Redis-backed rate limiting with configurable windows |
| `validate` | Per-route | Run Joi/Zod schema on `req.body`, `req.params`, `req.query` |
| `errorHandler` | Global (last) | Catch all errors; map to standardized response; log via Pino + Sentry |

### 1.4 Validators

Each validator exports a Joi/Zod schema. The `validate` middleware factory applies the schema:

```javascript
// validators/auth.validator.js
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  name: Joi.string().max(100).optional(),
});

// routes/auth.routes.js
router.post('/register', validate(registerSchema), authRateLimit, authController.register);
```

Key validation rules:

| Endpoint | Field | Rule |
|----------|-------|------|
| Register | email | Valid email format, max 254 chars |
| Register | password | Min 8 chars, max 128 chars |
| Register | name | Max 100 chars, sanitized |
| Convert | amountCents | Integer, > 0, <= 5000000 (50,000.00) |
| Convert | merchant | Must be in allowed merchant list |
| Convert | cardNumber | String, 4-50 chars, alphanumeric + dashes |
| Send Gift | recipientEmail | Valid email format |
| Send Gift | amountCents | Integer, > 0, <= 5000000 |
| Send Gift | message | Max 2000 chars, sanitized |
| Send Gift | occasion | String from allowed list, or 'other' + customOccasion |
| Admin Settings | key | String from allowed settings keys |
| Admin Settings | value | Type depends on key (validated per-key) |

---

## 2. Frontend Module Breakdown

### 2.1 Screens

| Screen | Purpose | API Calls | State Dependencies |
|--------|---------|-----------|-------------------|
| `LoginScreen` | Email/password login + registration + Google OAuth | `auth/login`, `auth/register`, `auth/google` | AppState.isLoggedIn, AppState.setUser |
| `PasswordResetScreen` | Forgot password + reset token entry | `auth/forgot-password`, `auth/reset-password` | None |
| `WalletDashboardScreen` | Balance card, quick actions, recent activity (5 items) | `wallet/balance`, `transactions` (limit 5) | AppState.balance, AppState.transactions |
| `TransactionHistoryScreen` | Full paginated transaction list with filters | `transactions` (paginated) | Local page state |
| `ConvertGiftCardScreen` | 3-step wizard: merchant, card details, preview | `convert` | AppState.refreshWallet |
| `PersonalizeYourGiftScreen` | Recipient, occasion, amount, message, media, schedule | `gifts/send`, `uploads/signed-url` | AppState.balance, AppState.refreshWallet |
| `GiftRevealExperienceScreen` | Animated gift reveal with sender's message/media | `gifts/:id` | Gift data (passed as argument or fetched) |
| `GiftClaimScreen` | Claim flow for gift recipients (deep link target) | `gifts/claim/:token` | None (standalone) |
| `AddCreditScreen` | Select amount, payment method, Stripe checkout | `stripe/prices`, `stripe/create-checkout-session` | AppState.refreshWallet |
| `AdminOverviewScreen` | Dashboard metrics, controls, fraud flags | `admin/stats`, `admin/settings` | Admin data (local) |
| `AdminUserDetailScreen` | User profile + transactions + admin actions | `admin/users/:id` | Admin data (local) |
| `ProfileScreen` | Account info, password change, preferences, logout | `users/:id`, `auth/change-password` | AppState.user* |

### 2.2 Components

| Component | Props | Used In |
|-----------|-------|---------|
| `BalanceCard` | balance (int cents), tier, userName | WalletDashboardScreen |
| `TransactionItem` | transaction (typed model) | WalletDashboardScreen, TransactionHistoryScreen |
| `MerchantGrid` | merchants[], selectedMerchant, onSelect | ConvertGiftCardScreen |
| `OccasionGrid` | occasions[], selectedOccasion, onSelect | PersonalizeYourGiftScreen |
| `MediaCapture` | onVideoReady, onAudioReady | PersonalizeYourGiftScreen |
| `LoadingButton` | label, onPressed, isLoading | All screens with submit actions |
| `ErrorBanner` | message, onDismiss | All screens |
| `EmptyState` | icon, title, subtitle, action? | Transaction lists, admin lists |
| `PaginatedList` | fetchPage, itemBuilder | TransactionHistoryScreen, AdminUsers |

### 2.3 Services (Flutter)

#### ApiService (Refactored)

```dart
class ApiService {
  static String get baseUrl => Environment.apiBaseUrl;

  /// All API calls go through this method for centralized error handling.
  static Future<ApiResponse<T>> _request<T>({
    required String method,
    required String path,
    Map<String, dynamic>? body,
    Map<String, String>? queryParams,
    T Function(Map<String, dynamic>)? fromJson,
  }) async {
    // 1. Build URI with query params
    // 2. Add auth header if token exists
    // 3. Make request
    // 4. Handle 401 → auto-logout
    // 5. Handle network errors → user-friendly message
    // 6. Parse response → ApiResponse<T>
  }
}
```

Key improvement: All API calls return `ApiResponse<T>` which has `data`, `error`, and `statusCode` fields. The 401 handler triggers automatic logout via AppState.

#### StorageService

```dart
class StorageService {
  /// Uses FlutterSecureStorage for tokens and sensitive data.
  /// Uses SharedPreferences for non-sensitive preferences.
  static Future<void> saveToken(String token) async;
  static Future<String?> getToken() async;
  static Future<void> clearToken() async;
  static Future<void> saveBiometricPreference(bool enabled) async;
  static Future<bool> getBiometricPreference() async;
}
```

### 2.4 State Management

AppState remains the single ChangeNotifier but gains structure:

```dart
class AppState extends ChangeNotifier {
  // Auth state
  AuthStatus _authStatus = AuthStatus.unknown; // unknown, authenticated, unauthenticated
  String _userId = '';
  String _userName = '';
  String _userEmail = '';
  String _userRole = 'user';
  String _tier = 'STANDARD';

  // Wallet state
  int _balanceCents = 0;  // INTEGER CENTS
  List<Transaction> _recentTransactions = [];

  // Computed
  String get balanceDisplay => CurrencyFormatter.centsToDisplay(_balanceCents);
  bool get isAdmin => _userRole == 'admin';

  // Auth methods
  Future<String?> login({required String email, required String password});
  Future<String?> register({required String email, required String password, String? name});
  Future<String?> loginWithGoogle({required String idToken, required String email, ...});
  Future<void> logout();
  Future<void> tryAutoLogin();

  // Wallet methods
  Future<void> refreshWallet();
}
```

---

## 3. Database Schema

### 3.1 Users Collection

```
Collection: users
Document ID: Firebase Auth UID

{
  name: string (max 100, sanitized),
  email: string (unique, indexed),
  password_hash: string (bcrypt, 12 rounds; empty for Google auth users),
  balance_cents: number (integer, default 0, >= 0),
  tier: "STANDARD" | "GOLD" | "PLATINUM" (default "STANDARD"),
  role: "user" | "admin" (default "user"),
  status: "active" | "suspended" (default "active"),
  photo_url: string (optional),
  auth_provider: "email" | "google" (default "email"),
  notification_preferences: {
    email: boolean (default true),
    push: boolean (default false),
  },
  fcm_tokens: string[] (default []),
  reset_token_hash: string (optional, SHA-256 of reset token),
  reset_token_expires_at: timestamp (optional),
  suspended_at: timestamp (optional),
  suspended_by: string (optional, admin user ID),
  suspended_reason: string (optional),
  created_at: timestamp,
  updated_at: timestamp,
  last_login_at: timestamp,
}

Indexes:
  - email (unique, for login lookups)
  - status (for admin user listing)
  - tier (for tier-based queries)
  - created_at (for admin user listing, sorted)
```

### 3.2 Transactions Collection

```
Collection: transactions
Document ID: auto-generated

{
  user_id: string (indexed, references users),
  amount_cents: number (integer; positive for credits, negative for debits),
  type: "credit" | "debit",
  description: string (sanitized),
  category: "gift_card" | "gift_sent" | "gift_received" | "gift_refund" | "top_up" | "general",
  reference_id: string (optional; gift ID, stripe session ID),
  reference_type: string (optional; "gift", "stripe_session"),
  created_at: timestamp,
}

Indexes:
  - (user_id, created_at DESC) composite index for paginated history
  - (user_id, category) for filtered queries
  - (created_at DESC) for admin global queries
```

### 3.3 Gifts Collection

```
Collection: gifts
Document ID: auto-generated

{
  sender_id: string (indexed, references users),
  sender_name: string (denormalized for email display),
  recipient_email: string (indexed),
  recipient_user_id: string (optional; set when claimed),
  amount_cents: number (integer, > 0),
  message: string (sanitized, max 2000 chars),
  occasion: string,
  status: "pending" | "claimed" | "expired" (indexed),
  claim_token: string (unique, UUID v4, indexed),
  claim_token_hash: string (SHA-256 of claim_token, indexed for lookup),
  video_key: string (optional; GCS object key),
  audio_key: string (optional; GCS object key),
  scheduled_at: timestamp (optional; null = immediate delivery),
  notification_sent_at: timestamp (optional),
  claimed_at: timestamp (optional),
  expires_at: timestamp (created_at + 90 days),
  created_at: timestamp,
  updated_at: timestamp,
}

Indexes:
  - claim_token_hash (unique, for claim lookups)
  - (status, expires_at) composite for expiration job
  - (sender_id, created_at DESC) for sender history
  - (recipient_email, status) for recipient lookups
  - (status, scheduled_at) composite for scheduled delivery job
```

### 3.4 Fraud Flags Collection

```
Collection: fraud_flags
Document ID: auto-generated

{
  user_id: string (references users),
  user_name: string (denormalized),
  user_email: string (denormalized),
  reason: string,
  amount_cents: number (optional; related transaction amount),
  severity: "low" | "medium" | "high" | "critical",
  status: "open" | "reviewing" | "resolved" | "blocked",
  resolved_by: string (optional; admin user ID),
  resolved_at: timestamp (optional),
  resolution_notes: string (optional),
  created_at: timestamp,
  updated_at: timestamp,
}

Indexes:
  - (status, severity DESC) for admin dashboard
  - (user_id) for per-user fraud history
  - (created_at DESC) for timeline view
```

### 3.5 Settings Collection

```
Collection: settings
Document ID: setting key (e.g., "exchange_rate", "global_rate_lock")

{
  key: string (document ID),
  value: any (type depends on key),
  value_type: "number" | "boolean" | "string" (for validation),
  description: string,
  updated_at: timestamp,
  updated_by: string (admin user ID),
}

Known keys:
  - exchange_rate: number (0.0 - 1.0, default 0.9)
  - global_rate_lock: boolean (default false)
  - standard_spread: number (basis points)
  - gift_expiration_days: number (default 90)
  - max_gift_amount_cents: number (default 5000000)
  - max_conversion_amount_cents: number (default 5000000)
```

### 3.6 Audit Log Collection

```
Collection: audit_log
Document ID: auto-generated

{
  actor_id: string (admin user ID),
  actor_email: string (denormalized),
  action: string (e.g., "update_setting", "suspend_user", "resolve_fraud_flag"),
  target_type: string (e.g., "setting", "user", "fraud_flag"),
  target_id: string,
  before_value: any (optional; previous state),
  after_value: any (optional; new state),
  ip_address: string,
  request_id: string,
  created_at: timestamp,
}

Indexes:
  - (created_at DESC) for timeline view
  - (actor_id, created_at DESC) for per-admin history
  - (target_type, target_id) for entity history
```

### 3.7 Processed Sessions Collection (Redis)

```
Redis Set: processed_sessions
Members: Stripe session IDs
TTL: 24 hours per member (via EXPIRE on individual keys, or use sorted set with score = timestamp)

Alternative Redis structure:
  Key: processed_session:{sessionId}
  Value: 1
  TTL: 86400 (24 hours)
```

---

## 4. Currency Handling

### 4.1 Core Rule

**All monetary values are integers representing cents.** There are ZERO exceptions.

| Layer | Format | Example ($12.50) |
|-------|--------|-----------------|
| Database (Firestore) | Integer cents | `1250` |
| API request/response | Integer cents (`amountCents`) | `1250` |
| Backend business logic | Integer cents | `1250` |
| Frontend state (AppState) | Integer cents | `1250` |
| Frontend display | Formatted string | `"$12.50"` |

### 4.2 Currency Utility (Backend)

```javascript
// utils/currency.js
const currency = {
  /**
   * Convert a dollar amount (from legacy data) to cents.
   * Only used during migration. NOT for normal operations.
   */
  dollarsToCents(dollars) {
    return Math.round(dollars * 100);
  },

  /**
   * Format cents as a display string. For API responses that include
   * a display field alongside the cents value.
   */
  centsToDisplay(cents) {
    return `$${(cents / 100).toFixed(2)}`;
  },

  /**
   * Calculate exchange: amountCents * rate, returned as integer cents.
   * Rate is a float (e.g., 0.9), but the RESULT is always integer.
   */
  applyExchangeRate(amountCents, rate) {
    return Math.round(amountCents * rate);
  },

  /**
   * Validate that a value is a positive integer within bounds.
   */
  isValidCents(value, max = 5_000_000) {
    return Number.isInteger(value) && value > 0 && value <= max;
  },
};
```

### 4.3 Currency Utility (Frontend - Dart)

```dart
// utils/currency_formatter.dart
class CurrencyFormatter {
  /// Convert integer cents to display string.
  /// 1250 → "$12.50"
  /// 0 → "$0.00"
  static String centsToDisplay(int cents) {
    final dollars = cents / 100;
    return '\$${dollars.toStringAsFixed(2)}';
  }

  /// Convert a user-entered dollar string to cents for API calls.
  /// "12.50" → 1250
  /// "12" → 1200
  /// Returns null if invalid.
  static int? displayToCents(String input) {
    final parsed = double.tryParse(input);
    if (parsed == null || parsed <= 0) return null;
    return (parsed * 100).round();
  }
}
```

### 4.4 Migration from Float to Integer

1. **Add new fields:** `balance_cents` (users), `amount_cents` (transactions, gifts).
2. **Backfill:** `balance_cents = Math.round(balance * 100)` for each user.
3. **Dual-write period:** Both old and new fields are written for 1 week.
4. **Switch reads:** API responses use `_cents` fields; frontend parses `_cents`.
5. **Remove old fields:** Drop `balance`, `amount` (float) fields.
6. **Reconciliation report:** Compare sum of transaction `amount_cents` against each user's `balance_cents`.

---

## 5. File Upload Flow

### 5.1 Signed URL Upload Architecture

Media files (video, audio) are uploaded directly from the Flutter client to Google Cloud Storage. The API server never receives or proxies the file bytes.

```mermaid
sequenceDiagram
    participant C as Flutter Client
    participant A as API Server
    participant GCS as Google Cloud Storage

    C->>A: POST /api/v1/uploads/signed-url
    Note over C,A: {fileType: "video", contentType: "video/mp4"}
    A->>A: Validate: fileType in ["video", "audio"]
    A->>A: Validate: contentType in allowed MIME types
    A->>A: Generate objectKey: gifts/{userId}/{uuid}.{ext}
    A->>GCS: generateSignedUrl(objectKey, {action: 'write', expires: 15min, contentType})
    GCS-->>A: signedUrl
    A-->>C: {signedUrl, objectKey, expiresAt}

    C->>GCS: PUT signedUrl (file bytes, Content-Type header)
    GCS-->>C: 200 OK

    C->>A: PATCH /api/v1/gifts/:id/media {videoKey: objectKey}
    A->>A: Validate objectKey format, verify gift belongs to sender
    A->>F: Update gift.video_key = objectKey
    A-->>C: 200 {success: true}
```

### 5.2 Upload Constraints

| Constraint | Value | Enforcement |
|-----------|-------|-------------|
| Max video size | 50 MB | GCS signed URL condition |
| Max audio size | 10 MB | GCS signed URL condition |
| Max video duration | 30 seconds | Client-side (ImagePicker maxDuration) |
| Max audio duration | 60 seconds | Client-side (timer auto-stop) |
| Allowed video types | video/mp4, video/quicktime, video/webm | Signed URL content-type restriction |
| Allowed audio types | audio/aac, audio/mp4, audio/webm, audio/ogg | Signed URL content-type restriction |
| Upload URL expiry | 15 minutes | Signed URL expiration |
| Download URL expiry | 1 hour | Signed URL expiration (regenerated on request) |

### 5.3 GCS Bucket Configuration

```
Bucket: unicredit-media-{environment}
Location: us-central1 (same region as Firestore)
Storage class: Standard
Public access: Restricted (no public access)
Lifecycle rules:
  - Delete objects in tmp/ prefix after 1 day (failed uploads)
  - Move objects to Nearline after 180 days (claimed gifts)
CORS configuration:
  - Origin: ALLOWED_ORIGINS
  - Methods: PUT, GET
  - Headers: Content-Type
  - Max age: 3600
```

### 5.4 Media Delivery

When a gift recipient views a gift with media:

1. Client requests gift data: `GET /api/v1/gifts/:id`
2. Server checks authorization (recipient or sender)
3. Server generates signed download URL for each media key
4. Server returns gift data with `videoUrl` and `audioUrl` (signed, 1-hour TTL)
5. Client renders media player with signed URL

---

## 6. Background Job Architecture

### 6.1 Queue System: BullMQ + Redis

BullMQ is chosen for its reliability (at-least-once delivery), built-in retry with backoff, and Redis-backed persistence.

### 6.2 Job Definitions

#### Gift Expiration Job
```
Queue: gift-expiration
Schedule: Daily at 02:00 UTC (cron)
Logic:
  1. Query gifts where status == 'pending' AND expires_at <= now
  2. For each expired gift:
     a. Set status = 'expired'
     b. Credit sender.balance_cents with gift.amount_cents
     c. Create refund transaction for sender
     d. Send expiration notification to sender
  3. Log: "{count} gifts expired, ${totalRefundedCents} refunded"
Retry: 3 attempts with exponential backoff
Timeout: 5 minutes
```

#### Scheduled Delivery Job
```
Queue: scheduled-delivery
Schedule: Every 5 minutes (cron)
Logic:
  1. Query gifts where status == 'pending' AND scheduled_at <= now AND notification_sent_at == null
  2. For each due gift:
     a. Send gift notification email to recipient
     b. Send push notification if recipient has app + tokens
     c. Set notification_sent_at = now
  3. Log: "{count} scheduled gifts delivered"
Retry: 3 attempts with exponential backoff
Timeout: 2 minutes
```

#### Session Cleanup Job
```
Queue: session-cleanup
Schedule: Hourly (cron)
Logic:
  1. Scan Redis keys matching processed_session:* with TTL expired
  2. (Redis TTL handles this automatically; job is a safety net)
  3. Clean up any orphaned BullMQ completed jobs older than 7 days
Retry: 1 attempt
Timeout: 1 minute
```

#### Gift Expiration Warning Job
```
Queue: gift-expiration-warning
Schedule: Daily at 10:00 UTC (cron)
Logic:
  1. Query gifts where status == 'pending' AND expires_at BETWEEN (now + 6 days) AND (now + 8 days)
  2. For each gift:
     a. Send expiration warning email to sender
     b. Send push notification to sender
  3. Log: "{count} expiration warnings sent"
Retry: 3 attempts
Timeout: 2 minutes
```

### 6.3 MVP Simplification

For MVP, background jobs run in the same Node.js process as the API server using BullMQ's `Worker` class. This avoids deploying a separate worker container.

Post-MVP, workers are extracted into a separate deployable unit for independent scaling.

---

## 7. Email / Notification Pipeline

### 7.1 Email Templates (SendGrid Dynamic Templates)

| Template | Trigger | Variables |
|----------|---------|-----------|
| `gift-notification` | Gift sent (immediate or scheduled delivery reached) | senderName, recipientEmail, occasion, message, amountDisplay, claimUrl |
| `gift-claimed` | Gift claimed by recipient | senderName, recipientName, amountDisplay, occasion |
| `password-reset` | Forgot password request | resetUrl, expiresIn ("1 hour") |
| `payment-confirmation` | Stripe checkout completed | userName, amountDisplay, newBalanceDisplay, transactionDate |
| `gift-expiring-warning` | 7 days before gift expiration | senderName, recipientEmail, amountDisplay, expiresDate |
| `gift-expired-refund` | Gift expired, sender refunded | senderName, recipientEmail, amountDisplay, refundedDisplay |

### 7.2 Push Notification Payloads (FCM)

```json
// Gift received
{
  "notification": {
    "title": "You received a gift!",
    "body": "Alex sent you 500 UniCredit for your birthday"
  },
  "data": {
    "type": "gift_received",
    "giftId": "abc123",
    "claimToken": "xyz789"
  }
}

// Gift claimed
{
  "notification": {
    "title": "Your gift was claimed!",
    "body": "Sarah claimed your 500 UniCredit gift"
  },
  "data": {
    "type": "gift_claimed",
    "giftId": "abc123"
  }
}

// Payment confirmed
{
  "notification": {
    "title": "Payment confirmed",
    "body": "$50.00 added to your wallet"
  },
  "data": {
    "type": "payment_confirmed",
    "amountCents": 5000
  }
}
```

### 7.3 Notification Service Architecture

```
NotificationService
├── EmailProvider (SendGrid)
│   ├── sendTemplatedEmail(templateId, to, variables)
│   └── sendRawEmail(to, subject, htmlBody)
├── PushProvider (FCM)
│   ├── sendToUser(userId, notification, data)
│   └── sendToTokens(tokens[], notification, data)
└── dispatch(userId, channel, payload)
    ├── Check user.notification_preferences
    ├── If email enabled → EmailProvider
    └── If push enabled → PushProvider
```

---

## 8. Rate Limiting Strategy

### 8.1 Redis-Backed Implementation

Using `express-rate-limit` with `rate-limit-redis` store:

```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { redisClient } = require('../config/redis');

function createRateLimiter({ windowMs, max, keyGenerator, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,  // Return rate limit info in headers
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
    }),
    keyGenerator: keyGenerator || ((req) => req.ip),
    message: { error: { code: 'RATE_LIMIT_EXCEEDED', message } },
  });
}
```

### 8.2 Rate Limit Tiers

| Tier | Endpoints | Window | Max | Key |
|------|-----------|--------|-----|-----|
| Auth | `/auth/login`, `/auth/register`, `/auth/google` | 15 min | 15 | IP |
| Password Reset | `/auth/forgot-password` | 1 hour | 5 | IP |
| Financial | `/convert`, `/gifts/send`, `/stripe/create-checkout-session` | 1 min | 10 | User ID |
| General API | All other authenticated endpoints | 1 min | 100 | User ID |
| Admin | `/admin/*` | 1 min | 60 | User ID |
| Webhook | `/stripe/webhook` | None | None | Signature verified |

### 8.3 Response Headers

Every rate-limited response includes:
```
X-RateLimit-Limit: 15
X-RateLimit-Remaining: 12
X-RateLimit-Reset: 1679045400
Retry-After: 300  (only on 429 responses)
```

---

## 9. Environment Configuration Strategy

### 9.1 Required Variables (Production)

```bash
# Server
NODE_ENV=production
PORT=3000
BASE_URL=https://api.unicredit.app

# Security
JWT_SECRET=<random 64-char string>
ALLOWED_ORIGINS=https://unicredit.app,https://www.unicredit.app

# Database
FIREBASE_SERVICE_ACCOUNT_JSON=<full JSON string>

# Redis
REDIS_URL=redis://user:password@host:6379

# Payments
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@unicredit.app
SENDGRID_FROM_NAME=UniCredit

# Storage
GCS_BUCKET=unicredit-media-production
GCS_PROJECT_ID=unicredit-prod

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx

# Optional
LOG_LEVEL=info
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```

### 9.2 Development Defaults

```bash
NODE_ENV=development
PORT=3000
BASE_URL=http://localhost:3000
JWT_SECRET=dev-secret-change-in-production
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080,http://localhost:5000
LOG_LEVEL=debug
# Redis, Stripe, SendGrid, GCS are optional in development
# Missing services are logged as warnings, features gracefully degraded
```

### 9.3 Startup Validation

```javascript
// config/env.js
function validateEnv() {
  const required = ['JWT_SECRET'];
  const productionRequired = [
    'STRIPE_WEBHOOK_SECRET',
    'REDIS_URL',
    'FIREBASE_SERVICE_ACCOUNT_JSON',
  ];

  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error(`FATAL: Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production') {
    const missingProd = productionRequired.filter(k => !process.env[k]);
    if (missingProd.length > 0) {
      console.error(`FATAL: Missing production env vars: ${missingProd.join(', ')}`);
      process.exit(1);
    }

    // Reject placeholder values
    if (process.env.JWT_SECRET === 'dev-secret-change-in-production') {
      console.error('FATAL: JWT_SECRET must be changed from default in production');
      process.exit(1);
    }
  }
}
```

---

## 10. Testing Strategy

### 10.1 Backend Tests

| Type | Tool | Coverage Target | Focus |
|------|------|----------------|-------|
| Unit | Jest | 80%+ | Services, validators, currency utils |
| Integration | Jest + Supertest | Key flows | Auth flow, conversion flow, gift flow, Stripe webhook |
| E2E | Playwright (post-MVP) | Critical paths | Register → convert → send gift → claim |

### 10.2 Frontend Tests

| Type | Tool | Coverage Target | Focus |
|------|------|----------------|-------|
| Unit | Flutter test | Widget tests | Components, formatters, validators |
| Widget | Flutter test | Key screens | Login, dashboard, conversion |
| Integration | Flutter integration test | Critical flows | Auth → dashboard → convert |

### 10.3 Security Tests

- All validators tested with malicious input (XSS payloads, SQL injection strings, oversized payloads).
- Rate limit tests verify enforcement and Redis persistence.
- Auth tests verify JWT expiry, invalid tokens, missing headers.
- IDOR tests verify users cannot access other users' resources.
- Stripe webhook tests verify signature rejection for invalid signatures.
