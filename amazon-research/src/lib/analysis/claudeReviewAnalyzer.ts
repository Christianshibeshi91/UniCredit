import type { Anthropic } from "./claudeClient";
import type { Product, Review, AnalysisResult, Complaint, FeatureRequest } from "@/lib/types";
import { SYSTEM_PROMPT, SUBMIT_ANALYSIS_TOOL, buildReviewAnalysisPrompt } from "@/constants/prompts";
import { batchReviews } from "./reviewParser";
import { client, MODEL, withRetry, AnalysisError, CircuitOpenError } from "./claudeClient";

export { AnalysisError, CircuitOpenError };

// ── Single Batch Analysis ─────────────────────────────────────────

async function analyzeBatch(
  product: Product,
  reviews: Review[],
  batchIndex: number,
  totalBatches: number
): Promise<AnalysisResult> {
  const userMessage = buildReviewAnalysisPrompt(
    product,
    reviews,
    batchIndex,
    totalBatches
  );

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [SUBMIT_ANALYSIS_TOOL],
    tool_choice: { type: "tool", name: "submit_analysis" },
    messages: [{ role: "user", content: userMessage }],
  });

  const toolBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );

  if (!toolBlock || toolBlock.name !== "submit_analysis") {
    throw new Error("Claude did not call submit_analysis tool");
  }

  return toolBlock.input as unknown as AnalysisResult;
}

// ── Streaming Analysis ────────────────────────────────────────────

export async function analyzeProductReviewsStreaming(
  product: Product,
  reviews: Review[],
  onProgress: (event: StreamEvent) => void
): Promise<AnalysisResult> {
  const userMessage = buildReviewAnalysisPrompt(
    product,
    reviews,
    0,
    1
  );

  onProgress({ type: "start", reviewCount: reviews.length });

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [SUBMIT_ANALYSIS_TOOL],
    tool_choice: { type: "tool", name: "submit_analysis" },
    messages: [{ role: "user", content: userMessage }],
  });

  let tokenCount = 0;
  stream.on("text", () => {
    tokenCount++;
    if (tokenCount % 20 === 0) {
      onProgress({ type: "progress", tokens: tokenCount });
    }
  });

  const finalMessage = await stream.finalMessage();

  const toolBlock = finalMessage.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );

  if (!toolBlock || toolBlock.name !== "submit_analysis") {
    throw new Error("Claude did not call submit_analysis tool");
  }

  onProgress({
    type: "usage",
    promptTokens: finalMessage.usage.input_tokens,
    completionTokens: finalMessage.usage.output_tokens,
  });

  return toolBlock.input as unknown as AnalysisResult;
}

export interface StreamEvent {
  type: "start" | "progress" | "usage";
  reviewCount?: number;
  tokens?: number;
  promptTokens?: number;
  completionTokens?: number;
}

// ── Merge Batch Results ───────────────────────────────────────────

function mergeAnalyses(results: AnalysisResult[]): AnalysisResult {
  if (results.length === 1) return results[0];

  // Deduplicate complaints by normalized issue text
  const complaintMap = new Map<string, Complaint>();
  for (const result of results) {
    for (const complaint of result.complaints) {
      const key = complaint.issue.toLowerCase().trim();
      if (!complaintMap.has(key)) {
        complaintMap.set(key, complaint);
      } else {
        // Merge: keep higher severity, combine quotes
        const existing = complaintMap.get(key)!;
        const severityOrder: Record<string, number> = { critical: 3, major: 2, minor: 1 };
        if (severityOrder[complaint.severity] > severityOrder[existing.severity]) {
          existing.severity = complaint.severity;
        }
        const combinedQuotes = [
          ...new Set([...existing.exampleQuotes, ...complaint.exampleQuotes]),
        ];
        existing.exampleQuotes = combinedQuotes.slice(0, 3);
      }
    }
  }

  // Deduplicate feature requests by normalized feature text, sum mentionCounts
  const featureMap = new Map<string, FeatureRequest>();
  for (const result of results) {
    for (const fr of result.featureRequests) {
      const key = fr.feature.toLowerCase().trim();
      if (!featureMap.has(key)) {
        featureMap.set(key, { ...fr });
      } else {
        const existing = featureMap.get(key)!;
        existing.mentionCount += fr.mentionCount;
        const demandOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
        if (demandOrder[fr.demandLevel] > demandOrder[existing.demandLevel]) {
          existing.demandLevel = fr.demandLevel;
        }
      }
    }
  }

  // Merge product gaps (deduplicate by gap text)
  const gapSet = new Set<string>();
  const mergedGaps = results.flatMap((r) => r.productGaps).filter((g) => {
    const key = g.gap.toLowerCase().trim();
    if (gapSet.has(key)) return false;
    gapSet.add(key);
    return true;
  });

  // Average sentiments
  const avgSentiment = {
    positive: Math.round(
      results.reduce((s, r) => s + r.sentimentBreakdown.positive, 0) / results.length
    ),
    neutral: Math.round(
      results.reduce((s, r) => s + r.sentimentBreakdown.neutral, 0) / results.length
    ),
    negative: 0,
  };
  avgSentiment.negative = 100 - avgSentiment.positive - avgSentiment.neutral;

  // Deduplicate themes
  const themeSet = new Set<string>();
  const mergedThemes = results
    .flatMap((r) => r.keyThemes)
    .filter((t) => {
      const key = t.toLowerCase().trim();
      if (themeSet.has(key)) return false;
      themeSet.add(key);
      return true;
    })
    .slice(0, 8);

  // Deduplicate improvement ideas
  const ideaSet = new Set<string>();
  const mergedIdeas = results
    .flatMap((r) => r.improvementIdeas)
    .filter((idea) => {
      const key = idea.toLowerCase().trim();
      if (ideaSet.has(key)) return false;
      ideaSet.add(key);
      return true;
    })
    .slice(0, 5);

  return {
    complaints: Array.from(complaintMap.values()).slice(0, 15),
    featureRequests: Array.from(featureMap.values()).slice(0, 10),
    productGaps: mergedGaps,
    sentimentBreakdown: avgSentiment,
    opportunitySummary: results.map((r) => r.opportunitySummary).join(" "),
    improvementIdeas: mergedIdeas,
    keyThemes: mergedThemes,
  };
}

// ── Main Entry Point ──────────────────────────────────────────────

export async function analyzeProductReviews(
  productId: string,
  reviews: Review[],
  product: Product
): Promise<AnalysisResult> {
  const batches = batchReviews(reviews);

  if (batches.length === 0) {
    throw new AnalysisError(
      "No reviews to analyze",
      productId,
      0,
      null
    );
  }

  let attemptCount = 0;

  try {
    if (batches.length === 1) {
      return await withRetry(() => {
        attemptCount++;
        return analyzeBatch(product, batches[0], 0, 1);
      });
    }

    // Process batches sequentially to avoid rate limits
    const results: AnalysisResult[] = [];
    for (let i = 0; i < batches.length; i++) {
      const result = await withRetry(() => {
        attemptCount++;
        return analyzeBatch(product, batches[i], i, batches.length);
      });
      results.push(result);
    }

    return mergeAnalyses(results);
  } catch (error) {
    throw new AnalysisError(
      `Analysis failed for product ${productId}`,
      productId,
      attemptCount,
      error
    );
  }
}
