# API Contracts

**Version:** 1.0
**Date:** 2026-03-17

All endpoints are under the `/api/` prefix. Runtime is Node.js on Vercel serverless.

---

## Authentication

Unless noted otherwise, all endpoints require an authenticated user.

**Header:** `Authorization: Bearer <firebase-id-token>`

**Error on missing/invalid token:**
```json
{ "error": "Unauthorized" }
```
HTTP 401

**Cron endpoints** use `Authorization: Bearer <CRON_SECRET>` instead of user tokens.

---

## Type Definitions (shared)

```typescript
type Tier = "S" | "A" | "B" | "C" | "D";
type Recommendation = "strong_buy" | "buy" | "watch" | "avoid";
type ViabilityTier = "S" | "A" | "B" | "C";
type SuggestionStatus = "draft" | "estimated" | "sourcing" | "archived";
type ReportStatus = "pending" | "running" | "complete" | "failed";
type SyncType = "catalog" | "pricing" | "reviews" | "bsr" | "inventory" | "fees";
type SyncStatusState = "idle" | "syncing" | "success" | "error";
```

---

## 1. Products

### GET /api/products

List products with filtering and cursor-based pagination.

**Auth:** Required (currently unauthenticated — to be retrofitted)

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `category` | string | — | Filter by category name |
| `tier` | Tier | — | Filter by opportunity tier |
| `minScore` | number | — | Min opportunity score (0-100) |
| `maxScore` | number | — | Max opportunity score (0-100) |
| `cursor` | string | — | Product ID for cursor pagination |
| `sortBy` | string | `"createdAt"` | Sort field. Valid: `title`, `price`, `rating`, `reviewCount`, `bsr`, `createdAt` |
| `limit` | number | 20 | Results per page. Max: 100 |

**Response 200:**
```typescript
{
  products: Array<{
    id: string;
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
    estimatedMonthlySales: number;
    estimatedMonthlyRevenue: number;
    profitMarginEstimate: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    opportunity: {
      opportunityScore: number;
      tier: Tier;
      recommendation: Recommendation;
      scoreBreakdown: {
        demandScore: number;    // 0-25
        competitionScore: number; // 0-25
        marginScore: number;    // 0-25
        sentimentScore: number; // 0-25
      };
      createdAt: Timestamp;
    } | null;
  }>;
  nextCursor: string | null;
}
```

**Error 400:** Invalid `sortBy` field
**Error 500:** Firestore query failure

---

### POST /api/products (PLANNED)

Add a product by ASIN. Fetches data from Amazon SP-API and stores in Firestore.

**Auth:** Required

**Request Body:**
```typescript
{
  asin: string;           // Must match /^[A-Z0-9]{10}$/
  autoAnalyze?: boolean;  // Default: user setting
}
```

**Response 201 (new product):**
```typescript
{
  product: Product;
  exists: false;
  analysisTriggered: boolean;
}
```

**Response 200 (existing product):**
```typescript
{
  product: Product;
  exists: true;
}
```

**Error 400:** Invalid ASIN format, SP-API not configured
**Error 404:** ASIN not found on Amazon
**Error 500:** SP-API or Firestore failure

---

## 2. Analysis

### POST /api/analyze

Run Claude-powered review analysis on a product. Returns SSE stream.

**Auth:** Required (currently unauthenticated)

**Request Body:**
```typescript
{
  productId: string;         // ASIN format: /^[A-Z0-9]{10}$/
  forceReanalyze?: boolean;  // Default: false. Skip cache if true.
}
```

**Response (cached — Content-Type: application/json):**

If a fresh analysis (< 7 days old) exists and `forceReanalyze` is false:
```typescript
{
  message: "Analysis is fresh";
  analysis: Analysis;
}
```

**Response (streaming — Content-Type: text/event-stream):**

SSE events in order:
```typescript
// 1. Start
data: { type: "start", productId: string, reviewCount: number }

// 2. Progress (every ~20 tokens)
data: { type: "progress", tokens: number }

// 3. Analysis result
data: {
  type: "analysis",
  data: {
    complaints: Complaint[];
    featureRequests: FeatureRequest[];
    productGaps: ProductGap[];
    sentimentBreakdown: { positive: number; neutral: number; negative: number };
    opportunitySummary: string;
    improvementIdeas: string[];
    keyThemes: string[];
  }
}

// 4. Opportunity score
data: {
  type: "score",
  data: {
    opportunityScore: number;
    scoreBreakdown: ScoreBreakdown;
    tier: Tier;
    recommendation: Recommendation;
  }
}

// 5. Done
data: { type: "done" }

// Error (replaces steps 2-5)
data: { type: "error", message: string }
```

**Error 400:** Invalid productId format, invalid JSON body
**Error 404:** Product not found, no reviews found

---

## 3. Opportunities

### GET /api/opportunities

List scored opportunities ordered by score.

**Auth:** Required (currently unauthenticated)

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `tier` | Tier | — | Filter by tier |
| `recommendation` | Recommendation | — | Filter by recommendation |
| `minScore` | number | — | Min opportunity score |
| `limit` | number | 50 | Max results. Cap: 100 |

**Response 200:**
```typescript
{
  opportunities: Array<{
    id: string;
    productId: string;
    opportunityScore: number;
    scoreBreakdown: ScoreBreakdown;
    tier: Tier;
    recommendation: Recommendation;
    createdAt: Timestamp;
  }>;
}
```

---

## 4. Suggestions

### GET /api/suggestions

List product suggestions.

**Auth:** Required

**Response 200:**
```typescript
{
  suggestions: ProductSuggestion[];
}
```

Currently returns mock data. After migration, queries `suggestions` Firestore collection.

### POST /api/suggestions

Generate new product suggestions via Claude.

**Auth:** Required

**Request Body:**
```typescript
{
  productIds?: string[];     // Specific products to analyze
  categoryFilter?: string;   // Limit to category
}
```

**Response 200:**
```typescript
{
  suggestions: ProductSuggestion[];
  source: "live" | "mock";
}
```

---

## 5. Cost Estimate

### POST /api/cost-estimate

Generate a startup cost estimate for a product suggestion.

**Auth:** Required

**Request Body:**
```typescript
{
  suggestionId: string;
}
```

**Response 200:**
```typescript
{
  estimate: CostEstimate;
  source: "live" | "mock";
}
```

**CostEstimate shape:**
```typescript
{
  id: string;
  suggestionId: string;
  sourcingCosts: {
    unitCost: number;
    moqUnits: number;
    moqTotalCost: number;
    sampleCost: number;
  };
  shippingCosts: {
    seaFreight: number;
    customsDuty: number;
    importFees: number;
    totalPerUnit: number;
  };
  amazonFees: {
    fbaFulfillmentFee: number;
    referralFee: number;
    storageFeeMonthly: number;
    totalPerUnit: number;
  };
  launchBudget: {
    productPhotography: number;
    brandingAndPackaging: number;
    sampleOrdering: number;
    ppcLaunchBudget: number;
    amazonStorefront: number;
    totalOneTime: number;
  };
  contingencyBuffer: number;
  totalStartupCapital: number;
  targetSalePrice: number;
  estimatedNetMargin: number;    // 0.0-1.0
  breakEvenUnits: number;
  breakEvenMonths: number;
  roi12Month: number;
  monthlyProjections: Array<{
    month: number;
    unitsSold: number;
    revenue: number;
    totalCosts: number;
    profit: number;
    cumulativeProfit: number;
  }>;
  assumptions: string[];
  claudeModel: string;
  createdAt: string;             // ISO 8601
}
```

**Error 400:** Missing suggestionId
**Error 404:** Suggestion not found

---

## 6. Supplier

### POST /api/supplier/search-strategy

Generate supplier search keywords, product spec, and filter criteria.

**Auth:** Required

**Request Body:**
```typescript
{
  suggestionId: string;
}
```

**Response 200:**
```typescript
{
  keywords: string[];
  spec: ProductSpec;
  filters: SupplierFilterCriteria;
  source: "live" | "mock";
}
```

### POST /api/supplier/score

Score a list of supplier profiles.

**Auth:** Required

**Request Body:**
```typescript
{
  suggestionId: string;
  suppliers?: SupplierProfile[];   // Max 10. HTML-sanitized server-side.
}
```

**Response 200:**
```typescript
{
  scoredSuppliers: ScoredSupplier[];
  sanitizedInput: number;
  source: "live" | "mock";
}
```

**Error 400:** Missing suggestionId, suppliers not array, exceeds max 10

### POST /api/supplier/draft-message

Draft a supplier outreach email.

**Auth:** Required

**Request Body:**
```typescript
{
  suggestionId: string;
  supplierId: string;
}
```

**Response 200:**
```typescript
{
  outreach: {
    subject: string;
    body: string;
    tone: "professional" | "friendly_professional";
    variants: Array<{
      label: string;
      subject: string;
      body: string;
    }>;
  };
  supplierId: string;
  source: "live" | "mock";
}
```

---

## 7. Intelligence

### POST /api/intelligence/run

Run the 9-stage intelligence pipeline. Returns SSE stream. Max duration: 120 seconds.

**Auth:** Required

**Request Body:**
```typescript
{
  availableCapital: number;   // 2000-5000
}
```

**Response (SSE stream):**
```typescript
// Start
data: { type: "start", reportId: string, totalStages: 9 }

// Stage progress (emitted twice per stage: running + complete)
data: {
  type: "stage",
  stage: PipelineStage,
  index: number,          // 0-8
  status: "running" | "complete" | "error",
  message: string
}

// Pipeline complete
data: { type: "complete", report: IntelligenceReport }

// Error
data: { type: "error", message: string }
```

**PipelineStage values:**
```
"context_aggregation" | "beginner_filter" | "market_synthesis" |
"product_definition" | "financial_viability_check" |
"ninety_day_feasibility_check" | "risk_analysis" |
"confidence_scoring" | "final_synthesis"
```

**Error 400:** Capital out of range (2000-5000)

### GET /api/intelligence/report/[reportId]

Fetch a completed intelligence report.

**Auth:** Required

**Response 200:** Full `IntelligenceReport` object (see `src/lib/types/intelligence.ts` for complete schema — 250+ lines)

**Error 404:** Report not found

### GET /api/intelligence/reports (PLANNED)

List the authenticated user's intelligence reports.

**Auth:** Required

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | number | 20 | Max results |
| `cursor` | string | — | Pagination cursor |

**Response 200:**
```typescript
{
  reports: Array<{
    id: string;
    status: ReportStatus;
    productName: string | null;
    successProbability: number | null;
    availableCapital: number;
    createdAt: string;
  }>;
  nextCursor: string | null;
}
```

---

## 8. Live Data

### GET /api/live-data/status

Get SP-API sync status overview.

**Auth:** Required

**Response 200:**
```typescript
{
  enabled: boolean;
  syncs: Array<{
    type: SyncType;
    lastSyncAt: string | null;
    nextSyncAt: string | null;
    status: SyncStatusState;
    itemCount: number;
    errors: string[];
  }>;
  lastFullSync: string | null;
  apiHealth: "healthy" | "degraded" | "down";
}
```

### POST /api/live-data/sync

Trigger a manual data sync. Requires CRON_SECRET or admin role.

**Auth:** CRON_SECRET bearer token

**Request Body:**
```typescript
{
  asins: string[];           // Non-empty array
  types: SyncType[];         // Valid sync types
}
```

**Response 200:**
```typescript
{
  results: SyncResult[];
}
```

**Error 400:** Invalid body, empty asins, invalid types
**Error 401:** Invalid CRON_SECRET

### GET /api/live-data/product/[asin]

Get enriched product data with live SP-API overlay.

**Auth:** Required

**Response 200:**
```typescript
{
  // All Product fields plus:
  livePrice?: number;
  liveBSR?: number | null;
  liveReviewCount?: number;
  liveRating?: number;
  competitorCount?: number;
  fbaFees?: number;
  lastSynced?: string;
  dataSource: "live" | "mock" | "cached";
}
```

**Error 404:** Product not found

---

## 9. Cron Jobs

All cron endpoints require `Authorization: Bearer <CRON_SECRET>` header. If `AMAZON_SP_API_ENABLED !== "true"`, they return immediately with `{ message: "SP-API disabled" }`.

### GET /api/cron/sync-pricing
**Schedule:** `0 0 * * *` (daily midnight UTC)
**Syncs:** Pricing data for all tracked products

### GET /api/cron/sync-reviews
**Schedule:** `0 6 * * *` (daily 6am UTC)
**Syncs:** Review data for all tracked products

### GET /api/cron/sync-bsr
**Schedule:** `0 12 * * *` (daily noon UTC)
**Syncs:** BSR rankings for all tracked products

### GET /api/cron/sync-catalog
**Schedule:** `0 3 * * *` (daily 3am UTC)
**Syncs:** Catalog metadata for all tracked products

### GET /api/cron/sync-fees
**Schedule:** `0 18 * * *` (daily 6pm UTC)
**Syncs:** Fee estimates for all tracked products

**Response 200 (all cron):**
```typescript
{
  type: SyncType;
  synced: number;
  errors: string[];
}
```

---

## 10. Auth Endpoints (PLANNED)

### POST /api/auth/profile

Create or update user profile on sign-in. Called by client-side AuthProvider.

**Auth:** Required

**Request Body:**
```typescript
{
  displayName?: string;
  email: string;
}
```

**Response 200:**
```typescript
{
  uid: string;
  email: string;
  displayName: string;
  createdAt: string;
}
```

---

## 11. Settings Endpoints (PLANNED)

### GET /api/settings

Get authenticated user's settings.

**Auth:** Required

**Response 200:**
```typescript
{
  autoAnalyzeNewProducts: boolean;
  enableResponseCaching: boolean;
  claudeModel: string;
  maxReviewsPerBatch: number;
  analysisCompletionAlerts: boolean;
  theme: "light" | "dark";
  updatedAt: string;
}
```

### PUT /api/settings

Update user settings (partial update).

**Auth:** Required

**Request Body:** `Partial<UserSettings>` — only include fields to change.

**Validation:**
- `claudeModel`: must be one of allowed model strings
- `maxReviewsPerBatch`: 10-200
- `theme`: `"light"` | `"dark"`

**Response 200:**
```typescript
{
  settings: UserSettings;
  updatedAt: string;
}
```

**Error 400:** Invalid field values

---

## 12. Dashboard Stats Endpoint (PLANNED)

### GET /api/dashboard/stats

Aggregated KPI data for the dashboard page.

**Auth:** Required

**Response 200:**
```typescript
{
  totalProducts: number;
  analyzedProducts: number;
  avgScore: number;
  totalRevenue: number;
  totalReviews: number;
  avgRating: number;
  avgPrice: number;
  sProducts: number;
  aProducts: number;
  bProducts: number;
  tierCounts: Record<Tier, number>;
  categoryCounts: Record<string, number>;
  trendScores: number[];      // Last 6 months
  trendMonths: string[];      // Month labels
}
```

---

## 13. Rate Limits

### Anthropic API (enforced by circuit breaker)

| Metric | Limit |
|---|---|
| Failures before circuit opens | 5 in 10 minutes |
| Cooldown when circuit is open | 60 seconds |
| Max retry attempts per call | 3 |
| Retry delay | Exponential backoff: 1s, 2s, 4s + jitter |

### Amazon SP-API (enforced by rate limiter)

| Endpoint | Max Tokens | Refill Rate (per sec) |
|---|---|---|
| catalog | 2 | 2 |
| pricing | 10 | 10 |
| reviews | 1 | 1 |
| bsr | 5 | 5 |
| inventory | 5 | 5 |
| fees | 5 | 5 |

### API Route Limits

| Route | Limit Mechanism |
|---|---|
| `/api/products` GET | `limit` param capped at 100 |
| `/api/opportunities` GET | `limit` param capped at 100 |
| `/api/supplier/score` POST | Max 10 suppliers, 5000 chars per profile |
| `/api/intelligence/run` POST | `maxDuration = 120` seconds |
| `/api/analyze` POST | 7-day cache to prevent re-analysis |

---

## 14. Common Error Response Format

All non-SSE error responses follow this format:

```typescript
{
  error: string;   // Human-readable error message
}
```

HTTP status codes used:
- **400** — Bad request (validation failure)
- **401** — Unauthorized (missing or invalid auth)
- **404** — Resource not found
- **500** — Internal server error (generic, details logged server-side)
