# Bug Report -- Amazon Product Research Platform

Audited: 2026-03-17
Auditor: QA Engineer (Teammate 4)

---

## Critical Severity

### BUG-001: Build Failure -- Exported `analysisStore` violates Next.js route module contract
- **File:** `src/app/api/url-analysis/run/route.ts:17`
- **Category:** Functional / Build
- **Description:** The file `export { analysisStore }` exports a non-handler symbol from a Next.js API route module. Next.js App Router requires route files to export only HTTP method handlers and specific config keys (`runtime`, `maxDuration`, etc.). The `analysisStore` Map export causes a build-time type error:
  ```
  Type 'OmitWithTag<...>' does not satisfy the constraint '{ [x: string]: never; }'.
  Property 'analysisStore' is incompatible with index signature.
  ```
- **Expected:** Build succeeds.
- **Actual:** `npx next build` fails with type error.
- **Suggested Fix:** Move `analysisStore` to a shared module (e.g., `src/lib/stores/analysisStore.ts`) and import it from both the run route and the report route.

### BUG-002: Build Failure -- Same issue in Intelligence run route
- **File:** `src/app/api/intelligence/run/route.ts:44`
- **Category:** Functional / Build
- **Description:** `export { reportStore }` exports a non-handler symbol from the route module. The intelligence report route at `src/app/api/intelligence/report/[reportId]/route.ts:2` imports it directly. This may not have triggered a build error yet because the URL analysis route error halts compilation first, but it follows the same violating pattern.
- **Expected:** Build succeeds.
- **Actual:** Build would fail once BUG-001 is fixed.
- **Suggested Fix:** Move `reportStore` to `src/lib/stores/reportStore.ts`.

### BUG-003: Auth Not Wired -- Login page uses stub handlers, ignores Firebase auth
- **File:** `src/app/login/page.tsx:19-35`
- **Category:** Security / Functional
- **Description:** The login page defines stub handlers that just `console.log` and `router.push("/dashboard")` without calling Firebase auth. The `useAuth` hook exists and is fully implemented, but the page does not import or use it. Any user can click "Sign in" with any email and be redirected to the dashboard.
- **Expected:** Login page uses `useAuth` hook to call `signIn`, `signUp`, and `signInWithGoogle`.
- **Actual:** Authentication is completely bypassed on the login page.
- **Suggested Fix:** Import `useAuth` and wire `handleLogin` to `auth.signIn(email, password)`, `handleSignup` to `auth.signUp(email, password)`, and `handleGoogleSignIn` to `auth.signInWithGoogle()`.

### BUG-004: Session Cookie Never Set -- Middleware blocks all dashboard access for real users
- **File:** `src/middleware.ts:56`
- **Category:** Security / Functional
- **Description:** The middleware checks for a `__session` cookie to protect dashboard routes. However, nothing in the entire codebase ever sets this cookie. The `useAuth` hook does not set a cookie after successful authentication. This means:
  - With the stub login (BUG-003), users always get redirected to `/login` because no cookie exists.
  - Even if auth were wired, the cookie would never be set, creating an infinite redirect loop.
- **Expected:** After successful Firebase auth, a `__session` cookie is set (e.g., with the ID token or a flag).
- **Actual:** Cookie is never set; all dashboard routes redirect to `/login`.
- **Suggested Fix:** In the `useAuth` hook's `onIdTokenChange` callback, set `document.cookie = "__session=..."` when a user is authenticated, and clear it on sign-out.

### BUG-005: XSS via innerHTML in PDF Export
- **File:** `src/lib/services/export/pdfExport.ts:85`
- **Category:** Security (XSS)
- **Description:** `exportElementAsPDF` writes `element.innerHTML` directly into a new window's document via `printWindow.document.write(...)`. If any element's content contains unescaped user-supplied data (e.g., product titles, review text, supplier names), this creates a cross-site scripting vector. The `docTitle` is escaped, but the element body is not.
- **Expected:** Element content is sanitized before injection into the print window.
- **Actual:** Raw `innerHTML` is injected into `document.write()`.
- **Suggested Fix:** Use `element.textContent` for text-only content, or use DOMPurify to sanitize `innerHTML` before injection.

---

## High Severity

### BUG-006: Products GET endpoint has auth commented out
- **File:** `src/app/api/products/route.ts:23`
- **Category:** Security (Auth Bypass)
- **Description:** The GET handler has `await verifyAuthToken(request)` commented out with a TODO note. This means any unauthenticated request can fetch the product catalog. The middleware does check for a Bearer token on API routes, but since the cookie-based auth is also broken (BUG-004), the entire auth stack is unreliable.
- **Expected:** Auth verification is active.
- **Actual:** Auth is commented out; all product data is publicly accessible.
- **Suggested Fix:** Uncomment the auth verification line.

### BUG-007: Dashboard stats GET endpoint has auth commented out
- **File:** `src/app/api/dashboard/stats/route.ts:14`
- **Category:** Security (Auth Bypass)
- **Description:** Same as BUG-006. `verifyAuthToken` is commented out, exposing aggregated business KPIs (revenue, product counts, scores) without authentication.
- **Expected:** Auth verification is active.
- **Actual:** Dashboard stats are publicly accessible.

### BUG-008: Intelligence run endpoint has optional auth -- reports can be created anonymously
- **File:** `src/app/api/intelligence/run/route.ts:49-61`
- **Category:** Security (Auth Bypass)
- **Description:** Auth is wrapped in a try/catch that silently swallows failures, with the comment "Auth is optional for this endpoint during transition period." Anonymous users can trigger expensive intelligence pipeline runs (120s max duration, Claude API calls). This enables:
  - Denial of wallet attacks (running up Claude API costs)
  - Resource exhaustion (120-second pipeline executions)
- **Expected:** Auth is required; anonymous users are blocked.
- **Actual:** Anyone can run the intelligence pipeline without authentication.

### BUG-009: Race condition in user productsAdded counter
- **File:** `src/lib/services/productIngestion.ts:134`
- **Category:** Functional (Race Condition)
- **Description:** The code reads the current `productsAdded` value and increments it in a non-atomic operation:
  ```ts
  productsAdded: (await db.collection("users").doc(userId).get()).data()?.productsAdded + 1 || 1,
  ```
  If two products are ingested concurrently for the same user, both will read the same value (e.g., 5) and both will write 6, losing one increment.
- **Expected:** Counter is atomically incremented.
- **Actual:** Non-atomic read-then-write can lose increments under concurrency.
- **Suggested Fix:** Use Firestore `FieldValue.increment(1)`.

### BUG-010: Model ID mismatch between Settings API and Settings UI
- **File:** `src/app/api/settings/route.ts:9-13` vs `src/app/dashboard/settings/page.tsx:178-181`
- **Category:** Integration
- **Description:** The Settings API allowlist contains:
  - `claude-sonnet-4-20250514`
  - `claude-haiku-35-20241022`
  - `claude-opus-4-20250514`

  But the Settings UI dropdown shows:
  - `Claude Sonnet 4 (claude-sonnet-4-20250514)` -- matches
  - `Claude Opus 4.6 (claude-opus-4-6)` -- DOES NOT MATCH API
  - `Claude Haiku 4.5 (claude-haiku-4-5-20251001)` -- DOES NOT MATCH API

  Additionally, `src/lib/analysis/claudeClient.ts:8` uses `"claude-opus-4-6"` which is not in the API allowlist.
- **Expected:** UI model values match API allowlist.
- **Actual:** 2 of 3 models will be rejected by the API with a 400 error.

### BUG-011: Search scoring logic bug -- "starts with" is unreachable
- **File:** `src/hooks/useSearch.ts:58-68`
- **Category:** Functional (Logic Error)
- **Description:** The search scoring checks are ordered:
  1. Exact match (1.0)
  2. `includes` (0.8) -- "Contains full query"
  3. `startsWith` (0.9) -- "Starts with query"

  Since `String.includes()` returns true for strings that also `startsWith`, the "starts with" branch (score 0.9) is dead code -- it can never be reached. A field that starts with the query will always be caught by the `includes` check first and assigned 0.8 instead of 0.9.
- **Expected:** "Starts with" matches score higher (0.9) than general "contains" matches (0.8).
- **Actual:** All "starts with" matches get 0.8 due to ordering.
- **Suggested Fix:** Swap lines 58-62 and 64-68 so `startsWith` is checked before `includes`.

### BUG-012: No rate limiting on product ingestion POST
- **File:** `src/app/api/products/route.ts:154`
- **Category:** Security (Rate Limiting)
- **Description:** The comment explicitly notes "Consider adding per-user rate limiting (e.g., 10 products/hour)" but no rate limiting is implemented. Each POST triggers 2-4 SP-API calls. A malicious user could exhaust Amazon SP-API rate limits or rack up costs.
- **Expected:** Per-user rate limiting on product ingestion.
- **Actual:** No rate limiting; unlimited SP-API calls possible.

---

## Medium Severity

### BUG-013: CSV export vulnerable to formula injection
- **File:** `src/lib/services/export/csvExport.ts:13-19`
- **Category:** Security
- **Description:** The `escapeCSV` function does not sanitize values starting with `=`, `+`, `-`, or `@`. When users open exported CSVs in Excel or Google Sheets, these characters can trigger formula injection attacks. Product titles or review text from Amazon could contain such values.
- **Expected:** Values starting with formula trigger characters are prefixed with a single quote or tab.
- **Actual:** No formula injection protection (also documented by existing test on line 64).

### BUG-014: Dashboard stats uses `Math.random()` for trend data
- **File:** `src/app/api/dashboard/stats/route.ts:101`
- **Category:** Functional
- **Description:** Trend scores use `Math.random()` to generate variance, producing different results on every request. This makes the dashboard non-deterministic and confusing.
- **Expected:** Trend data is derived from actual time-series data or at minimum uses a deterministic seed.
- **Actual:** Random values on every API call.

### BUG-015: Settings page does not use the `useSettings` hook
- **File:** `src/app/dashboard/settings/page.tsx`
- **Category:** Integration
- **Description:** The settings page uses local `useState` for all settings and the `handleSave` function just toggles a "Saved!" message without persisting anything. The `useSettings` hook exists with full Firestore persistence logic, but the page does not use it.
- **Expected:** Settings page uses `useSettings` hook to read/write settings via API.
- **Actual:** Settings are purely local state; nothing is persisted.

### BUG-016: Dashboard layout does not use `useAuth` or `AuthGuard`
- **File:** `src/app/dashboard/layout.tsx:122-128`
- **Category:** Integration
- **Description:** The sign-out button just calls `console.log("Sign out")`. The layout does not import `useAuth` or wrap content in `AuthGuard`. The sidebar hardcodes "User" and "user@example.com" instead of showing the actual user's info.
- **Expected:** Dashboard uses auth hook for user info and sign-out.
- **Actual:** Auth integration is stubbed out.

### BUG-017: `useDashboardStats` does not send auth headers
- **File:** `src/hooks/useDashboardStats.ts:39`
- **Category:** Integration
- **Description:** The hook calls `fetch("/api/dashboard/stats")` without any Authorization header. Even though auth is currently commented out on the API (BUG-007), once auth is enabled, this hook will receive 401 responses.
- **Expected:** Auth headers are included in API requests.
- **Actual:** No auth headers sent.

### BUG-018: Intelligence report endpoint has no auth check
- **File:** `src/app/api/intelligence/report/[reportId]/route.ts`
- **Category:** Security (IDOR)
- **Description:** The GET handler for individual reports does not verify authentication. Any user who guesses or enumerates a `reportId` (UUID) can read another user's intelligence report. The fallback to mock data for IDs starting with "mock-" is also publicly accessible.
- **Expected:** Auth is verified and reports are scoped to the requesting user.
- **Actual:** Any report can be fetched by anyone with the ID.

### BUG-019: Deprecated `adminDb` proxy used inconsistently
- **File:** `src/app/api/products/route.ts:2`, `src/app/api/analyze/route.ts:2`, `src/app/api/opportunities/route.ts:2`
- **Category:** Functional / Code Quality
- **Description:** Three files import `adminDb` (the deprecated Proxy-based export), while all other files use `getAdminDb()`. The proxy works but adds overhead and could cause confusing bugs if the admin app is not initialized at import time.
- **Expected:** All files use `getAdminDb()`.
- **Actual:** Mixed usage.

### BUG-020: `docker-compose.yml` references `.env.local` which may not exist
- **File:** `docker-compose.yml:19-20`
- **Category:** Functional / Deployment
- **Description:** The `env_file` directive references `.env.local`, but only `.env.local.example` is provided. Deployment will fail unless the user manually creates the file.
- **Expected:** Documentation clearly states to copy `.env.local.example` to `.env.local`, or `docker-compose.yml` has a fallback.
- **Actual:** Silent failure if `.env.local` is missing.

---

## Low Severity

### BUG-021: `isSearching` state in `useSearch` is always false
- **File:** `src/hooks/useSearch.ts:36`
- **Category:** Functional
- **Description:** `const [isSearching] = useState(false)` -- the state is initialized but never updated. The hook exposes `isSearching` which always returns `false`. Since search is synchronous (`useMemo`), this is harmless but misleading for consumers.
- **Expected:** Either remove `isSearching` or set it based on search state.
- **Actual:** Always returns `false`.

### BUG-022: AuthGuard localStorage fallback is a security gap
- **File:** `src/components/auth/AuthGuard.tsx:33`
- **Category:** Security
- **Description:** The fallback auth check uses `localStorage.getItem("session")`, which can be trivially set by any user in browser DevTools (`localStorage.setItem("session", "anything")`). This is documented as a stub, but it is the actual fallback behavior.
- **Expected:** No localStorage fallback; only Firebase auth state is trusted.
- **Actual:** Any value in `localStorage.session` bypasses the guard.

### BUG-023: Login form does not validate email format
- **File:** `src/components/auth/LoginForm.tsx:25-31`
- **Category:** Functional
- **Description:** The login form validates that email is non-empty and password is non-empty, but does not check email format. The input has `type="email"` and `noValidate` on the form, so browser validation is explicitly disabled.
- **Expected:** Client-side email format validation before submission.
- **Actual:** Any non-empty string is accepted as email.

### BUG-024: SignupForm `onSubmit` signature mismatch
- **File:** `src/components/auth/SignupForm.tsx:9` vs `src/app/login/page.tsx:25`
- **Category:** Integration
- **Description:** `SignupForm` expects `onSubmit: (name: string, email: string, password: string) => Promise<void>`. But `useAuth.signUp` accepts `(email: string, password: string)` -- it does not accept a name parameter. When auth is wired, the name parameter from SignupForm would need to be passed separately to the profile API.
- **Expected:** Clear contract for how user name is stored.
- **Actual:** Prop signature does not match auth hook signature.

### BUG-025: `url-analysis/run` route does not validate URL for SSRF
- **File:** `src/app/api/url-analysis/run/route.ts:33-41`
- **Category:** Security (SSRF)
- **Description:** The URL validation only checks protocol is HTTP/HTTPS. It does not block:
  - Internal/private IPs (127.0.0.1, 10.x.x.x, 192.168.x.x)
  - Cloud metadata endpoints (169.254.169.254)
  - Localhost
  If `runURLAnalysisPipeline` fetches the URL server-side, this enables Server-Side Request Forgery.
- **Expected:** Block private/internal IP ranges and cloud metadata endpoints.
- **Actual:** Any HTTP(S) URL is accepted.

### BUG-026: No loading/error state shown for auth in LoginPage
- **File:** `src/app/login/page.tsx:14-35`
- **Category:** UI/UX
- **Description:** The login page does not show error messages from the auth hook. `LoginForm` has its own error state, but the page-level error from `useAuth` is never surfaced (since `useAuth` is not used).
- **Expected:** Auth errors are displayed to the user.
- **Actual:** Only the form-level catch block shows errors (which will show raw Firebase errors once wired).

### BUG-027: `SignupForm` password requirement mismatch with Firebase
- **File:** `src/components/auth/SignupForm.tsx:68`
- **Category:** Functional
- **Description:** SignupForm requires `strength.score < 3` (which needs 3 of 5 checks). But Firebase's minimum requirement is only 6 characters. The form could block valid Firebase passwords or allow passwords that pass score >= 3 but are still weak.
- **Expected:** Password requirements are documented and aligned with server expectations.
- **Actual:** Client and server validation are decoupled.

### BUG-028: NaN passes validation in capital and settings fields
- **File:** `src/app/api/intelligence/run/route.ts:73`, `src/app/api/settings/route.ts:101-108`
- **Category:** Functional (Input Validation)
- **Description:** `typeof NaN === "number"` is true in JavaScript. The range checks `NaN < 2000` and `NaN > 5000` both return false. This means NaN slips through validation in:
  1. Intelligence pipeline `availableCapital` validation: NaN overrides default 3500 and passes the 2000-5000 range check.
  2. Settings `maxReviewsPerBatch` validation: NaN passes the 10-200 range check.
  NaN values would then be written to Firestore, potentially causing downstream computation errors.
- **Expected:** NaN is rejected by validation.
- **Actual:** NaN passes all range checks due to IEEE 754 comparison behavior.
- **Suggested Fix:** Add explicit `Number.isNaN()` checks before range validation.

### BUG-029: `limit=0` parsed as falsy, falls back to default instead of clamping
- **File:** `src/app/api/products/route.ts:46`, `src/app/api/intelligence/reports/route.ts:19`
- **Category:** Functional (Input Parsing)
- **Description:** The limit parsing logic uses `parseInt(limitParam ?? "20", 10) || DEFAULT_LIMIT`. When `limit=0`, `parseInt("0")` returns `0`, which is falsy. The `|| DEFAULT_LIMIT` fallback triggers, so `limit=0` becomes `limit=20` instead of being clamped to 1 via `Math.max(1, ...)`.
- **Expected:** `limit=0` is clamped to 1.
- **Actual:** `limit=0` becomes 20 (the default).
- **Suggested Fix:** Use nullish coalescing: `parseInt(limitParam ?? "20", 10) ?? DEFAULT_LIMIT`, or check for NaN explicitly before falling back.
