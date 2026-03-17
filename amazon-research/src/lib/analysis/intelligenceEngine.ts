import type { Anthropic } from "./claudeClient";
import type {
  IntelligenceReport,
  IntelligenceSSEEvent,
  ReportInputContext,
  SellerProfile,
  ProductVerdict,
  BeginnerFitAssessment,
  FinancialModel,
  FinancialScenario,
  NinetyDayPlaybook,
  RiskRegister,
  SuccessProbability,
  DisqualifiedProduct,
  TokenUsage,
  PipelineStage,
} from "@/lib/types/intelligence";
import { client, INTELLIGENCE_MODEL, withRetry, isLLMConfigured } from "./claudeClient";
import {
  MARKET_SYNTHESIS_PROMPT,
  PRODUCT_DEFINITION_PROMPT,
  FINANCIAL_MODEL_PROMPT,
  NINETY_DAY_PLANNER_PROMPT,
  RISK_ANALYZER_PROMPT,
  CONFIDENCE_SCORER_PROMPT,
  FINAL_SYNTHESIS_PROMPT,
  SYNTHESIZE_MARKET_TOOL,
  DEFINE_PRODUCT_TOOL,
  MODEL_FINANCIALS_TOOL,
  BUILD_PLAYBOOK_TOOL,
  ANALYZE_RISKS_TOOL,
  SCORE_PROBABILITY_TOOL,
  SYNTHESIZE_FINAL_TOOL,
  buildMarketSynthesisPrompt,
  buildProductDefinitionPrompt,
  buildFinancialModelPrompt,
  buildNinetyDayPlannerPrompt,
  buildRiskAnalyzerPrompt,
  buildConfidenceScorerPrompt,
  buildFinalSynthesisPrompt,
} from "@/constants/intelligencePrompts";
import { getMockSuggestions } from "@/lib/mock-suggestions";
import { MOCK_PRODUCTS } from "@/lib/mock-data";
import { getMockIntelligenceReport } from "@/lib/mock-intelligence";
import { getMockLiveDataForProduct } from "@/lib/mock-spapi";
import { spapiCache } from "@/lib/spapi/cache";
import type { LiveDataEnvelope, SPAPIPricing, SPAPIBSRData, SPAPIReviewData } from "@/lib/types/spapi";

// ── Seller Profile (Single Source of Truth) ──────────────────────

export const SELLER_PROFILE: SellerProfile = {
  experienceLevel: "beginner",
  availableCapital: { min: 2000, max: 5000 },
  priorities: [
    "Low complexity — no electronics, certifications, or regulated categories",
    "Fast time-to-market — under 90 days from decision to first sale",
    "Sustainable margins — minimum 35% net margin at scale",
    "Defensible position — brand-registrable with differentiation moat",
  ],
  hardDisqualifiers: [
    "Requires FDA/FCC/UL certification",
    "MOQ exceeds $3,000 for first order",
    "Existing top seller has 10,000+ reviews and no product weaknesses",
    "Category average return rate exceeds 8%",
    "Requires specialized storage (cold chain, hazmat, oversized)",
    "Seasonal product with <4 months of viable selling window",
    "Commodity product with <20% margin at current market price",
    "Requires ongoing subscription/consumable model to be profitable",
  ],
};

// ── Pipeline Stage Metadata ──────────────────────────────────────

const STAGE_META: { stage: PipelineStage; label: string }[] = [
  { stage: "context_aggregation", label: "Aggregating product data and market context" },
  { stage: "beginner_filter", label: "Applying beginner seller filters" },
  { stage: "market_synthesis", label: "Synthesizing market opportunities" },
  { stage: "product_definition", label: "Defining optimal product specification" },
  { stage: "financial_viability_check", label: "Modeling financial viability" },
  { stage: "ninety_day_feasibility_check", label: "Building 90-day launch playbook" },
  { stage: "risk_analysis", label: "Analyzing risks with beginner multipliers" },
  { stage: "confidence_scoring", label: "Scoring success probability" },
  { stage: "final_synthesis", label: "Running final consistency check" },
];

// ── Claude Call Helper ───────────────────────────────────────────

async function callSonnet<T>(
  systemPrompt: string,
  userMessage: string,
  tool: Anthropic.Tool,
  tokenUsage: TokenUsage,
  stageName: string,
): Promise<T> {
  const response = await withRetry(() =>
    client.messages.create({
      model: INTELLIGENCE_MODEL,
      max_tokens: 8192,
      system: systemPrompt,
      tools: [tool],
      tool_choice: { type: "tool" as const, name: tool.name },
      messages: [{ role: "user", content: userMessage }],
    })
  );

  const toolBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );

  if (!toolBlock || toolBlock.name !== tool.name) {
    throw new Error(`Claude did not call ${tool.name} tool`);
  }

  // Track token usage
  tokenUsage.totalInputTokens += response.usage.input_tokens;
  tokenUsage.totalOutputTokens += response.usage.output_tokens;
  tokenUsage.byStage[stageName] = {
    input: response.usage.input_tokens,
    output: response.usage.output_tokens,
  };

  return toolBlock.input as unknown as T;
}

// ── Projection Computation (Pure TS) ─────────────────────────────

function computeProjections(
  sellingPrice: number,
  totalVariableCost: number,
  launchBudgetTotal: number,
): FinancialScenario[] {
  const ramps = {
    Conservative: { weight: 0.25, units: [30, 30, 45, 60, 75, 90, 100, 110, 120, 130, 140, 150, 150, 155, 160, 160, 165, 170] },
    Base: { weight: 0.50, units: [50, 70, 100, 150, 180, 200, 230, 260, 280, 300, 300, 310, 320, 330, 340, 350, 360, 370] },
    Optimistic: { weight: 0.25, units: [80, 120, 180, 250, 320, 380, 420, 450, 480, 500, 500, 520, 540, 560, 580, 600, 620, 640] },
  } as const;

  const ppcSchedule = [600, 500, 400, 350, 300, 250, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200];

  return (Object.entries(ramps) as [FinancialScenario["label"], typeof ramps[keyof typeof ramps]][]).map(
    ([label, config]) => {
      const monthlyRevenue: number[] = [];
      const monthlyNetProfit: number[] = [];
      const cumulativeProfit: number[] = [];
      let cumulative = -launchBudgetTotal;

      for (let i = 0; i < 18; i++) {
        const units = config.units[i];
        const rev = +(units * sellingPrice).toFixed(2);
        const costs = +(units * totalVariableCost).toFixed(2);
        const ppc = ppcSchedule[i];
        const profit = +(rev - costs - ppc).toFixed(2);
        cumulative = +(cumulative + profit).toFixed(2);
        monthlyRevenue.push(rev);
        monthlyNetProfit.push(profit);
        cumulativeProfit.push(cumulative);
      }

      return {
        label,
        probabilityWeight: config.weight,
        monthlyUnitSales: [...config.units],
        monthlyRevenue,
        monthlyNetProfit,
        cumulativeProfit,
      };
    }
  );
}

// ── Main Pipeline ────────────────────────────────────────────────

export async function runIntelligencePipeline(
  input: ReportInputContext,
  onProgress: (event: IntelligenceSSEEvent) => void,
): Promise<IntelligenceReport> {
  // Mock path — no API key available
  if (!isLLMConfigured) {
    return runMockPipeline(input, onProgress);
  }

  const reportId = crypto.randomUUID();
  const tokenUsage: TokenUsage = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    byStage: {},
  };

  const emitStage = (index: number, status: "running" | "complete" | "error", message?: string) => {
    onProgress({
      type: "stage",
      stage: STAGE_META[index].stage,
      index,
      status,
      message: message ?? STAGE_META[index].label,
    });
  };

  // Stage 1: Context Aggregation (pure TS) — enriched with live data when available
  emitStage(0, "running");
  const spApiEnabled = process.env.AMAZON_SP_API_ENABLED === "true";
  const products = MOCK_PRODUCTS.map((p) => {
    let livePrice: number | undefined;
    let liveBSR: number | null | undefined;
    let liveReviewCount: number | undefined;
    let liveRating: number | undefined;
    let dataSource: "live" | "mock" | "cached" = "mock";

    if (spApiEnabled) {
      // Pull from SP-API cache
      const pricing = spapiCache.get<LiveDataEnvelope<SPAPIPricing>>(`pricing:${p.asin}`);
      const bsr = spapiCache.get<LiveDataEnvelope<SPAPIBSRData>>(`bsr:${p.asin}`);
      const reviews = spapiCache.get<LiveDataEnvelope<SPAPIReviewData>>(`reviews:${p.asin}`);
      livePrice = pricing?.data.buyBoxPrice ?? undefined;
      liveBSR = bsr?.data.bsr ?? undefined;
      liveReviewCount = reviews?.data.reviewCount ?? undefined;
      liveRating = reviews?.data.rating ?? undefined;
      dataSource = pricing?.source ?? bsr?.source ?? "cached";
    } else {
      // Use mock live data overlay
      const mock = getMockLiveDataForProduct(p.asin);
      livePrice = mock.livePrice;
      liveBSR = mock.liveBSR;
      liveReviewCount = mock.liveReviewCount;
      liveRating = mock.liveRating;
    }

    return {
      title: p.title,
      category: p.category,
      price: livePrice ?? p.price,
      rating: liveRating ?? p.rating,
      reviewCount: liveReviewCount ?? p.reviewCount,
      bsr: (liveBSR ?? p.bsr) as number,
      opportunityScore: p.opportunityScore,
      dataSource,
    };
  });
  const suggestions = getMockSuggestions().map((s) => ({
    title: s.title,
    viabilityScore: s.viabilityScore,
    category: s.category,
  }));
  emitStage(0, "complete", `Aggregated ${products.length} products (${spApiEnabled ? "live" : "mock"} data)`);

  // Stage 2: Beginner Filter (pure TS) — uses live pricing/reviews when available
  emitStage(1, "running");
  const disqualified: DisqualifiedProduct[] = [];
  const qualified = products.filter((p) => {
    if (p.reviewCount > 10000) {
      disqualified.push({
        productName: p.title,
        rejectionReason: `Top seller has ${p.reviewCount.toLocaleString()} reviews (${p.dataSource} data) — social proof barrier too high`,
        failedFilter: "review_barrier",
        wouldWorkIf: "Targeted a sub-niche with fewer established sellers",
      });
      return false;
    }
    if (p.price > 75) {
      disqualified.push({
        productName: p.title,
        rejectionReason: `Price $${p.price} (${p.dataSource}) exceeds beginner impulse-buy ceiling`,
        failedFilter: "price_ceiling",
        wouldWorkIf: "Sold a smaller/simpler variant in the $25-$50 range",
      });
      return false;
    }
    if (p.bsr > 50000) {
      disqualified.push({
        productName: p.title,
        rejectionReason: `BSR #${p.bsr.toLocaleString()} (${p.dataSource}) indicates insufficient demand`,
        failedFilter: "low_demand",
        wouldWorkIf: "Identified a seasonal peak or emerging trend in this niche",
      });
      return false;
    }
    return true;
  });
  emitStage(1, "complete", `${qualified.length} qualified, ${disqualified.length} filtered out`);

  // Stage 3: Market Synthesis (Sonnet) — powered by live data when available
  emitStage(2, "running");
  // Sort by opportunity: low reviews + low BSR = highest opportunity
  const sortedQualified = [...qualified].sort((a, b) => {
    const scoreA = (a.opportunityScore ?? 0) + (a.reviewCount < 500 ? 20 : 0) + (a.bsr < 5000 ? 15 : 0);
    const scoreB = (b.opportunityScore ?? 0) + (b.reviewCount < 500 ? 20 : 0) + (b.bsr < 5000 ? 15 : 0);
    return scoreB - scoreA;
  });
  const marketPrompt = buildMarketSynthesisPrompt({
    products: sortedQualified.slice(0, 100),
    suggestions,
    sellerConstraints: SELLER_PROFILE.hardDisqualifiers.join("\n"),
  });
  const marketResult = await callSonnet<{
    topOpportunities: { productName: string; category: string; whyTop: string; estimatedMonthlySearches: number; competitionLevel: string; estimatedMargin: number }[];
    marketOverview: string;
  }>(MARKET_SYNTHESIS_PROMPT, marketPrompt, SYNTHESIZE_MARKET_TOOL, tokenUsage, "market_synthesis");
  emitStage(2, "complete");

  // Stage 4: Product Definition (Sonnet)
  emitStage(3, "running");
  const topOpp = marketResult.topOpportunities[0];
  const relatedProducts = qualified
    .filter((p) => p.category === topOpp.category)
    .slice(0, 10)
    .map((p) => `${p.title} | $${p.price} | ${p.rating}★ | ${p.reviewCount} reviews`)
    .join("\n");
  const productPrompt = buildProductDefinitionPrompt(topOpp, relatedProducts);
  const productResult = await callSonnet<{
    productName: string;
    targetPrice: number;
    estimatedUnitCost: number;
    minimumOrderQuantity: number;
    category: string;
    investmentThesis: string;
    winConditions: { name: string; met: boolean; score: number; evidence: string; caveat: string }[];
    alternatives: { productName: string; reason: string; whyNotChosen: string }[];
    beginnerAdvantages: string[];
    mustHaveFeatures: string[];
  }>(PRODUCT_DEFINITION_PROMPT, productPrompt, DEFINE_PRODUCT_TOOL, tokenUsage, "product_definition");

  const verdict: ProductVerdict = {
    productName: productResult.productName,
    targetPrice: productResult.targetPrice,
    estimatedUnitCost: productResult.estimatedUnitCost,
    minimumOrderQuantity: productResult.minimumOrderQuantity,
    category: productResult.category,
    investmentThesis: productResult.investmentThesis,
    winConditionAssessment: productResult.winConditions,
    totalWinScore: productResult.winConditions.reduce((s, w) => s + w.score, 0),
    alternativesConsidered: productResult.alternatives,
    beginnerAdvantages: productResult.beginnerAdvantages,
    mustHaveFeatures: productResult.mustHaveFeatures,
  };
  emitStage(3, "complete");

  // Stage 5: Financial Viability (Sonnet + pure TS)
  emitStage(4, "running");
  const financialPrompt = buildFinancialModelPrompt(
    { productName: verdict.productName, targetPrice: verdict.targetPrice, estimatedUnitCost: verdict.estimatedUnitCost, minimumOrderQuantity: verdict.minimumOrderQuantity },
    input.availableCapital,
  );
  const finResult = await callSonnet<{
    unitEconomics: { unitManufacturingCost: number; shippingPerUnit: number; amazonFees: number; totalVariableCost: number; sellingPrice: number; profitPerUnit: number; marginPercent: number };
    launchBudget: { items: { label: string; amount: number }[]; subtotal: number; contingency: number; total: number };
    breakEvenUnits: number;
    breakEvenMonths: number;
    roi12Month: number;
  }>(FINANCIAL_MODEL_PROMPT, financialPrompt, MODEL_FINANCIALS_TOOL, tokenUsage, "financial_viability_check");

  const scenarios = computeProjections(
    finResult.unitEconomics.sellingPrice,
    finResult.unitEconomics.totalVariableCost,
    finResult.launchBudget.total,
  );

  const financialModel: FinancialModel = {
    unitEconomics: finResult.unitEconomics,
    launchBudget: finResult.launchBudget,
    scenarios,
    breakEvenUnits: finResult.breakEvenUnits,
    breakEvenMonths: finResult.breakEvenMonths,
    roi12Month: finResult.roi12Month,
    monthsToSixFigureRevenue: scenarios[1].monthlyRevenue.findIndex((r) => r >= 8333) + 1 || null,
  };
  emitStage(4, "complete");

  // Stage 6: 90-Day Feasibility (Sonnet)
  emitStage(5, "running");
  const financialSummary = `Unit cost: $${financialModel.unitEconomics.totalVariableCost} | Price: $${financialModel.unitEconomics.sellingPrice} | Margin: ${financialModel.unitEconomics.marginPercent}% | Budget: $${financialModel.launchBudget.total}`;
  const playbookPrompt = buildNinetyDayPlannerPrompt(
    { productName: verdict.productName, category: verdict.category },
    financialSummary,
  );
  const playbookResult = await callSonnet<{
    phases: NinetyDayPlaybook["phases"];
    weeklyMilestones: NinetyDayPlaybook["weeklyMilestones"];
    day1Actions: string[];
    goLiveTargetDay: number;
  }>(NINETY_DAY_PLANNER_PROMPT, playbookPrompt, BUILD_PLAYBOOK_TOOL, tokenUsage, "ninety_day_feasibility_check");

  const playbook: NinetyDayPlaybook = playbookResult;
  emitStage(5, "complete");

  // Stage 7: Risk Analysis (Sonnet)
  emitStage(6, "running");
  const playbookSummary = playbook.phases.map((p) => `${p.name} (Days ${p.dayStart}-${p.dayEnd}): ${p.tasks.length} tasks`).join("\n");
  const riskPrompt = buildRiskAnalyzerPrompt(
    { productName: verdict.productName },
    financialSummary,
    playbookSummary,
  );
  const riskResult = await callSonnet<RiskRegister>(
    RISK_ANALYZER_PROMPT, riskPrompt, ANALYZE_RISKS_TOOL, tokenUsage, "risk_analysis",
  );
  emitStage(6, "complete");

  // Stage 8: Confidence Scoring (Sonnet)
  emitStage(7, "running");
  const allStages = `Product: ${verdict.productName}\nWin Score: ${verdict.totalWinScore}/100\nMargin: ${financialModel.unitEconomics.marginPercent}%\nBudget: $${financialModel.launchBudget.total}\nGo-Live Day: ${playbook.goLiveTargetDay}\nTop Risk: ${riskResult.topBeginnerRisk}`;
  const probPrompt = buildConfidenceScorerPrompt(allStages);
  const probResult = await callSonnet<{
    overallScore: number;
    confidenceInterval: [number, number];
    dimensions: SuccessProbability["dimensions"];
    failureScenarios: SuccessProbability["failureScenarios"];
    honestAssessment: string;
  }>(CONFIDENCE_SCORER_PROMPT, probPrompt, SCORE_PROBABILITY_TOOL, tokenUsage, "confidence_scoring");

  const successProbability: SuccessProbability = probResult;
  emitStage(7, "complete");

  // Stage 9: Final Synthesis (Sonnet)
  emitStage(8, "running");
  const fullReport = `Verdict: ${verdict.productName} at $${verdict.targetPrice}\nWin Score: ${verdict.totalWinScore}\nMargin: ${financialModel.unitEconomics.marginPercent}%\nBudget: $${financialModel.launchBudget.total} (available: $${input.availableCapital})\nBreak-even: Month ${financialModel.breakEvenMonths}\nGo-Live: Day ${playbook.goLiveTargetDay}\nSuccess Probability: ${successProbability.overallScore}% [${successProbability.confidenceInterval[0]}-${successProbability.confidenceInterval[1]}]\nTop Risk: ${riskResult.topBeginnerRisk}\nRisks: ${riskResult.risks.length} identified`;
  const synthesisPrompt = buildFinalSynthesisPrompt(fullReport);
  await callSonnet<{
    inconsistencies: string[];
    reconciliations: string[];
    goNoGo: string;
    confidence: number;
    finalNotes: string;
  }>(FINAL_SYNTHESIS_PROMPT, synthesisPrompt, SYNTHESIZE_FINAL_TOOL, tokenUsage, "final_synthesis");
  emitStage(8, "complete");

  // Assemble final report
  const report: IntelligenceReport = {
    id: reportId,
    status: "complete",
    sellerProfile: SELLER_PROFILE,
    inputContext: input,
    verdict,
    beginnerFitAssessment: {
      totalScore: verdict.totalWinScore,
      dimensions: [
        { name: "capitalAdequacy", label: "Capital Adequacy", score: Math.min(20, Math.round((input.availableCapital / financialModel.launchBudget.total) * 16)), explanation: `Launch cost $${financialModel.launchBudget.total} vs available $${input.availableCapital}` },
        { name: "skillAlignment", label: "Skill Alignment", score: 14, explanation: "Standard FBA product — no specialized skills required" },
        { name: "timeCommitment", label: "Time Commitment", score: 17, explanation: "15-20 hrs/week during launch, 5-10 hrs/week ongoing" },
        { name: "riskTolerance", label: "Risk Tolerance", score: 15, explanation: `Maximum loss: $${financialModel.launchBudget.total}. Product has liquidation value.` },
        { name: "operationalComplexity", label: "Operational Complexity", score: 16, explanation: "Single SKU, FBA fulfillment, no bundling complexity" },
      ],
      warnings: [
        { severity: "critical", message: "Account suspension risk: New accounts face heightened scrutiny in first 90 days." },
        { severity: "important", message: "PPC learning curve: Expect ACOS of 40-60% in Month 1-2." },
        { severity: "fyi", message: "Seasonal Q4 surge: Plan inventory 90 days ahead for Oct-Dec volume." },
      ],
      requiredLearning: [
        { topic: "Amazon Seller Central", timeEstimate: "4-6 hours", resource: "Amazon Seller University" },
        { topic: "Product Photography", timeEstimate: "3-4 hours", resource: "YouTube tutorials" },
        { topic: "PPC Campaign Management", timeEstimate: "6-8 hours", resource: "Jungle Scout PPC Academy" },
        { topic: "Supplier Communication", timeEstimate: "2-3 hours", resource: "Alibaba Vetting Checklist" },
      ],
    },
    financialModel,
    ninetyDayPlaybook: playbook,
    riskRegister: riskResult,
    successProbability,
    disqualifiedProducts: disqualified,
    tokenUsage,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };

  return report;
}

// ── Mock Pipeline ────────────────────────────────────────────────

async function runMockPipeline(
  input: ReportInputContext,
  onProgress: (event: IntelligenceSSEEvent) => void,
): Promise<IntelligenceReport> {
  const reportId = crypto.randomUUID();
  const spApiEnabled = process.env.AMAZON_SP_API_ENABLED === "true";

  for (let i = 0; i < STAGE_META.length; i++) {
    const stageMessage = i === 0
      ? `${STAGE_META[i].label} (${MOCK_PRODUCTS.length} products, ${spApiEnabled ? "live" : "mock"} data)`
      : STAGE_META[i].label;

    onProgress({
      type: "stage",
      stage: STAGE_META[i].stage,
      index: i,
      status: "running",
      message: stageMessage,
    });

    // Simulate processing time — slightly longer for live data enrichment
    const delay = i < 2 ? (spApiEnabled ? 100 : 50) : 200;
    await new Promise((r) => setTimeout(r, delay));

    onProgress({
      type: "stage",
      stage: STAGE_META[i].stage,
      index: i,
      status: "complete",
      message: stageMessage,
    });
  }

  const report = getMockIntelligenceReport(reportId);
  report.inputContext = input;
  return report;
}
