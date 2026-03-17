// ── Intelligence Engine Types ────────────────────────────────────────

export type PipelineStage =
  | "context_aggregation"
  | "beginner_filter"
  | "market_synthesis"
  | "product_definition"
  | "financial_viability_check"
  | "ninety_day_feasibility_check"
  | "risk_analysis"
  | "confidence_scoring"
  | "final_synthesis";

export type ReportStatus = "pending" | "running" | "complete" | "failed";

export type WarningSeverity = "critical" | "important" | "fyi";

export type FitDimensionName =
  | "capitalAdequacy"
  | "skillAlignment"
  | "timeCommitment"
  | "riskTolerance"
  | "operationalComplexity";

export type ProbabilityDimensionName =
  | "marketDemand"
  | "competitivePosition"
  | "executionFeasibility"
  | "financialViability"
  | "timingAlignment";

export type ScenarioLabel = "Conservative" | "Base" | "Optimistic";

// ── Core Interfaces ──────────────────────────────────────────────────

export interface SellerProfile {
  experienceLevel: "beginner";
  availableCapital: { min: number; max: number };
  priorities: string[];
  hardDisqualifiers: string[];
}

export interface ReportInputContext {
  availableCapital: number;
  hardDeadlineDays?: number;
  categoryPreferences?: string[];
}

export interface WinConditionVerdict {
  name: string;
  met: boolean;
  score: number; // 0-25
  evidence: string;
  caveat: string;
}

export interface ProductVerdict {
  productName: string;
  targetPrice: number;
  estimatedUnitCost: number;
  minimumOrderQuantity: number;
  category: string;
  investmentThesis: string;
  winConditionAssessment: WinConditionVerdict[];
  totalWinScore: number; // sum of all 4 (0-100)
  alternativesConsidered: AlternativeProduct[];
  beginnerAdvantages: string[];
  mustHaveFeatures: string[];
}

export interface AlternativeProduct {
  productName: string;
  reason: string;
  whyNotChosen: string;
}

export interface FitDimension {
  name: FitDimensionName;
  label: string;
  score: number; // 0-20
  explanation: string;
}

export interface BeginnerWarning {
  severity: WarningSeverity;
  message: string;
}

export interface LearningItem {
  topic: string;
  timeEstimate: string;
  resource: string;
}

export interface BeginnerFitAssessment {
  totalScore: number; // 0-100 (sum of 5 dimensions)
  dimensions: FitDimension[];
  warnings: BeginnerWarning[];
  requiredLearning: LearningItem[];
}

// ── Financial Model ──────────────────────────────────────────────────

export interface UnitEconomics {
  unitManufacturingCost: number;
  shippingPerUnit: number;
  amazonFees: number;
  totalVariableCost: number;
  sellingPrice: number;
  profitPerUnit: number;
  marginPercent: number;
}

export interface StartupBudgetItem {
  label: string;
  amount: number;
}

export interface LaunchBudgetIntelligence {
  items: StartupBudgetItem[];
  subtotal: number;
  contingency: number;
  total: number;
}

export interface FinancialScenario {
  label: ScenarioLabel;
  probabilityWeight: number;
  monthlyUnitSales: number[];
  monthlyRevenue: number[];
  monthlyNetProfit: number[];
  cumulativeProfit: number[];
}

export interface FinancialModel {
  unitEconomics: UnitEconomics;
  launchBudget: LaunchBudgetIntelligence;
  scenarios: FinancialScenario[];
  breakEvenUnits: number;
  breakEvenMonths: number;
  roi12Month: number;
  monthsToSixFigureRevenue: number | null;
}

// ── 90-Day Playbook ──────────────────────────────────────────────────

export interface PlaybookTask {
  title: string;
  dayStart: number;
  dayEnd: number;
  exactSteps: string[];
  beginnerTip: string;
  cost: number;
  successMetric: string;
}

export interface PlaybookPhase {
  name: string;
  dayStart: number;
  dayEnd: number;
  tasks: PlaybookTask[];
}

export interface WeeklyMilestone {
  week: number;
  milestone: string;
  kpi: string;
}

export interface NinetyDayPlaybook {
  phases: PlaybookPhase[];
  weeklyMilestones: WeeklyMilestone[];
  day1Actions: string[];
  goLiveTargetDay: number;
}

// ── Risk Register ────────────────────────────────────────────────────

export interface Risk {
  title: string;
  description: string;
  likelihood: number; // 1-5
  impact: number; // 1-5
  beginnerMultiplier: number; // 1.0-2.5
  adjustedSeverity: number; // likelihood * impact * beginnerMultiplier
  earlyWarningSignals: string[];
  mitigation: string;
  contingency: string;
  isBeginnerSpecific: boolean;
}

export interface RiskRegister {
  risks: Risk[];
  topBeginnerRisk: string;
  unmitigatableRisks: string[];
}

// ── Success Probability ──────────────────────────────────────────────

export interface ProbabilityDimension {
  name: ProbabilityDimensionName;
  label: string;
  score: number; // 0-20
  explanation: string;
}

export interface FailureScenario {
  scenario: string;
  probability: number; // 0-100
  trigger: string;
}

export interface SuccessProbability {
  overallScore: number; // 0-100
  confidenceInterval: [number, number]; // [low, high]
  dimensions: ProbabilityDimension[];
  failureScenarios: FailureScenario[];
  honestAssessment: string;
}

// ── Disqualified Products ────────────────────────────────────────────

export interface DisqualifiedProduct {
  productName: string;
  rejectionReason: string;
  failedFilter: string;
  wouldWorkIf: string;
}

// ── Token Usage ──────────────────────────────────────────────────────

export interface TokenUsage {
  totalInputTokens: number;
  totalOutputTokens: number;
  byStage: Record<string, { input: number; output: number }>;
}

// ── Top-Level Report ─────────────────────────────────────────────────

export interface IntelligenceReport {
  id: string;
  status: ReportStatus;
  sellerProfile: SellerProfile;
  inputContext: ReportInputContext;
  verdict: ProductVerdict | null;
  beginnerFitAssessment: BeginnerFitAssessment | null;
  financialModel: FinancialModel | null;
  ninetyDayPlaybook: NinetyDayPlaybook | null;
  riskRegister: RiskRegister | null;
  successProbability: SuccessProbability | null;
  disqualifiedProducts: DisqualifiedProduct[];
  tokenUsage: TokenUsage;
  createdAt: string;
  completedAt: string | null;
}

// ── SSE Events ───────────────────────────────────────────────────────

export type IntelligenceSSEEvent =
  | { type: "start"; reportId: string; totalStages: number }
  | { type: "stage"; stage: PipelineStage; index: number; status: "running" | "complete" | "error"; message: string }
  | { type: "complete"; report: IntelligenceReport }
  | { type: "error"; message: string };
