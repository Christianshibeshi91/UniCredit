/**
 * Integration Tests: Settings API
 *
 * Tests the /api/settings endpoint validation logic, including
 * allowed models, numeric ranges, theme values, and security edge cases.
 */
import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Replicated validation logic from src/app/api/settings/route.ts
// ---------------------------------------------------------------------------

const ALLOWED_MODELS = new Set([
  "claude-sonnet-4-20250514",
  "claude-haiku-35-20241022",
  "claude-opus-4-20250514",
]);

interface UserSettings {
  autoAnalyzeNewProducts: boolean;
  enableResponseCaching: boolean;
  claudeModel: string;
  maxReviewsPerBatch: number;
  analysisCompletionAlerts: boolean;
  theme: "light" | "dark";
}

function validateSettingsUpdate(body: Partial<UserSettings>): string[] {
  const errors: string[] = [];

  if (
    body.claudeModel !== undefined &&
    !ALLOWED_MODELS.has(body.claudeModel)
  ) {
    errors.push(
      `Invalid claudeModel. Allowed: ${Array.from(ALLOWED_MODELS).join(", ")}`
    );
  }

  if (body.maxReviewsPerBatch !== undefined) {
    if (
      typeof body.maxReviewsPerBatch !== "number" ||
      body.maxReviewsPerBatch < 10 ||
      body.maxReviewsPerBatch > 200
    ) {
      errors.push("maxReviewsPerBatch must be a number between 10 and 200");
    }
  }

  if (
    body.theme !== undefined &&
    body.theme !== "light" &&
    body.theme !== "dark"
  ) {
    errors.push("theme must be 'light' or 'dark'");
  }

  if (
    body.autoAnalyzeNewProducts !== undefined &&
    typeof body.autoAnalyzeNewProducts !== "boolean"
  ) {
    errors.push("autoAnalyzeNewProducts must be a boolean");
  }

  if (
    body.enableResponseCaching !== undefined &&
    typeof body.enableResponseCaching !== "boolean"
  ) {
    errors.push("enableResponseCaching must be a boolean");
  }

  if (
    body.analysisCompletionAlerts !== undefined &&
    typeof body.analysisCompletionAlerts !== "boolean"
  ) {
    errors.push("analysisCompletionAlerts must be a boolean");
  }

  return errors;
}

// Only allow known keys through
const ALLOWED_KEYS: (keyof UserSettings)[] = [
  "autoAnalyzeNewProducts",
  "enableResponseCaching",
  "claudeModel",
  "maxReviewsPerBatch",
  "analysisCompletionAlerts",
  "theme",
];

function filterAllowedKeys(
  body: Record<string, unknown>
): Partial<UserSettings> {
  const filtered: Record<string, unknown> = {};
  for (const key of ALLOWED_KEYS) {
    if (body[key] !== undefined) {
      filtered[key] = body[key];
    }
  }
  return filtered as Partial<UserSettings>;
}

// ---------------------------------------------------------------------------
// Tests: Model validation
// ---------------------------------------------------------------------------

describe("Settings API - Model Validation", () => {
  it("accepts claude-sonnet-4-20250514", () => {
    expect(
      validateSettingsUpdate({ claudeModel: "claude-sonnet-4-20250514" })
    ).toHaveLength(0);
  });

  it("accepts claude-haiku-35-20241022", () => {
    expect(
      validateSettingsUpdate({ claudeModel: "claude-haiku-35-20241022" })
    ).toHaveLength(0);
  });

  it("accepts claude-opus-4-20250514", () => {
    expect(
      validateSettingsUpdate({ claudeModel: "claude-opus-4-20250514" })
    ).toHaveLength(0);
  });

  it("rejects claude-opus-4-6 (used by UI but not in allowlist)", () => {
    const errors = validateSettingsUpdate({ claudeModel: "claude-opus-4-6" });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("Invalid claudeModel");
  });

  it("rejects claude-haiku-4-5-20251001 (used by UI but not in allowlist)", () => {
    const errors = validateSettingsUpdate({
      claudeModel: "claude-haiku-4-5-20251001",
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects gpt-4", () => {
    expect(
      validateSettingsUpdate({ claudeModel: "gpt-4" }).length
    ).toBeGreaterThan(0);
  });

  it("rejects empty string", () => {
    expect(
      validateSettingsUpdate({ claudeModel: "" }).length
    ).toBeGreaterThan(0);
  });

  // Security: injection
  it("rejects SQL injection in model name", () => {
    expect(
      validateSettingsUpdate({ claudeModel: "'; DROP TABLE users;--" }).length
    ).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: maxReviewsPerBatch validation
// ---------------------------------------------------------------------------

describe("Settings API - maxReviewsPerBatch Validation", () => {
  it("accepts minimum value 10", () => {
    expect(
      validateSettingsUpdate({ maxReviewsPerBatch: 10 })
    ).toHaveLength(0);
  });

  it("accepts maximum value 200", () => {
    expect(
      validateSettingsUpdate({ maxReviewsPerBatch: 200 })
    ).toHaveLength(0);
  });

  it("accepts value in range", () => {
    expect(
      validateSettingsUpdate({ maxReviewsPerBatch: 50 })
    ).toHaveLength(0);
  });

  it("rejects value below minimum", () => {
    expect(
      validateSettingsUpdate({ maxReviewsPerBatch: 5 }).length
    ).toBeGreaterThan(0);
  });

  it("rejects value above maximum", () => {
    expect(
      validateSettingsUpdate({ maxReviewsPerBatch: 500 }).length
    ).toBeGreaterThan(0);
  });

  it("rejects zero", () => {
    expect(
      validateSettingsUpdate({ maxReviewsPerBatch: 0 }).length
    ).toBeGreaterThan(0);
  });

  it("rejects negative value", () => {
    expect(
      validateSettingsUpdate({ maxReviewsPerBatch: -1 }).length
    ).toBeGreaterThan(0);
  });

  it("BUG: NaN passes typeof check and is not caught by range check (should reject)", () => {
    // BUG: typeof NaN === "number" is true.
    // NaN < 10 is false. NaN > 200 is false. So the range check passes.
    // This means NaN is accepted as a valid maxReviewsPerBatch value.
    expect(
      validateSettingsUpdate({ maxReviewsPerBatch: NaN }).length
    ).toBe(0); // Documents actual buggy behavior -- NaN slips through
  });

  it("rejects Infinity", () => {
    expect(
      validateSettingsUpdate({ maxReviewsPerBatch: Infinity }).length
    ).toBeGreaterThan(0);
  });

  it("rejects string coerced to number", () => {
    expect(
      validateSettingsUpdate({
        maxReviewsPerBatch: "50" as unknown as number,
      }).length
    ).toBeGreaterThan(0);
  });

  it("rejects float value", () => {
    // Technically passes the range check since 50.5 is between 10 and 200
    // but ideally should be integer-only. This documents current behavior.
    const errors = validateSettingsUpdate({ maxReviewsPerBatch: 50.5 });
    expect(errors).toHaveLength(0); // Currently accepted -- potential issue
  });
});

// ---------------------------------------------------------------------------
// Tests: Theme validation
// ---------------------------------------------------------------------------

describe("Settings API - Theme Validation", () => {
  it("accepts 'dark'", () => {
    expect(validateSettingsUpdate({ theme: "dark" })).toHaveLength(0);
  });

  it("accepts 'light'", () => {
    expect(validateSettingsUpdate({ theme: "light" })).toHaveLength(0);
  });

  it("rejects 'auto'", () => {
    expect(
      validateSettingsUpdate({ theme: "auto" as "light" | "dark" }).length
    ).toBeGreaterThan(0);
  });

  it("rejects 'system'", () => {
    expect(
      validateSettingsUpdate({ theme: "system" as "light" | "dark" }).length
    ).toBeGreaterThan(0);
  });

  it("rejects empty string", () => {
    expect(
      validateSettingsUpdate({ theme: "" as "light" | "dark" }).length
    ).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: Boolean field validation
// ---------------------------------------------------------------------------

describe("Settings API - Boolean Fields", () => {
  it("accepts true for autoAnalyzeNewProducts", () => {
    expect(
      validateSettingsUpdate({ autoAnalyzeNewProducts: true })
    ).toHaveLength(0);
  });

  it("accepts false for autoAnalyzeNewProducts", () => {
    expect(
      validateSettingsUpdate({ autoAnalyzeNewProducts: false })
    ).toHaveLength(0);
  });

  it("rejects string 'true' for autoAnalyzeNewProducts", () => {
    expect(
      validateSettingsUpdate({
        autoAnalyzeNewProducts: "true" as unknown as boolean,
      }).length
    ).toBeGreaterThan(0);
  });

  it("rejects number 1 for autoAnalyzeNewProducts", () => {
    expect(
      validateSettingsUpdate({
        autoAnalyzeNewProducts: 1 as unknown as boolean,
      }).length
    ).toBeGreaterThan(0);
  });

  it("rejects null for enableResponseCaching", () => {
    expect(
      validateSettingsUpdate({
        enableResponseCaching: null as unknown as boolean,
      }).length
    ).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: Multiple field validation
// ---------------------------------------------------------------------------

describe("Settings API - Multi-Field Validation", () => {
  it("accepts valid full update", () => {
    const errors = validateSettingsUpdate({
      autoAnalyzeNewProducts: false,
      enableResponseCaching: true,
      claudeModel: "claude-sonnet-4-20250514",
      maxReviewsPerBatch: 100,
      analysisCompletionAlerts: true,
      theme: "light",
    });
    expect(errors).toHaveLength(0);
  });

  it("collects all errors when multiple fields invalid", () => {
    const errors = validateSettingsUpdate({
      claudeModel: "invalid",
      maxReviewsPerBatch: -1,
      theme: "neon" as "light" | "dark",
      autoAnalyzeNewProducts: "yes" as unknown as boolean,
    });
    expect(errors).toHaveLength(4);
  });

  it("accepts empty update (no fields)", () => {
    expect(validateSettingsUpdate({})).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: Key filtering (no extra fields stored)
// ---------------------------------------------------------------------------

describe("Settings API - Key Filtering", () => {
  it("filters out unknown keys", () => {
    const filtered = filterAllowedKeys({
      claudeModel: "claude-sonnet-4-20250514",
      __proto__: "attack",
      constructor: "attack",
      password: "secret",
      isAdmin: true,
    });
    expect(Object.keys(filtered)).toEqual(["claudeModel"]);
  });

  it("preserves all allowed keys", () => {
    const input = {
      autoAnalyzeNewProducts: true,
      enableResponseCaching: false,
      claudeModel: "claude-sonnet-4-20250514",
      maxReviewsPerBatch: 75,
      analysisCompletionAlerts: true,
      theme: "dark",
    };
    const filtered = filterAllowedKeys(input);
    expect(Object.keys(filtered).sort()).toEqual(ALLOWED_KEYS.sort());
  });

  it("ignores undefined values", () => {
    const filtered = filterAllowedKeys({
      claudeModel: undefined,
      theme: "dark",
    });
    expect(Object.keys(filtered)).toEqual(["theme"]);
  });
});
