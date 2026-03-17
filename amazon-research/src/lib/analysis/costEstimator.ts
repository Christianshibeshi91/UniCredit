import { client, MODEL, withRetry, circuitBreaker } from "./claudeClient";
import type { Anthropic } from "./claudeClient";
import type {
  CostEstimate,
  MonthlyProjection,
  ProductSuggestion,
  SourcingCosts,
  ShippingCosts,
  AmazonFees,
  LaunchBudget,
} from "@/lib/types";
import {
  COST_SYSTEM_PROMPT,
  SUBMIT_COST_ESTIMATE_TOOL,
  buildCostEstimatePrompt,
} from "@/constants/suggestionPrompts";

// ── Projection Computation (deterministic, no LLM) ───────────────

function computeProjections(
  unitCost: number,
  shippingPerUnit: number,
  amazonFeesPerUnit: number,
  targetPrice: number,
  totalStartupCapital: number
): MonthlyProjection[] {
  const totalCostPerUnit = unitCost + shippingPerUnit + amazonFeesPerUnit;
  const profitPerUnit = targetPrice - totalCostPerUnit;
  const projections: MonthlyProjection[] = [];
  let cumProfit = -totalStartupCapital;

  for (let month = 1; month <= 12; month++) {
    // Conservative sales ramp: 50 units/mo months 1-3, 150 months 4-6, 300 months 7-12
    const unitsSold = month <= 3 ? 50 : month <= 6 ? 150 : 300;
    const revenue = +(unitsSold * targetPrice).toFixed(2);
    const totalCosts = +(unitsSold * totalCostPerUnit).toFixed(2);
    const profit = +(unitsSold * profitPerUnit).toFixed(2);
    cumProfit = +(cumProfit + profit).toFixed(2);
    projections.push({
      month,
      unitsSold,
      revenue,
      totalCosts,
      profit,
      cumulativeProfit: cumProfit,
    });
  }
  return projections;
}

// ── Raw Tool Output Shape ─────────────────────────────────────────

interface RawCostEstimate {
  sourcingCosts: SourcingCosts;
  shippingCosts: ShippingCosts;
  amazonFees: AmazonFees;
  launchBudget: LaunchBudget;
  assumptions?: string[];
}

// ── Main Entry Point ──────────────────────────────────────────────

export async function estimateStartupCost(
  suggestion: ProductSuggestion
): Promise<CostEstimate> {
  circuitBreaker.check();

  const userMessage = buildCostEstimatePrompt(suggestion);

  const response = await withRetry(() =>
    client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: COST_SYSTEM_PROMPT,
      tools: [SUBMIT_COST_ESTIMATE_TOOL],
      tool_choice: { type: "tool", name: "submit_cost_estimate" },
      messages: [{ role: "user", content: userMessage }],
    })
  );

  const toolBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );

  if (!toolBlock || toolBlock.name !== "submit_cost_estimate") {
    throw new Error("Claude did not call submit_cost_estimate tool");
  }

  const raw = toolBlock.input as RawCostEstimate;

  // Build cost structures from Claude's unit economics
  const sourcingCosts: SourcingCosts = { ...raw.sourcingCosts };
  const shippingCosts: ShippingCosts = { ...raw.shippingCosts };
  const amazonFees: AmazonFees = { ...raw.amazonFees };
  const launchBudget: LaunchBudget = { ...raw.launchBudget };

  const baseCapital =
    sourcingCosts.moqTotalCost +
    shippingCosts.totalPerUnit * sourcingCosts.moqUnits +
    launchBudget.totalOneTime;
  const contingencyBuffer = +(baseCapital * 0.15).toFixed(2);
  const totalStartupCapital = +(baseCapital + contingencyBuffer).toFixed(2);

  const netProfitPerUnit =
    suggestion.targetPrice -
    sourcingCosts.unitCost -
    shippingCosts.totalPerUnit -
    amazonFees.totalPerUnit;
  const estimatedNetMargin = +(netProfitPerUnit / suggestion.targetPrice).toFixed(2);
  const breakEvenUnits = Math.ceil(totalStartupCapital / netProfitPerUnit);

  const monthlyProjections = computeProjections(
    sourcingCosts.unitCost,
    shippingCosts.totalPerUnit,
    amazonFees.totalPerUnit,
    suggestion.targetPrice,
    totalStartupCapital
  );

  // Find break-even month (first month where cumulative profit >= 0)
  const breakEvenMonthIdx = monthlyProjections.findIndex(
    (p) => p.cumulativeProfit >= 0
  );
  const breakEvenMonths = breakEvenMonthIdx >= 0 ? breakEvenMonthIdx + 1 : 12;

  // 12-month ROI: (final cumulative profit + capital) / capital
  const finalCumProfit = monthlyProjections[11].cumulativeProfit;
  const roi12Month = +(
    (finalCumProfit + totalStartupCapital) /
    totalStartupCapital
  ).toFixed(2);

  return {
    id: `ce-${Date.now()}`,
    suggestionId: suggestion.id,
    sourcingCosts,
    shippingCosts,
    amazonFees,
    launchBudget,
    contingencyBuffer,
    totalStartupCapital,
    targetSalePrice: suggestion.targetPrice,
    estimatedNetMargin,
    breakEvenUnits,
    breakEvenMonths,
    roi12Month,
    monthlyProjections,
    assumptions: raw.assumptions ?? [
      "Conservative sales ramp: 50 -> 150 -> 300 units/month",
      "Sea freight shipping (not air)",
      "Standard FBA fees (non-oversized)",
      "15% contingency buffer included",
    ],
    claudeModel: MODEL,
    createdAt: new Date().toISOString(),
  };
}
