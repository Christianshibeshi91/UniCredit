/**
 * Unit tests: ASIN validation logic
 */
import { describe, it, expect } from "vitest";
import { validateAsin } from "@/lib/services/productIngestion";

describe("ASIN Validation", () => {
  describe("valid ASINs", () => {
    it("accepts standard 10-character alphanumeric ASIN", () => {
      expect(validateAsin("B09V3KXJPB")).toBe(true);
    });

    it("accepts all-uppercase letters", () => {
      expect(validateAsin("ABCDEFGHIJ")).toBe(true);
    });

    it("accepts all digits", () => {
      expect(validateAsin("0123456789")).toBe(true);
    });

    it("accepts mixed alphanumeric", () => {
      expect(validateAsin("B0ABCD1234")).toBe(true);
    });
  });

  describe("invalid ASINs", () => {
    it("rejects lowercase letters", () => {
      expect(validateAsin("b09v3kxjpb")).toBe(false);
    });

    it("rejects mixed case", () => {
      expect(validateAsin("B09v3KXJPB")).toBe(false);
    });

    it("rejects too short (9 chars)", () => {
      expect(validateAsin("B09V3KXJP")).toBe(false);
    });

    it("rejects too long (11 chars)", () => {
      expect(validateAsin("B09V3KXJPBA")).toBe(false);
    });

    it("rejects empty string", () => {
      expect(validateAsin("")).toBe(false);
    });

    it("rejects special characters", () => {
      expect(validateAsin("B09V3KXJ-B")).toBe(false);
    });

    it("rejects spaces", () => {
      expect(validateAsin("B09V3 XJPB")).toBe(false);
    });

    it("rejects unicode characters", () => {
      expect(validateAsin("B09V3KXJ\u00E9B")).toBe(false);
    });

    // Security: injection attempts
    it("rejects SQL injection attempt", () => {
      expect(validateAsin("'; DROP--")).toBe(false);
    });

    it("rejects script tag", () => {
      expect(validateAsin("<script>hi")).toBe(false);
    });

    it("rejects path traversal", () => {
      expect(validateAsin("../../etc/")).toBe(false);
    });
  });
});
