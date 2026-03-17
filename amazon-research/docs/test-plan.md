# Test Plan -- Amazon Product Research Platform

Version: 1.0
Date: 2026-03-17

---

## 1. Authentication Tests

### 1.1 Email/Password Sign-In
- [ ] Valid email + correct password -> successful login, redirected to /dashboard
- [ ] Valid email + wrong password -> "Invalid email or password" error
- [ ] Non-existent email -> "Invalid email or password" (no user enumeration)
- [ ] Empty email -> client-side validation error
- [ ] Empty password -> client-side validation error
- [ ] Malformed email (no @, no domain) -> validation error
- [ ] SQL injection in email field -> rejected, no error leak
- [ ] XSS in email field -> sanitized, no script execution
- [ ] Too many failed attempts -> "Too many attempts" rate limit message
- [ ] Sign-in while already signed in -> no duplicate sessions

### 1.2 Email/Password Sign-Up
- [ ] Valid name + email + strong password -> account created, profile stored in Firestore
- [ ] Duplicate email -> "Account already exists" error
- [ ] Password < 8 chars -> client-side strength rejection
- [ ] Password without uppercase -> strength indicator shows unmet check
- [ ] Password without number -> strength indicator shows unmet check
- [ ] Password without special char -> strength indicator shows unmet check
- [ ] Passwords don't match -> "Passwords do not match" error
- [ ] Name with HTML tags -> stripped in profile creation
- [ ] Name > 100 chars -> truncated
- [ ] Profile API creates user doc with correct defaults

### 1.3 Google OAuth
- [ ] Successful Google sign-in -> account created/updated, redirected
- [ ] Google popup closed -> "Sign in was cancelled" message
- [ ] Google sign-in creates profile if first login
- [ ] Google sign-in updates lastLoginAt on subsequent logins

### 1.4 Sign-Out
- [ ] Sign out clears auth state
- [ ] Sign out clears session cookie
- [ ] Post-sign-out, navigating to /dashboard redirects to /login

### 1.5 Session Management
- [ ] __session cookie is set after successful auth
- [ ] __session cookie is cleared after sign-out
- [ ] Expired token triggers re-authentication
- [ ] Token refresh maintains session without user action

### 1.6 Route Protection
- [ ] Unauthenticated user accessing /dashboard -> redirect to /login
- [ ] Unauthenticated API request -> 401 response
- [ ] Valid token on API request -> 200 response
- [ ] Invalid/expired token -> 401 response
- [ ] Public routes (/, /login) accessible without auth
- [ ] Cron routes bypass auth middleware

---

## 2. Product Ingestion Tests

### 2.1 ASIN Validation
- [ ] Valid ASIN (B09V3KXJPB) -> accepted
- [ ] Lowercase ASIN -> auto-uppercased and accepted
- [ ] 9-char string -> rejected
- [ ] 11-char string -> rejected
- [ ] Empty string -> rejected
- [ ] Special characters (hyphens, spaces) -> rejected
- [ ] Unicode characters -> rejected
- [ ] SQL injection string -> rejected
- [ ] HTML/script tags -> rejected
- [ ] Path traversal (../../) -> rejected

### 2.2 Product Addition (POST /api/products)
- [ ] New ASIN with SP-API enabled -> product created, 201 response
- [ ] Existing ASIN -> returns existing product, 200 response
- [ ] SP-API disabled -> 400 error message about configuration
- [ ] Invalid JSON body -> 400 error
- [ ] Missing ASIN -> 400 error
- [ ] Auth required -> 401 without valid token
- [ ] BSR fetch failure -> product created with BSR=0
- [ ] Review fetch failure -> product created with reviewCount=0

### 2.3 Product Listing (GET /api/products)
- [ ] Returns paginated products with cursor
- [ ] `sortBy=price` sorts by price
- [ ] Invalid `sortBy` value -> 400 error
- [ ] `limit=5` returns exactly 5 products
- [ ] `limit=0` or negative -> clamped to 1
- [ ] `limit=200` -> clamped to 100
- [ ] `category` filter works correctly
- [ ] `tier` filter joins with opportunities collection
- [ ] `minScore`/`maxScore` filter on opportunity scores
- [ ] Cursor pagination returns next page

### 2.4 Review Ingestion
- [ ] Reviews are batch-written to Firestore
- [ ] HTML stripped from review body and title
- [ ] Rating clamped to 1-5
- [ ] Review body truncated at 5000 chars
- [ ] Review title truncated at 500 chars
- [ ] Empty review array -> returns 0
- [ ] SP-API disabled -> returns 0 silently

---

## 3. Intelligence Pipeline Tests

### 3.1 Run Pipeline (POST /api/intelligence/run)
- [ ] Valid request with capital -> starts SSE stream
- [ ] `availableCapital` below 2000 -> 400 error
- [ ] `availableCapital` above 5000 -> 400 error
- [ ] Invalid JSON body -> uses default capital
- [ ] SSE stream emits start, progress, complete events
- [ ] Report stored in Firestore on completion
- [ ] Report stored in memory cache
- [ ] User's `intelligenceReportsRun` counter incremented

### 3.2 Get Report (GET /api/intelligence/report/:reportId)
- [ ] Existing report in memory cache -> returned
- [ ] Report not in cache but in Firestore -> returned
- [ ] Mock ID (mock-*) -> returns mock data
- [ ] Non-existent ID -> 404 error
- [ ] Firestore error -> falls through to mock/404

### 3.3 List Reports (GET /api/intelligence/reports)
- [ ] Returns user's reports (scoped by userId)
- [ ] Sorted by createdAt desc
- [ ] Pagination with cursor works
- [ ] Limit clamped 1-50
- [ ] Auth required -> 401 without token

---

## 4. Settings Tests

### 4.1 GET /api/settings
- [ ] Authenticated user -> returns settings merged with defaults
- [ ] User with no doc -> returns defaults
- [ ] Unauthenticated -> 401

### 4.2 PUT /api/settings
- [ ] Valid partial update -> settings updated in Firestore
- [ ] Invalid `claudeModel` -> 400 error
- [ ] `maxReviewsPerBatch` < 10 -> 400 error
- [ ] `maxReviewsPerBatch` > 200 -> 400 error
- [ ] `maxReviewsPerBatch` non-number -> 400 error
- [ ] Invalid `theme` value -> 400 error
- [ ] Non-boolean `autoAnalyzeNewProducts` -> 400 error
- [ ] Multiple validation errors -> all returned
- [ ] Extra unknown fields -> ignored (not stored)
- [ ] Invalid JSON body -> 400 error

---

## 5. Export Tests

### 5.1 CSV Export
- [ ] Products exported with all 15 columns
- [ ] Special characters (commas, quotes, newlines) properly escaped
- [ ] Empty fields exported as empty strings
- [ ] Null/undefined values exported as empty strings
- [ ] Opportunities exported with all 8 columns
- [ ] Intelligence report exported with all sections
- [ ] File downloads with correct filename and date

### 5.2 PDF Export
- [ ] `exportPageAsPDF()` triggers print dialog
- [ ] `exportElementAsPDF(id)` creates new window with element content
- [ ] Non-existent element ID -> error logged, no crash
- [ ] Popup blocked -> falls back to full page print
- [ ] Document title is HTML-escaped

---

## 6. Search Tests

### 6.1 Fuzzy Search
- [ ] Empty query -> no results
- [ ] Single char query -> no results
- [ ] Exact match -> score 1.0
- [ ] Starts-with match -> score 0.9 (currently broken, see BUG-011)
- [ ] Contains match -> score 0.8
- [ ] All terms found -> score 0.6
- [ ] Partial terms -> score proportional to matched terms
- [ ] Case insensitive matching
- [ ] Cross-type results (products, suggestions, reports)
- [ ] Max 20 results returned
- [ ] Results sorted by score descending

### 6.2 Search Dialog (UI)
- [ ] Cmd+K opens search dialog
- [ ] Escape closes dialog
- [ ] Arrow keys navigate results
- [ ] Enter selects result and navigates
- [ ] "/" opens search (when not in input)
- [ ] Results grouped by type

---

## 7. Dashboard Stats Tests

### 7.1 GET /api/dashboard/stats
- [ ] Returns all expected KPI fields
- [ ] Tier counts are correct aggregations
- [ ] Category counts match product data
- [ ] Average calculations correct (rating, price, score)
- [ ] totalRevenue is rounded integer
- [ ] Empty database -> all zeros, no errors

---

## 8. Security Tests

### 8.1 Authentication
- [ ] No auth bypass via direct URL access to /dashboard/*
- [ ] API routes reject requests without Authorization header
- [ ] Invalid/expired tokens rejected
- [ ] Token verification uses firebase-admin (not client SDK)
- [ ] Error messages don't leak internal state

### 8.2 Input Validation
- [ ] ASIN injection via malicious strings
- [ ] XSS via product title in search results
- [ ] XSS via review content in CSV export
- [ ] Formula injection via CSV export (=, +, -, @)
- [ ] SSRF via URL analysis endpoint
- [ ] JSON body parsing errors handled gracefully

### 8.3 Authorization (IDOR)
- [ ] User A cannot access User B's settings
- [ ] User A cannot access User B's intelligence reports
- [ ] Report IDs cannot be enumerated

### 8.4 Rate Limiting
- [ ] Product ingestion rate limited per user
- [ ] Intelligence pipeline rate limited per user
- [ ] URL analysis rate limited per user

---

## 9. Error Handling Tests

### 9.1 Network Errors
- [ ] API timeout -> error message shown to user
- [ ] Network disconnection -> error boundary catches
- [ ] Invalid JSON response -> error message
- [ ] 500 responses -> generic error shown

### 9.2 Data Edge Cases
- [ ] Missing product fields -> defaults used
- [ ] Null rating/price -> displayed as 0
- [ ] Empty product list -> EmptyState component shown
- [ ] Duplicate product submission -> handled gracefully

---

## 10. Accessibility Tests

- [ ] All form inputs have labels (htmlFor/id pairing)
- [ ] Error messages linked via aria-describedby
- [ ] Modal dialogs have role="dialog" and aria-modal="true"
- [ ] Toast notifications have role="alert"
- [ ] Focus trapped in modals
- [ ] Keyboard navigable (Tab, Escape, Enter)
- [ ] Password toggle has aria-label
- [ ] Color contrast meets WCAG AA
- [ ] Screen reader announces search results
