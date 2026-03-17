import type { IntelligenceReport, SellerProfile, ReportInputContext, TokenUsage } from "@/lib/types/intelligence";
import { MOCK_VERDICT, MOCK_BEGINNER_FIT, MOCK_DISQUALIFIED } from "./mock-report-core";
import { MOCK_FINANCIAL_MODEL } from "./mock-report-financial";
import { MOCK_PLAYBOOK, MOCK_RISK_REGISTER, MOCK_SUCCESS_PROBABILITY } from "./mock-report-operational";

export { MOCK_VERDICT, MOCK_BEGINNER_FIT, MOCK_DISQUALIFIED } from "./mock-report-core";
export { MOCK_FINANCIAL_MODEL, MOCK_UNIT_ECONOMICS, MOCK_LAUNCH_BUDGET } from "./mock-report-financial";
export { MOCK_PLAYBOOK, MOCK_RISK_REGISTER, MOCK_SUCCESS_PROBABILITY } from "./mock-report-operational";

const MOCK_SELLER_PROFILE: SellerProfile = {
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

const MOCK_TOKEN_USAGE: TokenUsage = {
  totalInputTokens: 24500,
  totalOutputTokens: 18200,
  byStage: {
    market_synthesis: { input: 4200, output: 3100 },
    product_definition: { input: 3800, output: 2900 },
    financial_viability_check: { input: 3600, output: 2800 },
    ninety_day_feasibility_check: { input: 4100, output: 3200 },
    risk_analysis: { input: 3500, output: 2600 },
    confidence_scoring: { input: 2800, output: 1800 },
    final_synthesis: { input: 2500, output: 1800 },
  },
};

export function getMockIntelligenceReport(reportId?: string): IntelligenceReport {
  return {
    id: reportId ?? "mock-1",
    status: "complete",
    sellerProfile: MOCK_SELLER_PROFILE,
    inputContext: { availableCapital: 3500 },
    verdict: MOCK_VERDICT,
    beginnerFitAssessment: MOCK_BEGINNER_FIT,
    financialModel: MOCK_FINANCIAL_MODEL,
    ninetyDayPlaybook: MOCK_PLAYBOOK,
    riskRegister: MOCK_RISK_REGISTER,
    successProbability: MOCK_SUCCESS_PROBABILITY,
    disqualifiedProducts: MOCK_DISQUALIFIED,
    tokenUsage: MOCK_TOKEN_USAGE,
    createdAt: "2026-03-16T00:00:00.000Z",
    completedAt: "2026-03-16T00:02:34.000Z",
  };
}

export function getMockReportSummaries(): { id: string; productName: string; probability: number; date: string; status: string }[] {
  return [
    {
      id: "mock-1",
      productName: "Self-Cleaning Silicone Garlic Press with Ergonomic Rocker Design",
      probability: 72,
      date: "2026-03-16",
      status: "complete",
    },
  ];
}

export function getMockReportList(): IntelligenceReport[] {
  return [getMockIntelligenceReport()];
}
