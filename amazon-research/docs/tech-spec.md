# Technical Specification

**Version:** 1.0
**Date:** 2026-03-17

---

## 1. Authentication & Authorization (MVP Gap M13)

### 1.1 Firebase Auth Integration

**Providers:** Email/Password + Google OAuth

**Client-side (new files):**

- `src/lib/firebase/auth.ts` — Firebase Auth initialization, sign-in/sign-up/sign-out helpers
- `src/components/AuthProvider.tsx` — React context providing `user`, `loading`, `signIn`, `signOut`
- `src/app/login/page.tsx` — Login page with email/password form + Google sign-in button
- `src/app/login/layout.tsx` — Minimal layout (no sidebar)

**Server-side (new files):**

- `src/middleware.ts` — Next.js middleware to protect `/dashboard/*` and `/api/*` routes
- `src/lib/firebase/auth-admin.ts` — Server-side token verification via `admin.auth().verifyIdToken()`

**Implementation plan:**

```
Step 1: Firebase Console Setup
  - Enable Email/Password provider
  - Enable Google provider
  - Add authorized domains (localhost, *.vercel.app, custom domain)

Step 2: Client Auth Module (src/lib/firebase/auth.ts)
  - Import getAuth, signInWithEmailAndPassword, signInWithPopup,
    GoogleAuthProvider, onAuthStateChanged, signOut from "firebase/auth"
  - Export typed helper functions
  - Wire to existing firebase/client.ts app instance

Step 3: AuthProvider Context (src/components/AuthProvider.tsx)
  - Wrap app in RootLayout (src/app/layout.tsx)
  - Expose: user (User | null), loading (boolean), signIn, signUp, signOut
  - Listen to onAuthStateChanged
  - On first sign-in, call POST /api/auth/profile to create user doc

Step 4: Login Page (src/app/login/page.tsx)
  - Email/password form with validation
  - Google OAuth button
  - Redirect to /dashboard on success
  - Error display for auth failures

Step 5: Next.js Middleware (src/middleware.ts)
  - Match: /dashboard/:path*, /api/:path* (except /api/auth/*, /api/cron/*)
  - Check for session cookie (set by client after sign-in)
  - Redirect to /login if missing or expired
  - Pass through for public and cron routes

Step 6: API Route Auth Helper
  - Create src/lib/firebase/auth-admin.ts
  - Export: verifyAuthToken(request: NextRequest) => Promise<DecodedIdToken>
  - Reads Authorization: Bearer <token> header
  - Calls admin.auth().verifyIdToken(token)
  - Throws 401 on failure

Step 7: Retrofit Existing API Routes
  - Add auth check to: /api/products, /api/analyze, /api/opportunities,
    /api/suggestions, /api/cost-estimate, /api/supplier/*, /api/intelligence/*,
    /api/live-data/status, /api/live-data/product/*
  - Keep CRON_SECRET for cron routes (no user auth)
```

**Session Management:**

- Firebase ID tokens expire after 1 hour
- Client-side: `onIdTokenChanged` listener auto-refreshes tokens
- Server-side: middleware validates token expiry; if expired, client redirects to re-auth
- No custom session cookies needed; use Firebase ID token directly in Authorization header

**Modification to existing files:**

| File | Change |
|---|---|
| `src/app/layout.tsx` | Wrap children with `<AuthProvider>` |
| `src/app/page.tsx` | Redirect to `/login` if not authenticated, `/dashboard` if authenticated |
| `src/app/dashboard/layout.tsx` | Add auth guard (redirect to /login if no user) |
| All API route files (14 files) | Add `verifyAuthToken(request)` call at top of handler |

---

## 2. Product Ingestion by ASIN (MVP Gap M12)

### 2.1 ASIN Input Pipeline

**New API endpoint:** `POST /api/products`

**Request:**
```typescript
{
  asin: string;          // e.g., "B09V3KXJPB"
  autoAnalyze?: boolean; // default: true if user setting enabled
}
```

**Pipeline steps:**

```
1. Validate ASIN format: /^[A-Z0-9]{10}$/
2. Check Firestore: products/{asin} exists?
   → If yes, return existing product (200)
3. Fetch from Amazon SP-API (if enabled):
   a. getCatalogItem(asin) → title, brand, category, images, bullets
   b. getPricing(asin) → price, competitor count, fees
   c. getReviews(asin) → rating, review count, recent reviews
   d. getBSR(asin) → BSR, category rank
4. If SP-API disabled, return 400 "SP-API not configured"
   (Future: fallback to scraping or manual entry form)
5. Map SP-API data → Product type
6. Write to Firestore: products/{asin}
7. Return 201 with product data
8. If autoAnalyze: trigger POST /api/analyze internally
```

**UI integration (new component):**

- `src/components/dashboard/AddProductModal.tsx`
  - Modal with ASIN text input
  - Validates format client-side
  - Shows loading state during fetch
  - Displays product preview card on success
  - "Add & Analyze" button triggers analysis immediately
  - Error handling for invalid ASIN, SP-API failures, duplicate products

- Add "Add Product" button to Products page header and Sidebar

**Firestore document structure:**
```typescript
// products/{asin}
{
  id: string;              // same as ASIN
  asin: string;
  title: string;
  brand: string;
  category: string;
  subcategory: string;
  price: number;
  rating: number;
  reviewCount: number;
  bsr: number;
  imageUrl: string;
  productUrl: string;
  estimatedMonthlySales: number;
  estimatedMonthlyRevenue: number;
  profitMarginEstimate: number;
  dataSource: "spapi" | "manual";
  addedBy: string;         // userId
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 2.2 Review Ingestion

When a product is added via ASIN and SP-API is enabled:

```
1. Fetch reviews via SP-API: getReviews(asin)
2. Parse and normalize review data
3. Batch write to Firestore: reviews/{reviewId}
4. Each review doc has productId field for querying
```

**Constraint:** SP-API review data is limited. For full review access, may need Amazon Product Advertising API or scraping (out of MVP scope). Initial implementation stores the review data that SP-API provides (recent reviews, rating breakdown).

---

## 3. Mock-to-Firestore Migration (MVP Gap M11)

### 3.1 Current State: Mock Data Usage

| Page/Component | Mock Data Source | Mock Function |
|---|---|---|
| `DashboardPage` | `src/lib/mock-data.ts` | `getMockStats()`, `MOCK_PRODUCTS` |
| `ProductsPage` | `src/lib/mock-data.ts` | `MOCK_PRODUCTS` direct import |
| `ProductDetailPage` | `src/lib/mock-data.ts` | `getMockProduct(asin)`, `getMockAnalysis(asin)` |
| `OpportunitiesPage` | `src/lib/mock-data.ts` | `MOCK_PRODUCTS` direct import |
| `SuggestionsPage` | `src/lib/mock-suggestions.ts` | `getMockSuggestions()` |
| `SuggestionDetailPage` | `src/lib/mock-suggestions.ts` | Various mock getters |
| `IntelligenceReportPage` | `src/lib/mock-intelligence/` | `getMockIntelligenceReport()` |
| `LiveDataPage` | `src/lib/mock-spapi.ts` | `getMockLiveDataForProduct()` |
| API: `/api/suggestions` | `src/lib/mock-suggestions.ts` | Always returns mock data |
| API: `/api/cost-estimate` | `src/lib/mock-suggestions.ts` | Always returns mock data |
| API: `/api/supplier/*` | `src/lib/mock-suggestions.ts` | Always returns mock data |
| API: `/api/intelligence/report/[id]` | In-memory Map + mock fallback | `reportStore` + `getMockIntelligenceReport()` |
| API: `/api/live-data/product/[asin]` | `src/lib/mock-spapi.ts` | `getMockLiveDataForProduct()` |

### 3.2 Migration Plan

**Phase 1: Pages that already have Firestore API routes (wire UI to APIs)**

These pages have working API routes that query Firestore, but the UI ignores them and uses mock data directly.

| Page | Current | Migration |
|---|---|---|
| `DashboardPage` | Imports `getMockStats()`, `MOCK_PRODUCTS` | Create `useDashboard()` hook calling `/api/products` + `/api/opportunities` + compute stats server-side. Add `GET /api/dashboard/stats` endpoint. |
| `ProductsPage` | Imports `MOCK_PRODUCTS` | Replace with `useProducts()` hook (already exists, already calls `/api/products`). The hook works; the page just doesn't use it. |
| `OpportunitiesPage` | Imports `MOCK_PRODUCTS` | Create `useOpportunities()` hook calling `/api/opportunities`. |
| `ProductDetailPage` | Calls `getMockProduct(asin)`, `getMockAnalysis(asin)` | Create `useProductDetail(asin)` hook. Call `GET /api/products?asin={asin}` and `GET /api/analyze?productId={asin}`. |

**Phase 2: Pages that need new Firestore collections**

| Page | Current Mock | New Collection | Migration |
|---|---|---|---|
| `SuggestionsPage` | `getMockSuggestions()` | `suggestions` | Wire `/api/suggestions` GET to query `suggestions` collection. POST generates via Claude and writes to Firestore. |
| `SuggestionDetailPage` | Mock cost/supplier data | `costEstimates`, `supplierSearches` | Wire `/api/cost-estimate` and `/api/supplier/*` to read/write Firestore. |
| `IntelligenceReportPage` | In-memory Map | `intelligenceReports` | Wire `/api/intelligence/report/[id]` to Firestore. Write report in `/api/intelligence/run` after pipeline completes. |
| `SettingsPage` | Local React state | `users/{uid}/settings` | Wire to Firestore user settings subcollection. |

**Phase 3: Remove mock data (cleanup)**

After all pages are wired to Firestore:
1. Keep mock data files but only import them in development/test
2. Add `DATA_SOURCE` env var: `"firestore"` | `"mock"` (default: `"firestore"`)
3. API routes check `DATA_SOURCE` and fall back to mock when Firestore has no data
4. Eventually remove mock data files entirely

### 3.3 Specific File Changes

**`DashboardPage` (`src/app/dashboard/page.tsx`):**
- Remove: `import { getMockStats, MOCK_PRODUCTS } from "@/lib/mock-data"`
- Remove: `import { getMockSuggestions } from "@/lib/mock-suggestions"`
- Add: Custom hook `useDashboard()` that fetches stats from a new `/api/dashboard/stats` endpoint
- New endpoint computes KPIs from Firestore: total products, avg score, revenue, review counts, tier distribution, category breakdown

**`ProductsPage` (`src/app/dashboard/products/page.tsx`):**
- Remove: `import { MOCK_PRODUCTS, type MockProduct } from "@/lib/mock-data"`
- Add: `import { useProducts } from "@/hooks/useProducts"`
- Replace `MOCK_PRODUCTS` usage with `useProducts()` return value
- Add loading skeleton, error state

**`ProductDetailPage` (`src/app/dashboard/product/[asin]/page.tsx`):**
- Remove: `import { getMockProduct, getMockAnalysis } from "@/lib/mock-data"`
- Add: Fetch product and analysis from API endpoints
- Show loading states during fetch

**`OpportunitiesPage` (`src/app/dashboard/opportunities/page.tsx`):**
- Remove: `import { MOCK_PRODUCTS } from "@/lib/mock-data"`
- Add: Custom hook calling `/api/opportunities` with enriched product data

---

## 4. Settings Persistence (MVP Gap M14)

### 4.1 Settings Schema

```typescript
// Firestore: users/{uid}
interface UserSettings {
  // Analysis
  autoAnalyzeNewProducts: boolean;   // default: true
  enableResponseCaching: boolean;    // default: true
  claudeModel: string;               // default: "claude-sonnet-4-20250514"
  maxReviewsPerBatch: number;        // default: 50, min: 10, max: 200

  // Notifications
  analysisCompletionAlerts: boolean; // default: true

  // Appearance
  theme: "light" | "dark";          // default: "dark"

  // Metadata
  updatedAt: Timestamp;
}
```

### 4.2 Implementation

**New API endpoint:** `GET/PUT /api/settings`

```typescript
// GET /api/settings
// Returns user settings from Firestore, merged with defaults

// PUT /api/settings
// Body: Partial<UserSettings>
// Validates fields, merges with existing, writes to Firestore
```

**Settings page changes (`src/app/dashboard/settings/page.tsx`):**
- Add `useSettings()` hook that loads from `/api/settings` on mount
- Replace local `useState` calls with hook state
- `handleSave` calls `PUT /api/settings` instead of `setSaved(true)`
- Show loading skeleton while fetching
- Show success/error toast on save
- Theme change syncs to both Firestore and ThemeProvider

**ThemeProvider change:**
- On mount, if user is authenticated, fetch theme from Firestore settings
- Override localStorage value with Firestore value (Firestore is source of truth)
- Continue using localStorage as fallback for unauthenticated state

---

## 5. Intelligence Report Persistence (PRD S7)

### 5.1 Current State

Intelligence reports are stored in an in-memory `Map<string, IntelligenceReport>` with max 50 entries and LRU eviction. Reports are lost on server restart and not shared across Vercel serverless instances.

Location: `src/app/api/intelligence/run/route.ts`

### 5.2 Migration to Firestore

**New collection:** `intelligenceReports`

```typescript
// Firestore: intelligenceReports/{reportId}
// Schema mirrors IntelligenceReport type exactly
// Plus: userId field for ownership
```

**Changes to `/api/intelligence/run/route.ts`:**

```
1. Remove in-memory reportStore Map
2. After pipeline completes, write report to Firestore:
   adminDb.collection("intelligenceReports").doc(report.id).set({
     ...report,
     userId: decodedToken.uid,
   })
3. Remove exported reportStore (used by report/[reportId] route)
```

**Changes to `/api/intelligence/report/[reportId]/route.ts`:**

```
1. Remove import of reportStore
2. Query Firestore: intelligenceReports/{reportId}
3. Verify report.userId matches authenticated user
4. Remove mock fallback for "mock-" prefixed IDs (optional: keep for dev)
```

**New endpoint: `GET /api/intelligence/reports` (list all user reports)**

```typescript
// Returns: { reports: IntelligenceReportSummary[] }
// Query: intelligenceReports where userId == authenticated user
// Ordered by: createdAt desc
// Fields: id, status, verdict.productName, successProbability.overallScore, createdAt
```

**UI changes:**
- Intelligence landing page shows list of past reports (not just "Run New")
- Each report card links to `/dashboard/intelligence/[reportId]`

---

## 6. Search Implementation (PRD S5)

### 6.1 Current State

The Sidebar has a search input placeholder that is non-functional. The Products page has a local search that filters `MOCK_PRODUCTS` by title/brand/ASIN.

### 6.2 Implementation Plan

**Approach:** Client-side fuzzy search across Firestore data fetched by hooks.

The search is NOT a new API endpoint. Instead:

1. **Global search command (Cmd+K / Ctrl+K):**
   - New component: `src/components/SearchDialog.tsx`
   - Triggered by keyboard shortcut or clicking sidebar search
   - Searches across: products (title, brand, ASIN), suggestions (title, category), intelligence reports (product name)
   - Client-side filtering of data already loaded by hooks
   - Results grouped by type, with navigation links

2. **Products page search (existing):**
   - Already works against mock data
   - After migration to Firestore, will search against `useProducts()` results
   - For larger datasets, add server-side search parameter to `/api/products` (Firestore text search via `>=` and `<` prefix queries)

3. **Wire sidebar search to SearchDialog:**
   - Make the sidebar search input clickable → opens SearchDialog
   - Keyboard shortcut `/` also opens it

---

## 7. Export Implementation (PRD S3)

### 7.1 CSV Export

**New utility:** `src/lib/export/csv.ts`

```typescript
export function generateProductCSV(products: Product[]): string
export function generateOpportunityCSV(opportunities: Opportunity[]): string
export function generateIntelligenceCSV(report: IntelligenceReport): string
```

**Implementation:** Pure client-side. Generate CSV string from data, create Blob, trigger download via `URL.createObjectURL`.

**Integration points:**
- Products page: "Export CSV" button in header
- Opportunities page: "Export CSV" button in header
- Intelligence report page: "Export CSV" button

### 7.2 PDF Export

**New utility:** `src/lib/export/pdf.ts`

**Approach:** Use browser print-to-PDF with a print-optimized stylesheet.

```
1. Create print-specific CSS in globals.css (@media print)
2. Intelligence report page: "Export PDF" button
3. On click: window.print() with print stylesheet
4. Alternative: Use html2canvas + jsPDF for programmatic PDF generation
```

**Dependencies (if programmatic):**
- `jspdf` — PDF generation
- `html2canvas` — Render DOM to canvas

**Integration points:**
- Intelligence report page: "Download PDF" button
- Product detail page: "Export Analysis PDF" button

---

## 8. New API Endpoints Summary

| Method | Path | Purpose | Status |
|---|---|---|---|
| POST | `/api/auth/profile` | Create user profile on first sign-in | New |
| GET | `/api/settings` | Get user settings | New |
| PUT | `/api/settings` | Update user settings | New |
| POST | `/api/products` | Add product by ASIN | New |
| GET | `/api/dashboard/stats` | Dashboard KPI aggregation | New |
| GET | `/api/intelligence/reports` | List user's intelligence reports | New |

---

## 9. Database Seeding Strategy

For development and demo purposes, a seeding script is needed to populate Firestore with realistic data.

**New file:** `scripts/seed-firestore.ts`

```
1. Read HAND_CRAFTED products from mock-data.ts (16 products)
2. Write to Firestore products collection
3. Generate mock reviews for each product
4. Write to Firestore reviews collection
5. Run opportunity scoring on each product
6. Write to Firestore opportunities collection
7. Generate 1-2 mock suggestions
8. Write to Firestore suggestions collection
```

Run with: `npx tsx scripts/seed-firestore.ts`

Requires: `FIREBASE_ADMIN_*` env vars set in `.env.local`

---

## 10. Migration Sequence

Execute in this order to minimize breaking changes:

```
Phase 1: Auth Foundation
  1. Create Firebase Auth module + AuthProvider
  2. Create Login page
  3. Create Next.js middleware
  4. Create auth-admin verification helper
  5. Test: login flow works, dashboard is protected

Phase 2: API Auth Retrofit
  6. Add auth verification to all API routes (14 routes)
  7. Test: API calls include auth token, return 401 without

Phase 3: Settings Persistence
  8. Create settings API endpoints
  9. Create users collection structure
  10. Migrate SettingsPage to use Firestore
  11. Test: settings survive page reload

Phase 4: Data Pipeline
  12. Create POST /api/products (ASIN ingestion)
  13. Create AddProductModal component
  14. Create seed-firestore.ts script
  15. Seed Firestore with hand-crafted products
  16. Test: can add product by ASIN, data persists

Phase 5: UI Migration (mock → Firestore)
  17. Migrate DashboardPage to use API hooks
  18. Migrate ProductsPage to use useProducts hook
  19. Migrate OpportunitiesPage to use API hook
  20. Migrate ProductDetailPage to fetch from API
  21. Test: all pages show Firestore data

Phase 6: Intelligence Persistence
  22. Create intelligenceReports collection
  23. Modify /api/intelligence/run to write to Firestore
  24. Modify /api/intelligence/report/[id] to read from Firestore
  25. Add intelligence report listing endpoint
  26. Test: reports persist across page reloads

Phase 7: Polish
  27. Implement global search (Cmd+K)
  28. Implement CSV export
  29. Implement PDF export (print stylesheet)
  30. Add responsive mobile layout (sidebar collapse)
```
