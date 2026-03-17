import type Anthropic from "@anthropic-ai/sdk";

// ── System Prompts ────────────────────────────────────────────────

export const MARKET_SYNTHESIS_PROMPT = `You are a constraints-first FBA market strategist specializing in beginner seller opportunities. You analyze aggregated product data to identify the single best opportunity for a first-time Amazon seller with limited capital ($2,000-$5,000).

Rules:
- Never recommend products requiring certifications (FDA, FCC, UL)
- Never recommend products with top-seller review counts above 10,000
- MOQ must be achievable under $3,000 for first order
- Target gross margin minimum 40%
- Product must be launchable within 90 days
- Prefer simple, non-electronic, non-consumable products`;

export const PRODUCT_DEFINITION_PROMPT = `You are a meticulous product developer for Amazon private-label brands. Every feature you recommend must be traced to evidence from customer reviews or market data. You never invent features for novelty — every spec must solve a documented problem.

Rules:
- Every must-have feature needs evidence from complaint data or feature requests
- Price must be in impulse-buy range ($15-$35) for beginner sellers
- Product must be photographable without complex staging
- Design must be manufacturable with standard silicone/plastic/metal tooling`;

export const FINANCIAL_MODEL_PROMPT = `You are a conservative FBA accountant who specializes in unit economics for beginner sellers. You NEVER round in the seller's favor. Include every Amazon fee. Your break-even calculations assume worst-case PPC costs in months 1-3.

Rules:
- Include all Amazon fees: referral fee, FBA fulfillment, storage, advertising
- PPC budget: $600/month for months 1-3, tapering to $200/month
- Shipping: calculate sea freight per-unit at $0.80-$1.50 depending on weight
- Always include 15-20% contingency on total startup budget
- Never project profitability before Month 4`;

export const NINETY_DAY_PLANNER_PROMPT = `You are a solo seller operations expert who designs playbooks executable by one person working 15-20 hours per week. Every step must be concrete and actionable — no vague advice like "optimize your listing."

Rules:
- Every task has exact steps a beginner can follow
- Every task has a measurable success metric
- Include realistic cost for each task
- Include beginner-specific tips that prevent common first-timer mistakes
- Day 1 actions must be immediately executable with zero prerequisites`;

export const RISK_ANALYZER_PROMPT = `You are a risk analyst who specializes in beginner Amazon seller risks. You apply a "beginner multiplier" (1.0-2.5x) to each risk based on how much more likely a beginner is to encounter it compared to an experienced seller.

Rules:
- Score likelihood and impact on 1-5 scale
- Apply beginner multiplier to calculate adjusted severity
- Every risk must have actionable early warning signals
- Every mitigation must be achievable by a solo seller with <$5K capital
- Flag risks that are truly unmitigatable (algorithm changes, market shifts)`;

export const CONFIDENCE_SCORER_PROMPT = `You are an honest analyst who provides uncomfortable truths when the data warrants them. You score success probability across 5 dimensions, each 0-20 points. Your honest assessment must address both the opportunity and the realistic challenges a beginner will face.

Rules:
- Overall score is sum of 5 dimensions (0-100)
- Confidence interval must be realistic (typically ±12-15 points)
- Failure scenarios must include probability estimates
- Honest assessment must be at least 3 sentences acknowledging real challenges
- Never be artificially optimistic or pessimistic`;

export const FINAL_SYNTHESIS_PROMPT = `You are a senior partner at an FBA consulting firm reviewing a complete intelligence report. Your job is to find and reconcile any inconsistencies between stages, verify that financial projections align with market analysis, and ensure the playbook is achievable within stated constraints.

Rules:
- Flag any inconsistency between stages (e.g., timeline in playbook vs financial model)
- Verify unit economics sum correctly
- Confirm all playbook costs fit within stated budget
- Ensure risk mitigations are reflected in the playbook tasks
- Provide a final go/no-go recommendation with confidence level`;

// ── Tool Definitions ──────────────────────────────────────────────

export const SYNTHESIZE_MARKET_TOOL: Anthropic.Tool = {
  name: "synthesize_market",
  description: "Submit market synthesis with top 3 product opportunities for a beginner Amazon seller",
  input_schema: {
    type: "object" as const,
    properties: {
      topOpportunities: {
        type: "array",
        description: "Top 3 product opportunities ranked by beginner suitability",
        items: {
          type: "object",
          properties: {
            productName: { type: "string", description: "Clear product name" },
            category: { type: "string", description: "Amazon category" },
            whyTop: { type: "string", description: "Why this is a top opportunity for beginners" },
            estimatedMonthlySearches: { type: "number", description: "Estimated monthly Amazon searches" },
            competitionLevel: { type: "string", enum: ["low", "medium", "high"], description: "Competition assessment" },
            estimatedMargin: { type: "number", description: "Estimated gross margin percentage" },
          },
          required: ["productName", "category", "whyTop", "estimatedMonthlySearches", "competitionLevel", "estimatedMargin"],
        },
      },
      marketOverview: { type: "string", description: "2-3 sentence overview of the market landscape" },
      disqualifiedCount: { type: "number", description: "Number of products disqualified by beginner filters" },
    },
    required: ["topOpportunities", "marketOverview", "disqualifiedCount"],
  },
};

export const DEFINE_PRODUCT_TOOL: Anthropic.Tool = {
  name: "define_product",
  description: "Submit detailed product definition with win condition assessment",
  input_schema: {
    type: "object" as const,
    properties: {
      productName: { type: "string" },
      targetPrice: { type: "number" },
      estimatedUnitCost: { type: "number" },
      minimumOrderQuantity: { type: "number" },
      category: { type: "string" },
      investmentThesis: { type: "string", description: "2-4 sentence investment thesis" },
      winConditions: {
        type: "array",
        description: "4 win condition assessments",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            met: { type: "boolean" },
            score: { type: "number", description: "0-25 score" },
            evidence: { type: "string" },
            caveat: { type: "string" },
          },
          required: ["name", "met", "score", "evidence", "caveat"],
        },
      },
      alternatives: {
        type: "array",
        items: {
          type: "object",
          properties: {
            productName: { type: "string" },
            reason: { type: "string" },
            whyNotChosen: { type: "string" },
          },
          required: ["productName", "reason", "whyNotChosen"],
        },
      },
      beginnerAdvantages: { type: "array", items: { type: "string" } },
      mustHaveFeatures: { type: "array", items: { type: "string" } },
    },
    required: ["productName", "targetPrice", "estimatedUnitCost", "minimumOrderQuantity", "category", "investmentThesis", "winConditions", "alternatives", "beginnerAdvantages", "mustHaveFeatures"],
  },
};

export const MODEL_FINANCIALS_TOOL: Anthropic.Tool = {
  name: "model_financials",
  description: "Submit unit economics and launch budget analysis",
  input_schema: {
    type: "object" as const,
    properties: {
      unitEconomics: {
        type: "object",
        properties: {
          unitManufacturingCost: { type: "number" },
          shippingPerUnit: { type: "number" },
          amazonFees: { type: "number" },
          totalVariableCost: { type: "number" },
          sellingPrice: { type: "number" },
          profitPerUnit: { type: "number" },
          marginPercent: { type: "number" },
        },
        required: ["unitManufacturingCost", "shippingPerUnit", "amazonFees", "totalVariableCost", "sellingPrice", "profitPerUnit", "marginPercent"],
      },
      launchBudget: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: { label: { type: "string" }, amount: { type: "number" } },
              required: ["label", "amount"],
            },
          },
          subtotal: { type: "number" },
          contingency: { type: "number" },
          total: { type: "number" },
        },
        required: ["items", "subtotal", "contingency", "total"],
      },
      breakEvenUnits: { type: "number" },
      breakEvenMonths: { type: "number" },
      roi12Month: { type: "number", description: "12-month ROI as percentage" },
    },
    required: ["unitEconomics", "launchBudget", "breakEvenUnits", "breakEvenMonths", "roi12Month"],
  },
};

export const BUILD_PLAYBOOK_TOOL: Anthropic.Tool = {
  name: "build_playbook",
  description: "Submit 90-day launch playbook with phases, tasks, and milestones",
  input_schema: {
    type: "object" as const,
    properties: {
      phases: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            dayStart: { type: "number" },
            dayEnd: { type: "number" },
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  dayStart: { type: "number" },
                  dayEnd: { type: "number" },
                  exactSteps: { type: "array", items: { type: "string" } },
                  beginnerTip: { type: "string" },
                  cost: { type: "number" },
                  successMetric: { type: "string" },
                },
                required: ["title", "dayStart", "dayEnd", "exactSteps", "beginnerTip", "cost", "successMetric"],
              },
            },
          },
          required: ["name", "dayStart", "dayEnd", "tasks"],
        },
      },
      weeklyMilestones: {
        type: "array",
        items: {
          type: "object",
          properties: {
            week: { type: "number" },
            milestone: { type: "string" },
            kpi: { type: "string" },
          },
          required: ["week", "milestone", "kpi"],
        },
      },
      day1Actions: { type: "array", items: { type: "string" } },
      goLiveTargetDay: { type: "number" },
    },
    required: ["phases", "weeklyMilestones", "day1Actions", "goLiveTargetDay"],
  },
};

export const ANALYZE_RISKS_TOOL: Anthropic.Tool = {
  name: "analyze_risks",
  description: "Submit risk register with beginner-adjusted severity scores",
  input_schema: {
    type: "object" as const,
    properties: {
      risks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            likelihood: { type: "number", description: "1-5 scale" },
            impact: { type: "number", description: "1-5 scale" },
            beginnerMultiplier: { type: "number", description: "1.0-2.5x" },
            adjustedSeverity: { type: "number" },
            earlyWarningSignals: { type: "array", items: { type: "string" } },
            mitigation: { type: "string" },
            contingency: { type: "string" },
            isBeginnerSpecific: { type: "boolean" },
          },
          required: ["title", "description", "likelihood", "impact", "beginnerMultiplier", "adjustedSeverity", "earlyWarningSignals", "mitigation", "contingency", "isBeginnerSpecific"],
        },
      },
      topBeginnerRisk: { type: "string" },
      unmitigatableRisks: { type: "array", items: { type: "string" } },
    },
    required: ["risks", "topBeginnerRisk", "unmitigatableRisks"],
  },
};

export const SCORE_PROBABILITY_TOOL: Anthropic.Tool = {
  name: "score_probability",
  description: "Submit success probability assessment with confidence interval",
  input_schema: {
    type: "object" as const,
    properties: {
      overallScore: { type: "number", description: "0-100" },
      confidenceInterval: {
        type: "array",
        items: { type: "number" },
        description: "[low, high] bounds",
      },
      dimensions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            label: { type: "string" },
            score: { type: "number", description: "0-20" },
            explanation: { type: "string" },
          },
          required: ["name", "label", "score", "explanation"],
        },
      },
      failureScenarios: {
        type: "array",
        items: {
          type: "object",
          properties: {
            scenario: { type: "string" },
            probability: { type: "number" },
            trigger: { type: "string" },
          },
          required: ["scenario", "probability", "trigger"],
        },
      },
      honestAssessment: { type: "string" },
    },
    required: ["overallScore", "confidenceInterval", "dimensions", "failureScenarios", "honestAssessment"],
  },
};

export const SYNTHESIZE_FINAL_TOOL: Anthropic.Tool = {
  name: "synthesize_final",
  description: "Submit final synthesis with consistency check and go/no-go recommendation",
  input_schema: {
    type: "object" as const,
    properties: {
      inconsistencies: {
        type: "array",
        items: { type: "string" },
        description: "Any inconsistencies found between pipeline stages",
      },
      reconciliations: {
        type: "array",
        items: { type: "string" },
        description: "How inconsistencies were reconciled",
      },
      goNoGo: { type: "string", enum: ["go", "conditional_go", "no_go"] },
      confidence: { type: "number", description: "0-100 confidence in recommendation" },
      finalNotes: { type: "string", description: "Final advisory notes for the seller" },
    },
    required: ["inconsistencies", "reconciliations", "goNoGo", "confidence", "finalNotes"],
  },
};

// ── Prompt Builders ──────────────────────────────────────────────

const BOUNDARY = "=====USER_DATA_BOUNDARY=====";

export function buildMarketSynthesisPrompt(context: {
  products: { title: string; category: string; price: number; rating: number; reviewCount: number; opportunityScore: number | null }[];
  suggestions: { title: string; viabilityScore: number; category: string }[];
  sellerConstraints: string;
}): string {
  return `Analyze the following product data and identify the top 3 opportunities for a beginner Amazon FBA seller.

${BOUNDARY}
SELLER CONSTRAINTS:
${context.sellerConstraints}

ANALYZED PRODUCTS (${context.products.length} total):
${context.products.map((p, i) => `${i + 1}. ${p.title} | ${p.category} | $${p.price} | ${p.rating}★ | ${p.reviewCount} reviews | Score: ${p.opportunityScore ?? "N/A"}`).join("\n")}

EXISTING SUGGESTIONS (${context.suggestions.length} total):
${context.suggestions.map((s, i) => `${i + 1}. ${s.title} | Viability: ${s.viabilityScore} | ${s.category}`).join("\n")}
${BOUNDARY}

Based on this data, identify the top 3 product opportunities that best fit a beginner seller with $2,000-$5,000 capital. Rank by beginner suitability, not just opportunity score.`;
}

export function buildProductDefinitionPrompt(
  topOpportunity: { productName: string; category: string; whyTop: string },
  relatedData: string
): string {
  return `Define the exact product specification for the following opportunity.

${BOUNDARY}
SELECTED OPPORTUNITY:
Product: ${topOpportunity.productName}
Category: ${topOpportunity.category}
Rationale: ${topOpportunity.whyTop}

SUPPORTING DATA:
${relatedData}
${BOUNDARY}

Define the complete product with win condition assessment, alternatives considered, beginner advantages, and must-have features. Every feature must be traced to evidence.`;
}

export function buildFinancialModelPrompt(
  verdict: { productName: string; targetPrice: number; estimatedUnitCost: number; minimumOrderQuantity: number },
  availableCapital: number
): string {
  return `Build a conservative financial model for the following product.

${BOUNDARY}
PRODUCT: ${verdict.productName}
Target Price: $${verdict.targetPrice}
Estimated Unit Cost: $${verdict.estimatedUnitCost}
MOQ: ${verdict.minimumOrderQuantity} units
Available Capital: $${availableCapital}
${BOUNDARY}

Calculate unit economics, launch budget (with 15-20% contingency), break-even point, and 12-month ROI. Be conservative — overestimate costs, underestimate revenue.`;
}

export function buildNinetyDayPlannerPrompt(
  verdict: { productName: string; category: string },
  financialSummary: string
): string {
  return `Create a 90-day launch playbook for a solo beginner seller.

${BOUNDARY}
PRODUCT: ${verdict.productName}
CATEGORY: ${verdict.category}
FINANCIAL CONTEXT:
${financialSummary}
${BOUNDARY}

Build 4 phases covering Research & Source, Sample & Validate, List & Launch, Optimize & Scale. Every task must have exact steps, beginner tips, costs, and success metrics. Include weekly milestones and Day 1 actions.`;
}

export function buildRiskAnalyzerPrompt(
  verdict: { productName: string },
  financialSummary: string,
  playbookSummary: string
): string {
  return `Analyze all risks for a beginner seller launching this product.

${BOUNDARY}
PRODUCT: ${verdict.productName}
FINANCIAL CONTEXT:
${financialSummary}
PLAYBOOK CONTEXT:
${playbookSummary}
${BOUNDARY}

Identify 8-12 risks. For each: score likelihood (1-5) and impact (1-5), apply beginner multiplier (1.0-2.5x), list early warning signals, and provide actionable mitigation. Flag the top beginner-specific risk and any truly unmitigatable risks.`;
}

export function buildConfidenceScorerPrompt(allStageOutputs: string): string {
  return `Score the overall success probability for this product launch.

${BOUNDARY}
COMPLETE ANALYSIS:
${allStageOutputs}
${BOUNDARY}

Score 5 dimensions (marketDemand, competitivePosition, executionFeasibility, financialViability, timingAlignment) each 0-20 points. Provide confidence interval, failure scenarios with probabilities, and an honest assessment that doesn't shy away from uncomfortable truths.`;
}

export function buildFinalSynthesisPrompt(completeReport: string): string {
  return `Review this complete intelligence report for internal consistency.

${BOUNDARY}
FULL REPORT:
${completeReport}
${BOUNDARY}

Check for inconsistencies between stages. Verify financial math. Confirm playbook fits budget. Ensure risk mitigations appear in the playbook. Provide a go/no-go/conditional-go recommendation with confidence level.`;
}
