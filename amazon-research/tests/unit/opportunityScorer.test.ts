/**
 * Unit tests: Opportunity Scoring Engine
 */
import { describe, it, expect } from "vitest";
import { calculateScore } from "@/lib/analysis/opportunityScorer";
import type { AnalysisResult, Product } from "@/lib/types";

// Helper: create a minimal product for testing
function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "B09V3KXJPB",
    asin: "B09V3KXJPB",
    title: "Test Product",
    brand: "TestBrand",
    category: "Test Category",
    subcategory: "Test Sub",
    price: 29.99,
    rating: 4.1,
    reviewCount: 1000,
    bsr: 1500,
    imageUrl: "",
    productUrl: "",
    estimatedMonthlySales: 1500,
    estimatedMonthlyRevenue: 44985,
    profitMarginEstimate: 0.35,
    createdAt: null as unknown as Product["createdAt"],
    updatedAt: null as unknown as Product["updatedAt"],
    ...overrides,
  } as Product;
}

// Helper: create a minimal analysis result for testing
function makeAnalysis(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    complaints: [
      {
        issue: "Handle breaks easily",
        frequency: "very_common",
        severity: "critical",
        exampleQuotes: ["Broke after 2 uses"],
      },
      {
        issue: "Rust after washing",
        frequency: "common",
        severity: "major",
        exampleQuotes: ["Started rusting"],
      },
    ],
    featureRequests: [
      { feature: "Dishwasher safe", demandLevel: "high", mentionCount: 45 },
      { feature: "Silicone grip", demandLevel: "medium", mentionCount: 20 },
    ],
    productGaps: [
      { gap: "No silicone handle", opportunity: "Add grip", competitiveAdvantage: "Ergonomic" },
      { gap: "Poor materials", opportunity: "Use 304 SS", competitiveAdvantage: "Durability" },
    ],
    sentimentBreakdown: { positive: 45, neutral: 20, negative: 35 },
    opportunitySummary: "Strong opportunity due to quality issues.",
    improvementIdeas: [
      "Use 304 stainless steel",
      "Add silicone grip",
      "Include cleaning brush",
      "Dishwasher safe design",
    ],
    keyThemes: ["durability", "ergonomics", "material quality"],
    ...overrides,
  };
}

describe("Opportunity Scoring Engine", () => {
  describe("calculateScore", () => {
    it("returns all required fields", () => {
      const result = calculateScore(makeAnalysis(), makeProduct());

      expect(result).toHaveProperty("opportunityScore");
      expect(result).toHaveProperty("scoreBreakdown");
      expect(result).toHaveProperty("tier");
      expect(result).toHaveProperty("recommendation");
      expect(result.scoreBreakdown).toHaveProperty("demandScore");
      expect(result.scoreBreakdown).toHaveProperty("competitionScore");
      expect(result.scoreBreakdown).toHaveProperty("marginScore");
      expect(result.scoreBreakdown).toHaveProperty("sentimentScore");
    });

    it("scores are within valid ranges", () => {
      const result = calculateScore(makeAnalysis(), makeProduct());

      expect(result.opportunityScore).toBeGreaterThanOrEqual(0);
      expect(result.opportunityScore).toBeLessThanOrEqual(100);
      expect(result.scoreBreakdown.demandScore).toBeGreaterThanOrEqual(0);
      expect(result.scoreBreakdown.demandScore).toBeLessThanOrEqual(25);
      expect(result.scoreBreakdown.competitionScore).toBeGreaterThanOrEqual(0);
      expect(result.scoreBreakdown.competitionScore).toBeLessThanOrEqual(25);
      expect(result.scoreBreakdown.marginScore).toBeGreaterThanOrEqual(0);
      expect(result.scoreBreakdown.marginScore).toBeLessThanOrEqual(25);
      expect(result.scoreBreakdown.sentimentScore).toBeGreaterThanOrEqual(0);
      expect(result.scoreBreakdown.sentimentScore).toBeLessThanOrEqual(25);
    });

    it("opportunity score equals sum of breakdown scores", () => {
      const result = calculateScore(makeAnalysis(), makeProduct());
      const { demandScore, competitionScore, marginScore, sentimentScore } =
        result.scoreBreakdown;
      expect(result.opportunityScore).toBe(
        demandScore + competitionScore + marginScore + sentimentScore
      );
    });

    it("tier S for score >= 90", () => {
      // Create conditions for maximum scoring
      const product = makeProduct({
        reviewCount: 10000,
        bsr: 100,
        estimatedMonthlySales: 10000,
        price: 35,
        profitMarginEstimate: 0.6,
      });
      const analysis = makeAnalysis({
        complaints: Array.from({ length: 5 }, (_, i) => ({
          issue: `Critical issue ${i}`,
          frequency: "very_common" as const,
          severity: "critical" as const,
          exampleQuotes: ["quote"],
        })),
        productGaps: Array.from({ length: 5 }, (_, i) => ({
          gap: `Gap ${i}`,
          opportunity: "opportunity",
          competitiveAdvantage: "advantage",
        })),
        featureRequests: Array.from({ length: 5 }, (_, i) => ({
          feature: `Feature ${i}`,
          demandLevel: "high" as const,
          mentionCount: 50,
        })),
        sentimentBreakdown: { positive: 20, neutral: 35, negative: 45 },
        improvementIdeas: ["1", "2", "3", "4", "5"],
      });

      const result = calculateScore(analysis, product);
      expect(result.tier).toBe("S");
      expect(result.recommendation).toBe("strong_buy");
    });

    it("tier D for very low score", () => {
      const product = makeProduct({
        reviewCount: 10,
        bsr: 500000,
        estimatedMonthlySales: 5,
        price: 5,
        profitMarginEstimate: 0.05,
      });
      const analysis = makeAnalysis({
        complaints: [],
        productGaps: [],
        featureRequests: [],
        sentimentBreakdown: { positive: 95, neutral: 4, negative: 1 },
        improvementIdeas: [],
      });

      const result = calculateScore(analysis, product);
      expect(result.tier).toBe("D");
      expect(result.recommendation).toBe("avoid");
    });
  });

  describe("demand scoring", () => {
    it("rewards high review counts", () => {
      const lowReviews = calculateScore(
        makeAnalysis(),
        makeProduct({ reviewCount: 100 })
      );
      const highReviews = calculateScore(
        makeAnalysis(),
        makeProduct({ reviewCount: 5000 })
      );
      expect(highReviews.scoreBreakdown.demandScore).toBeGreaterThan(
        lowReviews.scoreBreakdown.demandScore
      );
    });

    it("rewards low BSR (high sales rank)", () => {
      const highBSR = calculateScore(
        makeAnalysis(),
        makeProduct({ bsr: 100000 })
      );
      const lowBSR = calculateScore(
        makeAnalysis(),
        makeProduct({ bsr: 200 })
      );
      expect(lowBSR.scoreBreakdown.demandScore).toBeGreaterThan(
        highBSR.scoreBreakdown.demandScore
      );
    });
  });

  describe("competition scoring", () => {
    it("rewards more critical complaints (weak competition)", () => {
      const fewComplaints = calculateScore(
        makeAnalysis({ complaints: [] }),
        makeProduct()
      );
      const manyComplaints = calculateScore(
        makeAnalysis({
          complaints: Array.from({ length: 5 }, () => ({
            issue: "Critical",
            frequency: "very_common" as const,
            severity: "critical" as const,
            exampleQuotes: [],
          })),
        }),
        makeProduct()
      );
      expect(manyComplaints.scoreBreakdown.competitionScore).toBeGreaterThan(
        fewComplaints.scoreBreakdown.competitionScore
      );
    });
  });

  describe("margin scoring", () => {
    it("rewards higher profit margins", () => {
      const lowMargin = calculateScore(
        makeAnalysis(),
        makeProduct({ profitMarginEstimate: 0.1 })
      );
      const highMargin = calculateScore(
        makeAnalysis(),
        makeProduct({ profitMarginEstimate: 0.5 })
      );
      expect(highMargin.scoreBreakdown.marginScore).toBeGreaterThan(
        lowMargin.scoreBreakdown.marginScore
      );
    });

    it("rewards sweet spot pricing ($25-$75)", () => {
      const lowPrice = calculateScore(
        makeAnalysis(),
        makeProduct({ price: 5 })
      );
      const sweetSpot = calculateScore(
        makeAnalysis(),
        makeProduct({ price: 35 })
      );
      expect(sweetSpot.scoreBreakdown.marginScore).toBeGreaterThan(
        lowPrice.scoreBreakdown.marginScore
      );
    });
  });

  describe("sentiment scoring", () => {
    it("rewards higher negative sentiment (more room for improvement)", () => {
      const positive = calculateScore(
        makeAnalysis({
          sentimentBreakdown: { positive: 90, neutral: 5, negative: 5 },
          improvementIdeas: [],
        }),
        makeProduct()
      );
      const negative = calculateScore(
        makeAnalysis({
          sentimentBreakdown: { positive: 20, neutral: 30, negative: 50 },
          improvementIdeas: ["1", "2", "3", "4", "5"],
        }),
        makeProduct()
      );
      expect(negative.scoreBreakdown.sentimentScore).toBeGreaterThan(
        positive.scoreBreakdown.sentimentScore
      );
    });
  });

  describe("tier derivation", () => {
    // Test via indirect observation of the score thresholds
    it("maps recommendation correctly to tier", () => {
      const product = makeProduct();
      const analysis = makeAnalysis();
      const result = calculateScore(analysis, product);

      const { tier, recommendation } = result;
      if (tier === "S") expect(recommendation).toBe("strong_buy");
      if (tier === "A") expect(recommendation).toBe("buy");
      if (tier === "B") expect(recommendation).toBe("watch");
      if (tier === "C" || tier === "D") expect(recommendation).toBe("avoid");
    });
  });
});
