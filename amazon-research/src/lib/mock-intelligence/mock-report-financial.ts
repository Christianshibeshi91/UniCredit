import type { FinancialModel, FinancialScenario, UnitEconomics, LaunchBudgetIntelligence } from "@/lib/types/intelligence";

const SELLING_PRICE = 22.99;

export const MOCK_UNIT_ECONOMICS: UnitEconomics = {
  unitManufacturingCost: 3.45,
  shippingPerUnit: 1.12,
  amazonFees: 6.24,
  totalVariableCost: 10.81,
  sellingPrice: SELLING_PRICE,
  profitPerUnit: 12.18,
  marginPercent: 53.0,
};

export const MOCK_LAUNCH_BUDGET: LaunchBudgetIntelligence = {
  items: [
    { label: "Initial Inventory (300 units x $3.45)", amount: 1035 },
    { label: "Supplier Samples (3 suppliers x $60)", amount: 180 },
    { label: "Product Photography (7 images)", amount: 800 },
    { label: "Brand Registry & Logo Design", amount: 600 },
    { label: "PPC Launch Budget (Month 1)", amount: 600 },
    { label: "A+ Content & Storefront", amount: 300 },
    { label: "UPC/EAN Barcodes", amount: 30 },
  ],
  subtotal: 3545,
  contingency: 797,
  total: 4342,
};

function generateScenarioProjections(
  unitRamp: number[],
  ppcMonthly: number[],
): { revenue: number[]; netProfit: number[]; cumulative: number[] } {
  const revenue: number[] = [];
  const netProfit: number[] = [];
  const cumulative: number[] = [];
  let cum = -MOCK_LAUNCH_BUDGET.total;

  for (let i = 0; i < 18; i++) {
    const units = unitRamp[Math.min(i, unitRamp.length - 1)];
    const rev = +(units * SELLING_PRICE).toFixed(2);
    const variableCost = +(units * MOCK_UNIT_ECONOMICS.totalVariableCost).toFixed(2);
    const ppc = ppcMonthly[Math.min(i, ppcMonthly.length - 1)];
    const profit = +(rev - variableCost - ppc).toFixed(2);
    cum = +(cum + profit).toFixed(2);
    revenue.push(rev);
    netProfit.push(profit);
    cumulative.push(cum);
  }

  return { revenue, netProfit, cumulative };
}

// Conservative: slow ramp
const conservativeRamp = [30, 30, 45, 60, 75, 90, 100, 110, 120, 130, 140, 150, 150, 155, 160, 160, 165, 170];
const conservativePPC = [600, 500, 450, 400, 350, 300, 250, 250, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200];
const conservativeData = generateScenarioProjections(conservativeRamp, conservativePPC);

const CONSERVATIVE_SCENARIO: FinancialScenario = {
  label: "Conservative",
  probabilityWeight: 0.25,
  monthlyUnitSales: conservativeRamp,
  monthlyRevenue: conservativeData.revenue,
  monthlyNetProfit: conservativeData.netProfit,
  cumulativeProfit: conservativeData.cumulative,
};

// Base: moderate ramp
const baseRamp = [50, 70, 100, 150, 180, 200, 230, 260, 280, 300, 300, 310, 320, 330, 340, 350, 360, 370];
const basePPC = [600, 500, 400, 350, 300, 250, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200];
const baseData = generateScenarioProjections(baseRamp, basePPC);

const BASE_SCENARIO: FinancialScenario = {
  label: "Base",
  probabilityWeight: 0.50,
  monthlyUnitSales: baseRamp,
  monthlyRevenue: baseData.revenue,
  monthlyNetProfit: baseData.netProfit,
  cumulativeProfit: baseData.cumulative,
};

// Optimistic: aggressive ramp
const optimisticRamp = [80, 120, 180, 250, 320, 380, 420, 450, 480, 500, 500, 520, 540, 560, 580, 600, 620, 640];
const optimisticPPC = [600, 500, 400, 300, 250, 200, 200, 200, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150];
const optimisticData = generateScenarioProjections(optimisticRamp, optimisticPPC);

const OPTIMISTIC_SCENARIO: FinancialScenario = {
  label: "Optimistic",
  probabilityWeight: 0.25,
  monthlyUnitSales: optimisticRamp,
  monthlyRevenue: optimisticData.revenue,
  monthlyNetProfit: optimisticData.netProfit,
  cumulativeProfit: optimisticData.cumulative,
};

export const MOCK_FINANCIAL_MODEL: FinancialModel = {
  unitEconomics: MOCK_UNIT_ECONOMICS,
  launchBudget: MOCK_LAUNCH_BUDGET,
  scenarios: [CONSERVATIVE_SCENARIO, BASE_SCENARIO, OPTIMISTIC_SCENARIO],
  breakEvenUnits: 357,
  breakEvenMonths: 5,
  roi12Month: 142,
  monthsToSixFigureRevenue: 14,
};
