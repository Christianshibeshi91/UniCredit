// ── Supplier Types ────────────────────────────────────────────────

export interface ProductSpec {
  productName: string;
  keyMaterials: string[];
  targetDimensions: string;
  targetWeight: string;
  requiredCertifications: string[];
  packagingRequirements: string;
  customizationNeeds: string[];
  targetUnitCost: number;
  targetMOQ: number;
}

export interface SupplierFilterCriteria {
  minYearsInBusiness: number;
  minTradeAssuranceUSD: number;
  requiredVerifications: string[];
  minResponseRate: number;          // percentage 0-100
  maxMOQ: number;
  maxLeadTimeDays: number;
  preferredRegions: string[];
}

export interface SupplierProfile {
  id: string;
  companyName: string;
  location: string;
  yearsInBusiness: number;
  mainProducts: string[];
  tradeAssuranceUSD: number;
  verifications: string[];
  responseRate: number;             // 0-100
  reviewScore: number;              // 0-5
  moq: number;
  leadTimeDays: number;
  sampleCost: number;
}

export interface SupplierScoreBreakdown {
  reliabilityScore: number;         // 0-25
  qualityScore: number;             // 0-25
  commercialScore: number;          // 0-25
  fitScore: number;                 // 0-25
}

export interface ScoredSupplier extends SupplierProfile {
  totalScore: number;               // 0-100
  scoreBreakdown: SupplierScoreBreakdown;
  rank: number;
  pros: string[];
  cons: string[];
  recommendation: string;
}

export type OutreachTone = "professional" | "friendly_professional";

export interface OutreachVariant {
  label: string;
  subject: string;
  body: string;
}

export interface OutreachMessage {
  subject: string;
  body: string;
  tone: OutreachTone;
  variants: OutreachVariant[];
}

export interface SupplierSearch {
  id: string;
  suggestionId: string;

  searchKeywords: string[];
  productSpec: ProductSpec;
  filterCriteria: SupplierFilterCriteria;

  suppliers: ScoredSupplier[];
  recommendedSupplierId: string;

  outreachMessage?: OutreachMessage;
  claudeModel: string;
  createdAt: string;                // ISO date
}
