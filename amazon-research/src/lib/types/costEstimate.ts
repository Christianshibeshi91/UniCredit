// ── Cost Estimate Types ───────────────────────────────────────────

export interface SourcingCosts {
  unitCost: number;
  moqUnits: number;
  moqTotalCost: number;
  sampleCost: number;
}

export interface ShippingCosts {
  seaFreight: number;               // per unit
  customsDuty: number;              // per unit
  importFees: number;               // per unit
  totalPerUnit: number;
}

export interface AmazonFees {
  fbaFulfillmentFee: number;        // per unit
  referralFee: number;              // per unit (% of sale price)
  storageFeeMonthly: number;        // per unit per month
  totalPerUnit: number;
}

export interface LaunchBudget {
  productPhotography: number;
  brandingAndPackaging: number;
  sampleOrdering: number;
  ppcLaunchBudget: number;          // first 90 days
  amazonStorefront: number;         // brand registry + A+ content
  totalOneTime: number;
}

export interface MonthlyProjection {
  month: number;                    // 1-12
  unitsSold: number;
  revenue: number;
  totalCosts: number;
  profit: number;
  cumulativeProfit: number;
}

export interface CostEstimate {
  id: string;
  suggestionId: string;

  sourcingCosts: SourcingCosts;
  shippingCosts: ShippingCosts;
  amazonFees: AmazonFees;
  launchBudget: LaunchBudget;

  contingencyBuffer: number;        // 15% buffer amount
  totalStartupCapital: number;

  // Projections
  targetSalePrice: number;
  estimatedNetMargin: number;       // 0.0-1.0
  breakEvenUnits: number;
  breakEvenMonths: number;
  roi12Month: number;               // projected ROI
  monthlyProjections: MonthlyProjection[];

  assumptions: string[];
  claudeModel: string;
  createdAt: string;                // ISO date
}
