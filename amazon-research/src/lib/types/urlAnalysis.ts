import type { ProductSpec, SupplierFilterCriteria } from "./supplier";

// ── URL Sources ──────────────────────────────────────────────────

export type URLSource = "amazon" | "alibaba" | "shopify" | "generic";

// ── Pipeline Stages ──────────────────────────────────────────────

export type URLAnalysisStage =
  | "url_detection"
  | "normalization"
  | "grading"
  | "review_mining"
  | "fake_review_detection"
  | "image_grading"
  | "qa_extraction"
  | "price_history"
  | "supplier_match"
  | "listing_rewrite"
  | "competitor_gap"
  | "ppc_keywords"
  | "pricing_strategy"
  | "repeat_purchase"
  | "action_plan";

export type URLAnalysisStatus = "queued" | "running" | "complete" | "failed";

// ── Normalized Product ───────────────────────────────────────────

export interface ProductVariant {
  name: string;
  options: string[];
  priceModifier?: number;
}

export interface NormalizedProduct {
  url: string;
  source: URLSource;
  asin?: string;
  title: string;
  brand: string;
  category: string;
  subcategory?: string;
  price: number;
  currency: string;
  rating: number;
  reviewCount: number;
  bsr?: number;
  bsrCategory?: string;
  description: string;
  bulletPoints: string[];
  images: string[];
  videos: string[];
  variants: ProductVariant[];
  qaCount: number;
  isPrime?: boolean;
  fulfillmentType?: "FBA" | "FBM" | "unknown";
  seller?: string;
}

// ── Product Grading ──────────────────────────────────────────────

export type ProductGrade =
  | "A+" | "A" | "A-"
  | "B+" | "B" | "B-"
  | "C+" | "C" | "C-"
  | "D" | "F";

export type GradeDimensionName =
  | "listingQuality"
  | "reviewSentiment"
  | "competitivePosition"
  | "profitPotential"
  | "marketMomentum";

export interface GradeDimension {
  name: GradeDimensionName;
  score: number; // 0-20
  maxScore: 20;
  grade: ProductGrade;
  rationale: string;
  keyEvidence: string;
  topIssue: string;
  quickWin: string;
}

export interface ProductGradeResult {
  overallGrade: ProductGrade;
  overallScore: number; // 0-100
  dimensions: GradeDimension[];
  strengths: string[];
  criticalWeaknesses: string[];
  gradeSummary: string;
  improvementPotential: number; // 0-100
  improvedGrade: ProductGrade;
}

// ── Review Mining ────────────────────────────────────────────────

export interface VOCPhrase {
  phrase: string;
  frequency: number;
  sentiment: "positive" | "negative" | "neutral";
  useIn: ("title" | "bullets" | "description" | "ppc")[];
}

export interface URLComplaintTheme {
  theme: string;
  reviewCount: number;
  severity: "critical" | "major" | "minor";
  exampleQuotes: string[];
  productFix: string;
  listingFix: string;
}

export interface PraiseTheme {
  theme: string;
  reviewCount: number;
  exampleQuotes: string[];
  leverageOpportunity: string;
}

export type EmotionType =
  | "frustration"
  | "delight"
  | "surprise"
  | "trust"
  | "disappointment"
  | "loyalty";

export interface EmotionalDriver {
  emotion: EmotionType;
  trigger: string;
  frequency: number;
  implication: string;
}

export interface ReviewSentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
}

export interface ReviewMiningResult {
  totalReviewsAnalyzed: number;
  sentimentBreakdown: ReviewSentimentBreakdown;
  sentimentTrend: "improving" | "declining" | "stable";
  sentimentTrendEvidence: string;
  vocPhrases: VOCPhrase[];
  topComplaintThemes: URLComplaintTheme[];
  topPraiseThemes: PraiseTheme[];
  emotionalDrivers: EmotionalDriver[];
  averageReviewLength: number;
  verifiedPurchaseRatio: number;
  mostHelpfulPositiveReview: string;
  mostHelpfulNegativeReview: string;
}

// ── Fake Review Detection ────────────────────────────────────────

export type FakeReviewVerdict = "clean" | "suspicious" | "likely_manipulated";

export interface FakeReviewFlag {
  flag: string;
  severity: "high" | "medium" | "low";
  evidence: string;
  affectedReviewCount: number;
}

export interface VelocityAnomaly {
  period: string;
  reviewsInPeriod: number;
  expectedReviews: number;
  deviationMultiple: number;
  possibleExplanation: string;
}

export interface PhraseSimilarityCluster {
  clusterSize: number;
  sharedPhrases: string[];
  suspicionLevel: "high" | "medium";
}

export interface FakeReviewResult {
  suspicionScore: number; // 0-100
  verdict: FakeReviewVerdict;
  confidence: number; // 0-100
  flags: FakeReviewFlag[];
  cleanSignals: string[];
  ratingDistributionAnomaly: boolean;
  reviewVelocityAnomalies: VelocityAnomaly[];
  phraseSimilarityClusters: PhraseSimilarityCluster[];
  unverifiedPurchaseSpike: boolean;
  summary: string;
  actionRecommendation: string;
}

// ── Listing Rewrite ──────────────────────────────────────────────

export type ChangeType =
  | "keyword_added"
  | "benefit_clarified"
  | "feature_removed"
  | "voc_language"
  | "length_optimized"
  | "cta_added"
  | "pain_point_addressed"
  | "specificity_added";

export interface ChangeExplanation {
  type: ChangeType;
  explanation: string;
  before: string;
  after: string;
}

export interface BulletChange {
  originalBullet: string;
  rewrittenBullet: string;
  changes: ChangeExplanation[];
}

export interface ListingRewriteResult {
  originalTitle: string;
  originalBullets: string[];
  originalDescription: string;
  rewrittenTitle: string;
  rewrittenBullets: string[];
  rewrittenDescription: string;
  titleChanges: ChangeExplanation[];
  bulletChanges: BulletChange[];
  descriptionChanges: ChangeExplanation[];
  keywordsAdded: string[];
  keywordsRemoved: string[];
  readabilityImprovement: string;
  originalListingScore: number;
  rewrittenListingScore: number;
  projectedCTRImprovement: string;
  projectedConversionImprovement: string;
}

// ── Image Grading ────────────────────────────────────────────────

export type ImageType =
  | "main"
  | "lifestyle"
  | "infographic"
  | "detail"
  | "packaging"
  | "scale"
  | "comparison"
  | "unknown";

export interface SingleImageGrade {
  imageUrl: string;
  imageIndex: number;
  type: ImageType;
  score: number; // 0-100
  grade: ProductGrade;
  strengths: string[];
  weaknesses: string[];
  specificImprovements: string[];
}

export interface ImageImprovement {
  priority: number;
  improvement: string;
  impact: "high" | "medium" | "low";
  estimatedCost: string;
  briefForPhotographer: string;
}

export interface InfographicBrief {
  infographicType: string;
  headline: string;
  keyPoints: string[];
  visualDirection: string;
  priority: "must_have" | "should_have" | "nice_to_have";
}

export interface ImageGradingResult {
  overallImageScore: number;
  overallImageGrade: ProductGrade;
  images: SingleImageGrade[];
  mainImageScore: number;
  lifestyleImageCount: number;
  infographicCount: number;
  whiteBackgroundCount: number;
  videoPresent: boolean;
  aplusContentPresent: boolean;
  missingImageTypes: string[];
  missingInfographics: string[];
  priorityImageImprovements: ImageImprovement[];
  infographicBriefs: InfographicBrief[];
}

// ── Q&A Extraction ───────────────────────────────────────────────

export interface ListingGap {
  question: string;
  gap: string;
  whereToAdd: "title" | "bullets" | "description" | "image" | "aplus";
  suggestedCopy: string;
}

export interface BuyerObjection {
  objection: string;
  frequency: number;
  overcome: string;
}

export interface FAQSuggestion {
  question: string;
  answer: string;
  priority: "high" | "medium" | "low";
}

export interface QAResult {
  totalQuestionsAnalyzed: number;
  questionCategories: { category: string; count: number }[];
  listingGaps: ListingGap[];
  buyerObjections: BuyerObjection[];
  unansweredQuestions: string[];
  faqSuggestions: FAQSuggestion[];
  listingAmendments: string[];
}

// ── Price History ────────────────────────────────────────────────

export interface PriceDataPoint {
  date: string;
  price: number;
  bsr: number;
}

export type PricingEventType =
  | "price_drop"
  | "price_increase"
  | "lightning_deal"
  | "coupon_added"
  | "bsr_spike"
  | "bsr_crash";

export interface PricingEvent {
  date: string;
  type: PricingEventType;
  magnitude: number;
  possibleReason: string;
}

export interface PriceHistoryResult {
  priceDataPoints: PriceDataPoint[];
  priceVolatility: "high" | "medium" | "low";
  priceDirection: "increasing" | "decreasing" | "stable";
  lowestPrice90Days: number;
  highestPrice90Days: number;
  averagePrice90Days: number;
  currentVsAverage: number;
  bsrDirection: "improving" | "declining" | "stable";
  bestBSR90Days: number;
  worstBSR90Days: number;
  detectedEvents: PricingEvent[];
  priceElasticitySignal: string;
  optimalPriceWindow: string;
  pricingInsight: string;
}

// ── Supplier Match ───────────────────────────────────────────────

export interface CostRange {
  low: number;
  mid: number;
  high: number;
  currency: "USD";
}

export interface MarginAnalysis {
  atCurrentPrice: number;
  atLowPrice: number;
  recommendedSalePrice: number;
  projectedNetMargin: number;
}

export interface SupplierMatchResult {
  productSpec: ProductSpec;
  estimatedManufacturingRegion: string;
  estimatedMaterialComposition: string[];
  searchKeywords: string[];
  filterCriteria: SupplierFilterCriteria;
  estimatedSourceCost: CostRange;
  estimatedLandedCost: CostRange;
  marginVsCurrentPrice: MarginAnalysis;
  sourcingOpportunityScore: number; // 0-100
  sourcingVerdict: "strong_opportunity" | "viable" | "marginal" | "avoid";
  sourcingRationale: string;
}

// ── Repeat Purchase ──────────────────────────────────────────────

export interface LTVEstimate {
  averageOrderValue: number;
  estimatedOrdersPerYear: number;
  estimatedLTV12Month: number;
  estimatedLTV36Month: number;
}

export interface RepeatPurchaseDriver {
  driver: string;
  strength: "strong" | "moderate" | "weak";
  evidence: string;
}

export interface RepeatPurchaseInhibitor {
  inhibitor: string;
  severity: "high" | "medium" | "low";
  mitigation: string;
}

export interface RepeatPurchaseResult {
  score: number; // 0-100
  probability: "very_high" | "high" | "medium" | "low" | "very_low";
  drivers: RepeatPurchaseDriver[];
  inhibitors: RepeatPurchaseInhibitor[];
  ltv: LTVEstimate;
  brandBuildingVerdict: string;
  subscriptionOpportunity: boolean;
  bundleOpportunities: string[];
  summary: string;
}

// ── Competitor Gap ───────────────────────────────────────────────

export interface CompetitorSummary {
  asin: string;
  title: string;
  price: number;
  rating: number;
  reviewCount: number;
  bsr: number;
  keyStrengths: string[];
  keyWeaknesses: string[];
}

export interface ProductGapItem {
  gap: string;
  competitorsThatHaveIt: string[];
  impactOnGrade: "high" | "medium" | "low";
  fixDifficulty: "easy" | "medium" | "hard";
  recommendation: string;
}

export interface CompetitorWeakness {
  weakness: string;
  affectedCompetitors: string[];
  opportunityFor: string;
  actionableStep: string;
}

export interface CompetitorGapResult {
  topCompetitors: CompetitorSummary[];
  productGaps: ProductGapItem[];
  competitorWeaknesses: CompetitorWeakness[];
  marketPositionMap: string;
  differentiationScore: number; // 0-100
  commodityRisk: "high" | "medium" | "low";
  summary: string;
}

// ── PPC Keywords ─────────────────────────────────────────────────

export interface PPCKeyword {
  keyword: string;
  matchType: "exact" | "phrase" | "broad";
  searchVolume: "high" | "medium" | "low";
  competition: "high" | "medium" | "low";
  estimatedBid: number;
  intent: string;
}

export interface PPCKeywordResult {
  exactMatchTargets: PPCKeyword[];
  broadMatchOpportunities: PPCKeyword[];
  longTailGems: PPCKeyword[];
  totalEstimatedMonthlyBudget: number;
  topKeywordInsight: string;
}

// ── Pricing Strategy ─────────────────────────────────────────────

export interface PromotionalStep {
  phase: string;
  duration: string;
  price: number;
  coupon?: string;
  rationale: string;
}

export interface PricingStrategyResult {
  optimalPrice: number;
  priceRationale: string;
  promotionalSequence: PromotionalStep[];
  couponStrategy: string;
  longTermPricingRoadmap: string;
  priceVsCompetitors: string;
}

// ── Action Plan ──────────────────────────────────────────────────

export type ActionCategory =
  | "listing"
  | "images"
  | "pricing"
  | "ppc"
  | "product"
  | "reviews"
  | "sourcing";

export interface ActionItem {
  action: string;
  category: ActionCategory;
  specificSteps: string[];
  estimatedCost: number;
  estimatedTimeHours: number;
  expectedImpact: string;
  gradeImpact: string;
  priority: number;
}

export interface URLActionPlan {
  immediateActions: ActionItem[];
  shortTermActions: ActionItem[];
  longTermActions: ActionItem[];
  totalEstimatedCost: number;
  projectedGradeAfterAllActions: ProductGrade;
  projectedScoreAfterAllActions: number;
  priorityStatement: string;
}

// ── Full Report ──────────────────────────────────────────────────

export interface URLAnalysisTokenUsage {
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
}

export interface URLAnalysisReport {
  id: string;
  status: URLAnalysisStatus;
  url: string;
  source: URLSource;
  normalizedProduct: NormalizedProduct;
  grade: ProductGradeResult;
  reviewMining: ReviewMiningResult;
  fakeReviewDetection: FakeReviewResult;
  listingRewrite: ListingRewriteResult;
  imageGrading: ImageGradingResult;
  qaExtraction: QAResult;
  priceHistory: PriceHistoryResult;
  supplierMatch: SupplierMatchResult;
  repeatPurchase: RepeatPurchaseResult;
  competitorGap: CompetitorGapResult;
  ppcKeywords: PPCKeywordResult;
  pricingStrategy: PricingStrategyResult;
  actionPlan: URLActionPlan;
  claudeModel: "claude-opus-4-6";
  tokenUsage: URLAnalysisTokenUsage;
  processingTimeMs: number;
  createdAt: string;
  completedAt: string;
}

// ── SSE Events ───────────────────────────────────────────────────

export type URLAnalysisSSEEvent =
  | { type: "start"; reportId: string; url: string; source: URLSource; totalStages: number }
  | { type: "stage"; stage: URLAnalysisStage; index: number; status: "running" | "complete" | "error"; message: string }
  | { type: "complete"; report: URLAnalysisReport }
  | { type: "error"; message: string };

// ── Comparison ───────────────────────────────────────────────────

export interface ComparisonProduct {
  analysisId: string;
  url: string;
  title: string;
  overallGrade: ProductGrade;
  overallScore: number;
  dimensionScores: Record<GradeDimensionName, number>;
  rank: number;
}

export interface DimensionWinner {
  dimension: GradeDimensionName;
  winnerId: string;
  winnerScore: number;
  margin: number;
  insight: string;
}

export interface ComparisonScorecard {
  products: ComparisonProduct[];
}

export interface ComparisonReport {
  id: string;
  urls: string[];
  analysisIds: string[];
  status: "running" | "complete" | "failed";
  scorecard: ComparisonScorecard;
  dimensionWinners: DimensionWinner[];
  overallWinner: string;
  overallWinnerReason: string;
  bestInClassByDimension: Record<string, string>;
  combinedActionPlan: string;
  sourcingRecommendation: string;
  claudeModel: "claude-opus-4-6";
  createdAt: string;
}

// ── Report Summaries (for landing page) ──────────────────────────

export interface URLAnalysisReportSummary {
  id: string;
  url: string;
  source: URLSource;
  productTitle: string;
  overallGrade: ProductGrade;
  overallScore: number;
  status: URLAnalysisStatus;
  createdAt: string;
}
