import { client, MODEL, withRetry, circuitBreaker } from "./claudeClient";
import type Anthropic from "@anthropic-ai/sdk";
import type { ProductSuggestion, ViabilityTier, Product, AnalysisResult } from "@/lib/types";
import { deduplicateByLevenshtein } from "@/lib/utils";
import {
  SUGGESTION_SYSTEM_PROMPT,
  SUBMIT_SUGGESTIONS_TOOL,
  buildGapAnalysisPrompt,
} from "@/constants/suggestionPrompts";

function assignTier(score: number): ViabilityTier {
  if (score >= 85) return "S";
  if (score >= 70) return "A";
  if (score >= 55) return "B";
  return "C";
}

interface RawSuggestion {
  title: string;
  description: string;
  category: string;
  subcategory: string;
  targetCustomer: string;
  targetPrice: number;
  painPointsAddressed: {
    issue: string;
    affectedPercentage: number;
    proposedSolution: string;
  }[];
  differentiators: string[];
  trendSignals: {
    signal: string;
    source: "google_trends" | "amazon_movers" | "social" | "claude_inference";
    strength: "strong" | "moderate" | "emerging";
  }[];
  riskFactors: {
    risk: string;
    severity: "high" | "medium" | "low";
    mitigation: string;
  }[];
  viabilityScore: number;
  viabilityBreakdown: {
    demandConfidence: number;
    differentiationStrength: number;
    marginPotential: number;
    executionFeasibility: number;
  };
}

export async function generateSuggestions(
  products: Product[],
  analyses: AnalysisResult[]
): Promise<ProductSuggestion[]> {
  circuitBreaker.check();

  const userMessage = buildGapAnalysisPrompt(products, analyses);

  const response = await withRetry(() =>
    client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system: SUGGESTION_SYSTEM_PROMPT,
      tools: [SUBMIT_SUGGESTIONS_TOOL],
      tool_choice: { type: "tool", name: "submit_suggestions" },
      messages: [{ role: "user", content: userMessage }],
    })
  );

  const toolBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );

  if (!toolBlock || toolBlock.name !== "submit_suggestions") {
    throw new Error("Claude did not call submit_suggestions tool");
  }

  const raw = (toolBlock.input as { suggestions: RawSuggestion[] }).suggestions;

  // Deduplicate similar suggestions by title similarity
  const deduped = deduplicateByLevenshtein(
    raw,
    (item) => item.title.toLowerCase(),
    2
  );

  const now = new Date().toISOString();
  return deduped.map((s, i) => ({
    id: `sug-${Date.now()}-${i}`,
    sourceProductIds: products.map((p) => p.asin),
    sourceAnalysisIds: [], // filled by caller
    title: s.title,
    description: s.description,
    category: s.category,
    subcategory: s.subcategory,
    targetCustomer: s.targetCustomer,
    targetPrice: s.targetPrice,
    painPointsAddressed: s.painPointsAddressed,
    differentiators: s.differentiators,
    trendSignals: s.trendSignals,
    riskFactors: s.riskFactors,
    viabilityScore: s.viabilityScore,
    viabilityBreakdown: s.viabilityBreakdown,
    tier: assignTier(s.viabilityScore),
    status: "draft" as const,
    generatedBy: "gap_analysis" as const,
    claudeModel: MODEL,
    createdAt: now,
    updatedAt: now,
  }));
}
