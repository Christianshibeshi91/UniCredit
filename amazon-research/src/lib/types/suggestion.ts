// ── Product Suggestion Types ──────────────────────────────────────

export type ViabilityTier = "S" | "A" | "B" | "C";

export type SuggestionStatus = "draft" | "estimated" | "sourcing" | "archived";

export type GeneratedBy = "gap_analysis" | "trend_expansion" | "hybrid";

export type TrendSource = "google_trends" | "amazon_movers" | "social" | "claude_inference";

export type TrendStrength = "strong" | "moderate" | "emerging";

export type RiskSeverity = "high" | "medium" | "low";

export interface ViabilityBreakdown {
  demandConfidence: number;         // 0-25
  differentiationStrength: number;  // 0-25
  marginPotential: number;          // 0-25
  executionFeasibility: number;     // 0-25
}

export interface PainPoint {
  issue: string;
  affectedPercentage: number;       // 0-100 estimated % of buyers impacted
  proposedSolution: string;
}

export interface TrendSignal {
  signal: string;
  source: TrendSource;
  strength: TrendStrength;
}

export interface RiskFactor {
  risk: string;
  severity: RiskSeverity;
  mitigation: string;
}

export interface ProductSuggestion {
  id: string;
  sourceProductIds: string[];
  sourceAnalysisIds: string[];

  // Product idea
  title: string;
  description: string;
  category: string;
  subcategory: string;
  targetCustomer: string;
  targetPrice: number;

  // Opportunity rationale
  painPointsAddressed: PainPoint[];
  differentiators: string[];
  trendSignals: TrendSignal[];
  riskFactors: RiskFactor[];

  // Scores
  viabilityScore: number;            // 0-100
  viabilityBreakdown: ViabilityBreakdown;
  tier: ViabilityTier;

  // Related data
  costEstimateId?: string;
  supplierSearchId?: string;

  status: SuggestionStatus;
  generatedBy: GeneratedBy;
  claudeModel: string;
  createdAt: string;                 // ISO date
  updatedAt: string;
}
