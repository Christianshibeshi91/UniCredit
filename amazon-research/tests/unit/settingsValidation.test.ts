/**
 * Unit tests: Settings validation logic
 */
import { describe, it, expect } from "vitest";

// Settings validation logic (mirrors the API route validation)
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

function validateSettings(body: Partial<UserSettings>): string[] {
  const errors: string[] = [];

  if (body.claudeModel !== undefined && !ALLOWED_MODELS.has(body.claudeModel)) {
    errors.push(`Invalid claudeModel`);
  }

  if (body.maxReviewsPerBatch !== undefined) {
    if (
      typeof body.maxReviewsPerBatch !== "number" ||
      body.maxReviewsPerBatch < 10 ||
      body.maxReviewsPerBatch > 200
    ) {
      errors.push("maxReviewsPerBatch must be 10-200");
    }
  }

  if (body.theme !== undefined && body.theme !== "light" && body.theme !== "dark") {
    errors.push("theme must be 'light' or 'dark'");
  }

  if (body.autoAnalyzeNewProducts !== undefined && typeof body.autoAnalyzeNewProducts !== "boolean") {
    errors.push("autoAnalyzeNewProducts must be boolean");
  }

  if (body.enableResponseCaching !== undefined && typeof body.enableResponseCaching !== "boolean") {
    errors.push("enableResponseCaching must be boolean");
  }

  if (body.analysisCompletionAlerts !== undefined && typeof body.analysisCompletionAlerts !== "boolean") {
    errors.push("analysisCompletionAlerts must be boolean");
  }

  return errors;
}

describe("Settings Validation", () => {
  describe("valid settings", () => {
    it("accepts empty update (no fields)", () => {
      expect(validateSettings({})).toHaveLength(0);
    });

    it("accepts valid Claude model", () => {
      expect(validateSettings({ claudeModel: "claude-sonnet-4-20250514" })).toHaveLength(0);
    });

    it("accepts all valid models", () => {
      for (const model of ALLOWED_MODELS) {
        expect(validateSettings({ claudeModel: model })).toHaveLength(0);
      }
    });

    it("accepts valid maxReviewsPerBatch (min)", () => {
      expect(validateSettings({ maxReviewsPerBatch: 10 })).toHaveLength(0);
    });

    it("accepts valid maxReviewsPerBatch (max)", () => {
      expect(validateSettings({ maxReviewsPerBatch: 200 })).toHaveLength(0);
    });

    it("accepts dark theme", () => {
      expect(validateSettings({ theme: "dark" })).toHaveLength(0);
    });

    it("accepts light theme", () => {
      expect(validateSettings({ theme: "light" })).toHaveLength(0);
    });

    it("accepts boolean toggles", () => {
      expect(
        validateSettings({
          autoAnalyzeNewProducts: false,
          enableResponseCaching: true,
          analysisCompletionAlerts: false,
        })
      ).toHaveLength(0);
    });
  });

  describe("invalid settings", () => {
    it("rejects invalid Claude model", () => {
      const errors = validateSettings({ claudeModel: "gpt-4" });
      expect(errors.length).toBeGreaterThan(0);
    });

    it("rejects maxReviewsPerBatch below minimum", () => {
      const errors = validateSettings({ maxReviewsPerBatch: 5 });
      expect(errors.length).toBeGreaterThan(0);
    });

    it("rejects maxReviewsPerBatch above maximum", () => {
      const errors = validateSettings({ maxReviewsPerBatch: 500 });
      expect(errors.length).toBeGreaterThan(0);
    });

    it("rejects invalid theme", () => {
      const errors = validateSettings({ theme: "blue" as "light" | "dark" });
      expect(errors.length).toBeGreaterThan(0);
    });

    it("rejects non-boolean autoAnalyzeNewProducts", () => {
      const errors = validateSettings({
        autoAnalyzeNewProducts: "true" as unknown as boolean,
      });
      expect(errors.length).toBeGreaterThan(0);
    });

    it("collects multiple errors", () => {
      const errors = validateSettings({
        claudeModel: "invalid-model",
        maxReviewsPerBatch: -1,
        theme: "neon" as "light" | "dark",
      });
      expect(errors.length).toBe(3);
    });
  });

  // Security: reject injection attempts
  describe("security", () => {
    it("rejects model with injection attempt", () => {
      const errors = validateSettings({
        claudeModel: "'; DROP TABLE users; --",
      });
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
