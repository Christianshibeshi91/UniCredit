# User Stories: Amazon Product Research Platform

**Version:** 1.0
**Date:** 2026-03-17

---

## Legend

- **Status:** `built` = implemented (may use mock data), `partial` = UI exists but logic incomplete, `planned` = not yet built
- **Priority:** P0 = must have for MVP, P1 = should have, P2 = could have

---

## Epic 1: Authentication & User Management

### US-1.1: Sign Up
**As a** new user, **I want to** create an account with email and password **so that** my research data is private and persistent across sessions.

- **Priority:** P0
- **Status:** Planned
- **Acceptance Criteria:**
  - [ ] User can sign up with email/password via Firebase Authentication
  - [ ] Email verification is required before accessing the dashboard
  - [ ] Password must meet minimum complexity requirements (8+ chars, mixed case, number)
  - [ ] Account creation fails gracefully with clear error messages for duplicate emails, weak passwords, etc.
  - [ ] User document is created in Firestore `users` collection upon successful registration
  - [ ] No secrets or tokens are stored in localStorage (only Firebase auth tokens in httpOnly cookies or secure session)

### US-1.2: Sign In
**As a** returning user, **I want to** log in with my credentials **so that** I can access my saved research.

- **Priority:** P0
- **Status:** Planned
- **Acceptance Criteria:**
  - [ ] User can sign in with email/password
  - [ ] Failed login attempts show generic error message (no enumeration of valid emails)
  - [ ] Session persists across browser tabs and survives page refreshes
  - [ ] Authenticated routes redirect unauthenticated users to login page
  - [ ] Rate limiting on login attempts (max 5 per minute per IP)

### US-1.3: Sign Out
**As a** logged-in user, **I want to** sign out **so that** my session is terminated securely.

- **Priority:** P0
- **Status:** Planned
- **Acceptance Criteria:**
  - [ ] Sign out clears all session data
  - [ ] User is redirected to the login page
  - [ ] API requests after sign out return 401

### US-1.4: Google OAuth Sign In
**As a** user, **I want to** sign in with my Google account **so that** I don't need to create a separate password.

- **Priority:** P1
- **Status:** Planned
- **Acceptance Criteria:**
  - [ ] Google OAuth provider is configured in Firebase
  - [ ] First-time Google sign-in creates a user document in Firestore
  - [ ] Returning Google users are logged in seamlessly

---

## Epic 2: Product Research & Catalog

### US-2.1: Add Product by ASIN
**As a** researcher, **I want to** add a product to my catalog by entering its Amazon ASIN **so that** I can start analyzing it.

- **Priority:** P0
- **Status:** Planned
- **Acceptance Criteria:**
  - [ ] Input field validates ASIN format (10 alphanumeric uppercase characters)
  - [ ] System fetches product data from Amazon (title, brand, category, price, rating, review count, BSR, images) via SP-API or scraping fallback
  - [ ] Product is stored in Firestore `products` collection associated with the user
  - [ ] Duplicate ASIN detection prevents adding the same product twice
  - [ ] Loading state shown during fetch; error state shown if ASIN not found
  - [ ] Product appears in catalog immediately after successful addition

### US-2.2: Browse Product Catalog
**As a** researcher, **I want to** browse all products I've added **so that** I can see my research portfolio at a glance.

- **Priority:** P0
- **Status:** Built (mock data)
- **Acceptance Criteria:**
  - [x] Products displayed in a table with columns: title, category, price, rating, review count, BSR, opportunity score, tier
  - [x] Table supports virtual scrolling for 10,000+ products (via @tanstack/react-virtual)
  - [x] Loading skeleton shown while data fetches
  - [ ] Data comes from Firestore (currently uses `MOCK_PRODUCTS`)
  - [x] Clicking a product navigates to its detail page

### US-2.3: Filter Products
**As a** researcher, **I want to** filter products by category, tier, score range, and review count **so that** I can focus on the most relevant opportunities.

- **Priority:** P0
- **Status:** Built (mock data)
- **Acceptance Criteria:**
  - [x] Filter by category (dropdown with all available categories)
  - [x] Filter by tier (S/A/B/C/D buttons)
  - [x] Filter by minimum opportunity score (slider or input)
  - [x] Filter by minimum review count (slider or input)
  - [x] Filters are composable (all conditions are AND'd)
  - [x] URL state managed by `nuqs` for shareable filter URLs
  - [x] Clear all filters button resets to default view

### US-2.4: View Product Detail
**As a** researcher, **I want to** see detailed information about a specific product **so that** I can understand its market position.

- **Priority:** P0
- **Status:** Built (mock data)
- **Acceptance Criteria:**
  - [x] Product header shows title, brand, category, ASIN, recommendation badge
  - [x] Stats grid shows price, rating, reviews, BSR, estimated monthly sales, profit margin
  - [x] Score breakdown shows 4 dimensions (demand, competition, margin, sentiment) as bars out of 25
  - [x] Link to Amazon product page (opens in new tab)
  - [x] Analyze Reviews button triggers Claude analysis
  - [ ] Data comes from Firestore (currently uses `getMockProduct()`)

### US-2.5: Delete Product
**As a** researcher, **I want to** remove a product from my catalog **so that** I can keep my research focused.

- **Priority:** P1
- **Status:** Planned
- **Acceptance Criteria:**
  - [ ] Delete button on product detail page with confirmation dialog
  - [ ] Deleting a product also deletes associated analysis, opportunities, and suggestions
  - [ ] Batch delete from catalog view
  - [ ] Undo option available for 5 seconds after deletion

---

## Epic 3: AI Review Analysis

### US-3.1: Analyze Product Reviews
**As a** researcher, **I want to** run AI analysis on a product's reviews **so that** I can understand customer pain points and market opportunities.

- **Priority:** P0
- **Status:** Built (functional with API key)
- **Acceptance Criteria:**
  - [x] Click "Analyze Reviews" on product detail page
  - [x] Analysis streams progress via SSE (start, progress tokens, analysis result, score, done)
  - [x] Claude extracts: complaints (5-15, with frequency/severity/quotes), feature requests (3-10, with demand level/mention count), product gaps, sentiment breakdown, opportunity summary, improvement ideas (5), key themes (5-8)
  - [x] Reviews are batched (50 per batch) to handle large review counts
  - [x] Multiple batch results are merged with deduplication (complaints by issue text, features by name with summed mention counts)
  - [x] Results stored in Firestore `analysis` collection
  - [x] Opportunity score calculated and stored in `opportunities` collection
  - [x] Stale analysis (>7 days) can be re-analyzed; fresh analysis returns cached result
  - [x] Circuit breaker prevents cascading failures (5 failures in 10 min = 60s cooldown)
  - [x] Retry logic with exponential backoff and jitter (3 attempts)

### US-3.2: View Analysis Results
**As a** researcher, **I want to** see the AI analysis results **so that** I can make informed product decisions.

- **Priority:** P0
- **Status:** Built (mock data)
- **Acceptance Criteria:**
  - [x] AnalysisSummary component shows complaints list with severity/frequency badges and example quotes
  - [x] Feature requests displayed with demand level indicators
  - [x] Product gaps shown with opportunity and competitive advantage descriptions
  - [x] Sentiment breakdown as visual bar (positive/neutral/negative percentages)
  - [x] Opportunity summary as narrative text
  - [x] Key themes as tag chips
  - [x] Improvement ideas as numbered list
  - [ ] Data comes from Firestore analysis document (currently uses `getMockAnalysis()`)

### US-3.3: Force Re-Analysis
**As a** researcher, **I want to** force a re-analysis of a product **so that** I can get fresh insights when reviews have changed significantly.

- **Priority:** P1
- **Status:** Built (functional)
- **Acceptance Criteria:**
  - [x] "Re-analyze Reviews" button appears when analysis already exists
  - [x] `forceReanalyze: true` flag bypasses the 7-day cache check
  - [x] Old analysis is overwritten with new results
  - [x] Opportunity score is recalculated

---

## Epic 4: Opportunity Scoring

### US-4.1: View Opportunity Scores
**As a** researcher, **I want to** see opportunity scores for all analyzed products **so that** I can prioritize which products to pursue.

- **Priority:** P0
- **Status:** Built (mock data)
- **Acceptance Criteria:**
  - [x] Opportunity table shows products sorted by score descending
  - [x] Score displayed as number (0-100) with tier badge (S/A/B/C/D)
  - [x] Recommendation shown (Strong Buy / Buy / Watch / Avoid)
  - [x] Score breakdown tooltip or detail view shows 4 dimensions
  - [x] Filter by tier and minimum score

### US-4.2: Understand Score Methodology
**As a** researcher, **I want to** understand how opportunity scores are calculated **so that** I can trust the recommendations.

- **Priority:** P1
- **Status:** Partial
- **Acceptance Criteria:**
  - [x] Score breakdown shows 4 dimensions each scored 0-25
  - [x] Dimension labels (Demand, Competition, Margin, Sentiment) are visible
  - [ ] Tooltip or info section explaining what each dimension measures
  - [ ] Explanation of tier thresholds (S>=90, A>=75, B>=50, C>=25, D<25)

---

## Epic 5: Product Suggestions

### US-5.1: View AI-Generated Product Suggestions
**As a** researcher, **I want to** see AI-generated product ideas based on gap analysis **so that** I can discover new opportunities I wouldn't have found manually.

- **Priority:** P0
- **Status:** Built (mock data)
- **Acceptance Criteria:**
  - [x] Suggestion feed shows product ideas with title, description, category, target customer, target price
  - [x] Viability score (0-100) and tier (S/A/B/C) displayed for each suggestion
  - [x] Viability breakdown shows 4 dimensions: demand confidence, differentiation strength, margin potential, execution feasibility
  - [x] Pain points addressed, differentiators, trend signals, and risk factors listed
  - [x] Filter by tier, category, price range, minimum viability score
  - [x] KPI cards show total ideas, average viability, S-tier count, A-tier count
  - [ ] Suggestions generated from real analysis data (currently uses `getMockSuggestions()`)

### US-5.2: Generate Suggestions
**As a** researcher, **I want to** trigger suggestion generation from analyzed products **so that** I can get fresh product ideas from my latest analysis data.

- **Priority:** P0
- **Status:** Built (functional with mock fallback)
- **Acceptance Criteria:**
  - [x] POST `/api/suggestions` accepts product IDs and optional category filter
  - [x] Claude generates suggestions using gap analysis prompt with tool_use pattern
  - [x] Suggestions deduplicated by title similarity (Levenshtein distance)
  - [x] Each suggestion includes viability score breakdown, pain points, differentiators, trend signals, risk factors
  - [ ] Suggestions persisted to Firestore (currently returned in response only)

### US-5.3: Get Cost Estimate for Suggestion
**As a** researcher, **I want to** get a detailed cost breakdown for a product suggestion **so that** I can evaluate financial viability.

- **Priority:** P0
- **Status:** Built (functional with mock fallback)
- **Acceptance Criteria:**
  - [x] CostEstimateBreakdown component displays sourcing costs (unit cost, MOQ, sample cost)
  - [x] Shipping costs shown (sea freight, customs duty, import fees)
  - [x] Amazon fees detailed (FBA fulfillment, referral fee, storage)
  - [x] Launch budget itemized (photography, branding, PPC, storefront)
  - [x] 15% contingency buffer included
  - [x] Total startup capital calculated
  - [x] 12-month projections with monthly revenue, costs, profit, cumulative profit
  - [x] Break-even month and 12-month ROI calculated
  - [x] Assumptions listed explicitly

### US-5.4: Find Suppliers for Suggestion
**As a** researcher, **I want to** get supplier search strategies and score potential suppliers **so that** I can move from idea to sourcing.

- **Priority:** P1
- **Status:** Built (functional)
- **Acceptance Criteria:**
  - [x] Search strategy generated with keywords, product spec, and filter criteria
  - [x] Supplier profiles scored on 4 dimensions: reliability, quality, commercial, fit (each 0-25)
  - [x] Suppliers ranked with pros/cons and recommendation
  - [x] Input validation: max 10 suppliers, max 5000 chars per profile
  - [x] HTML sanitization and prompt injection boundary applied to supplier data
  - [ ] No UI for inputting real supplier data (would need Alibaba/GlobalSources integration or manual entry)

### US-5.5: Draft Supplier Outreach Message
**As a** researcher, **I want to** get a professionally drafted outreach message for a supplier **so that** I can make initial contact confidently.

- **Priority:** P1
- **Status:** Built (functional)
- **Acceptance Criteria:**
  - [x] Outreach message generated with subject line and body
  - [x] Multiple tone variants (professional, friendly professional)
  - [x] Message includes product spec requirements
  - [x] Cost context included when cost estimate is available
  - [x] OutreachMessageDraft component renders message with copy button

---

## Epic 6: Intelligence Reports

### US-6.1: Run Intelligence Pipeline
**As a** beginner seller, **I want to** run a comprehensive intelligence report **so that** I get a complete business case for my best product opportunity.

- **Priority:** P0
- **Status:** Built (functional with mock fallback)
- **Acceptance Criteria:**
  - [x] User inputs available capital ($2,000-$5,000 range validated)
  - [x] 9-stage pipeline runs with real-time progress via SSE
  - [x] Pipeline stages: context aggregation, beginner filter, market synthesis, product definition, financial viability, 90-day playbook, risk analysis, confidence scoring, final synthesis
  - [x] Each stage shows running/complete/error status
  - [x] PipelineProgress component visualizes stage progression
  - [x] Final report includes all sections
  - [x] Falls back to mock pipeline when no API key (simulates stages with delays)
  - [x] Max duration: 120 seconds (Vercel serverless limit)

### US-6.2: View Product Verdict
**As a** beginner seller, **I want to** see the recommended product with win conditions **so that** I understand why this product was chosen.

- **Priority:** P0
- **Status:** Built (mock data + real)
- **Acceptance Criteria:**
  - [x] VerdictCard shows product name, target price, estimated unit cost, MOQ, category
  - [x] Investment thesis narrative
  - [x] 4 win conditions assessed (each 0-25, summing to 0-100)
  - [x] Alternatives considered with reasons and why not chosen
  - [x] Beginner advantages listed
  - [x] Must-have features listed

### US-6.3: View Financial Model
**As a** beginner seller, **I want to** see a detailed financial model **so that** I understand the investment required and expected returns.

- **Priority:** P0
- **Status:** Built (mock data + real)
- **Acceptance Criteria:**
  - [x] Unit economics breakdown (manufacturing, shipping, Amazon fees, profit per unit, margin %)
  - [x] Launch budget itemized with contingency
  - [x] 3 scenarios (Conservative/Base/Optimistic) with probability weights
  - [x] 18-month projections per scenario (unit sales, revenue, net profit, cumulative profit)
  - [x] AreaChart visualization of scenario projections
  - [x] ScenarioBarChart comparing scenario metrics
  - [x] Break-even units and months
  - [x] 12-month ROI
  - [x] Months to six-figure revenue (or null if unreachable)

### US-6.4: View 90-Day Playbook
**As a** beginner seller, **I want to** see a step-by-step launch plan **so that** I know exactly what to do from Day 1.

- **Priority:** P0
- **Status:** Built (mock data + real)
- **Acceptance Criteria:**
  - [x] Playbook divided into phases with day ranges
  - [x] Each task has: title, day range, exact steps, beginner tip, cost, success metric
  - [x] Weekly milestones with KPIs
  - [x] Day 1 actions highlighted (immediately executable)
  - [x] Go-live target day identified
  - [x] NinetyDayPlaybook component renders timeline view

### US-6.5: View Risk Register
**As a** beginner seller, **I want to** understand the risks involved **so that** I can prepare mitigations and set realistic expectations.

- **Priority:** P0
- **Status:** Built (mock data + real)
- **Acceptance Criteria:**
  - [x] Risk register lists all identified risks
  - [x] Each risk has: title, description, likelihood (1-5), impact (1-5), beginner multiplier (1.0-2.5x), adjusted severity
  - [x] Early warning signals for each risk
  - [x] Mitigation and contingency plans
  - [x] Beginner-specific risks flagged
  - [x] Top beginner risk highlighted
  - [x] Unmitigatable risks explicitly listed

### US-6.6: View Success Probability
**As a** beginner seller, **I want to** see an honest assessment of my chances of success **so that** I can make a go/no-go decision with eyes open.

- **Priority:** P0
- **Status:** Built (mock data + real)
- **Acceptance Criteria:**
  - [x] Overall score (0-100) with confidence interval
  - [x] 5 dimensions scored (market demand, competitive position, execution feasibility, financial viability, timing alignment)
  - [x] SuccessProbabilityMeter component visualizes score
  - [x] Failure scenarios with probability estimates and triggers
  - [x] Honest assessment narrative (at least 3 sentences)

### US-6.7: View Beginner Fit Assessment
**As a** beginner seller, **I want to** know if this opportunity is right for my experience level **so that** I don't get in over my head.

- **Priority:** P0
- **Status:** Built (mock data + real)
- **Acceptance Criteria:**
  - [x] Total fit score (0-100) across 5 dimensions
  - [x] Dimensions: capital adequacy, skill alignment, time commitment, risk tolerance, operational complexity
  - [x] BeginnerFitScore component with dimension radar/bars
  - [x] Beginner warnings by severity (critical/important/fyi)
  - [x] Required learning items with time estimates and resources

### US-6.8: View Disqualified Products
**As a** beginner seller, **I want to** see which products were filtered out and why **so that** I understand the selection logic and can revisit them if my situation changes.

- **Priority:** P1
- **Status:** Built (mock data + real)
- **Acceptance Criteria:**
  - [x] DisqualifiedProducts component lists rejected products
  - [x] Each shows: product name, rejection reason, failed filter name, "would work if" alternative scenario
  - [x] Filters applied: review barrier (>10,000), price ceiling (>$75), low demand (BSR >50,000)

### US-6.9: Access Previous Reports
**As a** researcher, **I want to** access intelligence reports I've previously generated **so that** I can review them and compare.

- **Priority:** P1
- **Status:** Partial
- **Acceptance Criteria:**
  - [x] Report detail page at `/dashboard/intelligence/[reportId]`
  - [x] GET `/api/intelligence/report/[reportId]` returns stored report
  - [ ] Report listing page showing all historical reports (not built)
  - [ ] Reports persisted to Firestore (currently in-memory Map, max 50, lost on restart)
  - [ ] Report comparison view (not built)

---

## Epic 7: Live Data Integration

### US-7.1: View Live Data Status
**As a** researcher, **I want to** see the status of my Amazon SP-API integration **so that** I know if my data is fresh or stale.

- **Priority:** P1
- **Status:** Built (mock data)
- **Acceptance Criteria:**
  - [x] LiveDataBadge shows data source (live/mock/cached)
  - [x] API health indicator (healthy/degraded/down)
  - [x] Sync status panel shows last sync time for each data type (catalog, pricing, reviews, BSR, inventory, fees)
  - [x] API quota usage visualization (used/limit per data type)
  - [x] Price movement alerts for >10% changes

### US-7.2: Toggle Live Data Mode
**As a** researcher, **I want to** toggle between live and mock data **so that** I can compare the differences and use the tool before SP-API setup.

- **Priority:** P1
- **Status:** Built (mock data)
- **Acceptance Criteria:**
  - [x] LiveDataToggle component shows current mode
  - [x] Live vs mock comparison table shows price, BSR, and review count differences
  - [x] Delta indicators show percentage change direction
  - [ ] Toggle actually switches data source in API routes (currently always mock unless `AMAZON_SP_API_ENABLED=true` in env)

### US-7.3: Trigger Manual Data Sync
**As a** researcher, **I want to** manually trigger a data sync **so that** I can refresh stale data on demand.

- **Priority:** P1
- **Status:** Built (functional)
- **Acceptance Criteria:**
  - [x] POST `/api/live-data/sync` accepts ASIN list and sync types
  - [x] Auth check via CRON_SECRET bearer token
  - [x] Returns sync results
  - [ ] UI trigger button for manual sync (not wired)

### US-7.4: Automated Data Sync (Cron)
**As a** researcher, **I want** my product data to sync automatically **so that** I always have fresh pricing, BSR, and review data.

- **Priority:** P1
- **Status:** Built (configured)
- **Acceptance Criteria:**
  - [x] 5 Vercel cron jobs configured: sync-pricing (daily midnight), sync-reviews (daily 6am), sync-bsr (daily noon), sync-catalog (daily 3am), sync-fees (daily 6pm)
  - [x] Each cron route checks CRON_SECRET authorization
  - [x] Each route checks `AMAZON_SP_API_ENABLED` env var
  - [ ] Cron routes need ASIN list from Firestore (currently would need manual ASIN input)

---

## Epic 8: Dashboard & Analytics

### US-8.1: View Dashboard Overview
**As a** researcher, **I want to** see a high-level overview of my research pipeline **so that** I can quickly assess my progress and priorities.

- **Priority:** P0
- **Status:** Built (mock data)
- **Acceptance Criteria:**
  - [x] KPI cards: total products, avg opportunity score, total estimated revenue, reviews analyzed
  - [x] Opportunity score trend chart (6-month line chart)
  - [x] Tier distribution donut chart (S/A/B/C/D)
  - [x] Top 5 opportunities list with score badges
  - [x] Category breakdown bar chart with product counts and avg scores
  - [x] Recent suggestions list with viability meters
  - [x] Quick stats row: avg rating, S-tier count, avg price, buy rate
  - [ ] Data comes from Firestore (currently `getMockStats()` and `MOCK_PRODUCTS`)

### US-8.2: Navigate Between Sections
**As a** researcher, **I want to** navigate easily between dashboard sections **so that** I can move fluidly through my research workflow.

- **Priority:** P0
- **Status:** Built (functional)
- **Acceptance Criteria:**
  - [x] Sidebar navigation with 7 items: Dashboard, Products, Opportunities, Suggestions, Intelligence, Live Data, Settings
  - [x] Active item highlighted with animated indicator
  - [x] Search placeholder in sidebar (non-functional)
  - [x] Theme toggle in sidebar footer
  - [x] API status indicator in sidebar footer

---

## Epic 9: Settings & Configuration

### US-9.1: Configure API Keys
**As a** researcher, **I want to** configure my API keys **so that** the tool can access Anthropic and Firebase services.

- **Priority:** P0
- **Status:** Partial (UI only)
- **Acceptance Criteria:**
  - [x] API Configuration section shows masked Anthropic API key and Firebase project ID
  - [x] "Change" button for API key (non-functional)
  - [ ] Actual API key management (encrypted storage, validation, rotation)
  - [ ] Firebase project ID configuration

### US-9.2: Configure Analysis Settings
**As a** researcher, **I want to** configure analysis parameters **so that** I can balance cost vs depth.

- **Priority:** P1
- **Status:** Partial (UI only)
- **Acceptance Criteria:**
  - [x] Auto-analyze toggle (new products automatically analyzed)
  - [x] Response caching toggle (7-day cache)
  - [x] Claude model selector (Sonnet 4 / Opus 4.6 / Haiku 4.5)
  - [x] Max reviews per batch input (10-200, default 50)
  - [ ] Settings persisted to user profile in Firestore (currently local state, resets on reload)

### US-9.3: Manage Data
**As a** researcher, **I want to** manage my stored data **so that** I can export results and clear stale cache.

- **Priority:** P1
- **Status:** Partial (UI only)
- **Acceptance Criteria:**
  - [x] Data stats shown: products count, analyses count, reviews count
  - [x] Export Data button (non-functional)
  - [x] Clear Cache button (non-functional)
  - [x] Reset Database button with red warning styling (non-functional)
  - [ ] Export to CSV/JSON functionality
  - [ ] Cache clearing functionality
  - [ ] Database reset with confirmation dialog

### US-9.4: Configure Appearance
**As a** researcher, **I want to** switch between dark and light themes **so that** I can use the tool comfortably in any lighting.

- **Priority:** P1
- **Status:** Built (functional)
- **Acceptance Criteria:**
  - [x] Dark mode toggle in settings page
  - [x] Theme persisted to localStorage
  - [x] System theme detection on first visit
  - [x] Toggle also accessible from sidebar footer
  - [x] Full glassmorphism design system adapts to both themes

---

## Epic 10: Search

### US-10.1: Search Products
**As a** researcher, **I want to** search my product catalog by keyword **so that** I can quickly find specific products.

- **Priority:** P1
- **Status:** Planned
- **Acceptance Criteria:**
  - [ ] Search input in sidebar accepts text queries
  - [ ] Keyboard shortcut `/` focuses search
  - [ ] Results match against product title, brand, category, and ASIN
  - [ ] Results appear in dropdown overlay
  - [ ] Click result navigates to product detail page
  - [ ] Search is client-side for catalog (Firestore full-text search for larger datasets)

---

## Epic 11: Data Export & Sharing

### US-11.1: Export Intelligence Report as PDF
**As a** researcher, **I want to** export an intelligence report as a PDF **so that** I can share it with partners or keep an offline copy.

- **Priority:** P2
- **Status:** Planned
- **Acceptance Criteria:**
  - [ ] "Export PDF" button on report detail page
  - [ ] PDF includes all sections: verdict, financial model, playbook, risk register, success probability, beginner fit
  - [ ] Charts rendered as static images in PDF
  - [ ] Professional formatting with branding

### US-11.2: Export Product Data as CSV
**As a** researcher, **I want to** export my product catalog as a CSV **so that** I can analyze it in a spreadsheet.

- **Priority:** P2
- **Status:** Planned
- **Acceptance Criteria:**
  - [ ] "Export CSV" button on products page
  - [ ] CSV includes all product fields plus opportunity scores
  - [ ] UTF-8 encoding with BOM for Excel compatibility
  - [ ] Date fields in ISO format

---

## Epic 12: Error Handling & Resilience

### US-12.1: Graceful API Failures
**As a** user, **I want** the application to handle API failures gracefully **so that** I understand what went wrong and can take action.

- **Priority:** P0
- **Status:** Built (partial)
- **Acceptance Criteria:**
  - [x] Circuit breaker opens after 5 failures in 10 minutes
  - [x] SSE streams emit error events with user-friendly messages
  - [x] Non-retryable errors (400, 401, 403, 404) fail fast
  - [x] Retryable errors use exponential backoff with jitter (3 attempts)
  - [x] Analysis failures update Firestore status to "failed"
  - [ ] Client-side error boundary for React component crashes
  - [ ] Toast/notification system for transient errors

### US-12.2: Offline/Mock Mode
**As a** user, **I want** the application to work in demo mode without API keys **so that** I can evaluate it before committing to setup.

- **Priority:** P1
- **Status:** Built (functional)
- **Acceptance Criteria:**
  - [x] All pages render with mock data when no API keys are configured
  - [x] Intelligence pipeline runs mock stages with simulated delays
  - [x] Suggestions API returns mock data when no Anthropic key
  - [x] SP-API integration falls back to mock data when disabled
  - [x] LiveDataBadge indicates "mock" data source
  - [ ] Clear indication in the UI that user is in demo mode (global banner)
