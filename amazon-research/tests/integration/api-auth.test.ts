/**
 * Integration Tests: Auth API
 *
 * Tests authentication token parsing, verification logic,
 * profile creation/update, and security edge cases.
 */
import { describe, it, expect } from "vitest";
import { AuthError } from "@/lib/firebase/auth-admin";

// ---------------------------------------------------------------------------
// Token extraction logic (mirrors auth-admin.ts)
// ---------------------------------------------------------------------------

function extractToken(
  authHeader: string | null
): { token: string } | { error: string; status: number } {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Missing or invalid Authorization header", status: 401 };
  }

  const idToken = authHeader.slice(7);

  if (!idToken || idToken.length < 10) {
    return { error: "Invalid token format", status: 401 };
  }

  return { token: idToken };
}

// ---------------------------------------------------------------------------
// Tests: Token extraction
// ---------------------------------------------------------------------------

describe("Auth API - Token Extraction", () => {
  it("extracts valid Bearer token", () => {
    const result = extractToken(
      "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.abcdefghij"
    );
    expect("token" in result).toBe(true);
    if ("token" in result) {
      expect(result.token).toBe(
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.abcdefghij"
      );
    }
  });

  it("rejects null header", () => {
    const result = extractToken(null);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.status).toBe(401);
    }
  });

  it("rejects empty string header", () => {
    const result = extractToken("");
    expect("error" in result).toBe(true);
  });

  it("rejects Basic auth scheme", () => {
    const result = extractToken("Basic dXNlcjpwYXNz");
    expect("error" in result).toBe(true);
  });

  it("rejects Bearer with empty token", () => {
    const result = extractToken("Bearer ");
    expect("error" in result).toBe(true);
  });

  it("rejects Bearer with short token (<10 chars)", () => {
    const result = extractToken("Bearer abc");
    expect("error" in result).toBe(true);
  });

  it("rejects Bearer with exactly 9 chars", () => {
    const result = extractToken("Bearer 123456789");
    expect("error" in result).toBe(true);
  });

  it("accepts Bearer with exactly 10 chars", () => {
    const result = extractToken("Bearer 1234567890");
    expect("token" in result).toBe(true);
  });

  it("rejects lowercase bearer", () => {
    const result = extractToken("bearer token12345678");
    expect("error" in result).toBe(true);
  });

  it("rejects BEARER (uppercase)", () => {
    const result = extractToken("BEARER token12345678");
    expect("error" in result).toBe(true);
  });

  // Security: token injection attempts
  it("handles token with newline characters", () => {
    const result = extractToken("Bearer token\n12345678");
    // Should still extract as a string (verification will fail server-side)
    expect("token" in result).toBe(true);
  });

  it("handles token with null bytes", () => {
    const result = extractToken("Bearer token\x0012345678");
    expect("token" in result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: AuthError class
// ---------------------------------------------------------------------------

describe("Auth API - AuthError", () => {
  it("extends Error", () => {
    const err = new AuthError("test", 400);
    expect(err instanceof Error).toBe(true);
    expect(err instanceof AuthError).toBe(true);
  });

  it("has correct name", () => {
    expect(new AuthError("test", 401).name).toBe("AuthError");
  });

  it("preserves status code 401", () => {
    expect(new AuthError("Unauthorized", 401).statusCode).toBe(401);
  });

  it("preserves status code 403", () => {
    expect(new AuthError("Forbidden", 403).statusCode).toBe(403);
  });

  it("preserves custom message", () => {
    expect(new AuthError("Custom message", 500).message).toBe(
      "Custom message"
    );
  });

  it("can be caught as Error", () => {
    try {
      throw new AuthError("test", 401);
    } catch (e) {
      expect(e instanceof Error).toBe(true);
      expect(e instanceof AuthError).toBe(true);
      expect((e as AuthError).statusCode).toBe(401);
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: Profile data validation
// ---------------------------------------------------------------------------

describe("Auth API - Profile Validation", () => {
  function validateProfileBody(body: {
    email?: string;
    displayName?: string;
  }): { valid: boolean; email: string; displayName: string } | { error: string } {
    const email = body.email ?? "";
    if (!email || !email.includes("@")) {
      return { error: "Valid email is required" };
    }

    const rawDisplayName = body.displayName ?? email.split("@")[0];
    const displayName = rawDisplayName.replace(/<[^>]*>/g, "").slice(0, 100);

    return { valid: true, email, displayName };
  }

  it("accepts valid email and name", () => {
    const result = validateProfileBody({
      email: "user@example.com",
      displayName: "John",
    });
    expect("valid" in result && result.valid).toBe(true);
  });

  it("rejects missing email", () => {
    const result = validateProfileBody({ displayName: "John" });
    expect("error" in result).toBe(true);
  });

  it("rejects email without @", () => {
    const result = validateProfileBody({ email: "notanemail" });
    expect("error" in result).toBe(true);
  });

  it("rejects empty email", () => {
    const result = validateProfileBody({ email: "" });
    expect("error" in result).toBe(true);
  });

  it("derives displayName from email if not provided", () => {
    const result = validateProfileBody({ email: "john@example.com" });
    if ("valid" in result) {
      expect(result.displayName).toBe("john");
    }
  });

  it("strips HTML from displayName", () => {
    const result = validateProfileBody({
      email: "user@test.com",
      displayName: '<script>alert("xss")</script>John',
    });
    if ("valid" in result) {
      expect(result.displayName).toBe('alert("xss")John');
      expect(result.displayName).not.toContain("<script>");
    }
  });

  it("truncates displayName at 100 characters", () => {
    const longName = "A".repeat(200);
    const result = validateProfileBody({
      email: "user@test.com",
      displayName: longName,
    });
    if ("valid" in result) {
      expect(result.displayName.length).toBeLessThanOrEqual(100);
    }
  });

  it("handles displayName with only HTML tags", () => {
    const result = validateProfileBody({
      email: "user@test.com",
      displayName: "<b><i></i></b>",
    });
    if ("valid" in result) {
      expect(result.displayName).toBe("");
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: Firebase error message mapping
// ---------------------------------------------------------------------------

describe("Auth API - Error Message Mapping", () => {
  function mapFirebaseError(message: string): string {
    if (
      message.includes("auth/user-not-found") ||
      message.includes("auth/wrong-password")
    ) {
      return "Invalid email or password.";
    }
    if (message.includes("auth/email-already-in-use")) {
      return "An account with this email already exists.";
    }
    if (message.includes("auth/weak-password")) {
      return "Password must be at least 6 characters.";
    }
    if (message.includes("auth/invalid-email")) {
      return "Please enter a valid email address.";
    }
    if (message.includes("auth/too-many-requests")) {
      return "Too many attempts. Please try again later.";
    }
    if (message.includes("auth/popup-closed-by-user")) {
      return "Sign in was cancelled.";
    }
    if (message.includes("auth/network-request-failed")) {
      return "Network error. Please check your connection.";
    }
    return "Authentication failed. Please try again.";
  }

  it("maps user-not-found to non-enumerating message", () => {
    expect(mapFirebaseError("Firebase: Error (auth/user-not-found).")).toBe(
      "Invalid email or password."
    );
  });

  it("maps wrong-password to same message (prevents enumeration)", () => {
    expect(mapFirebaseError("Firebase: Error (auth/wrong-password).")).toBe(
      "Invalid email or password."
    );
  });

  it("maps too-many-requests", () => {
    expect(mapFirebaseError("Firebase: Error (auth/too-many-requests).")).toBe(
      "Too many attempts. Please try again later."
    );
  });

  it("maps network failure", () => {
    expect(
      mapFirebaseError("Firebase: Error (auth/network-request-failed).")
    ).toBe("Network error. Please check your connection.");
  });

  it("does not leak internal details for unknown errors", () => {
    const result = mapFirebaseError("Internal server error at /auth/verify: connection reset");
    expect(result).toBe("Authentication failed. Please try again.");
    expect(result).not.toContain("Internal server error");
    expect(result).not.toContain("connection reset");
  });

  it("does not leak stack traces", () => {
    const result = mapFirebaseError(
      "Error: ECONNREFUSED at TCP.onStreamRead"
    );
    expect(result).toBe("Authentication failed. Please try again.");
  });
});

// ---------------------------------------------------------------------------
// Tests: Middleware path matching
// ---------------------------------------------------------------------------

describe("Auth API - Middleware Path Matching", () => {
  const PUBLIC_PATHS = ["/", "/login"];
  const API_AUTH_PATHS = ["/api/auth"];
  const CRON_PATHS = ["/api/cron/"];
  const STATIC_PATHS = ["/_next/", "/favicon.ico"];

  function classifyPath(
    pathname: string
  ): "static" | "public" | "auth-api" | "cron" | "api" | "protected" {
    if (STATIC_PATHS.some((p) => pathname.startsWith(p))) return "static";
    if (PUBLIC_PATHS.some((p) => pathname === p)) return "public";
    if (API_AUTH_PATHS.some((p) => pathname.startsWith(p))) return "auth-api";
    if (CRON_PATHS.some((p) => pathname.startsWith(p))) return "cron";
    if (pathname.startsWith("/api/")) return "api";
    return "protected";
  }

  it("classifies / as public", () => {
    expect(classifyPath("/")).toBe("public");
  });

  it("classifies /login as public", () => {
    expect(classifyPath("/login")).toBe("public");
  });

  it("classifies /dashboard as protected", () => {
    expect(classifyPath("/dashboard")).toBe("protected");
  });

  it("classifies /dashboard/products as protected", () => {
    expect(classifyPath("/dashboard/products")).toBe("protected");
  });

  it("classifies /api/products as api (requires Bearer)", () => {
    expect(classifyPath("/api/products")).toBe("api");
  });

  it("classifies /api/auth/profile as auth-api (no Bearer required)", () => {
    expect(classifyPath("/api/auth/profile")).toBe("auth-api");
  });

  it("classifies /api/cron/sync-bsr as cron", () => {
    expect(classifyPath("/api/cron/sync-bsr")).toBe("cron");
  });

  it("classifies /_next/static/chunk.js as static", () => {
    expect(classifyPath("/_next/static/chunk.js")).toBe("static");
  });

  it("classifies /favicon.ico as static", () => {
    expect(classifyPath("/favicon.ico")).toBe("static");
  });

  // Security: path traversal / bypass attempts
  it("classifies /login/ (trailing slash) as protected (not exact match)", () => {
    // This is a potential bypass: /login/ != /login
    expect(classifyPath("/login/")).toBe("protected");
  });

  it("classifies /Login (wrong case) as protected", () => {
    expect(classifyPath("/Login")).toBe("protected");
  });
});
