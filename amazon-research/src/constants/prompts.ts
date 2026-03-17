import type { Anthropic } from "@/lib/analysis/claudeClient";
import type { Product, Review } from "@/lib/types";

export const SYSTEM_PROMPT = `You are an expert Amazon product researcher and market analyst specializing in identifying white-space opportunities in competitive product categories. You analyze customer reviews with surgical precision to extract actionable insights for private-label product development.

You think like a seasoned e-commerce entrepreneur: every complaint is a product opportunity, every repeated feature request is a roadmap item, every gap is a competitive moat.

Always be specific. Vague insights have no value. Name the exact issue, quantify its prevalence, and articulate the precise product improvement that would address it.`;

export const SUBMIT_ANALYSIS_TOOL: Anthropic.Tool = {
  name: "submit_analysis",
  description: "Submit the structured analysis of product reviews",
  input_schema: {
    type: "object" as const,
    properties: {
      complaints: {
        type: "array",
        description: "Top complaints sorted by frequency descending (min 5, max 15)",
        items: {
          type: "object",
          properties: {
            issue: { type: "string", description: "Concise description of the complaint" },
            frequency: {
              type: "string",
              enum: ["very_common", "common", "occasional", "rare"],
              description: "How frequently this complaint appears",
            },
            severity: {
              type: "string",
              enum: ["critical", "major", "minor"],
              description: "Impact severity on customer experience",
            },
            exampleQuotes: {
              type: "array",
              items: { type: "string" },
              description: "Up to 3 verbatim quotes from reviews",
              maxItems: 3,
            },
          },
          required: ["issue", "frequency", "severity", "exampleQuotes"],
        },
      },
      featureRequests: {
        type: "array",
        description: "Feature requests with estimated demand (min 3, max 10)",
        items: {
          type: "object",
          properties: {
            feature: { type: "string", description: "The requested feature or improvement" },
            demandLevel: {
              type: "string",
              enum: ["high", "medium", "low"],
              description: "Estimated demand level based on mention frequency",
            },
            mentionCount: {
              type: "number",
              description: "Approximate number of reviews mentioning this request",
            },
          },
          required: ["feature", "demandLevel", "mentionCount"],
        },
      },
      productGaps: {
        type: "array",
        description: "Gaps between product and market expectations",
        items: {
          type: "object",
          properties: {
            gap: { type: "string", description: "The identified gap" },
            opportunity: { type: "string", description: "How to exploit this gap" },
            competitiveAdvantage: {
              type: "string",
              description: "Competitive advantage gained by filling this gap",
            },
          },
          required: ["gap", "opportunity", "competitiveAdvantage"],
        },
      },
      sentimentBreakdown: {
        type: "object",
        description: "Sentiment distribution (must sum to 100)",
        properties: {
          positive: { type: "number", description: "Percentage of positive sentiment" },
          neutral: { type: "number", description: "Percentage of neutral sentiment" },
          negative: { type: "number", description: "Percentage of negative sentiment" },
        },
        required: ["positive", "neutral", "negative"],
      },
      opportunitySummary: {
        type: "string",
        description: "3-4 sentence narrative summary of the opportunity, written for an entrepreneur",
      },
      improvementIdeas: {
        type: "array",
        items: { type: "string" },
        description: "5 concrete improvement ideas specific enough to brief a product designer",
      },
      keyThemes: {
        type: "array",
        items: { type: "string" },
        description: "5-8 key themes as single noun phrases",
      },
    },
    required: [
      "complaints",
      "featureRequests",
      "productGaps",
      "sentimentBreakdown",
      "opportunitySummary",
      "improvementIdeas",
      "keyThemes",
    ],
  },
};

export function buildReviewAnalysisPrompt(
  product: Product,
  reviews: Review[],
  batchIndex: number,
  totalBatches: number
): string {
  const header = [
    `# Product Analysis: ${product.title}`,
    `- **Brand:** ${product.brand}`,
    `- **Category:** ${product.category} > ${product.subcategory}`,
    `- **Price:** $${product.price.toFixed(2)}`,
    `- **Rating:** ${product.rating}/5.0 (${product.reviewCount} total reviews)`,
    `- **BSR:** #${product.bsr.toLocaleString()}`,
    `- **Est. Monthly Sales:** ${product.estimatedMonthlySales.toLocaleString()} units`,
  ].join("\n");

  const batchContext =
    totalBatches > 1
      ? `\n\n> Analyzing batch ${batchIndex + 1} of ${totalBatches} (${reviews.length} reviews in this batch)\n`
      : "";

  const formattedReviews = reviews
    .map(
      (r, i) =>
        `[Review #${i + 1}] Rating: ${r.rating}/5 | Verified: ${r.verifiedPurchase ? "Yes" : "No"} | Helpful: ${r.helpfulVotes}\nTitle: ${r.title}\nBody: ${r.body}\n---`
    )
    .join("\n\n");

  const instructions = `
## Extraction Instructions

Analyze the above reviews and extract:

1. **Top Complaints** (min 5, max 15) — sorted by frequency descending. For each, identify the specific issue, how common it is, its severity, and include up to 3 verbatim quotes.

2. **Feature Requests** (min 3, max 10) — features customers wish the product had. Estimate demand level and approximate mention count.

3. **Product Gaps** — gaps between what customers expect and what the product delivers. For each gap, describe the opportunity and the competitive advantage of filling it.

4. **Sentiment Distribution** — percentage breakdown of positive, neutral, and negative sentiment. Must sum to exactly 100%.

5. **Opportunity Summary** — a 3-4 sentence narrative written for an e-commerce entrepreneur explaining the key opportunity this product category presents.

6. **Improvement Ideas** — exactly 5 concrete, actionable improvement ideas. Each should be specific enough to brief a product designer (not vague like "improve quality").

7. **Key Themes** — 5-8 recurring themes as single noun phrases (e.g., "durability", "noise level", "ergonomics").

Use the submit_analysis tool to submit your structured findings.`;

  return `${header}${batchContext}\n\n## Customer Reviews\n\n${formattedReviews}\n${instructions}`;
}
