import type {
  Product,
  AnalysisResult,
  Opportunity,
  ScoreBreakdown,
  Tier,
  Recommendation,
} from "@/lib/types";

function clampScore(score: number, max: number = 25): number {
  return Math.max(0, Math.min(max, Math.round(score)));
}

function calculateDemandScore(product: Product): number {
  // Higher review count + lower BSR = higher demand
  let score = 0;

  // Review volume (0-12)
  if (product.reviewCount >= 5000) score += 12;
  else if (product.reviewCount >= 2000) score += 9;
  else if (product.reviewCount >= 1000) score += 6;
  else if (product.reviewCount >= 500) score += 3;

  // BSR ranking (0-8) — lower is better
  if (product.bsr <= 500) score += 8;
  else if (product.bsr <= 1000) score += 6;
  else if (product.bsr <= 3000) score += 4;
  else if (product.bsr <= 5000) score += 2;

  // Monthly sales volume (0-5)
  if (product.estimatedMonthlySales >= 5000) score += 5;
  else if (product.estimatedMonthlySales >= 2000) score += 3;
  else if (product.estimatedMonthlySales >= 500) score += 1;

  return clampScore(score);
}

function calculateCompetitionScore(analysis: AnalysisResult): number {
  // More complaints + more gaps = weaker competition = higher opportunity
  let score = 0;

  // Complaint density (0-10)
  const criticalCount = analysis.complaints.filter(
    (c) => c.severity === "critical"
  ).length;
  const majorCount = analysis.complaints.filter(
    (c) => c.severity === "major"
  ).length;
  score += Math.min(10, criticalCount * 3 + majorCount * 1.5);

  // Very common complaints indicate systemic weakness (0-8)
  const veryCommonCount = analysis.complaints.filter(
    (c) => c.frequency === "very_common"
  ).length;
  score += Math.min(8, veryCommonCount * 2.5);

  // Product gaps (0-7)
  score += Math.min(7, analysis.productGaps.length * 2);

  return clampScore(score);
}

function calculateMarginScore(
  product: Product,
  analysis: AnalysisResult
): number {
  let score = 0;

  // Profit margin estimate (0-10)
  if (product.profitMarginEstimate >= 0.5) score += 10;
  else if (product.profitMarginEstimate >= 0.35) score += 7;
  else if (product.profitMarginEstimate >= 0.25) score += 4;
  else score += 1;

  // Price point — sweet spot is $20-$80 for private label (0-8)
  if (product.price >= 25 && product.price <= 75) score += 8;
  else if (product.price >= 15 && product.price <= 100) score += 5;
  else score += 2;

  // Feature request density — more requests = differentiation potential (0-7)
  const highDemandFeatures = analysis.featureRequests.filter(
    (f) => f.demandLevel === "high"
  ).length;
  score += Math.min(7, highDemandFeatures * 2 + analysis.featureRequests.length);

  return clampScore(score);
}

function calculateSentimentScore(analysis: AnalysisResult): number {
  // Higher negative sentiment = more room for improvement = higher opportunity
  const { negative, neutral } = analysis.sentimentBreakdown;

  let score = 0;

  // Negative sentiment (0-15) — more negative = bigger opportunity
  if (negative >= 40) score += 15;
  else if (negative >= 30) score += 12;
  else if (negative >= 20) score += 8;
  else if (negative >= 10) score += 4;

  // Neutral sentiment often hides dissatisfaction (0-5)
  if (neutral >= 30) score += 5;
  else if (neutral >= 20) score += 3;
  else score += 1;

  // Improvement ideas density (0-5)
  score += Math.min(5, analysis.improvementIdeas.length);

  return clampScore(score);
}

function deriveTier(score: number): Tier {
  if (score >= 90) return "S";
  if (score >= 75) return "A";
  if (score >= 50) return "B";
  if (score >= 25) return "C";
  return "D";
}

function deriveRecommendation(tier: Tier): Recommendation {
  switch (tier) {
    case "S":
      return "strong_buy";
    case "A":
      return "buy";
    case "B":
      return "watch";
    case "C":
    case "D":
      return "avoid";
  }
}

export function calculateScore(
  analysis: AnalysisResult,
  product: Product
): Omit<Opportunity, "id" | "productId" | "createdAt"> {
  const scoreBreakdown: ScoreBreakdown = {
    demandScore: calculateDemandScore(product),
    competitionScore: calculateCompetitionScore(analysis),
    marginScore: calculateMarginScore(product, analysis),
    sentimentScore: calculateSentimentScore(analysis),
  };

  const opportunityScore =
    scoreBreakdown.demandScore +
    scoreBreakdown.competitionScore +
    scoreBreakdown.marginScore +
    scoreBreakdown.sentimentScore;

  const tier = deriveTier(opportunityScore);
  const recommendation = deriveRecommendation(tier);

  return {
    opportunityScore,
    scoreBreakdown,
    tier,
    recommendation,
  };
}
