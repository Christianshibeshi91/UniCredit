# UniCredit (Stitch) -- User Stories

**Version:** 3.0
**Date:** 2026-03-17
**Status:** Draft

---

## Epic 1: Authentication & Account Management

### US-1.1: Email/Password Registration

**As a** new user, **I want to** create an account with my email and password **so that** I can access my UniCredit wallet.

**Acceptance Criteria:**
- User provides email, password, and optional display name.
- Email must be a valid format (contains `@` and a domain).
- Password must be at least 8 characters.
- Duplicate email addresses are rejected with a clear error message.
- Password is hashed with bcrypt (12+ rounds) before storage.
- A JWT token is returned and persisted for session continuity.
- User is redirected to the wallet dashboard upon successful registration.
- Rate limited to 15 registration attempts per 15 minutes per IP.

### US-1.2: Email/Password Login

**As a** returning user, **I want to** log in with my email and password **so that** I can access my wallet and transaction history.

**Acceptance Criteria:**
- User provides email and password.
- Invalid credentials return a generic "Invalid email or password" message (no enumeration of which field is wrong).
- Successful login returns a JWT token valid for 24 hours.
- Session token is persisted locally for auto-login on app restart.
- Rate limited to 15 login attempts per 15 minutes per IP.

### US-1.3: Google OAuth Sign-In

**As a** user, **I want to** sign in with my Google account **so that** I can skip creating a new password.

**Acceptance Criteria:**
- Google ID token is verified server-side via Google's tokeninfo endpoint.
- If the email already exists, the user is logged in to their existing account.
- If the email is new, a new account is created with the Google display name and photo.
- Google-authenticated users have an empty password hash (cannot use password login unless they set one).
- The Google Client ID is loaded from environment variables, not hardcoded in source.

### US-1.4: Password Reset via Email

**As a** user who forgot my password, **I want to** receive a password reset email **so that** I can regain access to my account.

**Acceptance Criteria:**
- User enters their email address on the forgot password screen.
- If the email exists, a time-limited reset token (valid for 1 hour) is generated and emailed.
- If the email does not exist, the same success message is shown (no email enumeration).
- The reset link opens a form where the user enters a new password.
- The reset token is single-use and invalidated after use.
- Rate limited to 5 reset requests per hour per IP.

### US-1.5: Change Password

**As a** logged-in user, **I want to** change my password **so that** I can maintain account security.

**Acceptance Criteria:**
- User must provide current password and new password.
- Current password is verified before the change is applied.
- New password must be at least 8 characters.
- Password hash is updated in both Firestore and Firebase Auth.
- Success confirmation is displayed; existing sessions remain valid.

### US-1.6: Auto-Login on App Restart

**As a** returning user, **I want to** be automatically logged in when I reopen the app **so that** I do not have to re-enter credentials.

**Acceptance Criteria:**
- JWT token is stored in SharedPreferences (or SecureStorage for production).
- On app launch, the stored token is validated via the `/api/auth/me` endpoint.
- If the token is valid, the user is taken directly to the wallet dashboard.
- If the token is expired or invalid, the user is taken to the login screen and the stored token is cleared.

### US-1.7: Logout

**As a** user, **I want to** sign out of my account **so that** no one else can access my wallet on this device.

**Acceptance Criteria:**
- A confirmation dialog is shown before logout.
- All local state (token, user data, transactions) is cleared.
- The user is redirected to the login screen.
- The stored JWT token is removed from local storage.

### US-1.8: Biometric Authentication

**As a** user, **I want to** unlock the app with my fingerprint or face **so that** I can access my wallet quickly and securely.

**Acceptance Criteria:**
- Biometric toggle is available in Profile > Preferences.
- When enabled, app launch prompts for biometric verification before showing the dashboard.
- If biometric verification fails 3 times, the user falls back to email/password login.
- Biometric preference is stored locally (not synced across devices).
- The biometric toggle actually functions (currently UI-only).

---

## Epic 2: Wallet Management

### US-2.1: View Wallet Balance

**As a** user, **I want to** see my current UniCredit balance prominently **so that** I know how much I have available.

**Acceptance Criteria:**
- Balance is displayed on the wallet dashboard in a styled balance card.
- Balance is formatted as currency with two decimal places (e.g., "$1,240.50").
- Balance is stored internally as integer cents to avoid floating-point errors.
- Balance updates in real-time after any transaction (conversion, gift sent, credit added).
- Pull-to-refresh reloads the balance from the server.

### US-2.2: View Transaction History

**As a** user, **I want to** see my recent transactions **so that** I can track my spending and credits.

**Acceptance Criteria:**
- Transactions are displayed in reverse chronological order.
- Each transaction shows: description, type (credit/debit), amount, date, and category icon.
- Credits are shown in green with a "+" prefix; debits in red with a "-" prefix.
- Transaction list supports pagination (load more on scroll, 20 per page).
- A "View All" link navigates to a full transaction history screen.
- Empty state shows a helpful message with a call to action.

### US-2.3: View Tier Status

**As a** user, **I want to** see my current tier (Standard, Gold, Platinum) **so that** I understand my loyalty level and benefits.

**Acceptance Criteria:**
- Tier badge is displayed on the balance card and profile screen.
- Each tier has a distinct visual treatment (color, icon).
- Tier upgrade criteria are accessible (e.g., "Convert $5,000 to reach Gold").
- Tier benefits are listed somewhere in the app (better rates, bonus credits, etc.).

### US-2.4: Search and Filter Transactions

**As a** user, **I want to** search and filter my transactions **so that** I can find specific entries quickly.

**Acceptance Criteria:**
- Search by description text (partial match).
- Filter by category (gift_card, gift_sent, top_up, general).
- Filter by date range.
- Filter by credit/debit type.
- Results update as filters are applied.

---

## Epic 3: Gift Card Conversion

### US-3.1: Select Merchant

**As a** user, **I want to** select the merchant of my gift card **so that** the correct exchange rate and validation rules are applied.

**Acceptance Criteria:**
- At least 6 merchants are displayed: Amazon, iTunes, Google Play, Steam, Walmart, eBay.
- Each merchant has a unique icon and color gradient.
- Only one merchant can be selected at a time.
- Selected merchant is visually highlighted with elevation and shadow.
- A "See All" link is available for future merchant expansion.

### US-3.2: Enter Card Details

**As a** user, **I want to** enter my gift card number, PIN, and value **so that** my card can be validated and converted.

**Acceptance Criteria:**
- Card number is required; PIN is optional (depends on merchant).
- Card value must be a positive number between $0.01 and $50,000.
- Input fields have appropriate keyboard types (number for value).
- A paste button is available for the card number field.
- PIN field is obscured by default.

### US-3.3: Preview Conversion Value

**As a** user, **I want to** see the estimated UniCredit value before confirming **so that** I know exactly what I will receive.

**Acceptance Criteria:**
- Estimated value updates in real-time as the user types the card value.
- The exchange rate is displayed (e.g., "1 GC = 0.90 UniCredit -- 90% rate").
- The estimated value is shown prominently in a green-tinted container.
- The exchange rate may vary by merchant (fetched from settings if available).

### US-3.4: Confirm Conversion

**As a** user, **I want to** confirm the conversion and see my balance update **so that** I know the conversion was successful.

**Acceptance Criteria:**
- A loading indicator is shown during the conversion API call.
- On success, a green snackbar shows the credited amount.
- The wallet balance refreshes to reflect the new total.
- A transaction record is created with type "credit" and category "gift_card".
- The user is navigated back to the dashboard or conversion screen clears its fields.
- On failure, a red snackbar shows a user-friendly error message (no stack traces).

### US-3.5: Conversion Error Handling

**As a** user, **I want to** see clear error messages if my conversion fails **so that** I know what went wrong.

**Acceptance Criteria:**
- Missing card number: "Please fill in card number and a valid amount."
- Invalid amount (zero, negative, or exceeds $50,000): "Invalid amount. Must be between $0.01 and $50,000."
- Network error: "Something went wrong. Please try again."
- Rate limit exceeded: "Too many requests. Please try again later."
- All errors are displayed as snackbars with red background.

---

## Epic 4: Gift Sending

### US-4.1: Enter Recipient

**As a** gift sender, **I want to** enter the recipient's email address **so that** they receive my gift.

**Acceptance Criteria:**
- Email field with proper keyboard type and validation.
- Invalid email format is rejected before submission.
- Contacts icon is present for future address book integration.
- Self-sending (to own email) is allowed but shows a confirmation.

### US-4.2: Select Occasion

**As a** gift sender, **I want to** choose an occasion for my gift **so that** the recipient sees an appropriate theme.

**Acceptance Criteria:**
- 10 occasion options are displayed in a 3-column grid: Birthday, Wedding, Graduation, Anniversary, Holiday, New Baby, Farewell, Congrats, Thank You, Other.
- Each occasion has a unique icon and color gradient.
- Selecting "Other" reveals a text input for a custom occasion name.
- Only one occasion can be selected at a time.

### US-4.3: Set Gift Amount

**As a** gift sender, **I want to** specify how much UniCredit to send **so that** the recipient receives the intended value.

**Acceptance Criteria:**
- Amount field accepts numeric input.
- Amount must be positive and not exceed the sender's balance.
- If the amount exceeds the sender's balance, submission fails with "Insufficient balance."

### US-4.4: Add Personal Message

**As a** gift sender, **I want to** write a personal message **so that** the gift feels thoughtful and personal.

**Acceptance Criteria:**
- Multi-line text field with 200-word limit indicator.
- Character/word counter updates as the user types.
- If no message is provided, a default ("Enjoy your gift!") is used.
- Message is sanitized server-side (HTML entities escaped).

### US-4.5: Attach Video Message

**As a** gift sender, **I want to** record or select a video message **so that** the recipient can see and hear my well-wishes.

**Acceptance Criteria:**
- On mobile: opens camera for recording (max 30 seconds).
- On web: opens file picker for video selection.
- Video preview shows file name and "Video Ready" confirmation.
- Re-recording replaces the previous video.
- Video file is uploaded to cloud storage (GCS/S3) and linked to the gift record.
- **Current gap:** Video is captured but silently discarded -- must implement upload.

### US-4.6: Attach Audio Message

**As a** gift sender, **I want to** record a voice message **so that** the recipient hears my personal greeting.

**Acceptance Criteria:**
- Tap to start recording; tap again to stop.
- Recording timer is displayed during recording.
- Auto-stop at 60 seconds.
- Audio preview shows duration and "Audio Ready" confirmation.
- Microphone permission is requested before first recording.
- Audio file is uploaded to cloud storage and linked to the gift record.
- **Current gap:** Audio is recorded but silently discarded -- must implement upload.

### US-4.7: Schedule Gift Delivery

**As a** gift sender, **I want to** schedule a future delivery date **so that** the gift arrives on the right occasion.

**Acceptance Criteria:**
- Date picker allows selection of any future date.
- If no date is selected, the gift is sent immediately.
- Scheduled gifts show a "Scheduled for [date]" indicator in transaction history.
- A background job processes scheduled gifts at the specified date/time.

### US-4.8: Confirm and Send Gift

**As a** gift sender, **I want to** review and confirm my gift before sending **so that** I can catch any mistakes.

**Acceptance Criteria:**
- Loading indicator during the send API call.
- On success: sender's balance is debited, transaction record created, green snackbar confirmation.
- Recipient receives an email notification with a claim link.
- Gift record is created with status "pending."
- On failure: red snackbar with user-friendly error, balance is NOT debited.

### US-4.9: Gift Sending Error Handling

**As a** gift sender, **I want to** see clear error messages if sending fails **so that** I can fix the issue.

**Acceptance Criteria:**
- Missing recipient: "Please enter recipient email and a valid amount."
- Invalid email: "Invalid recipient email."
- Insufficient balance: "Insufficient balance."
- Amount exceeds $50,000: "Invalid amount. Must be between $0.01 and $50,000."
- Network error: "Something went wrong. Please try again."
- Rate limit: "Too many requests. Please try again later."

---

## Epic 5: Gift Receiving

### US-5.1: Receive Gift Notification

**As a** gift recipient, **I want to** receive an email when someone sends me a gift **so that** I know to claim it.

**Acceptance Criteria:**
- Email is sent via SendGrid/SES to the recipient's email address.
- Email includes: sender's name, occasion, personal message (no video/audio -- those are in-app).
- Email includes a secure claim link (time-limited token).
- Email is branded with UniCredit design.
- **Current gap:** No email notification exists -- gifts are created but recipients have no way to know.

### US-5.2: Claim Gift

**As a** gift recipient, **I want to** claim my gift and add it to my wallet **so that** I can use the UniCredit.

**Acceptance Criteria:**
- Claim link opens the app (deep link) or a web page.
- If the recipient has an account, the gift is added to their balance immediately.
- If the recipient does not have an account, they are prompted to create one, and the gift is credited after registration.
- Gift status changes from "pending" to "claimed."
- Sender is notified (in-app or email) that their gift was claimed.
- A claimed gift cannot be claimed again.

### US-5.3: View Gift Reveal Experience

**As a** gift recipient, **I want to** see an animated reveal with the sender's message and media **so that** the gifting experience feels special.

**Acceptance Criteria:**
- Reveal screen shows: occasion label, sender's message (quoted), amount, sender's name.
- If video/audio was attached, a play button is displayed.
- "Accept Gift" button credits the amount and shows a success animation.
- "Send Thank You" link is available (future feature).
- **Current gap:** The reveal screen uses hardcoded data -- must load actual gift data.

### US-5.4: Gift Expiration

**As a** gift sender, **I want** unclaimed gifts to expire after a reasonable period **so that** my money is not locked up indefinitely.

**Acceptance Criteria:**
- Gifts expire after 90 days (configurable in settings).
- Expired gifts return the full amount to the sender's wallet.
- A transaction record is created for the refund.
- Sender is notified when a gift expires.
- A background job runs daily to process expired gifts.

---

## Epic 6: Payments & Credit

### US-6.1: Select Top-Up Amount

**As a** user, **I want to** choose from preset amounts to add to my wallet **so that** I can quickly top up.

**Acceptance Criteria:**
- 6 preset amounts are displayed: $10, $25, $50, $100, $200, $500.
- Higher amounts show bonus labels (e.g., "$50 +$2 bonus").
- Selected amount is visually highlighted.
- The selected amount is displayed prominently in a hero card.

### US-6.2: Select Payment Method

**As a** user, **I want to** choose my payment method **so that** I can pay the way I prefer.

**Acceptance Criteria:**
- Three options: Credit/Debit Card (Visa, Mastercard, Amex), Apple Pay, Bank Transfer.
- Only one method can be selected at a time.
- Selected method shows a blue checkmark.
- **Note:** In MVP, all methods route through Stripe Checkout.

### US-6.3: Complete Stripe Checkout

**As a** user, **I want to** complete my payment via Stripe **so that** my wallet is credited.

**Acceptance Criteria:**
- Tapping "Add $X to Wallet" creates a Stripe Checkout session.
- User is redirected to Stripe's hosted checkout page.
- After successful payment, Stripe redirects to the success page.
- The success page confirms the credited amount.
- Balance is updated via Stripe webhook (primary) or success redirect (fallback).
- Idempotency: each session is processed only once (tracked via `processedSessions`).

### US-6.4: Payment Failure Handling

**As a** user, **I want to** know if my payment failed **so that** I can try again or use a different method.

**Acceptance Criteria:**
- Stripe cancel redirect shows "Payment Cancelled" with a return-to-app prompt.
- Network errors during checkout session creation show "Something went wrong."
- If Stripe is not configured, a 503 error is shown: "Stripe not configured."

### US-6.5: Webhook Payment Processing

**As** the system, **I want to** process Stripe webhooks reliably **so that** payments are credited exactly once.

**Acceptance Criteria:**
- Webhook signature is verified using `STRIPE_WEBHOOK_SECRET` (mandatory in production).
- `checkout.session.completed` events with `payment_status: paid` credit the user.
- Session IDs are tracked to prevent duplicate processing.
- Processed session records are cleaned up after 24 hours.
- Failed signature verification returns 400.

---

## Epic 7: Admin Dashboard

### US-7.1: View Platform Metrics

**As an** admin, **I want to** see key platform metrics at a glance **so that** I can monitor business health.

**Acceptance Criteria:**
- Total Volume: sum of all positive transaction amounts, formatted as currency.
- Total Users: count of user documents.
- Active Conversations (Transactions): count of transaction documents.
- Metrics refresh on page load.
- Growth percentages are calculated from real data (not hardcoded).
- **Current gap:** Growth percentages are hardcoded to 0 in the API response.

### US-7.2: Review Fraud Flags

**As an** admin, **I want to** see flagged users and take action **so that** I can prevent fraud.

**Acceptance Criteria:**
- Fraud flags are listed with: user name, reason, amount, severity, and status.
- Each flag has "Review" and "Block" action buttons.
- "Review" opens a detailed view of the user's transaction history.
- "Block" suspends the user account and marks the flag as resolved.
- Resolved flags are removed from the active list.
- **Current gap:** Action buttons exist but have no functionality.

### US-7.3: Manage Exchange Rates

**As an** admin, **I want to** adjust the gift card exchange rate **so that** I can respond to market conditions.

**Acceptance Criteria:**
- Current exchange rate is displayed.
- "Adjust" button opens a modal with a numeric input.
- New rate is saved to Firestore `settings` collection.
- Changes take effect immediately for new conversions.
- An audit log records who changed the rate and when.
- **Current gap:** The "Adjust" button exists but does nothing.

### US-7.4: Toggle Global Rate Lock

**As an** admin, **I want to** lock the exchange rate globally **so that** I can freeze rates during volatile periods.

**Acceptance Criteria:**
- Toggle switch reflects the current state from Firestore settings.
- Toggling persists the change to Firestore.
- When locked, conversions use the locked rate regardless of per-merchant settings.
- **Current gap:** Toggle changes local state only -- does not persist.

### US-7.5: View and Manage Users

**As an** admin, **I want to** search, view, and manage user accounts **so that** I can handle support requests and compliance.

**Acceptance Criteria:**
- User list is paginated (50 per page).
- Search by name or email.
- User detail view shows: profile info, balance, tier, transaction history.
- Admin can suspend, reinstate, and adjust tier for a user.
- Admin actions are audit-logged.

### US-7.6: Admin Access Control

**As** the system, **I want to** restrict admin endpoints to users with the admin role **so that** regular users cannot access admin functions.

**Acceptance Criteria:**
- All `/api/admin/*` endpoints require JWT with `role: admin`.
- Non-admin users receive 403: "Admin access required."
- Admin role is never assignable via public endpoints (manual database assignment only).
- The admin tab in the mobile app is only visible to admin users.
- **Current gap:** The Admin tab is visible to all users in the bottom navigation.

---

## Epic 8: User Profile

### US-8.1: View Profile Information

**As a** user, **I want to** see my account information **so that** I can verify it is correct.

**Acceptance Criteria:**
- Displays: avatar (initial-based), full name, email, tier badge.
- Profile photo upload is available (camera icon on avatar).
- Information is read from the AppState provider.

### US-8.2: Edit Profile Information

**As a** user, **I want to** update my name and email **so that** my account reflects current information.

**Acceptance Criteria:**
- Tapping on name or email row opens an edit form.
- Changes are saved to the backend via POST `/api/users`.
- Email changes may require re-verification (post-MVP).
- IDOR protection: users can only edit their own profile.

### US-8.3: Toggle Biometric Login

**As a** user, **I want to** enable or disable biometric login **so that** I can choose my preferred security level.

**Acceptance Criteria:**
- Toggle switch in Preferences section.
- State is persisted locally.
- **Current gap:** Toggle exists but has no functional implementation.

### US-8.4: Toggle Smart Alerts

**As a** user, **I want to** enable or disable notifications **so that** I control how the app contacts me.

**Acceptance Criteria:**
- Toggle switch in Preferences section.
- When enabled, the user receives push notifications for gifts, payments, and security events.
- State is synced to the backend for server-side notification delivery decisions.
- **Current gap:** Toggle exists but has no functional implementation.

---

## Epic 9: Notifications

### US-9.1: Gift Received Notification

**As a** gift recipient, **I want to** be notified when someone sends me a gift **so that** I can claim it promptly.

**Acceptance Criteria:**
- Email notification sent immediately (or at scheduled delivery time).
- Push notification if the user has the app installed and notifications enabled.
- Notification includes sender name, occasion, and claim action.

### US-9.2: Gift Claimed Notification

**As a** gift sender, **I want to** be notified when my gift is claimed **so that** I know it was received.

**Acceptance Criteria:**
- Push notification and/or email to the sender.
- Includes recipient name and amount claimed.

### US-9.3: Payment Confirmation Notification

**As a** user, **I want to** be notified when a payment is processed **so that** I have a receipt.

**Acceptance Criteria:**
- Email confirmation with amount, payment method, and new balance.
- Push notification with amount credited.

### US-9.4: Gift Expiring Warning

**As a** gift sender, **I want to** be warned when my sent gift is about to expire **so that** I can remind the recipient.

**Acceptance Criteria:**
- Email and push notification 7 days before expiration.
- Includes recipient email and remaining amount.

---

## Epic 10: Error & Edge Case Scenarios

### US-10.1: Network Failure Handling

**As a** user, **I want to** see a helpful message when the network is unavailable **so that** I know the app is not broken.

**Acceptance Criteria:**
- API calls that fail due to network errors show "Connection error. Is the backend running?" or similar.
- No blank screens or unhandled exception dialogs.
- Retry button is available where appropriate.
- **Current gap:** Network failures show raw exception messages or blank screens.

### US-10.2: Token Expiration Handling

**As a** user, **I want to** be gracefully redirected to login when my session expires **so that** I can re-authenticate.

**Acceptance Criteria:**
- 401 responses from any API call trigger automatic logout.
- The user sees the login screen with a message: "Session expired. Please sign in again."
- No infinite loops or error cascades.

### US-10.3: Concurrent Session Handling

**As a** user, **I want to** know if my account is accessed from another device **so that** I can secure my account if necessary.

**Acceptance Criteria:**
- For MVP: last-login-wins (new login invalidates old tokens).
- Post-MVP: active session list with "Sign out everywhere" option.

### US-10.4: Insufficient Balance Prevention

**As a** user, **I want to** be prevented from sending a gift larger than my balance **so that** I do not accidentally overdraft.

**Acceptance Criteria:**
- Client-side validation checks balance before submission.
- Server-side validation rejects the request with "Insufficient balance."
- Balance is checked atomically (not susceptible to race conditions from concurrent requests).

### US-10.5: Duplicate Submission Prevention

**As a** user, **I want** the app to prevent me from accidentally submitting a conversion or gift twice **so that** I am not charged double.

**Acceptance Criteria:**
- Submit buttons are disabled during API calls (loading state).
- Server-side idempotency for payment processing (Stripe session tracking).
- Conversion and gift endpoints use appropriate rate limiting.

### US-10.6: Admin Tab Visibility

**As a** regular user, **I want** the admin tab to be hidden **so that** I am not confused by inaccessible features.

**Acceptance Criteria:**
- Bottom navigation shows 3 tabs for regular users: Wallet, Convert, Profile.
- Bottom navigation shows 4 tabs for admin users: Wallet, Convert, Admin, Profile.
- Admin-only endpoints return 403 if accessed by non-admin users regardless of UI.
