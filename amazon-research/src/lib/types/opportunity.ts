import type { Timestamp } from "firebase/firestore";

export type Tier = "S" | "A" | "B" | "C" | "D";
export type Recommendation = "strong_buy" | "buy" | "watch" | "avoid";

export interface ScoreBreakdown {
  demandScore: number;
  competitionScore: number;
  marginScore: number;
  sentimentScore: number;
}

export interface Opportunity {
  id: string;
  productId: string;
  opportunityScore: number;
  scoreBreakdown: ScoreBreakdown;
  tier: Tier;
  recommendation: Recommendation;
  createdAt: Timestamp;
}
