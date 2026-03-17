# Test Results -- Amazon Product Research Platform

Date: 2026-03-17
QA Engineer: Teammate 4

---

## 1. Unit Test Results

**Status: ALL PASS**

| Test File | Tests | Passed | Failed |
|-----------|-------|--------|--------|
| `tests/unit/asinValidation.test.ts` | 12 | 12 | 0 |
| `tests/unit/authAdmin.test.ts` | 13 | 13 | 0 |
| `tests/unit/csvExport.test.ts` | 14 | 14 | 0 |
| `tests/unit/opportunityScorer.test.ts` | 15 | 15 | 0 |
| `tests/unit/productIngestion.test.ts` | 12 | 12 | 0 |
| `tests/unit/search.test.ts` | 14 | 14 | 0 |
| `tests/unit/settingsValidation.test.ts` | 13 | 13 | 0 |
| **Unit Total** | **93** | **93** | **0** |

## 2. Integration Test Results

**Status: ALL PASS (4 tests document known bugs)**

| Test File | Tests | Passed | Failed |
|-----------|-------|--------|--------|
| `tests/integration/api-products.test.ts` | 27 | 27 | 0 |
| `tests/integration/api-settings.test.ts` | 35 | 35 | 0 |
| `tests/integration/api-auth.test.ts` | 43 | 43 | 0 |
| `tests/integration/api-intelligence.test.ts` | 35 | 35 | 0 |
| **Integration Total** | **140** | **140** | **0** |

### Bug-Documenting Tests

The following tests pass but document actual bugs in the application:

- `api-products.test.ts`: "BUG: limit=0 falls back to default 20" -- See BUG-029
- `api-settings.test.ts`: "BUG: NaN passes typeof check and is not caught by range check" -- See BUG-028
- `api-intelligence.test.ts`: "BUG: NaN passes typeof check and overrides default" -- See BUG-028
- `api-intelligence.test.ts`: "BUG: limit=0 parsed as falsy, falls back to default 20" -- See BUG-029
- `api-settings.test.ts`: "rejects claude-opus-4-6 (used by UI but not in allowlist)" -- See BUG-010
- `api-settings.test.ts`: "rejects claude-haiku-4-5-20251001 (used by UI but not in allowlist)" -- See BUG-010

## 3. E2E Test Specs

**Status: SPEC ONLY (not executable without Playwright setup)**

| Test File | Specs |
|-----------|-------|
| `tests/e2e/auth-flow.spec.ts` | 17 |
| `tests/e2e/product-workflow.spec.ts` | 21 |
| `tests/e2e/intelligence-workflow.spec.ts` | 20 |
| **E2E Total** | **58** |

These are structured as Playwright-style test specifications. They require:
1. A running development server
2. `@playwright/test` package installed
3. Firebase Auth emulator (or test credentials)

## 4. Build Results

**Status: FAIL**

```
npx next build
```

**Error:**
```
Type error: Type 'OmitWithTag<typeof import("...src/app/api/url-analysis/run/route"),
"POST" | "runtime" | "GET" | ...>' does not satisfy the constraint '{ [x: string]: never; }'.
Property 'analysisStore' is incompatible with index signature.
```

**Root Cause:** `src/app/api/url-analysis/run/route.ts` exports `analysisStore` (a `Map`), which violates the Next.js App Router constraint that route files may only export HTTP handler functions and config values. See BUG-001.

**Secondary Issue:** `src/app/api/intelligence/run/route.ts` exports `reportStore` with the same pattern. See BUG-002.

## 5. Bug Summary by Severity

| Severity | Count | Bug IDs |
|----------|-------|---------|
| Critical | 5 | BUG-001, BUG-002, BUG-003, BUG-004, BUG-005 |
| High | 7 | BUG-006, BUG-007, BUG-008, BUG-009, BUG-010, BUG-011, BUG-012 |
| Medium | 8 | BUG-013 through BUG-020 |
| Low | 9 | BUG-021 through BUG-029 |
| **Total** | **29** | |

### Critical Issues Requiring Immediate Fix

1. **BUG-001 / BUG-002**: Build fails. No deployment possible. Fix: Move exported stores to shared modules.
2. **BUG-003**: Auth not wired in login page. Fix: Import and use `useAuth` hook.
3. **BUG-004**: Session cookie never set. Fix: Set `__session` cookie after auth.
4. **BUG-005**: XSS via `innerHTML` in PDF export. Fix: Sanitize content before injection.

### High Priority Issues

5. **BUG-006 / BUG-007**: Auth commented out on GET endpoints.
6. **BUG-008**: Intelligence pipeline allows anonymous execution.
7. **BUG-009**: Race condition in user counter (use `FieldValue.increment()`).
8. **BUG-010**: Model ID mismatch between API and UI.
9. **BUG-011**: Search scoring logic bug (dead code for "starts with").
10. **BUG-012**: No rate limiting on product ingestion.

## 6. Test Coverage Assessment

### Well-Tested Areas
- ASIN validation (thorough, including security edge cases)
- CSV escaping logic
- Opportunity scoring engine (all scoring dimensions)
- Settings validation (field types, ranges, allowed values)
- Search algorithm (scoring, ranking, edge cases)
- Firebase error message mapping
- Auth error class behavior

### Under-Tested Areas
- Actual API route handlers (require HTTP-level integration tests)
- Firebase Admin integration (requires emulator or mock)
- SP-API client calls (no integration tests)
- Component rendering (no React rendering tests)
- SSE streaming behavior
- Concurrent request handling
- Token refresh flow
- Export file generation in browser context

### Not Tested At All
- End-to-end user flows (requires Playwright setup)
- Accessibility (requires axe-core or manual testing)
- Performance (no load tests, no Lighthouse)
- Cross-browser compatibility
- Mobile responsiveness
- Docker deployment flow

## 7. Recommendations

1. **Blocker**: Fix BUG-001/002 to unblock builds.
2. **Security**: Wire auth (BUG-003/004) and uncomment auth checks (BUG-006/007/008) before any deployment.
3. **Security**: Sanitize PDF export content (BUG-005) and add SSRF protection (BUG-025).
4. **Testing**: Add Playwright for E2E tests. Add Firebase emulator for integration tests.
5. **Testing**: Add React Testing Library for component-level tests.
6. **Quality**: Fix all NaN and limit=0 edge cases (BUG-028/029).
7. **Quality**: Fix search scoring order (BUG-011) and model ID mismatch (BUG-010).
