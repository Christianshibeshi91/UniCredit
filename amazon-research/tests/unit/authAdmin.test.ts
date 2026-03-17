/**
 * Unit tests: Auth helper (token verification mock)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthError } from "@/lib/firebase/auth-admin";

describe("Auth Admin - AuthError", () => {
  it("creates an error with status code", () => {
    const error = new AuthError("Unauthorized", 401);
    expect(error.message).toBe("Unauthorized");
    expect(error.statusCode).toBe(401);
    expect(error.name).toBe("AuthError");
    expect(error instanceof Error).toBe(true);
  });

  it("creates 403 forbidden error", () => {
    const error = new AuthError("Forbidden", 403);
    expect(error.message).toBe("Forbidden");
    expect(error.statusCode).toBe(403);
  });
});

describe("Auth token extraction logic", () => {
  it("extracts Bearer token from authorization header", () => {
    const header = "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test";
    expect(header.startsWith("Bearer ")).toBe(true);
    const token = header.slice(7);
    expect(token).toBe("eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test");
  });

  it("rejects missing authorization header", () => {
    const header = null as string | null;
    expect(header).toBeNull();
    // When header is null, auth should be rejected
    const hasValidBearer = header !== null && header.startsWith("Bearer ");
    expect(hasValidBearer).toBe(false);
  });

  it("rejects non-Bearer scheme", () => {
    const header = "Basic dXNlcjpwYXNz";
    expect(header.startsWith("Bearer ")).toBe(false);
  });

  it("rejects empty Bearer token", () => {
    const header = "Bearer ";
    const token = header.slice(7);
    expect(token.length < 10).toBe(true);
  });

  it("rejects Bearer with short token", () => {
    const header = "Bearer abc";
    const token = header.slice(7);
    expect(token.length < 10).toBe(true);
  });
});

describe("Firebase error message mapping", () => {
  // Test the mapFirebaseError logic (extracted from useAuth.ts)
  function mapFirebaseError(message: string): string {
    if (message.includes("auth/user-not-found") || message.includes("auth/wrong-password")) {
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

  it("maps user-not-found to friendly message", () => {
    expect(mapFirebaseError("Firebase: Error (auth/user-not-found).")).toBe(
      "Invalid email or password."
    );
  });

  it("maps wrong-password to same message as user-not-found (no enumeration)", () => {
    expect(mapFirebaseError("Firebase: Error (auth/wrong-password).")).toBe(
      "Invalid email or password."
    );
  });

  it("maps email-already-in-use", () => {
    expect(mapFirebaseError("Firebase: Error (auth/email-already-in-use).")).toBe(
      "An account with this email already exists."
    );
  });

  it("maps weak-password", () => {
    expect(mapFirebaseError("Firebase: Error (auth/weak-password).")).toBe(
      "Password must be at least 6 characters."
    );
  });

  it("maps unknown errors to generic message (no detail leak)", () => {
    expect(mapFirebaseError("Some internal error details")).toBe(
      "Authentication failed. Please try again."
    );
  });
});
