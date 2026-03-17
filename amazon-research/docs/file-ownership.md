# File Ownership Map

**Version:** 1.0
**Date:** 2026-03-17

This document maps every file and directory to its owning teammate.

**Teammate 3 (Developer):** Business logic, API routes, services, models, hooks
**Teammate 5 (DevOps/UI):** Components, styles, layouts, deployment, configuration

Files marked **SHARED** require coordination between teammates when modified.

---

## 1. Root Configuration

| File/Directory | Owner | Notes |
|---|---|---|
| `package.json` | **SHARED** | Teammate 3 adds backend deps, Teammate 5 adds frontend deps |
| `package-lock.json` | **SHARED** | Auto-generated from package.json |
| `tsconfig.json` | **SHARED** | Compiler settings affect both frontend and backend |
| `next.config.ts` | Teammate 5 | Next.js configuration, build settings |
| `postcss.config.mjs` | Teammate 5 | Tailwind CSS PostCSS config |
| `vercel.json` | Teammate 5 | Deployment config, cron schedules |
| `next-env.d.ts` | — | Auto-generated, do not edit |
| `tsconfig.tsbuildinfo` | — | Auto-generated, do not edit |

---

## 2. Source Root (`src/`)

### 2.1 App Router — Layouts & Pages

| File | Owner | Notes |
|---|---|---|
| `src/app/layout.tsx` | **SHARED** | Root layout. Teammate 5 owns styling/providers; Teammate 3 adds AuthProvider |
| `src/app/page.tsx` | **SHARED** | Root redirect. Teammate 3 adds auth-aware redirect logic |
| `src/app/globals.css` | Teammate 5 | Design system: theme vars, glass morphism, animations |
| `src/app/login/page.tsx` | **SHARED** | PLANNED. Teammate 5 builds UI; Teammate 3 wires auth logic |
| `src/app/login/layout.tsx` | Teammate 5 | PLANNED. Minimal layout without sidebar |

### 2.2 Dashboard Pages

| File | Owner | Notes |
|---|---|---|
| `src/app/dashboard/layout.tsx` | Teammate 5 | Dashboard shell: sidebar + content area |
| `src/app/dashboard/page.tsx` | **SHARED** | Teammate 5 owns layout/components; Teammate 3 replaces mock data with hooks |
| `src/app/dashboard/products/page.tsx` | **SHARED** | Teammate 5 owns table/grid UI; Teammate 3 wires useProducts hook |
| `src/app/dashboard/product/[asin]/page.tsx` | **SHARED** | Teammate 5 owns detail layout; Teammate 3 wires data fetching |
| `src/app/dashboard/opportunities/page.tsx` | **SHARED** | Teammate 5 owns ranking UI; Teammate 3 wires opportunities API |
| `src/app/dashboard/suggestions/page.tsx` | **SHARED** | Teammate 5 owns feed UI; Teammate 3 wires suggestions API |
| `src/app/dashboard/suggestions/[suggestionId]/page.tsx` | **SHARED** | Teammate 5 owns detail UI; Teammate 3 wires cost/supplier APIs |
| `src/app/dashboard/intelligence/page.tsx` | **SHARED** | Teammate 5 owns landing UI; Teammate 3 wires report listing |
| `src/app/dashboard/intelligence/[reportId]/page.tsx` | **SHARED** | Teammate 5 owns report UI; Teammate 3 wires Firestore persistence |
| `src/app/dashboard/live-data/page.tsx` | **SHARED** | Teammate 5 owns dashboard UI; Teammate 3 owns data enrichment |
| `src/app/dashboard/settings/page.tsx` | **SHARED** | Teammate 5 owns settings UI; Teammate 3 wires Firestore persistence |

### 2.3 API Routes

All API routes are owned by **Teammate 3**.

| File | Owner | Purpose |
|---|---|---|
| `src/app/api/products/route.ts` | Teammate 3 | Product CRUD (GET + planned POST) |
| `src/app/api/analyze/route.ts` | Teammate 3 | Claude review analysis (SSE) |
| `src/app/api/opportunities/route.ts` | Teammate 3 | Opportunity scoring queries |
| `src/app/api/suggestions/route.ts` | Teammate 3 | Suggestion generation + listing |
| `src/app/api/cost-estimate/route.ts` | Teammate 3 | Cost estimation |
| `src/app/api/supplier/search-strategy/route.ts` | Teammate 3 | Supplier search strategy |
| `src/app/api/supplier/score/route.ts` | Teammate 3 | Supplier scoring |
| `src/app/api/supplier/draft-message/route.ts` | Teammate 3 | Outreach drafting |
| `src/app/api/intelligence/run/route.ts` | Teammate 3 | Intelligence pipeline (SSE) |
| `src/app/api/intelligence/report/[reportId]/route.ts` | Teammate 3 | Report retrieval |
| `src/app/api/live-data/status/route.ts` | Teammate 3 | SP-API sync status |
| `src/app/api/live-data/sync/route.ts` | Teammate 3 | Manual sync trigger |
| `src/app/api/live-data/product/[asin]/route.ts` | Teammate 3 | Enriched product data |
| `src/app/api/cron/sync-pricing/route.ts` | Teammate 3 | Cron: pricing sync |
| `src/app/api/cron/sync-reviews/route.ts` | Teammate 3 | Cron: review sync |
| `src/app/api/cron/sync-bsr/route.ts` | Teammate 3 | Cron: BSR sync |
| `src/app/api/cron/sync-catalog/route.ts` | Teammate 3 | Cron: catalog sync |
| `src/app/api/cron/sync-fees/route.ts` | Teammate 3 | Cron: fee sync |

**Planned API routes (Teammate 3):**

| File | Purpose |
|---|---|
| `src/app/api/auth/profile/route.ts` | User profile creation |
| `src/app/api/settings/route.ts` | User settings CRUD |
| `src/app/api/dashboard/stats/route.ts` | Dashboard KPI aggregation |
| `src/app/api/intelligence/reports/route.ts` | List user's reports |

---

## 3. Components

All components are owned by **Teammate 5** unless noted.

### 3.1 UI Primitives (`src/components/ui/`)

| File | Owner |
|---|---|
| `StatusBadge.tsx` | Teammate 5 |
| `Skeleton.tsx` | Teammate 5 |
| `MiniChart.tsx` | Teammate 5 |

### 3.2 Dashboard Components (`src/components/dashboard/`)

| File | Owner |
|---|---|
| `FilterBar.tsx` | Teammate 5 |
| `OpportunityTable.tsx` | Teammate 5 |
| `ProductCard.tsx` | Teammate 5 |
| `ScoreBadge.tsx` | Teammate 5 |
| `AnalysisSummary.tsx` | Teammate 5 |

### 3.3 Suggestion Components (`src/components/suggestions/`)

| File | Owner |
|---|---|
| `SuggestionCard.tsx` | Teammate 5 |
| `SuggestionFeed.tsx` | Teammate 5 |
| `ViabilityMeter.tsx` | Teammate 5 |
| `CostEstimateBreakdown.tsx` | Teammate 5 |
| `SupplierCard.tsx` | Teammate 5 |
| `SupplierSearchPanel.tsx` | Teammate 5 |
| `OutreachMessageDraft.tsx` | Teammate 5 |

### 3.4 Intelligence Components (`src/components/intelligence/`)

| File | Owner |
|---|---|
| `IntelligenceLanding.tsx` | Teammate 5 |
| `PipelineProgress.tsx` | Teammate 5 |
| `VerdictCard.tsx` | Teammate 5 |
| `BeginnerFitScore.tsx` | Teammate 5 |
| `FinancialModelView.tsx` | Teammate 5 |
| `NinetyDayPlaybook.tsx` | Teammate 5 |
| `RiskRegister.tsx` | Teammate 5 |
| `SuccessProbabilityMeter.tsx` | Teammate 5 |
| `DisqualifiedProducts.tsx` | Teammate 5 |
| `charts/AreaChart.tsx` | Teammate 5 |
| `charts/ScenarioBarChart.tsx` | Teammate 5 |

### 3.5 Live Data Components (`src/components/live-data/`)

| File | Owner |
|---|---|
| `LiveDataBadge.tsx` | Teammate 5 |
| `LiveDataOverlay.tsx` | Teammate 5 |
| `LiveDataToggle.tsx` | Teammate 5 |
| `SyncStatusPanel.tsx` | Teammate 5 |
| `CompetitorPriceChart.tsx` | Teammate 5 |

### 3.6 Layout Components (`src/components/layout/`)

| File | Owner |
|---|---|
| `Sidebar.tsx` | Teammate 5 |

### 3.7 Providers

| File | Owner | Notes |
|---|---|---|
| `src/components/ThemeProvider.tsx` | Teammate 5 | Theme context |
| `src/components/AuthProvider.tsx` | **SHARED** | PLANNED. Teammate 3 builds auth logic; Teammate 5 integrates into layout |

### 3.8 Planned Components

| File | Owner | Notes |
|---|---|---|
| `src/components/dashboard/AddProductModal.tsx` | **SHARED** | Teammate 5 builds modal UI; Teammate 3 wires ASIN API |
| `src/components/SearchDialog.tsx` | **SHARED** | Teammate 5 builds dialog UI; Teammate 3 wires search logic |

---

## 4. Hooks

All hooks are owned by **Teammate 3**.

| File | Owner | Purpose |
|---|---|---|
| `src/hooks/useProducts.ts` | Teammate 3 | Fetch products from `/api/products` |
| `src/hooks/useAnalysis.ts` | Teammate 3 | SSE analysis streaming |
| `src/hooks/useIntelligence.ts` | Teammate 3 | SSE intelligence pipeline |
| `src/hooks/useLiveData.ts` | Teammate 3 | Live data status + product enrichment |

**Planned hooks (Teammate 3):**

| File | Purpose |
|---|---|
| `src/hooks/useAuth.ts` | Authentication state |
| `src/hooks/useSettings.ts` | User settings CRUD |
| `src/hooks/useDashboard.ts` | Dashboard KPI aggregation |
| `src/hooks/useOpportunities.ts` | Opportunities listing |

---

## 5. Library Code (`src/lib/`)

### 5.1 Firebase (`src/lib/firebase/`)

| File | Owner | Notes |
|---|---|---|
| `client.ts` | **SHARED** | Client-side Firebase init. Teammate 3 adds Auth; Teammate 5 uses Firestore |
| `admin.ts` | Teammate 3 | Server-side Firebase Admin SDK |
| `auth.ts` | Teammate 3 | PLANNED. Firebase Auth helpers |
| `auth-admin.ts` | Teammate 3 | PLANNED. Server-side token verification |

### 5.2 Types (`src/lib/types/`)

All types are owned by **Teammate 3**. These define the data contracts that both teammates consume.

| File | Owner | Types Defined |
|---|---|---|
| `index.ts` | Teammate 3 | Re-exports all types |
| `product.ts` | Teammate 3 | Product, Review |
| `analysis.ts` | Teammate 3 | Analysis, AnalysisResult, Complaint, FeatureRequest, etc. |
| `opportunity.ts` | Teammate 3 | Opportunity, Tier, Recommendation, ScoreBreakdown |
| `suggestion.ts` | Teammate 3 | ProductSuggestion, ViabilityTier, PainPoint, etc. |
| `costEstimate.ts` | Teammate 3 | CostEstimate, SourcingCosts, ShippingCosts, etc. |
| `supplier.ts` | Teammate 3 | SupplierProfile, ScoredSupplier, OutreachMessage, etc. |
| `intelligence.ts` | Teammate 3 | IntelligenceReport, ProductVerdict, FinancialModel, etc. |
| `spapi.ts` | Teammate 3 | SPAPIConfig, SPAPIToken, SyncStatus, etc. |
| `liveData.ts` | Teammate 3 | EnrichedProduct, LiveDataStatus, DataFreshness |
| `urlAnalysis.ts` | Teammate 3 | URLAnalysisReport, ProductGradeResult, etc. |

### 5.3 Analysis Engine (`src/lib/analysis/`)

All analysis modules are owned by **Teammate 3**.

| File | Owner | Purpose |
|---|---|---|
| `claudeClient.ts` | Teammate 3 | Anthropic client, circuit breaker, retry logic |
| `claudeReviewAnalyzer.ts` | Teammate 3 | Streaming review analysis |
| `opportunityScorer.ts` | Teammate 3 | Pure TS scoring engine |
| `productSuggestionEngine.ts` | Teammate 3 | Claude-powered suggestion generation |
| `costEstimator.ts` | Teammate 3 | Claude + TS cost estimation |
| `supplierAdvisor.ts` | Teammate 3 | Supplier search, scoring, outreach |
| `intelligenceEngine.ts` | Teammate 3 | 9-stage intelligence pipeline |
| `reviewParser.ts` | Teammate 3 | Review batching + formatting |

### 5.4 SP-API Layer (`src/lib/spapi/`)

All SP-API modules are owned by **Teammate 3**.

| File | Owner | Purpose |
|---|---|---|
| `client.ts` | Teammate 3 | SP-API HTTP client |
| `tokenManager.ts` | Teammate 3 | OAuth token refresh |
| `rateLimiter.ts` | Teammate 3 | Token bucket rate limiter |
| `cache.ts` | Teammate 3 | In-memory LRU cache |
| `dataBridge.ts` | Teammate 3 | Product enrichment bridge |
| `sync/pricingSync.ts` | Teammate 3 | Pricing data sync |
| `sync/reviewSync.ts` | Teammate 3 | Review data sync |
| `sync/bsrSync.ts` | Teammate 3 | BSR data sync |
| `sync/catalogSync.ts` | Teammate 3 | Catalog data sync |
| `sync/feeSync.ts` | Teammate 3 | Fee data sync |
| `sync/inventorySync.ts` | Teammate 3 | Inventory data sync |

### 5.5 Constants / Prompts

| File | Owner | Notes |
|---|---|---|
| `src/constants/prompts.ts` | Teammate 3 | Claude system prompts + tool definitions for analysis |
| `src/constants/suggestionPrompts.ts` | Teammate 3 | Claude prompts for suggestions, cost, suppliers |
| `src/constants/intelligencePrompts.ts` | Teammate 3 | Claude prompts for 9-stage pipeline |

### 5.6 Mock Data

| File | Owner | Notes |
|---|---|---|
| `src/lib/mock-data.ts` | **SHARED** | Products + analysis mocks. Both teammates read; Teammate 3 manages schema alignment |
| `src/lib/mock-suggestions.ts` | Teammate 3 | Suggestion + cost + supplier mocks |
| `src/lib/mock-intelligence/` | Teammate 3 | Intelligence report mocks |
| `src/lib/mock-spapi.ts` | Teammate 3 | SP-API data mocks |
| `src/lib/mock-url-analysis/` | Teammate 3 | URL analysis mocks |

### 5.7 Utilities

| File | Owner | Notes |
|---|---|---|
| `src/lib/utils.ts` | **SHARED** | `cn()` (Teammate 5), `levenshtein` + `deduplicateByLevenshtein` (Teammate 3) |

### 5.8 Planned Exports

| File | Owner | Purpose |
|---|---|---|
| `src/lib/export/csv.ts` | Teammate 3 | CSV generation utilities |
| `src/lib/export/pdf.ts` | **SHARED** | PDF generation (Teammate 3 logic, Teammate 5 print styles) |

---

## 6. Other Directories

| Directory/File | Owner | Notes |
|---|---|---|
| `public/` | Teammate 5 | Static assets |
| `scripts/` | Teammate 3 | Seed scripts, migration tools |
| `tests/` | **SHARED** | Both teammates write tests for their domains |
| `docs/` | **SHARED** | Architecture, specs, contracts |
| `stitch-*.html` | Teammate 5 | Design mockups |

---

## 7. Planned New Files (Not Yet Created)

| File | Owner | Phase |
|---|---|---|
| `src/middleware.ts` | Teammate 3 | Phase 1 (Auth) |
| `src/app/login/page.tsx` | SHARED | Phase 1 (Auth) |
| `src/app/login/layout.tsx` | Teammate 5 | Phase 1 (Auth) |
| `src/components/AuthProvider.tsx` | SHARED | Phase 1 (Auth) |
| `src/lib/firebase/auth.ts` | Teammate 3 | Phase 1 (Auth) |
| `src/lib/firebase/auth-admin.ts` | Teammate 3 | Phase 1 (Auth) |
| `src/hooks/useAuth.ts` | Teammate 3 | Phase 1 (Auth) |
| `src/app/api/auth/profile/route.ts` | Teammate 3 | Phase 1 (Auth) |
| `src/app/api/settings/route.ts` | Teammate 3 | Phase 3 (Settings) |
| `src/hooks/useSettings.ts` | Teammate 3 | Phase 3 (Settings) |
| `src/components/dashboard/AddProductModal.tsx` | SHARED | Phase 4 (Ingestion) |
| `src/hooks/useDashboard.ts` | Teammate 3 | Phase 5 (Migration) |
| `src/hooks/useOpportunities.ts` | Teammate 3 | Phase 5 (Migration) |
| `src/app/api/dashboard/stats/route.ts` | Teammate 3 | Phase 5 (Migration) |
| `src/app/api/intelligence/reports/route.ts` | Teammate 3 | Phase 6 (Intel Persist) |
| `src/components/SearchDialog.tsx` | SHARED | Phase 7 (Polish) |
| `src/lib/export/csv.ts` | Teammate 3 | Phase 7 (Polish) |
| `src/lib/export/pdf.ts` | SHARED | Phase 7 (Polish) |
| `scripts/seed-firestore.ts` | Teammate 3 | Phase 4 (Ingestion) |

---

## 8. Coordination Points

These are the critical areas where both teammates must coordinate changes:

### 8.1 Type Contracts
Teammate 3 defines types in `src/lib/types/`. Teammate 5 consumes them in components. Any type change requires both to update.

### 8.2 Hook Return Shapes
Teammate 3 defines hook return types. Teammate 5 consumes them in pages. Coordinate on loading/error states.

### 8.3 Mock Data Format
`src/lib/mock-data.ts` is consumed by both. The `MockProduct` interface must stay aligned with the `Product` type and component expectations.

### 8.4 Root Layout Providers
`src/app/layout.tsx` wraps the entire app. Adding new providers (AuthProvider, etc.) requires coordination.

### 8.5 CSS Design Tokens
`src/app/globals.css` defines the design system. Teammate 5 owns it, but Teammate 3 should use existing tokens/classes rather than introducing new styling patterns.

### 8.6 API Response Shapes
API routes return data that hooks consume and components render. Changes to response shapes are a three-way contract: route (T3) → hook (T3) → component (T5).
