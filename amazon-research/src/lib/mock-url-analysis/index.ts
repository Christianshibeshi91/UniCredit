import type {
  URLAnalysisReport,
  URLAnalysisReportSummary,
  ComparisonReport,
} from "@/lib/types/urlAnalysis";
import { MOCK_NORMALIZED_PRODUCT } from "./mock-product";
import { MOCK_GRADE_RESULT } from "./mock-grades";
import { MOCK_REVIEW_MINING, MOCK_FAKE_REVIEW_RESULT } from "./mock-reviews";
import {
  MOCK_LISTING_REWRITE,
  MOCK_IMAGE_GRADING,
  MOCK_QA_RESULT,
  MOCK_PRICE_HISTORY,
  MOCK_SUPPLIER_MATCH,
  MOCK_REPEAT_PURCHASE,
  MOCK_COMPETITOR_GAP,
  MOCK_PPC_KEYWORDS,
  MOCK_PRICING_STRATEGY,
  MOCK_ACTION_PLAN,
} from "./mock-operational";

export function getMockURLAnalysisReport(
  reportId?: string,
): URLAnalysisReport {
  const id = reportId ?? "mock-url-1";
  const now = new Date().toISOString();

  return {
    id,
    status: "complete",
    url: MOCK_NORMALIZED_PRODUCT.url,
    source: MOCK_NORMALIZED_PRODUCT.source,
    normalizedProduct: MOCK_NORMALIZED_PRODUCT,
    grade: MOCK_GRADE_RESULT,
    reviewMining: MOCK_REVIEW_MINING,
    fakeReviewDetection: MOCK_FAKE_REVIEW_RESULT,
    listingRewrite: MOCK_LISTING_REWRITE,
    imageGrading: MOCK_IMAGE_GRADING,
    qaExtraction: MOCK_QA_RESULT,
    priceHistory: MOCK_PRICE_HISTORY,
    supplierMatch: MOCK_SUPPLIER_MATCH,
    repeatPurchase: MOCK_REPEAT_PURCHASE,
    competitorGap: MOCK_COMPETITOR_GAP,
    ppcKeywords: MOCK_PPC_KEYWORDS,
    pricingStrategy: MOCK_PRICING_STRATEGY,
    actionPlan: MOCK_ACTION_PLAN,
    claudeModel: "claude-opus-4-6",
    tokenUsage: { inputTokens: 48200, outputTokens: 32100, thinkingTokens: 15400 },
    processingTimeMs: 87400,
    createdAt: now,
    completedAt: now,
  };
}

export function getMockReportSummaries(): URLAnalysisReportSummary[] {
  return [
    {
      id: "mock-url-1",
      url: "https://www.amazon.com/dp/B09KXBCZ7L",
      source: "amazon",
      productTitle: "Bamboo Cutting Board Set (3-Piece) with Juice Groove",
      overallGrade: "B+",
      overallScore: 76,
      status: "complete",
      createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
    {
      id: "mock-url-2",
      url: "https://www.amazon.com/dp/B08M3H7D5P",
      source: "amazon",
      productTitle: "RoyalCraft Premium Bamboo Cutting Board",
      overallGrade: "A-",
      overallScore: 82,
      status: "complete",
      createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    },
    {
      id: "mock-url-3",
      url: "https://www.alibaba.com/product-detail/Bamboo-Board_123456.html",
      source: "alibaba",
      productTitle: "Custom Bamboo Cutting Board OEM Factory",
      overallGrade: "C+",
      overallScore: 61,
      status: "complete",
      createdAt: new Date(Date.now() - 72 * 3600000).toISOString(),
    },
  ];
}

export function getMockComparisonReport(): ComparisonReport {
  return {
    id: "mock-compare-1",
    urls: [
      "https://www.amazon.com/dp/B09KXBCZ7L",
      "https://www.amazon.com/dp/B08M3H7D5P",
    ],
    analysisIds: ["mock-url-1", "mock-url-2"],
    status: "complete",
    scorecard: {
      products: [
        {
          analysisId: "mock-url-1",
          url: "https://www.amazon.com/dp/B09KXBCZ7L",
          title: "Bamboo Cutting Board Set (3-Piece)",
          overallGrade: "B+",
          overallScore: 76,
          dimensionScores: { listingQuality: 15, reviewSentiment: 17, competitivePosition: 14, profitPotential: 16, marketMomentum: 14 },
          rank: 2,
        },
        {
          analysisId: "mock-url-2",
          url: "https://www.amazon.com/dp/B08M3H7D5P",
          title: "RoyalCraft Premium Bamboo Cutting Board",
          overallGrade: "A-",
          overallScore: 82,
          dimensionScores: { listingQuality: 18, reviewSentiment: 16, competitivePosition: 17, profitPotential: 15, marketMomentum: 16 },
          rank: 1,
        },
      ],
    },
    dimensionWinners: [
      { dimension: "listingQuality", winnerId: "mock-url-2", winnerScore: 18, margin: 3, insight: "RoyalCraft has A+ Content and optimized bullets" },
      { dimension: "reviewSentiment", winnerId: "mock-url-1", winnerScore: 17, margin: 1, insight: "GreenChef's juice groove design drives stronger positive sentiment" },
      { dimension: "competitivePosition", winnerId: "mock-url-2", winnerScore: 17, margin: 3, insight: "RoyalCraft's lower price and 8K+ reviews dominate category rank" },
      { dimension: "profitPotential", winnerId: "mock-url-1", winnerScore: 16, margin: 1, insight: "3-piece set format creates better margins per order" },
      { dimension: "marketMomentum", winnerId: "mock-url-2", winnerScore: 16, margin: 2, insight: "RoyalCraft has accelerating BSR trend and review velocity" },
    ],
    overallWinner: "mock-url-2",
    overallWinnerReason: "RoyalCraft wins on overall grade (A- vs B+) driven by superior listing quality, competitive position, and market momentum. However, GreenChef's 3-piece set format gives it a genuine profit and sentiment advantage that could close the gap with better listing optimization.",
    bestInClassByDimension: {
      listingQuality: "mock-url-2",
      reviewSentiment: "mock-url-1",
      competitivePosition: "mock-url-2",
      profitPotential: "mock-url-1",
      marketMomentum: "mock-url-2",
    },
    combinedActionPlan: "Learn from RoyalCraft's A+ Content and listing optimization, then combine it with GreenChef's superior product format (3-piece set with juice groove). The perfect product would be a 3-piece set with RoyalCraft's listing quality.",
    sourcingRecommendation: "If sourcing a new product: the 3-piece set format (GreenChef) is the better business model due to higher margins. Apply RoyalCraft's listing and marketing strategies to the set format for maximum competitive advantage.",
    claudeModel: "claude-opus-4-6",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  };
}

// Re-export sub-modules for direct access
export { MOCK_NORMALIZED_PRODUCT } from "./mock-product";
export { MOCK_GRADE_RESULT } from "./mock-grades";
export { MOCK_REVIEW_MINING, MOCK_FAKE_REVIEW_RESULT } from "./mock-reviews";
export {
  MOCK_LISTING_REWRITE,
  MOCK_IMAGE_GRADING,
  MOCK_QA_RESULT,
  MOCK_PRICE_HISTORY,
  MOCK_SUPPLIER_MATCH,
  MOCK_REPEAT_PURCHASE,
  MOCK_COMPETITOR_GAP,
  MOCK_PPC_KEYWORDS,
  MOCK_PRICING_STRATEGY,
  MOCK_ACTION_PLAN,
} from "./mock-operational";
