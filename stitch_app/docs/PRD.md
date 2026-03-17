# UniCredit (Stitch) -- Product Requirements Document

**Version:** 3.0
**Date:** 2026-03-17
**Status:** Draft
**Author:** Business Analyst & Researcher Agent

---

## 1. Problem Statement

### What Problem Does UniCredit Solve?

Consumers accumulate unused gift cards worth billions of dollars annually. These cards sit in drawers, wallets, and email inboxes -- partially used, forgotten, or for merchants the holder does not frequent. Meanwhile, people want to send personalized digital gifts without the friction of guessing which store someone prefers.

UniCredit bridges these two problems: it converts unused gift cards into a universal digital currency ("UniCredit") stored in a personal wallet, and enables users to send personalized gifts (with video/audio messages) to anyone via email.

### Why Does It Need a Redesign?

The current v2.0 implementation has reached a plateau where its architectural limitations prevent growth:

1. **Monolithic Backend** -- The entire backend lives in a single 1,077-line `server.js` file. Authentication, wallet operations, gift sending, admin controls, Stripe integration, and Firebase initialization are all interleaved. This makes testing, maintenance, and team development impractical.

2. **Incomplete Core Features** -- Several user-facing features are either stubs or fundamentally broken:
   - Video and audio attachments for gifts are captured on the client side but never uploaded or stored. The files are silently discarded.
   - Password reset shows a success message but sends no actual email.
   - Admin controls (rate lock, spread adjustment) toggle local state but do not persist or take effect.
   - Gift notifications do not exist -- recipients have no way to know they received a gift.

3. **Financial Integrity Risks** -- The app uses floating-point `double` for all monetary values, which introduces rounding errors that are unacceptable in a fintech product. There is no refund, chargeback, or dispute handling.

4. **Security Gaps** -- Stripe webhook signature verification is optional, CORS is permissive (`callback(null, true)` for all origins in production), rate limiting is in-memory (resets on restart, does not scale across instances), and demo seed data includes hardcoded passwords (`admin123`, `demo123`) deployed in production.

5. **No Scalability Path** -- In-memory data structures for rate limiting and session tracking, no pagination on transaction queries, no caching layer, and no structured logging or error monitoring.

6. **Missing Modern Expectations** -- No offline support, no push notifications, no multi-currency support, no loyalty/rewards program, and no accessibility compliance.

---

## 2. Target Users

### Primary Users

| Segment | Description | Volume Estimate |
|---------|-------------|-----------------|
| **Gift Card Holders** | Consumers with partially used or unwanted gift cards who want to consolidate value | 60% of user base |
| **Gift Senders** | People sending personalized digital gifts for occasions (birthdays, holidays, weddings) | 25% of user base |
| **Gift Recipients** | People receiving UniCredit gifts via email who may convert to full users | 15% of user base (growth funnel) |

### Secondary Users

| Segment | Description |
|---------|-------------|
| **Platform Administrators** | Internal staff managing exchange rates, fraud flags, user accounts, and system configuration |
| **Customer Support Agents** | Staff handling disputes, refunds, and user inquiries |

---

## 3. Value Proposition

**For gift card holders:** "Stop losing money on cards you will never fully use. Convert any gift card to UniCredit at 90% value -- instantly, from your phone."

**For gift senders:** "Send a gift anyone will love. UniCredit gifts come with video messages, scheduled delivery, and let the recipient spend however they choose."

**For gift recipients:** "Receive gifts without the guesswork. Claim your UniCredit and spend it at any supported merchant, send it forward, or cash out."

### Key Differentiators vs. Alternatives

1. **Emotional gifting layer** -- Competitors focus on transactions; UniCredit combines financial utility with personalized video/audio messages and occasion-themed experiences.
2. **Bidirectional value flow** -- Users can both convert cards IN and send gifts OUT, creating a network effect that pure gift card resellers lack.
3. **Unified wallet** -- Unlike Apple Wallet or Google Pay (which store individual cards), UniCredit consolidates all value into a single, fungible balance.
4. **Tiered loyalty system** -- Engagement-driven tiers (Standard/Gold/Platinum) that reward heavy users with better rates and exclusive features.

---

## 4. User Personas

### Persona 1: Maya, the Gift Card Hoarder

- **Age:** 32, Marketing Manager
- **Behavior:** Receives 5-8 gift cards per year from coworkers and family. Uses about 60% of each card's value before forgetting about it.
- **Goal:** Consolidate scattered gift card balances into one usable balance.
- **Pain Points:**
  - Tracks gift card balances across multiple apps and websites
  - Cards expire or get lost before full value is used
  - Feels guilty about wasted money
- **Success Metric:** Converts 3+ cards per month, maintains a wallet balance she actively spends.

### Persona 2: David, the Thoughtful Gift Sender

- **Age:** 45, Software Engineer
- **Behavior:** Sends 15-20 gifts per year for birthdays, holidays, and milestones. Values personalization over convenience.
- **Goal:** Send meaningful gifts that feel personal, not generic.
- **Pain Points:**
  - Amazon gift cards feel impersonal
  - Cannot attach a video message to a Venmo payment
  - Does not know which store the recipient prefers
  - Forgets dates and needs scheduling
- **Success Metric:** Sends gifts with video messages that recipients open and claim within 48 hours.

### Persona 3: Priya, the Budget-Conscious Recipient

- **Age:** 24, Graduate Student
- **Behavior:** Receives UniCredit gifts and wants to maximize their value. Price-sensitive, compares options.
- **Goal:** Claim gifts easily and use the balance where it matters most.
- **Pain Points:**
  - Does not want to download another app just to claim a gift
  - Wants to understand the value before committing
  - Needs cash-equivalent flexibility
- **Success Metric:** Claims gift within one session, converts balance to a purchase or transfer within one week.

### Persona 4: Carlos, the Platform Administrator

- **Age:** 38, Operations Lead
- **Behavior:** Monitors platform health daily, reviews fraud flags, adjusts exchange rates based on market conditions.
- **Goal:** Maintain platform integrity and profitability while minimizing fraud.
- **Pain Points:**
  - Current admin dashboard is mostly stubs with no real controls
  - No alerts for anomalous activity
  - Cannot drill into individual user accounts or transactions
  - No audit trail for admin actions
- **Success Metric:** Resolves fraud flags within 4 hours, adjusts rates with confidence in the impact.

---

## 5. Feature List (MoSCoW Prioritization)

### MUST HAVE (MVP)

| # | Feature | Description | Current Status |
|---|---------|-------------|----------------|
| M1 | **Auth: Email/Password** | Register, login, logout with JWT sessions and bcrypt hashing | Exists -- needs hardening |
| M2 | **Auth: Google OAuth** | Sign in with Google, verified via tokeninfo endpoint | Exists -- needs client ID moved to env |
| M3 | **Auth: Password Reset** | Send password reset email with time-limited token | Stub only -- no email sent |
| M4 | **Wallet: Balance Display** | Show current UniCredit balance with currency formatting | Exists -- uses floating-point |
| M5 | **Wallet: Transaction History** | Paginated, filterable list of all transactions | Exists -- limited to 20, no pagination |
| M6 | **Gift Card Conversion** | Select merchant, enter card details, convert at exchange rate | Exists -- needs validation improvements |
| M7 | **Gift Sending: Basic** | Send UniCredit to any email with message and occasion | Exists -- functional |
| M8 | **Gift Receiving: Claim Flow** | Email notification with secure claim link, one-tap accept | Does not exist |
| M9 | **Add Credit: Stripe Payments** | Top up wallet via Stripe Checkout | Exists -- webhook verification optional |
| M10 | **User Profile** | View/edit name, email; change password | Exists -- functional |
| M11 | **Admin: Dashboard Metrics** | Total volume, user count, transaction count with real data | Exists -- partially functional |
| M12 | **Admin: Fraud Flag Management** | View, review, resolve, and block flagged users | Partially exists -- no resolve/block |
| M13 | **Integer Currency** | Replace all floating-point currency with integer cents | Does not exist |
| M14 | **Backend Modularization** | Split server.js into separate route, service, and middleware modules | Does not exist |
| M15 | **Stripe Webhook Verification** | Require webhook signature verification in production | Partially exists -- currently optional |
| M16 | **Environment Configuration** | Move all hardcoded config (API URLs, client IDs, product IDs) to environment variables | Partially done |
| M17 | **Error Handling & Logging** | Structured logging with request IDs, sanitized error responses | Partially exists |
| M18 | **Input Validation** | Server-side validation for all endpoints with proper error messages | Partially exists |

### SHOULD HAVE (Post-MVP, High Value)

| # | Feature | Description |
|---|---------|-------------|
| S1 | **Gift Sending: Media Upload** | Upload video/audio messages that are stored and delivered to recipient |
| S2 | **Gift Sending: Scheduled Delivery** | Schedule gifts for future dates with automated delivery |
| S3 | **Push Notifications** | Gift received, gift claimed, payment confirmed, gift expiring |
| S4 | **Offline Support** | Cache wallet balance and transaction history for offline viewing |
| S5 | **Tier System: Functional Rewards** | Better exchange rates, bonus credits, and exclusive features per tier |
| S6 | **Admin: User Management** | Search, view, edit, suspend, and reinstate user accounts |
| S7 | **Admin: Exchange Rate Controls** | Adjust global and per-merchant exchange rates with audit trail |
| S8 | **Refund & Dispute Handling** | Process refunds, handle chargebacks, dispute resolution workflow |
| S9 | **Distributed Rate Limiting** | Redis-backed rate limiting that works across multiple instances |
| S10 | **API Pagination** | Cursor-based pagination for transactions, users, and admin lists |
| S11 | **Health Monitoring** | Health check endpoints, uptime monitoring, error alerting (PagerDuty/Slack) |
| S12 | **Biometric Authentication** | Fingerprint/Face ID for app unlock and transaction confirmation |
| S13 | **Gift Expiration** | Unclaimed gifts expire after configurable period, funds returned to sender |

### COULD HAVE (Future Enhancements)

| # | Feature | Description |
|---|---------|-------------|
| C1 | **Multi-Currency Support** | Display balances and transact in USD, EUR, GBP, CAD |
| C2 | **Merchant Expansion** | Support 20+ merchants with dynamic merchant onboarding |
| C3 | **Gift Card Scanning** | Camera-based OCR to scan physical gift card numbers |
| C4 | **Social Features** | Friend lists, gift history with contacts, group gifting |
| C5 | **Cash Out / Withdrawal** | Convert UniCredit balance to bank transfer or PayPal |
| C6 | **Recurring Gifts** | Set up automatic monthly/annual gifts for subscriptions |
| C7 | **Gift Templates & Themes** | Pre-designed gift card themes with custom branding |
| C8 | **Analytics Dashboard (User)** | Spending insights, gifting patterns, savings calculator |
| C9 | **Admin: Revenue Analytics** | Revenue, margin, conversion funnel, cohort analysis |
| C10 | **Two-Factor Authentication** | TOTP-based 2FA for account security |
| C11 | **Accessibility (WCAG 2.1 AA)** | Screen reader support, keyboard navigation, high contrast |
| C12 | **Localization / i18n** | Support for multiple languages |
| C13 | **Gift Marketplace** | Browse and purchase pre-loaded gift cards from merchants |

### WON'T HAVE (Out of Scope)

| # | Feature | Reason |
|---|---------|--------|
| W1 | **Cryptocurrency Integration** | Regulatory complexity, not aligned with target market |
| W2 | **Physical Card Issuance** | Requires banking partner, fulfillment infrastructure |
| W3 | **Bill Pay** | Scope creep -- focus on gifting and gift card conversion |
| W4 | **Investment/Savings Features** | Requires securities licensing |
| W5 | **In-App Chat / Messaging** | Not core to value proposition |

---

## 6. MVP Scope

The MVP (v3.0) delivers a production-ready foundation by fixing critical issues and completing core flows:

### MVP Boundary

```
IN SCOPE:
  - M1 through M18 (all MUST HAVE features)
  - Backend modularization into routes/services/middleware
  - Integer-based currency (cents) throughout the stack
  - Mandatory Stripe webhook verification
  - Removal of seed data from production code
  - Environment-based configuration for all secrets and config
  - Paginated transaction history
  - Functional password reset via email (SendGrid/SES)
  - Basic gift claim flow with email notification
  - Structured logging with Winston or Pino
  - CORS locked to allowed origins only

OUT OF SCOPE FOR MVP:
  - Media upload (S1) -- complex storage infrastructure
  - Push notifications (S3) -- requires Firebase Cloud Messaging setup
  - Offline support (S4) -- requires local database
  - All COULD HAVE and WON'T HAVE features
```

### MVP Success Criteria

1. A new user can register, convert a gift card, and see the correct balance (in cents, displayed as dollars) within 30 seconds.
2. A user can send a gift that generates an email notification the recipient can act on.
3. Admin can view real metrics, review fraud flags, and adjust exchange rates with changes persisting across restarts.
4. Zero hardcoded secrets, passwords, or API keys in committed code.
5. All financial operations use integer arithmetic (cents) with no floating-point rounding errors.
6. Stripe webhook signature verification is mandatory (server fails to start without it in production).

---

## 7. Risks, Assumptions, Dependencies, Constraints

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Gift card validation is simulated (no real merchant API integration) | High | Medium | Clearly label as demo/sandbox; plan merchant API partnerships for v3.1 |
| Stripe rate changes or API deprecation | Low | High | Pin Stripe SDK version; monitor deprecation notices |
| Firebase Firestore costs scale non-linearly with transaction volume | Medium | Medium | Implement query optimization, caching, and consider migration path to PostgreSQL |
| Floating-point to integer migration introduces balance discrepancies | Medium | High | Run migration with reconciliation report; freeze transactions during migration window |
| Fraud through fake gift card submissions | High | High | Implement velocity limits, device fingerprinting, and manual review queue |

### Assumptions

1. Users have a valid email address for account creation and gift receiving.
2. Gift card values are self-reported by users (no real-time merchant API validation in MVP).
3. The 90% exchange rate is commercially viable and will be refined based on merchant partnerships.
4. Firebase Firestore remains the primary database for MVP; migration to a relational database is a post-MVP decision.
5. The Flutter mobile app is the primary client; web is secondary (Flutter web build exists but is not optimized).

### Dependencies

| Dependency | Type | Risk Level |
|------------|------|-----------|
| Firebase Admin SDK v12 | Backend service | Low -- Google-maintained, stable |
| Stripe SDK v14 | Payment processing | Low -- well-maintained, versioned |
| Flutter 3.0+ | Frontend framework | Low -- Google-maintained |
| SendGrid or AWS SES | Email delivery (new) | Low -- commodity service |
| Google OAuth | Authentication | Low -- stable API |
| Node.js 18+ LTS | Runtime | Low -- LTS support through 2025 |

### Constraints

1. **Budget:** Small team (5-agent architecture team); no dedicated DevOps initially.
2. **Timeline:** MVP within 8-10 weeks from design approval.
3. **Compliance:** Must handle financial data per PCI-DSS guidelines (Stripe handles card data directly; UniCredit stores no card numbers).
4. **Platform:** iOS and Android via Flutter; web as secondary target.

---

## 8. Non-Functional Requirements

### Performance

| Metric | Target | Current |
|--------|--------|---------|
| API response time (p95) | < 300ms | Unknown (no monitoring) |
| App cold start | < 3 seconds | ~2 seconds (Flutter web) |
| Transaction history load | < 500ms for 100 items | ~800ms for 20 items (no pagination) |
| Concurrent users | 1,000+ | Unknown (in-memory state limits) |

### Security

| Requirement | Priority | Status |
|-------------|----------|--------|
| All secrets via environment variables | Critical | Partially done -- Google client ID hardcoded |
| Stripe webhook signature verification mandatory in production | Critical | Optional currently |
| CORS restricted to known origins | Critical | Permissive (`callback(null, true)`) |
| Rate limiting survives restarts | High | In-memory -- resets on restart |
| No seed passwords in production code | Critical | `admin123`/`demo123` in init function |
| JWT secret rotation capability | Medium | Single static secret |
| Input sanitization on all endpoints | High | Partially implemented |
| IDOR protection on all user-specific endpoints | High | Implemented |
| Password hashing with bcrypt (12+ rounds) | High | Implemented (12 rounds) |
| HTTPS enforced in production | Critical | Depends on deployment |
| Content Security Policy headers | Medium | Not implemented |
| Helmet.js security headers | Medium | Not implemented |

### Scalability

| Requirement | Target |
|-------------|--------|
| Horizontal scaling | Stateless backend (move sessions/rate-limits to Redis) |
| Database connections | Connection pooling for Firestore |
| File storage | Cloud Storage (GCS/S3) for media uploads |
| CDN | Static assets served via CDN |

### Accessibility

| Requirement | Standard | Priority |
|-------------|----------|----------|
| Screen reader support | WCAG 2.1 AA | COULD (post-MVP) |
| Keyboard navigation | WCAG 2.1 AA | COULD (post-MVP) |
| Color contrast ratios | 4.5:1 minimum | SHOULD |
| Touch target sizes | 48x48dp minimum | SHOULD |
| Semantic labels on all interactive elements | Flutter Semantics API | SHOULD |

### Reliability

| Requirement | Target |
|-------------|--------|
| Uptime | 99.9% (8.7 hours downtime/year) |
| Data durability | Firestore replication (Google SLA) |
| Backup frequency | Daily Firestore exports |
| RTO (Recovery Time Objective) | < 1 hour |
| RPO (Recovery Point Objective) | < 1 hour |

### Observability

| Requirement | Tool/Approach |
|-------------|---------------|
| Structured logging | Winston or Pino with JSON output |
| Request tracing | Correlation IDs on all requests |
| Error tracking | Sentry or equivalent |
| Uptime monitoring | Health check endpoint + external ping |
| Performance monitoring | APM (Datadog, New Relic, or Cloud Monitoring) |
| Alerting | PagerDuty/Slack integration for P1 issues |

---

## Appendix A: Current Architecture Snapshot

```
Frontend (Flutter)
  lib/
    main.dart                           -- App entry, routing, navigation
    services/
      api_service.dart                  -- HTTP client (hardcoded localhost:3000)
      app_state.dart                    -- Provider-based state management
    screens/
      login_screen.dart                 -- Auth (email/password + Google OAuth)
      wallet_dashboard_screen.dart      -- Balance card, quick actions, recent activity
      convert_gift_card_screen.dart     -- 6 merchants, 3-step wizard
      personalize_your_gift_screen.dart -- Gift sending with occasion/message/media
      gift_reveal_experience_screen.dart-- Gift claim UI (hardcoded data)
      add_credit_screen.dart            -- Stripe checkout, 6 amounts, 3 payment methods
      admin_overview_screen.dart        -- Volume, users, fraud flags, controls
      profile_screen.dart               -- Profile info, password change, preferences
    theme/
      app_theme.dart                    -- Design system (colors, spacing, typography)

Backend (Node.js + Express)
  server.js                             -- ALL routes, middleware, helpers (1,077 lines)
  package.json                          -- 7 dependencies

Database: Firebase Firestore
  Collections: users, transactions, gifts, fraud_flags, settings, _meta
  Fallback: In-memory Maps/Arrays when Firebase is not connected
```

## Appendix B: Data Model (Current)

### Users Collection
```
{
  name: string,
  email: string,
  password_hash: string,
  balance: number (float -- MUST migrate to integer cents),
  tier: "STANDARD" | "GOLD" | "PLATINUM",
  role: "user" | "admin",
  photo_url?: string,
  auth_provider?: "google",
  created_at: ISO 8601 string,
  updated_at: ISO 8601 string
}
```

### Transactions Collection
```
{
  user_id: string,
  amount: number (float -- MUST migrate to integer cents),
  type: "credit" | "debit",
  description: string,
  category: "gift_card" | "gift_sent" | "top_up" | "general",
  created_at: ISO 8601 string
}
```

### Gifts Collection
```
{
  sender_id: string,
  recipient_email: string,
  amount: number,
  message: string,
  occasion: string,
  status: "pending" | "claimed" | "expired",
  created_at: ISO 8601 string
}
```

### Settings Collection
```
{
  key: string,
  value: any,
  description: string,
  updated_at: ISO 8601 string,
  updated_by: string
}
```
