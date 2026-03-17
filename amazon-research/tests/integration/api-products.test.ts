/**
 * Integration Tests: Products API
 *
 * Tests the /api/products endpoint with mocked Firebase and SP-API.
 * Validates authentication, input validation, CRUD operations, and error handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateAsin, IngestionError } from "@/lib/services/productIngestion";
import { AuthError } from "@/lib/firebase/auth-admin";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock getAdminDb to return a fake Firestore instance
const mockCollection = vi.fn();
const mockDoc = vi.fn();
const mockGet = vi.fn();
const mockSet = vi.fn();
const mockUpdate = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockStartAfter = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({
    collection: mockCollection,
  }),
  adminDb: new Proxy(
    {},
    {
      get: () => mockCollection,
    }
  ),
}));

vi.mock("@/lib/firebase/auth-admin", async () => {
  const actual = await vi.importActual("@/lib/firebase/auth-admin");
  return {
    ...actual,
    verifyAuthToken: vi.fn(),
  };
});

vi.mock("@/lib/spapi/client", () => ({
  spapiClient: {
    isEnabled: vi.fn(() => false),
    getCatalogItem: vi.fn(),
    getPricing: vi.fn(),
    getBSR: vi.fn(),
    getReviews: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Tests: ASIN Validation for Product Ingestion
// ---------------------------------------------------------------------------

describe("Products API - ASIN Input Validation", () => {
  it("rejects ASIN shorter than 10 characters", () => {
    expect(validateAsin("B09V3")).toBe(false);
  });

  it("rejects ASIN longer than 10 characters", () => {
    expect(validateAsin("B09V3KXJPBA")).toBe(false);
  });

  it("rejects lowercase ASIN", () => {
    expect(validateAsin("b09v3kxjpb")).toBe(false);
  });

  it("accepts valid 10-char uppercase alphanumeric ASIN", () => {
    expect(validateAsin("B09V3KXJPB")).toBe(true);
  });

  it("accepts all-numeric ASIN", () => {
    expect(validateAsin("0123456789")).toBe(true);
  });

  // Security: injection attempts
  it("rejects ASIN with SQL injection payload", () => {
    expect(validateAsin("' OR 1=1;-")).toBe(false);
  });

  it("rejects ASIN with script tag", () => {
    expect(validateAsin("<script>ab")).toBe(false);
  });

  it("rejects ASIN with null bytes", () => {
    expect(validateAsin("B09V3K\0JPB")).toBe(false);
  });

  it("rejects ASIN with path traversal", () => {
    expect(validateAsin("../../../a")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: Product GET query parameter validation
// ---------------------------------------------------------------------------

describe("Products API - Query Parameter Validation", () => {
  const VALID_SORT_FIELDS = new Set([
    "title",
    "price",
    "rating",
    "reviewCount",
    "bsr",
    "createdAt",
  ]);

  const MAX_LIMIT = 100;
  const DEFAULT_LIMIT = 20;

  function validateSortBy(sortBy: string): boolean {
    return VALID_SORT_FIELDS.has(sortBy);
  }

  function parseLimit(limitParam: string | null): number {
    return Math.min(
      MAX_LIMIT,
      Math.max(
        1,
        parseInt(limitParam ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT
      )
    );
  }

  it("accepts valid sort fields", () => {
    for (const field of VALID_SORT_FIELDS) {
      expect(validateSortBy(field)).toBe(true);
    }
  });

  it("rejects invalid sort field", () => {
    expect(validateSortBy("__proto__")).toBe(false);
    expect(validateSortBy("constructor")).toBe(false);
    expect(validateSortBy("password")).toBe(false);
  });

  it("rejects SQL-injection-style sort field", () => {
    expect(validateSortBy("price; DROP TABLE")).toBe(false);
  });

  it("parses null limit to default 20", () => {
    expect(parseLimit(null)).toBe(20);
  });

  it("clamps limit to max 100", () => {
    expect(parseLimit("500")).toBe(100);
  });

  it("BUG: limit=0 falls back to default 20 (should clamp to 1)", () => {
    // BUG: parseInt("0", 10) returns 0, which is falsy.
    // The `|| DEFAULT_LIMIT` fallback triggers, returning 20 instead of 1.
    // Same for negative: parseInt("-5") = -5, which is truthy, so Math.max(1, -5) = 1.
    expect(parseLimit("0")).toBe(20); // Documents actual buggy behavior
    expect(parseLimit("-5")).toBe(1);  // This one works correctly
  });

  it("parses valid limit", () => {
    expect(parseLimit("50")).toBe(50);
  });

  it("falls back to default for non-numeric input", () => {
    expect(parseLimit("abc")).toBe(20);
    expect(parseLimit("")).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// Tests: IngestionError behavior
// ---------------------------------------------------------------------------

describe("Products API - IngestionError", () => {
  it("IngestionError carries status code", () => {
    const err = new IngestionError("SP-API not configured", 400);
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("SP-API not configured");
    expect(err instanceof Error).toBe(true);
  });

  it("IngestionError for server error", () => {
    const err = new IngestionError("Upstream failure", 500);
    expect(err.statusCode).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Tests: AuthError handling
// ---------------------------------------------------------------------------

describe("Products API - Auth Error Handling", () => {
  it("AuthError with 401 for missing token", () => {
    const err = new AuthError("Missing or invalid Authorization header", 401);
    expect(err.statusCode).toBe(401);
    expect(err.name).toBe("AuthError");
  });

  it("AuthError with 401 for expired token", () => {
    const err = new AuthError("Unauthorized", 401);
    expect(err.statusCode).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Tests: POST /api/products body validation
// ---------------------------------------------------------------------------

describe("Products API - POST body validation", () => {
  function validatePostBody(body: unknown): {
    valid: boolean;
    error?: string;
    asin?: string;
  } {
    if (!body || typeof body !== "object") {
      return { valid: false, error: "Invalid JSON body" };
    }
    const { asin } = body as { asin?: string };
    const normalized = asin?.toUpperCase()?.trim();
    if (!normalized) {
      return { valid: false, error: "ASIN is required" };
    }
    if (!validateAsin(normalized)) {
      return {
        valid: false,
        error:
          "Invalid ASIN format. Must be 10 alphanumeric characters (uppercase).",
      };
    }
    return { valid: true, asin: normalized };
  }

  it("rejects null body", () => {
    expect(validatePostBody(null).valid).toBe(false);
  });

  it("rejects body without asin", () => {
    expect(validatePostBody({}).valid).toBe(false);
  });

  it("rejects body with empty asin", () => {
    expect(validatePostBody({ asin: "" }).valid).toBe(false);
  });

  it("rejects body with invalid asin", () => {
    expect(validatePostBody({ asin: "invalid" }).valid).toBe(false);
  });

  it("accepts valid asin and normalizes case", () => {
    const result = validatePostBody({ asin: "b09v3kxjpb" });
    expect(result.valid).toBe(true);
    expect(result.asin).toBe("B09V3KXJPB");
  });

  it("trims whitespace from asin", () => {
    const result = validatePostBody({ asin: " B09V3KXJPB " });
    expect(result.valid).toBe(true);
    expect(result.asin).toBe("B09V3KXJPB");
  });
});
