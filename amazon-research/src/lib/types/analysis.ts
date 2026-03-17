import type { Timestamp } from "firebase/firestore";

export type ComplaintFrequency = "very_common" | "common" | "occasional" | "rare";
export type ComplaintSeverity = "critical" | "major" | "minor";
export type DemandLevel = "high" | "medium" | "low";

export interface Complaint {
  issue: string;
  frequency: ComplaintFrequency;
  severity: ComplaintSeverity;
  exampleQuotes: string[];
}

export interface FeatureRequest {
  feature: string;
  demandLevel: DemandLevel;
  mentionCount: number;
}

export interface ProductGap {
  gap: string;
  opportunity: string;
  competitiveAdvantage: string;
}

export interface SentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
}

export interface Analysis {
  id: string;
  productId: string;
  status: "pending" | "processing" | "complete" | "failed";
  reviewsAnalyzed: number;
  complaints: Complaint[];
  featureRequests: FeatureRequest[];
  productGaps: ProductGap[];
  sentimentBreakdown: SentimentBreakdown;
  opportunitySummary: string;
  improvementIdeas: string[];
  keyThemes: string[];
  claudeModel: string;
  promptTokens: number;
  completionTokens: number;
  processingTimeMs: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AnalysisResult {
  complaints: Complaint[];
  featureRequests: FeatureRequest[];
  productGaps: ProductGap[];
  sentimentBreakdown: SentimentBreakdown;
  opportunitySummary: string;
  improvementIdeas: string[];
  keyThemes: string[];
}
