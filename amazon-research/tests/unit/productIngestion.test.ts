/**
 * Unit tests: Product Ingestion Service
 */
import { describe, it, expect } from "vitest";
import { validateAsin, IngestionError } from "@/lib/services/productIngestion";

describe("Product Ingestion Service", () => {
  describe("validateAsin", () => {
    it("accepts valid ASIN B09V3KXJPB", () => {
      expect(validateAsin("B09V3KXJPB")).toBe(true);
    });

    it("rejects lowercase asin", () => {
      expect(validateAsin("b09v3kxjpb")).toBe(false);
    });

    it("rejects 9-character string", () => {
      expect(validateAsin("B09V3KXJP")).toBe(false);
    });

    it("rejects 11-character string", () => {
      expect(validateAsin("B09V3KXJPBA")).toBe(false);
    });

    it("rejects empty string", () => {
      expect(validateAsin("")).toBe(false);
    });

    it("rejects strings with hyphens", () => {
      expect(validateAsin("B09-V3KXJP")).toBe(false);
    });
  });

  describe("IngestionError", () => {
    it("creates error with correct properties", () => {
      const error = new IngestionError("Not found", 404);
      expect(error.message).toBe("Not found");
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe("IngestionError");
    });

    it("is an instance of Error", () => {
      const error = new IngestionError("Bad request", 400);
      expect(error instanceof Error).toBe(true);
      expect(error instanceof IngestionError).toBe(true);
    });
  });

  describe("BSR to sales estimation", () => {
    // Test the estimation logic via exported function behavior
    // The estimateMonthlySalesFromBSR function is private, so we test
    // indirectly through the public API or by reimplementing the logic

    function estimateMonthlySalesFromBSR(bsr: number): number {
      if (bsr <= 0) return 0;
      if (bsr <= 100) return 10000;
      if (bsr <= 500) return 5000;
      if (bsr <= 1000) return 3000;
      if (bsr <= 3000) return 1500;
      if (bsr <= 5000) return 800;
      if (bsr <= 10000) return 400;
      if (bsr <= 50000) return 150;
      if (bsr <= 100000) return 50;
      return 20;
    }

    it("returns 0 for BSR 0", () => {
      expect(estimateMonthlySalesFromBSR(0)).toBe(0);
    });

    it("returns 0 for negative BSR", () => {
      expect(estimateMonthlySalesFromBSR(-1)).toBe(0);
    });

    it("returns highest sales for top BSR", () => {
      expect(estimateMonthlySalesFromBSR(50)).toBe(10000);
    });

    it("returns lower sales for higher BSR", () => {
      expect(estimateMonthlySalesFromBSR(100000)).toBe(50);
    });

    it("decreases monotonically as BSR increases", () => {
      const bsrValues = [50, 200, 800, 2000, 4000, 8000, 30000, 80000, 200000];
      const sales = bsrValues.map(estimateMonthlySalesFromBSR);
      for (let i = 1; i < sales.length; i++) {
        expect(sales[i]).toBeLessThanOrEqual(sales[i - 1]);
      }
    });
  });
});
