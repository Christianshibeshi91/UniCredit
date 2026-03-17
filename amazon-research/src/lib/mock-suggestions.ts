/**
 * Mock data for the Product Suggestion Engine.
 * Provides 6 hand-crafted suggestions with full CostEstimate,
 * SupplierSearch data, and OutreachMessage.
 */

import type {
  ProductSuggestion, ViabilityTier, ViabilityBreakdown, PainPoint, TrendSignal, RiskFactor,
  CostEstimate, SourcingCosts, ShippingCosts, AmazonFees, LaunchBudget, MonthlyProjection,
  SupplierSearch, ProductSpec, SupplierFilterCriteria, ScoredSupplier, SupplierScoreBreakdown,
  OutreachMessage, OutreachVariant,
} from "@/lib/types";

// ── Helpers ──────────────────────────────────────────────────────────

const NOW = "2026-03-16T00:00:00.000Z";

function generateProjections(
  targetSalePrice: number,
  unitCost: number,
  shippingPerUnit: number,
  amazonFeesPerUnit: number,
  totalStartupCapital: number,
): MonthlyProjection[] {
  const costPerUnit = unitCost + shippingPerUnit + amazonFeesPerUnit;
  let cumulative = -totalStartupCapital;
  const schedule = [50, 50, 50, 150, 150, 150, 300, 300, 300, 300, 300, 300];
  return schedule.map((units, i) => {
    const revenue = +(units * targetSalePrice).toFixed(2);
    const totalCosts = +(units * costPerUnit).toFixed(2);
    const profit = +(revenue - totalCosts).toFixed(2);
    cumulative = +(cumulative + profit).toFixed(2);
    return { month: i + 1, unitsSold: units, revenue, totalCosts, profit, cumulativeProfit: cumulative };
  });
}

// ── Suggestion 1: Self-Cleaning Garlic Press ─────────────────────────

const sug1: ProductSuggestion = {
  id: "sug-1",
  sourceProductIds: ["B09V3KXJPB"],
  sourceAnalysisIds: ["analysis-garlic-1"],
  title: "Self-Cleaning Garlic Press with Dual Chamber",
  description:
    "A stainless steel garlic press featuring a patented self-cleaning wiper mechanism and a dual-chamber design that accommodates both small and large cloves without pre-peeling. Addresses the top three consumer pain points found in 8,000+ reviews of competing products.",
  category: "Kitchen Gadgets",
  subcategory: "Garlic Tools",
  targetCustomer: "Home cooks who hate cleaning garlic presses",
  targetPrice: 24.99,
  painPointsAddressed: [
    { issue: "Cleaning difficulty", affectedPercentage: 65, proposedSolution: "Integrated wiper plate ejects residue with one push" },
    { issue: "Handle ergonomics", affectedPercentage: 40, proposedSolution: "Wider, contoured silicone grip reduces hand strain" },
    { issue: "Rust and corrosion", affectedPercentage: 25, proposedSolution: "18/10 stainless steel body, dishwasher-safe finish" },
  ],
  differentiators: [
    "Patented self-cleaning mechanism",
    "Dual chamber for small/large cloves",
    "Dishwasher-safe stainless steel",
  ],
  trendSignals: [
    { signal: "\"self cleaning garlic press\" searches up 140% YoY", source: "google_trends", strength: "strong" },
    { signal: "Garlic tools category climbing Amazon Movers & Shakers", source: "amazon_movers", strength: "moderate" },
  ],
  riskFactors: [
    { risk: "Patent infringement on wiper mechanism", severity: "medium", mitigation: "Prior-art search completed; file provisional patent before tooling" },
    { risk: "Chinese manufacturing quality variance", severity: "medium", mitigation: "Require BSCI audit and pre-shipment SGS inspection" },
  ],
  viabilityScore: 88,
  viabilityBreakdown: { demandConfidence: 23, differentiationStrength: 22, marginPotential: 22, executionFeasibility: 21 },
  tier: "S",
  costEstimateId: "ce-1",
  supplierSearchId: "ss-1",
  status: "estimated",
  generatedBy: "gap_analysis",
  claudeModel: "claude-sonnet-4-20250514",
  createdAt: NOW,
  updatedAt: NOW,
};

const ce1: CostEstimate = {
  id: "ce-1",
  suggestionId: "sug-1",
  sourcingCosts: { unitCost: 3.20, moqUnits: 500, moqTotalCost: 1600, sampleCost: 45 },
  shippingCosts: { seaFreight: 0.85, customsDuty: 0.32, importFees: 0.15, totalPerUnit: 1.32 },
  amazonFees: { fbaFulfillmentFee: 3.86, referralFee: 3.75, storageFeeMonthly: 0.18, totalPerUnit: 7.79 },
  launchBudget: { productPhotography: 800, brandingAndPackaging: 600, sampleOrdering: 180, ppcLaunchBudget: 2500, amazonStorefront: 400, totalOneTime: 4480 },
  contingencyBuffer: 1117,
  totalStartupCapital: 8529,
  targetSalePrice: 24.99,
  estimatedNetMargin: 0.35,
  breakEvenUnits: 682,
  breakEvenMonths: 5,
  roi12Month: 2.8,
  monthlyProjections: generateProjections(24.99, 3.20, 1.32, 7.79, 8529),
  assumptions: [
    "MOQ of 500 units at $3.20/unit from verified Alibaba supplier",
    "Sea freight via Shenzhen to Los Angeles at current rates",
    "PPC ACoS of 35% for first 90 days, declining to 20%",
    "FBA standard-size tier based on estimated dimensions",
    "15% contingency buffer on total startup costs",
  ],
  claudeModel: "claude-sonnet-4-20250514",
  createdAt: NOW,
};

const ss1: SupplierSearch = {
  id: "ss-1",
  suggestionId: "sug-1",
  searchKeywords: ["garlic press manufacturer", "stainless steel kitchen tool factory", "self-cleaning garlic crusher OEM", "kitchen gadget ODM China", "garlic mincer custom mold"],
  productSpec: {
    productName: "Self-Cleaning Garlic Press with Dual Chamber",
    keyMaterials: ["18/10 stainless steel", "food-grade silicone grip"],
    targetDimensions: "7.5 x 2.5 x 1.8 inches",
    targetWeight: "280g",
    requiredCertifications: ["FDA food contact", "LFGB", "CA Prop 65"],
    packagingRequirements: "Custom branded box with insert, barcode, suffocation warning",
    customizationNeeds: ["Dual-chamber die cut", "Integrated wiper plate", "Laser-etched logo"],
    targetUnitCost: 3.50,
    targetMOQ: 500,
  },
  filterCriteria: {
    minYearsInBusiness: 5,
    minTradeAssuranceUSD: 50000,
    requiredVerifications: ["Trade Assurance", "Verified Supplier"],
    minResponseRate: 80,
    maxMOQ: 1000,
    maxLeadTimeDays: 35,
    preferredRegions: ["Guangdong", "Zhejiang", "Fujian"],
  },
  suppliers: [
    {
      id: "sup-1",
      companyName: "Yangjiang Bright Kitchen Co., Ltd",
      location: "Yangjiang, Guangdong, China",
      yearsInBusiness: 12,
      mainProducts: ["garlic presses", "kitchen shears", "peelers", "can openers"],
      tradeAssuranceUSD: 150000,
      verifications: ["Trade Assurance", "Verified Supplier", "SGS Audited"],
      responseRate: 96,
      reviewScore: 4.8,
      moq: 500,
      leadTimeDays: 25,
      sampleCost: 45,
      totalScore: 87,
      scoreBreakdown: { reliabilityScore: 23, qualityScore: 22, commercialScore: 21, fitScore: 21 },
      rank: 1,
      pros: ["12 years garlic press specialization", "In-house mold shop", "FDA/LFGB certified", "Fast sample turnaround"],
      cons: ["Slightly higher MOQ for custom molds", "Limited English communication"],
      recommendation: "Best overall fit — deep category expertise and strong quality certifications. Request golden sample before committing to production run.",
    },
    {
      id: "sup-2",
      companyName: "Jieyang Xinfa Hardware Products Co., Ltd",
      location: "Jieyang, Guangdong, China",
      yearsInBusiness: 8,
      mainProducts: ["stainless steel kitchenware", "garlic tools", "spice grinders"],
      tradeAssuranceUSD: 80000,
      verifications: ["Trade Assurance", "Verified Supplier"],
      responseRate: 89,
      reviewScore: 4.5,
      moq: 300,
      leadTimeDays: 30,
      sampleCost: 35,
      totalScore: 74,
      scoreBreakdown: { reliabilityScore: 19, qualityScore: 19, commercialScore: 18, fitScore: 18 },
      rank: 2,
      pros: ["Lower MOQ of 300 units", "Competitive pricing", "Good English-speaking sales team"],
      cons: ["Fewer quality certifications", "Longer lead times on custom tooling"],
      recommendation: "Strong backup option with lower barrier to entry. Good for test runs before scaling.",
    },
    {
      id: "sup-3",
      companyName: "Zhejiang Mingshen Tools Manufacturing Co., Ltd",
      location: "Yongkang, Zhejiang, China",
      yearsInBusiness: 15,
      mainProducts: ["kitchen tools", "hand tools", "garden tools", "stainless steel utensils"],
      tradeAssuranceUSD: 200000,
      verifications: ["Trade Assurance", "Verified Supplier", "ISO 9001"],
      responseRate: 82,
      reviewScore: 4.3,
      moq: 1000,
      leadTimeDays: 28,
      sampleCost: 50,
      totalScore: 71,
      scoreBreakdown: { reliabilityScore: 21, qualityScore: 20, commercialScore: 15, fitScore: 15 },
      rank: 3,
      pros: ["ISO 9001 certified", "15 years in business", "Large production capacity"],
      cons: ["Higher MOQ of 1,000 units", "Broad product range — less kitchen specialization"],
      recommendation: "Best for scale-up phase. High MOQ makes them unsuitable for initial run but ideal once demand is validated.",
    },
  ],
  recommendedSupplierId: "sup-1",
  outreachMessage: {
    subject: "Custom Self-Cleaning Garlic Press — OEM Inquiry (500 units initial order)",
    body: `Dear Sales Team at Yangjiang Bright Kitchen,

I am sourcing a custom stainless steel garlic press with a unique self-cleaning wiper mechanism and dual-chamber design for the US Amazon market. We are a growing private-label brand focused on premium kitchen tools.

Key requirements:
- Material: 18/10 stainless steel body with food-grade silicone grip
- Custom feature: Integrated wiper plate for self-cleaning function
- Dual chamber design for small and large cloves
- Certifications needed: FDA food contact, LFGB, CA Prop 65
- Custom branded packaging with barcode

Initial order: 500 units with potential for 2,000-5,000 units/quarter after launch validation.

Could you please provide:
1. Unit pricing at 500 / 1,000 / 2,500 MOQ tiers
2. Custom mold cost and timeline
3. Golden sample lead time and cost
4. Your current FDA/LFGB certification documentation

We are ready to move quickly and can place a sample order this week if pricing aligns.

Best regards,
[Your Name]
[Brand Name]`,
    tone: "professional",
    variants: [
      {
        label: "volume_focused",
        subject: "High-Volume Garlic Press Partnership — 5,000+ Units/Quarter Potential",
        body: `Dear Yangjiang Bright Kitchen Team,

We are an established Amazon private-label brand planning to launch a premium garlic press line in the US market. Based on our market analysis, we project 5,000+ units per quarter within 6 months of launch.

We are looking for a long-term manufacturing partner, not just a one-time supplier. Our ideal partner has:
- Deep experience with stainless steel kitchen tools
- In-house tooling capability for custom molds
- FDA and LFGB certifications already in place
- Willingness to negotiate pricing tiers as volume grows

Our product requires a unique self-cleaning mechanism and dual-chamber design. We have detailed CAD drawings ready to share under NDA.

Could we schedule a call this week to discuss partnership terms, volume pricing, and exclusivity arrangements?

Best regards,
[Your Name]`,
      },
      {
        label: "quality_focused",
        subject: "Premium Kitchen Tool OEM — Quality-First Garlic Press Project",
        body: `Dear Quality Team at Yangjiang Bright Kitchen,

We are developing a premium-tier garlic press for the US market where quality and safety certifications are non-negotiable. Our brand positions at the top of the category, and our customers expect flawless fit and finish.

Before discussing pricing, we would like to understand your quality processes:
1. What QC checkpoints exist in your production line?
2. Can you provide recent SGS or Bureau Veritas inspection reports?
3. What is your defect rate on stainless steel kitchen tools?
4. Do you offer pre-shipment third-party inspection coordination?

Our product features a self-cleaning mechanism that requires tight tolerances on the wiper plate. We need a partner who can hold +/-0.1mm on critical dimensions.

If your quality capabilities align, we are prepared to pay a premium for consistent excellence and would like to request a golden sample.

Best regards,
[Your Name]`,
      },
    ],
  },
  claudeModel: "claude-sonnet-4-20250514",
  createdAt: NOW,
};

// ── Suggestion 2: Reinforced Adjustable Dumbbell ─────────────────────

const sug2: ProductSuggestion = {
  id: "sug-2",
  sourceProductIds: ["B0BFWK4TMR"],
  sourceAnalysisIds: ["analysis-dumbbell-1"],
  title: "Reinforced Adjustable Dumbbell with Steel Mechanism",
  description:
    "A 5-50 lb adjustable dumbbell replacing the common plastic selector with a full steel locking mechanism. CNC-machined weight plates ensure +/-1% accuracy. Rubber-coated cradle eliminates rattling during sets.",
  category: "Fitness Equipment",
  subcategory: "Dumbbells",
  targetCustomer: "Home gym enthusiasts frustrated with flimsy adjustment mechanisms",
  targetPrice: 179.99,
  painPointsAddressed: [
    { issue: "Mechanism failure under load", affectedPercentage: 55, proposedSolution: "Full steel selector mechanism rated to 100,000 cycles" },
    { issue: "Weight accuracy inconsistency", affectedPercentage: 35, proposedSolution: "CNC-machined plates with +/-1% tolerance" },
    { issue: "Noise during adjustment and use", affectedPercentage: 30, proposedSolution: "Rubber-dampened cradle and nylon bushings" },
  ],
  differentiators: [
    "All-steel adjustment mechanism (no plastic components)",
    "CNC-machined weight plates for +/-1% accuracy",
    "Rubber-dampened cradle eliminates rattling",
    "5-50 lb range in 5 lb increments",
  ],
  trendSignals: [
    { signal: "\"home gym equipment\" sustained 200%+ above pre-2020 baseline", source: "google_trends", strength: "strong" },
    { signal: "Adjustable dumbbells #3 in Amazon Sports Movers & Shakers", source: "amazon_movers", strength: "strong" },
    { signal: "TikTok home gym content up 85% YoY", source: "social", strength: "moderate" },
  ],
  riskFactors: [
    { risk: "High unit cost and startup capital", severity: "medium", mitigation: "Start with single-dumbbell SKU; add pair bundle after validation" },
    { risk: "Shipping weight increases fulfillment costs", severity: "high", mitigation: "Negotiate FBA heavy/bulky rates; consider FBM for initial launch" },
    { risk: "Established competitors (Bowflex, PowerBlock)", severity: "medium", mitigation: "Differentiate on mechanism durability — target their top complaints" },
  ],
  viabilityScore: 91,
  viabilityBreakdown: { demandConfidence: 24, differentiationStrength: 23, marginPotential: 22, executionFeasibility: 22 },
  tier: "S",
  costEstimateId: "ce-2",
  supplierSearchId: "ss-2",
  status: "estimated",
  generatedBy: "gap_analysis",
  claudeModel: "claude-sonnet-4-20250514",
  createdAt: NOW,
  updatedAt: NOW,
};

const ce2: CostEstimate = {
  id: "ce-2",
  suggestionId: "sug-2",
  sourcingCosts: { unitCost: 42.50, moqUnits: 200, moqTotalCost: 8500, sampleCost: 120 },
  shippingCosts: { seaFreight: 4.80, customsDuty: 2.10, importFees: 0.65, totalPerUnit: 7.55 },
  amazonFees: { fbaFulfillmentFee: 18.25, referralFee: 27.00, storageFeeMonthly: 1.45, totalPerUnit: 46.70 },
  launchBudget: { productPhotography: 1200, brandingAndPackaging: 900, sampleOrdering: 360, ppcLaunchBudget: 4000, amazonStorefront: 600, totalOneTime: 7060 },
  contingencyBuffer: 2860,
  totalStartupCapital: 18420,
  targetSalePrice: 179.99,
  estimatedNetMargin: 0.28,
  breakEvenUnits: 234,
  breakEvenMonths: 4,
  roi12Month: 3.1,
  monthlyProjections: generateProjections(179.99, 42.50, 7.55, 46.70, 18420),
  assumptions: [
    "MOQ of 200 units at $42.50/unit — single dumbbell SKU",
    "Heavy/bulky FBA fulfillment tier with negotiated rates",
    "Referral fee at 15% of $179.99 sale price",
    "PPC ACoS of 40% for first 90 days in competitive fitness category",
    "Sea freight at premium rate due to weight (approx. 25 lbs/unit)",
  ],
  claudeModel: "claude-sonnet-4-20250514",
  createdAt: NOW,
};

const ss2: SupplierSearch = {
  id: "ss-2",
  suggestionId: "sug-2",
  searchKeywords: ["adjustable dumbbell manufacturer", "fitness equipment OEM China", "CNC machined weight plates factory", "steel dumbbell mechanism supplier", "home gym equipment ODM"],
  productSpec: {
    productName: "Reinforced Adjustable Dumbbell with Steel Mechanism",
    keyMaterials: ["cast iron weight plates", "CNC-machined steel selector", "rubber coating", "nylon bushings"],
    targetDimensions: "17 x 8 x 9 inches",
    targetWeight: "25 lbs (at 50 lb setting with cradle)",
    requiredCertifications: ["CE", "ASTM F2264", "REACH"],
    packagingRequirements: "Heavy-duty corrugated box with foam inserts, 60 lb gross weight rated",
    customizationNeeds: ["Custom steel selector mechanism", "CNC plate machining", "Rubber-coated cradle mold", "Laser-etched weight markings"],
    targetUnitCost: 45.00,
    targetMOQ: 200,
  },
  filterCriteria: {
    minYearsInBusiness: 8,
    minTradeAssuranceUSD: 100000,
    requiredVerifications: ["Trade Assurance", "Verified Supplier"],
    minResponseRate: 75,
    maxMOQ: 500,
    maxLeadTimeDays: 45,
    preferredRegions: ["Shandong", "Hebei", "Jiangsu"],
  },
  suppliers: [
    {
      id: "sup-4",
      companyName: "Rizhao Hengda Sports Equipment Co., Ltd",
      location: "Rizhao, Shandong, China",
      yearsInBusiness: 18,
      mainProducts: ["adjustable dumbbells", "kettlebells", "barbells", "weight plates"],
      tradeAssuranceUSD: 500000,
      verifications: ["Trade Assurance", "Verified Supplier", "ISO 9001", "BSCI Audited"],
      responseRate: 94,
      reviewScore: 4.7,
      moq: 200,
      leadTimeDays: 35,
      sampleCost: 120,
      totalScore: 91,
      scoreBreakdown: { reliabilityScore: 24, qualityScore: 23, commercialScore: 22, fitScore: 22 },
      rank: 1,
      pros: ["18 years dumbbell specialization", "Existing adjustable dumbbell molds", "In-house CNC capabilities", "BSCI audited"],
      cons: ["Premium pricing reflects quality", "Peak season lead times can extend to 50 days"],
      recommendation: "Top choice — established leader in adjustable dumbbell manufacturing with proven CNC capabilities. Their existing tooling reduces mold costs significantly.",
    },
    {
      id: "sup-5",
      companyName: "Nantong Iron Bull Fitness Manufacturing Co., Ltd",
      location: "Nantong, Jiangsu, China",
      yearsInBusiness: 10,
      mainProducts: ["dumbbells", "home gym systems", "strength equipment", "fitness accessories"],
      tradeAssuranceUSD: 200000,
      verifications: ["Trade Assurance", "Verified Supplier", "ISO 14001"],
      responseRate: 88,
      reviewScore: 4.4,
      moq: 100,
      leadTimeDays: 40,
      sampleCost: 95,
      totalScore: 79,
      scoreBreakdown: { reliabilityScore: 20, qualityScore: 20, commercialScore: 20, fitScore: 19 },
      rank: 2,
      pros: ["Low MOQ of 100 units", "Flexible on customization", "ISO 14001 environmental certification"],
      cons: ["Less experience with precision CNC components", "Smaller production capacity"],
      recommendation: "Good for initial test batch due to low MOQ. Verify CNC tolerance capabilities with sample before committing.",
    },
    {
      id: "sup-6",
      companyName: "Cangzhou Strongman Equipment Co., Ltd",
      location: "Cangzhou, Hebei, China",
      yearsInBusiness: 14,
      mainProducts: ["weight plates", "Olympic barbells", "power racks", "dumbbells"],
      tradeAssuranceUSD: 350000,
      verifications: ["Trade Assurance", "Verified Supplier", "SGS Audited"],
      responseRate: 79,
      reviewScore: 4.2,
      moq: 300,
      leadTimeDays: 30,
      sampleCost: 110,
      totalScore: 75,
      scoreBreakdown: { reliabilityScore: 21, qualityScore: 19, commercialScore: 18, fitScore: 17 },
      rank: 3,
      pros: ["Fast 30-day lead time", "Strong cast iron expertise", "Large production capacity for scale"],
      cons: ["Higher MOQ of 300", "Lower response rate", "Hebei region — verify current export logistics"],
      recommendation: "Best for scale-up production. Their cast iron expertise is excellent but MOQ is too high for initial validation run.",
    },
  ],
  recommendedSupplierId: "sup-4",
  outreachMessage: {
    subject: "Custom Adjustable Dumbbell — Steel Mechanism OEM Project (200 unit initial run)",
    body: `Dear Sales Team at Rizhao Hengda,

We are developing a premium adjustable dumbbell for the US Amazon market that differentiates on mechanism durability. Our market research shows the #1 complaint with current products is plastic selector failure — we want to solve this with an all-steel mechanism.

Product specifications:
- 5-50 lb range in 5 lb increments
- Full steel selector mechanism (no plastic components)
- CNC-machined weight plates with +/-1% tolerance
- Rubber-dampened cradle to eliminate noise
- CE certification required

Initial order: 200 units (single dumbbell SKU). We project scaling to 1,000+ units/quarter.

Please provide:
1. Unit pricing at 200 / 500 / 1,000 MOQ tiers
2. Existing adjustable dumbbell mold compatibility or new mold costs
3. CNC machining capabilities and tolerance specifications
4. Sample timeline and cost
5. Heavy goods shipping FOB quote

Best regards,
[Your Name]
[Brand Name]`,
    tone: "professional",
    variants: [
      {
        label: "volume_focused",
        subject: "Long-Term Dumbbell Manufacturing Partner — 1,000+ Units/Quarter",
        body: `Dear Rizhao Hengda Team,

We are an Amazon private-label brand entering the adjustable dumbbell market with a differentiated all-steel mechanism design. Our launch strategy projects 1,000+ units per quarter within two quarters, with plans for a full home gym product line.

We are seeking an exclusive manufacturing partnership with volume-based pricing tiers. Can we discuss annual commitment pricing and dedicated production line allocation?

Key project details: 5-50 lb adjustable dumbbell, all-steel mechanism, CNC plates, rubber cradle. Full specs available under NDA.

Best regards,
[Your Name]`,
      },
      {
        label: "quality_focused",
        subject: "Premium Adjustable Dumbbell — Precision Manufacturing Inquiry",
        body: `Dear Quality Assurance Team at Rizhao Hengda,

We are developing a premium-tier adjustable dumbbell that competes with Bowflex and PowerBlock on durability. Our key differentiator is an all-steel selector mechanism rated for 100,000+ cycles, which requires precision CNC machining.

Before we discuss commercial terms, we need to verify:
1. CNC machining tolerances achievable on steel selectors (we need +/-0.05mm)
2. Cycle testing capabilities (can you test to 100,000 actuations?)
3. Weight plate accuracy verification process
4. Recent third-party quality inspection reports

Quality is our brand promise — we will pay premium rates for verified precision.

Best regards,
[Your Name]`,
      },
    ],
  },
  claudeModel: "claude-sonnet-4-20250514",
  createdAt: NOW,
};

// ── Suggestion 3: Ultra-Quiet Ceramic Pet Fountain ───────────────────

const sug3: ProductSuggestion = {
  id: "sug-3",
  sourceProductIds: ["B0C1KRLVNP"],
  sourceAnalysisIds: ["analysis-petfountain-1"],
  title: "Ultra-Quiet Ceramic Pet Fountain with App Control",
  description:
    "A ceramic pet water fountain with a brushless DC pump operating below 25 dB and BLE-connected app for filter change reminders, water level alerts, and consumption tracking. Targets premium pet owners seeking smart, quiet hydration solutions.",
  category: "Pet Supplies",
  subcategory: "Water Fountains",
  targetCustomer: "Pet owners who want quiet, smart-connected water solutions",
  targetPrice: 49.99,
  painPointsAddressed: [
    { issue: "Pump noise disturbs household", affectedPercentage: 58, proposedSolution: "Brushless DC pump with silicone dampeners — below 25 dB" },
    { issue: "Forget to change filters", affectedPercentage: 42, proposedSolution: "BLE app with push notification for filter replacement" },
    { issue: "Plastic taste and bacterial growth", affectedPercentage: 38, proposedSolution: "Lead-free glazed ceramic body, dishwasher-safe" },
  ],
  differentiators: [
    "Sub-25 dB brushless DC pump",
    "BLE app with filter tracking and water level alerts",
    "Lead-free glazed ceramic (not plastic)",
    "2L capacity with visible water level window",
  ],
  trendSignals: [
    { signal: "\"smart pet fountain\" searches up 210% YoY", source: "google_trends", strength: "strong" },
    { signal: "Premium pet products category growing 18% annually", source: "claude_inference", strength: "moderate" },
  ],
  riskFactors: [
    { risk: "BLE module adds complexity and cost", severity: "medium", mitigation: "Use proven ESP32-C3 module; budget for firmware development" },
    { risk: "Ceramic breakage during shipping", severity: "high", mitigation: "Custom foam packaging; FBA fragile item program" },
    { risk: "App maintenance and support overhead", severity: "medium", mitigation: "Use Tuya IoT platform for turnkey app infrastructure" },
  ],
  viabilityScore: 82,
  viabilityBreakdown: { demandConfidence: 22, differentiationStrength: 21, marginPotential: 19, executionFeasibility: 20 },
  tier: "A",
  costEstimateId: "ce-3",
  supplierSearchId: "ss-3",
  status: "draft",
  generatedBy: "trend_expansion",
  claudeModel: "claude-sonnet-4-20250514",
  createdAt: NOW,
  updatedAt: NOW,
};

const ce3: CostEstimate = {
  id: "ce-3",
  suggestionId: "sug-3",
  sourcingCosts: { unitCost: 11.80, moqUnits: 300, moqTotalCost: 3540, sampleCost: 85 },
  shippingCosts: { seaFreight: 2.40, customsDuty: 0.95, importFees: 0.35, totalPerUnit: 3.70 },
  amazonFees: { fbaFulfillmentFee: 6.12, referralFee: 7.50, storageFeeMonthly: 0.42, totalPerUnit: 14.04 },
  launchBudget: { productPhotography: 1000, brandingAndPackaging: 800, sampleOrdering: 255, ppcLaunchBudget: 3500, amazonStorefront: 500, totalOneTime: 6055 },
  contingencyBuffer: 2205,
  totalStartupCapital: 14800,
  targetSalePrice: 49.99,
  estimatedNetMargin: 0.31,
  breakEvenUnits: 694,
  breakEvenMonths: 6,
  roi12Month: 2.2,
  monthlyProjections: generateProjections(49.99, 11.80, 3.70, 14.04, 14800),
  assumptions: [
    "BLE module cost included in unit cost ($2.30 for ESP32-C3 + antenna)",
    "Ceramic body with lead-free glaze adds $3.50/unit vs plastic",
    "Fragile item surcharge included in FBA fulfillment fee",
    "App development via Tuya white-label platform ($0/unit, $2000 one-time setup not shown)",
    "Higher PPC budget due to competitive pet supplies category",
  ],
  claudeModel: "claude-sonnet-4-20250514",
  createdAt: NOW,
};

const ss3: SupplierSearch = {
  id: "ss-3",
  suggestionId: "sug-3",
  searchKeywords: ["ceramic pet fountain manufacturer", "pet water dispenser factory", "smart pet products OEM", "ceramic fountain with pump supplier", "IoT pet device ODM"],
  productSpec: {
    productName: "Ultra-Quiet Ceramic Pet Fountain with App Control",
    keyMaterials: ["lead-free glazed ceramic", "brushless DC pump", "ESP32-C3 BLE module", "food-grade silicone seals"],
    targetDimensions: "8.5 x 8.5 x 6 inches",
    targetWeight: "1.8 kg (empty)",
    requiredCertifications: ["FCC Part 15", "UL Listed pump", "FDA food contact", "RoHS"],
    packagingRequirements: "Double-wall box with molded foam insert for ceramic protection, fragile labels",
    customizationNeeds: ["Custom ceramic mold", "BLE firmware integration", "Tuya app whitelabel", "Branded pump housing"],
    targetUnitCost: 12.50,
    targetMOQ: 300,
  },
  filterCriteria: {
    minYearsInBusiness: 5,
    minTradeAssuranceUSD: 80000,
    requiredVerifications: ["Trade Assurance", "Verified Supplier"],
    minResponseRate: 80,
    maxMOQ: 500,
    maxLeadTimeDays: 45,
    preferredRegions: ["Guangdong", "Fujian", "Zhejiang"],
  },
  suppliers: [
    {
      id: "sup-7",
      companyName: "Shenzhen Petwant Technology Co., Ltd",
      location: "Shenzhen, Guangdong, China",
      yearsInBusiness: 9,
      mainProducts: ["smart pet feeders", "pet water fountains", "IoT pet devices", "pet cameras"],
      tradeAssuranceUSD: 200000,
      verifications: ["Trade Assurance", "Verified Supplier", "ISO 9001"],
      responseRate: 93,
      reviewScore: 4.6,
      moq: 300,
      leadTimeDays: 40,
      sampleCost: 85,
      totalScore: 86,
      scoreBreakdown: { reliabilityScore: 22, qualityScore: 22, commercialScore: 21, fitScore: 21 },
      rank: 1,
      pros: ["Specialized in smart pet products", "In-house firmware team", "Tuya ecosystem experience", "UL-listed pump supply chain"],
      cons: ["Ceramic body sourced from sub-supplier", "Higher minimum for custom firmware"],
      recommendation: "Best overall — their smart pet device expertise and Tuya integration experience directly match our needs. Request ceramic sample to verify sub-supplier quality.",
    },
    {
      id: "sup-8",
      companyName: "Dehua Mingyuan Ceramics Co., Ltd",
      location: "Dehua, Fujian, China",
      yearsInBusiness: 20,
      mainProducts: ["ceramic pet bowls", "ceramic fountains", "decorative ceramics", "glazed homeware"],
      tradeAssuranceUSD: 120000,
      verifications: ["Trade Assurance", "Verified Supplier", "SGS Audited"],
      responseRate: 85,
      reviewScore: 4.5,
      moq: 200,
      leadTimeDays: 35,
      sampleCost: 60,
      totalScore: 78,
      scoreBreakdown: { reliabilityScore: 22, qualityScore: 23, commercialScore: 17, fitScore: 16 },
      rank: 2,
      pros: ["20 years ceramic expertise — Dehua is the ceramic capital of China", "FDA food contact certified", "Beautiful glaze finish"],
      cons: ["No IoT/electronics capability — would need separate BLE supplier", "Limited English communication"],
      recommendation: "Best ceramic quality but lacks electronics capability. Consider for ceramic body sourcing paired with a separate electronics assembler.",
    },
    {
      id: "sup-9",
      companyName: "Foshan Yuanbo Pet Products Co., Ltd",
      location: "Foshan, Guangdong, China",
      yearsInBusiness: 7,
      mainProducts: ["pet fountains", "pet bowls", "automatic feeders", "pet grooming tools"],
      tradeAssuranceUSD: 90000,
      verifications: ["Trade Assurance", "Verified Supplier"],
      responseRate: 91,
      reviewScore: 4.3,
      moq: 500,
      leadTimeDays: 30,
      sampleCost: 70,
      totalScore: 72,
      scoreBreakdown: { reliabilityScore: 18, qualityScore: 18, commercialScore: 18, fitScore: 18 },
      rank: 3,
      pros: ["Fast lead times", "Existing pet fountain molds", "Good price point"],
      cons: ["Higher MOQ of 500", "Primarily plastic products — ceramic is newer for them"],
      recommendation: "Decent option if budget is tight. Their existing fountain molds save tooling costs but verify ceramic production quality thoroughly.",
    },
  ],
  recommendedSupplierId: "sup-7",
  outreachMessage: {
    subject: "Smart Ceramic Pet Fountain — OEM Project with BLE App (300 unit initial order)",
    body: `Dear Petwant Technology Team,

We are developing a premium ceramic pet water fountain with BLE connectivity for the US Amazon market. Your smart pet product expertise makes you an ideal manufacturing partner.

Product requirements:
- Lead-free glazed ceramic body (2L capacity)
- Brushless DC pump — must operate below 25 dB
- ESP32-C3 BLE module with Tuya app integration
- Features: filter change reminders, water level alerts, consumption tracking
- Certifications: FCC Part 15, UL listed pump, FDA food contact, RoHS

Initial order: 300 units. Scaling to 1,500+/quarter based on launch performance.

Questions:
1. Do you have experience with ceramic fountain bodies, or would you source from a sub-supplier?
2. Can your firmware team customize the Tuya app with our branding?
3. Unit pricing at 300 / 500 / 1,000 tiers?
4. Sample cost and lead time for a fully functional prototype?

We have detailed product specifications and UI wireframes ready to share.

Best regards,
[Your Name]
[Brand Name]`,
    tone: "professional",
    variants: [
      {
        label: "volume_focused",
        subject: "Smart Pet Fountain Line — Multi-SKU Partnership Opportunity",
        body: `Dear Petwant Technology Team,

We are launching a premium smart pet product line on Amazon US, starting with a ceramic water fountain with BLE app connectivity. Our roadmap includes 3 fountain sizes, matching smart feeders, and seasonal color editions — projecting 6,000+ total units in Year 1.

We are looking for a single manufacturing partner to build this entire line. Is your team interested in discussing an exclusive partnership with volume commitments?

Initial SKU: 2L ceramic fountain with BLE. Full specs available under mutual NDA.

Best regards,
[Your Name]`,
      },
      {
        label: "quality_focused",
        subject: "Premium Pet Fountain — Ceramic Quality and BLE Reliability Inquiry",
        body: `Dear Quality Team at Petwant Technology,

Our brand targets the premium segment of the pet fountain market. Before engaging commercially, we need to validate your capabilities on two critical fronts:

Ceramic Quality:
1. Source of ceramic body — in-house kiln or sub-supplier?
2. Lead-free glaze verification — can you provide FDA food contact test reports?
3. Breakage rate in shipping — what is your current defect/damage rate?

BLE Reliability:
1. ESP32-C3 firmware development timeline for custom features?
2. BLE range and reliability testing methodology?
3. OTA update capability for post-launch firmware fixes?

We will pay premium pricing for verified quality on both fronts.

Best regards,
[Your Name]`,
      },
    ],
  },
  claudeModel: "claude-sonnet-4-20250514",
  createdAt: NOW,
};

// ── Suggestion 4: Ergonomic Standing Desk Cable Management ───────────

const sug4: ProductSuggestion = {
  id: "sug-4",
  sourceProductIds: ["B0BGJ5PKLF", "B09T6GR6JN"],
  sourceAnalysisIds: ["analysis-cable-1"],
  title: "Ergonomic Standing Desk Cable Management System",
  description:
    "A modular under-desk cable management tray system designed specifically for sit-stand desks. Telescoping arms adjust from 24-48 inches to match any desk width, and magnetic cable clips keep cables organized during height transitions.",
  category: "Home Office",
  subcategory: "Cable Management",
  targetCustomer: "Remote workers with standing desks who need clean cable routing that moves with the desk",
  targetPrice: 34.99,
  painPointsAddressed: [
    { issue: "Cables snag during desk height adjustment", affectedPercentage: 52, proposedSolution: "Telescoping tray with 24-inch cable slack management loop" },
    { issue: "Existing trays do not fit adjustable desk widths", affectedPercentage: 44, proposedSolution: "Adjustable 24-48 inch telescoping arm system" },
    { issue: "Cables fall out of trays during movement", affectedPercentage: 35, proposedSolution: "Magnetic cable clips with 10 lb pull force" },
  ],
  differentiators: [
    "Telescoping 24-48 inch width adjustment",
    "Magnetic cable clips rated for standing desk movement",
    "Tool-free clamp installation in under 5 minutes",
    "Integrated power strip mount",
  ],
  trendSignals: [
    { signal: "\"standing desk cable management\" searches up 95% YoY", source: "google_trends", strength: "moderate" },
    { signal: "Home office category sustained growth post-pandemic", source: "claude_inference", strength: "moderate" },
  ],
  riskFactors: [
    { risk: "Low barrier to entry — easy to copy", severity: "medium", mitigation: "File design patent on telescoping mechanism; build brand loyalty quickly" },
    { risk: "Desk compatibility claims may generate returns", severity: "low", mitigation: "Comprehensive compatibility chart in listing; include shim kit for edge cases" },
  ],
  viabilityScore: 76,
  viabilityBreakdown: { demandConfidence: 20, differentiationStrength: 19, marginPotential: 19, executionFeasibility: 18 },
  tier: "A",
  costEstimateId: "ce-4",
  supplierSearchId: "ss-4",
  status: "draft",
  generatedBy: "gap_analysis",
  claudeModel: "claude-sonnet-4-20250514",
  createdAt: NOW,
  updatedAt: NOW,
};

const ce4: CostEstimate = {
  id: "ce-4",
  suggestionId: "sug-4",
  sourcingCosts: { unitCost: 4.80, moqUnits: 500, moqTotalCost: 2400, sampleCost: 55 },
  shippingCosts: { seaFreight: 1.10, customsDuty: 0.48, importFees: 0.18, totalPerUnit: 1.76 },
  amazonFees: { fbaFulfillmentFee: 5.20, referralFee: 5.25, storageFeeMonthly: 0.28, totalPerUnit: 10.73 },
  launchBudget: { productPhotography: 700, brandingAndPackaging: 500, sampleOrdering: 165, ppcLaunchBudget: 2000, amazonStorefront: 350, totalOneTime: 3715 },
  contingencyBuffer: 1025,
  totalStartupCapital: 6890,
  targetSalePrice: 34.99,
  estimatedNetMargin: 0.38,
  breakEvenUnits: 390,
  breakEvenMonths: 4,
  roi12Month: 3.5,
  monthlyProjections: generateProjections(34.99, 4.80, 1.76, 10.73, 6890),
  assumptions: [
    "Steel and ABS construction at $4.80/unit with magnetic clips included",
    "Standard-size FBA tier — product ships flat-packed",
    "Lower PPC spend due to less competitive niche",
    "15% referral fee on Home Office category",
    "Installation hardware (clamps, screws) included in unit cost",
  ],
  claudeModel: "claude-sonnet-4-20250514",
  createdAt: NOW,
};

const ss4: SupplierSearch = {
  id: "ss-4",
  suggestionId: "sug-4",
  searchKeywords: ["cable management tray manufacturer", "under desk organizer factory", "metal desk accessories OEM", "magnetic cable clip supplier", "office furniture accessories ODM"],
  productSpec: {
    productName: "Ergonomic Standing Desk Cable Management System",
    keyMaterials: ["powder-coated steel tray", "ABS plastic end caps", "N52 neodymium magnets", "silicone cable clips"],
    targetDimensions: "24-48 x 4.5 x 3 inches (adjustable)",
    targetWeight: "850g",
    requiredCertifications: ["RoHS", "REACH"],
    packagingRequirements: "Flat-pack retail box with instruction insert and QR code to video guide",
    customizationNeeds: ["Telescoping arm mechanism", "Magnetic clip integration", "Tool-free clamp design", "Custom color options"],
    targetUnitCost: 5.00,
    targetMOQ: 500,
  },
  filterCriteria: {
    minYearsInBusiness: 3,
    minTradeAssuranceUSD: 30000,
    requiredVerifications: ["Trade Assurance"],
    minResponseRate: 80,
    maxMOQ: 1000,
    maxLeadTimeDays: 30,
    preferredRegions: ["Guangdong", "Zhejiang", "Jiangsu"],
  },
  suppliers: [
    {
      id: "sup-10",
      companyName: "Zhongshan Lifesmart Hardware Co., Ltd",
      location: "Zhongshan, Guangdong, China",
      yearsInBusiness: 11,
      mainProducts: ["cable management trays", "monitor arms", "desk organizers", "laptop stands"],
      tradeAssuranceUSD: 100000,
      verifications: ["Trade Assurance", "Verified Supplier", "ISO 9001"],
      responseRate: 95,
      reviewScore: 4.7,
      moq: 500,
      leadTimeDays: 20,
      sampleCost: 55,
      totalScore: 88,
      scoreBreakdown: { reliabilityScore: 23, qualityScore: 22, commercialScore: 22, fitScore: 21 },
      rank: 1,
      pros: ["Direct category experience with cable trays", "Fast 20-day lead time", "Existing powder-coating line", "Excellent communication"],
      cons: ["Telescoping mechanism will require new tooling", "Slightly above target on pricing"],
      recommendation: "Best fit — their cable management specialization and fast turnaround make them ideal. Negotiate tooling cost amortization over first 2 orders.",
    },
    {
      id: "sup-11",
      companyName: "Ningbo Deli Office Equipment Co., Ltd",
      location: "Ningbo, Zhejiang, China",
      yearsInBusiness: 6,
      mainProducts: ["desk accessories", "office organizers", "filing products", "desktop shelves"],
      tradeAssuranceUSD: 60000,
      verifications: ["Trade Assurance", "Verified Supplier"],
      responseRate: 88,
      reviewScore: 4.4,
      moq: 300,
      leadTimeDays: 25,
      sampleCost: 40,
      totalScore: 76,
      scoreBreakdown: { reliabilityScore: 19, qualityScore: 19, commercialScore: 20, fitScore: 18 },
      rank: 2,
      pros: ["Lower MOQ of 300", "Competitive pricing", "Good with flat-pack products"],
      cons: ["Less experience with metal fabrication", "No existing cable tray tooling"],
      recommendation: "Good alternative with lower entry cost. Verify their metal stamping capabilities for the telescoping mechanism.",
    },
    {
      id: "sup-12",
      companyName: "Suzhou Kenton Office Supplies Co., Ltd",
      location: "Suzhou, Jiangsu, China",
      yearsInBusiness: 8,
      mainProducts: ["cable organizers", "power strip holders", "wire management", "cord covers"],
      tradeAssuranceUSD: 45000,
      verifications: ["Trade Assurance"],
      responseRate: 82,
      reviewScore: 4.1,
      moq: 500,
      leadTimeDays: 28,
      sampleCost: 45,
      totalScore: 70,
      scoreBreakdown: { reliabilityScore: 18, qualityScore: 17, commercialScore: 18, fitScore: 17 },
      rank: 3,
      pros: ["Cable management specialization", "Competitive pricing on bulk orders", "Flexible on custom designs"],
      cons: ["Smaller operation", "Lower trade assurance amount", "Fewer third-party verifications"],
      recommendation: "Budget option with relevant category experience. Suitable for price-sensitive launch but may need quality monitoring.",
    },
  ],
  recommendedSupplierId: "sup-10",
  outreachMessage: {
    subject: "Custom Under-Desk Cable Management System — Telescoping Design (500 units)",
    body: `Dear Lifesmart Hardware Team,

We are developing a cable management system specifically designed for sit-stand desks — a growing but underserved niche on Amazon US. Your cable tray expertise caught our attention.

Our product features:
- Telescoping 24-48 inch adjustable width (no competitor offers this)
- Magnetic cable clips rated for standing desk movement
- Tool-free clamp installation
- Integrated power strip mount
- Powder-coated steel with ABS end caps

Initial order: 500 units. We expect this to scale to 2,000+/quarter as standing desk adoption grows.

Could you provide:
1. Pricing at 500 / 1,000 / 2,500 tiers
2. Tooling cost for the telescoping arm mechanism
3. Sample timeline
4. Available powder-coat color options

Best regards,
[Your Name]
[Brand Name]`,
    tone: "friendly_professional",
    variants: [
      {
        label: "volume_focused",
        subject: "Standing Desk Accessories Line — Multi-Product Manufacturing Partner Needed",
        body: `Dear Lifesmart Hardware Team,

We are building a standing desk accessories brand on Amazon US — starting with a cable management system and expanding to monitor arms, keyboard trays, and desk shelves. We need a single manufacturing partner for the entire line.

Year 1 projection across all SKUs: 8,000+ units. Our cable management system launches first (500 units), followed by quarterly new product releases.

Interested in discussing exclusive manufacturing terms?

Best regards,
[Your Name]`,
      },
      {
        label: "quality_focused",
        subject: "Cable Management System — Durability and Finish Quality Inquiry",
        body: `Dear Quality Team at Lifesmart Hardware,

Our cable management system will be marketed as a premium product at $34.99 — double the average cable tray price. This premium positioning requires exceptional build quality and finish.

Key quality questions:
1. Powder-coat adhesion testing — what standards do you test against?
2. Telescoping mechanism lifecycle — can you test to 10,000 extension cycles?
3. Magnetic clip pull-force consistency across production batches?
4. Packaging quality for flat-pack products — damage rate during shipping?

We are willing to pay more per unit for documented quality assurance processes.

Best regards,
[Your Name]`,
      },
    ],
  },
  claudeModel: "claude-sonnet-4-20250514",
  createdAt: NOW,
};

// ── Suggestion 5: Portable Cold Brew Coffee Maker ────────────────────

const sug5: ProductSuggestion = {
  id: "sug-5",
  sourceProductIds: ["B0BPYTF2NB", "B09NLFDKM3"],
  sourceAnalysisIds: ["analysis-coldbrew-1"],
  title: "Portable Cold Brew Coffee Maker with Built-in Grinder",
  description:
    "An all-in-one portable cold brew system combining a ceramic burr grinder with a vacuum-insulated brewing chamber. Grinds and brews 16 oz of cold brew in 12-18 hours. USB-C rechargeable grinder eliminates the need for a separate device.",
  category: "Kitchen Gadgets",
  subcategory: "Coffee Makers",
  targetCustomer: "Coffee enthusiasts who want fresh-ground cold brew at home or while traveling",
  targetPrice: 59.99,
  painPointsAddressed: [
    { issue: "Need separate grinder for fresh cold brew", affectedPercentage: 48, proposedSolution: "Integrated ceramic burr grinder in the lid assembly" },
    { issue: "Cold brew makers are not portable", affectedPercentage: 36, proposedSolution: "Vacuum-insulated stainless steel body, leak-proof lid, carry strap" },
    { issue: "Inconsistent grind size affects extraction", affectedPercentage: 28, proposedSolution: "15-step grind adjustment dial calibrated for cold brew coarseness" },
  ],
  differentiators: [
    "Built-in ceramic burr grinder with USB-C charging",
    "Vacuum-insulated double-wall stainless steel",
    "15-step grind adjustment optimized for cold brew",
    "16 oz capacity with fine-mesh stainless filter (no paper filters needed)",
  ],
  trendSignals: [
    { signal: "\"cold brew coffee maker\" stable high-volume keyword", source: "google_trends", strength: "moderate" },
    { signal: "Portable coffee gadgets trending on Instagram Reels", source: "social", strength: "moderate" },
    { signal: "Cold brew category growing 15% YoY on Amazon", source: "amazon_movers", strength: "emerging" },
  ],
  riskFactors: [
    { risk: "Complex product with grinder + brewer integration", severity: "high", mitigation: "Extensive prototype testing; budget for 3 sample iterations" },
    { risk: "USB-C rechargeable component adds failure points", severity: "medium", mitigation: "Use proven motor/battery module from established supplier" },
    { risk: "Higher price point limits impulse purchases", severity: "low", mitigation: "Strong A+ content and video demonstrating value proposition" },
  ],
  viabilityScore: 68,
  viabilityBreakdown: { demandConfidence: 19, differentiationStrength: 17, marginPotential: 16, executionFeasibility: 16 },
  tier: "B",
  costEstimateId: "ce-5",
  supplierSearchId: "ss-5",
  status: "draft",
  generatedBy: "hybrid",
  claudeModel: "claude-sonnet-4-20250514",
  createdAt: NOW,
  updatedAt: NOW,
};

const ce5: CostEstimate = {
  id: "ce-5",
  suggestionId: "sug-5",
  sourcingCosts: { unitCost: 16.50, moqUnits: 300, moqTotalCost: 4950, sampleCost: 110 },
  shippingCosts: { seaFreight: 1.80, customsDuty: 0.85, importFees: 0.30, totalPerUnit: 2.95 },
  amazonFees: { fbaFulfillmentFee: 6.75, referralFee: 9.00, storageFeeMonthly: 0.35, totalPerUnit: 16.10 },
  launchBudget: { productPhotography: 1100, brandingAndPackaging: 750, sampleOrdering: 330, ppcLaunchBudget: 3500, amazonStorefront: 500, totalOneTime: 6180 },
  contingencyBuffer: 2370,
  totalStartupCapital: 16200,
  targetSalePrice: 59.99,
  estimatedNetMargin: 0.25,
  breakEvenUnits: 662,
  breakEvenMonths: 6,
  roi12Month: 1.9,
  monthlyProjections: generateProjections(59.99, 16.50, 2.95, 16.10, 16200),
  assumptions: [
    "Integrated grinder motor and ceramic burr assembly at $6.80/unit within total unit cost",
    "USB-C rechargeable Li-ion battery module at $2.40/unit within total unit cost",
    "Vacuum insulation adds $2.50/unit vs single-wall construction",
    "Higher PPC budget for competitive coffee category",
    "3 sample iterations budgeted at $110 each in launch costs",
  ],
  claudeModel: "claude-sonnet-4-20250514",
  createdAt: NOW,
};

const ss5: SupplierSearch = {
  id: "ss-5",
  suggestionId: "sug-5",
  searchKeywords: ["portable coffee grinder manufacturer", "cold brew coffee maker OEM", "vacuum insulated bottle factory", "ceramic burr grinder supplier", "USB rechargeable coffee grinder ODM"],
  productSpec: {
    productName: "Portable Cold Brew Coffee Maker with Built-in Grinder",
    keyMaterials: ["304 stainless steel body", "ceramic burr grinder", "Li-ion battery", "BPA-free Tritan lid", "food-grade silicone seals"],
    targetDimensions: "4 x 4 x 10 inches",
    targetWeight: "650g (empty)",
    requiredCertifications: ["FDA food contact", "FCC Part 15", "UL 2054 (battery)", "CA Prop 65"],
    packagingRequirements: "Premium retail box with magnetic closure, foam insert, USB-C cable, cleaning brush included",
    customizationNeeds: ["Integrated grinder-lid assembly", "15-step grind dial", "Custom vacuum bottle shape", "USB-C charging circuit"],
    targetUnitCost: 17.00,
    targetMOQ: 300,
  },
  filterCriteria: {
    minYearsInBusiness: 5,
    minTradeAssuranceUSD: 80000,
    requiredVerifications: ["Trade Assurance", "Verified Supplier"],
    minResponseRate: 80,
    maxMOQ: 500,
    maxLeadTimeDays: 45,
    preferredRegions: ["Guangdong", "Zhejiang"],
  },
  suppliers: [
    {
      id: "sup-13",
      companyName: "Dongguan Topline Coffee Equipment Co., Ltd",
      location: "Dongguan, Guangdong, China",
      yearsInBusiness: 11,
      mainProducts: ["portable coffee grinders", "manual coffee makers", "pour over sets", "coffee accessories"],
      tradeAssuranceUSD: 180000,
      verifications: ["Trade Assurance", "Verified Supplier", "ISO 9001", "BSCI Audited"],
      responseRate: 92,
      reviewScore: 4.6,
      moq: 300,
      leadTimeDays: 40,
      sampleCost: 95,
      totalScore: 84,
      scoreBreakdown: { reliabilityScore: 22, qualityScore: 22, commercialScore: 20, fitScore: 20 },
      rank: 1,
      pros: ["11 years coffee equipment specialization", "Existing ceramic burr grinder production line", "Experience with USB-C rechargeable products", "UL battery certification in place"],
      cons: ["Cold brew specific products are new to them", "Custom vacuum bottle requires sub-supplier"],
      recommendation: "Best match for the grinder component — their core competency. Partner with their recommended vacuum bottle sub-supplier for the body.",
    },
    {
      id: "sup-14",
      companyName: "Yongkang Hezhong Stainless Steel Products Co., Ltd",
      location: "Yongkang, Zhejiang, China",
      yearsInBusiness: 13,
      mainProducts: ["vacuum flasks", "insulated bottles", "stainless steel tumblers", "cold brew bottles"],
      tradeAssuranceUSD: 150000,
      verifications: ["Trade Assurance", "Verified Supplier", "SGS Audited"],
      responseRate: 86,
      reviewScore: 4.5,
      moq: 500,
      leadTimeDays: 30,
      sampleCost: 70,
      totalScore: 77,
      scoreBreakdown: { reliabilityScore: 21, qualityScore: 21, commercialScore: 18, fitScore: 17 },
      rank: 2,
      pros: ["Vacuum insulation expertise — Yongkang is the flask capital", "Existing cold brew bottle molds", "Fast lead times"],
      cons: ["No grinder/electronics experience", "Higher MOQ of 500", "Would need separate electronics assembly"],
      recommendation: "Excellent for the bottle body component. Consider a split-sourcing approach: bottle from Hezhong, grinder assembly from Topline.",
    },
    {
      id: "sup-15",
      companyName: "Shenzhen Kingrinder Technology Co., Ltd",
      location: "Shenzhen, Guangdong, China",
      yearsInBusiness: 6,
      mainProducts: ["electric coffee grinders", "manual burr grinders", "portable espresso makers", "coffee scales"],
      tradeAssuranceUSD: 90000,
      verifications: ["Trade Assurance", "Verified Supplier"],
      responseRate: 94,
      reviewScore: 4.7,
      moq: 200,
      leadTimeDays: 35,
      sampleCost: 110,
      totalScore: 75,
      scoreBreakdown: { reliabilityScore: 18, qualityScore: 22, commercialScore: 18, fitScore: 17 },
      rank: 3,
      pros: ["Highest grinder quality — known brand in specialty coffee community", "Low MOQ of 200", "Excellent English communication"],
      cons: ["Smaller company", "No bottle/insulation capability", "Premium pricing"],
      recommendation: "Top grinder quality but would only supply the grinder module. Consider if quality premium justifies the split-sourcing complexity.",
    },
  ],
  recommendedSupplierId: "sup-13",
  outreachMessage: {
    subject: "Integrated Cold Brew Maker + Grinder — OEM Development Project (300 units)",
    body: `Dear Topline Coffee Equipment Team,

We are developing a unique all-in-one portable cold brew coffee maker that integrates a ceramic burr grinder into the lid of a vacuum-insulated brewing chamber. Nothing like this exists on the market — we believe it is a significant opportunity.

Technical requirements:
- Ceramic burr grinder with 15-step adjustment dial in lid assembly
- USB-C rechargeable motor (2000+ mAh Li-ion)
- 304 stainless steel vacuum-insulated body (16 oz capacity)
- Fine-mesh stainless filter basket
- Leak-proof design for portability
- Certifications: FDA, FCC Part 15, UL 2054 (battery), CA Prop 65

We understand this is a custom development project and expect 2-3 prototype iterations. Initial production run: 300 units.

Please advise on:
1. Feasibility of integrating your grinder mechanism into a bottle lid
2. Development timeline and NRE (non-recurring engineering) costs
3. Whether you can source the vacuum bottle body or if we should supply separately
4. Prototype cost per iteration

Best regards,
[Your Name]
[Brand Name]`,
    tone: "professional",
    variants: [
      {
        label: "volume_focused",
        subject: "Coffee Gadget Brand — Multi-SKU Development Partnership",
        body: `Dear Topline Coffee Equipment Team,

We are building a coffee gadget brand targeting the specialty coffee consumer on Amazon. Our first product is an integrated cold brew maker with built-in grinder, followed by a portable espresso maker and a smart pour-over kettle.

Year 1 total units across all SKUs: 5,000+. We need a development partner who can handle both the engineering and production.

Interested in discussing an R&D partnership with volume commitments?

Best regards,
[Your Name]`,
      },
      {
        label: "quality_focused",
        subject: "Cold Brew Grinder Integration — Engineering Feasibility Discussion",
        body: `Dear Engineering Team at Topline Coffee,

We are developing a cold brew maker with an integrated ceramic burr grinder — a product that does not exist on the market yet. Before commercial discussions, we need to validate engineering feasibility.

Key technical questions:
1. Can your ceramic burr assembly be miniaturized to fit a 4-inch diameter lid?
2. What torque does your motor deliver? We need consistent coarse grind for cold brew.
3. Battery life expectation — how many grinds per charge with a 2000 mAh cell?
4. Waterproofing approach for the grinder-to-bottle seal?
5. Drop test data for your existing grinder products?

We have preliminary CAD models and would appreciate a DFM (Design for Manufacturing) review.

Best regards,
[Your Name]`,
      },
    ],
  },
  claudeModel: "claude-sonnet-4-20250514",
  createdAt: NOW,
};

// ── Suggestion 6: Smart Posture-Correcting Lumbar Pillow ─────────────

const sug6: ProductSuggestion = {
  id: "sug-6",
  sourceProductIds: ["B0CG8R6J35", "B0B1KPQMZV"],
  sourceAnalysisIds: ["analysis-lumbar-1", "analysis-lumbar-2"],
  title: "Smart Posture-Correcting Lumbar Pillow with Haptic Feedback",
  description:
    "A memory foam lumbar pillow with an embedded pressure sensor array and Bluetooth-connected haptic motor. When the user slouches or shifts out of optimal alignment, gentle vibration pulses remind them to correct posture. Companion app tracks posture score over time.",
  category: "Health & Wellness",
  subcategory: "Back Support",
  targetCustomer: "Office workers and remote professionals suffering from lower back pain due to poor sitting posture",
  targetPrice: 69.99,
  painPointsAddressed: [
    { issue: "Forget to maintain good posture", affectedPercentage: 62, proposedSolution: "Haptic vibration feedback when posture deviates from baseline" },
    { issue: "Generic lumbar pillows do not fit all chair types", affectedPercentage: 45, proposedSolution: "Adjustable strap system compatible with office, gaming, and car seats" },
    { issue: "No way to track posture improvement", affectedPercentage: 32, proposedSolution: "BLE app with daily posture score, trends, and streak tracking" },
    { issue: "Lumbar pillows flatten over time", affectedPercentage: 28, proposedSolution: "Dual-density memory foam with reinforced core maintains shape 2x longer" },
  ],
  differentiators: [
    "Embedded pressure sensor array detects posture deviation",
    "Haptic feedback motor with adjustable intensity",
    "BLE companion app with posture score tracking",
    "Dual-density memory foam with reinforced core",
    "Universal strap fits office, gaming, and car seats",
  ],
  trendSignals: [
    { signal: "\"posture corrector\" is a $1.2B global market growing 8% CAGR", source: "claude_inference", strength: "moderate" },
    { signal: "\"smart posture\" searches emerging but low volume", source: "google_trends", strength: "emerging" },
  ],
  riskFactors: [
    { risk: "Complex product with electronics in a cushion form factor", severity: "high", mitigation: "Partner with experienced IoT cushion manufacturer; extensive durability testing" },
    { risk: "FDA regulatory risk if marketed as medical device", severity: "high", mitigation: "Position as wellness/lifestyle product; avoid therapeutic claims in listing" },
    { risk: "High unit cost limits margin", severity: "medium", mitigation: "Target $69.99 price point; optimize BOM through Tuya platform" },
    { risk: "User fatigue with haptic reminders", severity: "low", mitigation: "Adjustable sensitivity and quiet hours in app settings" },
  ],
  viabilityScore: 62,
  viabilityBreakdown: { demandConfidence: 17, differentiationStrength: 16, marginPotential: 15, executionFeasibility: 14 },
  tier: "B",
  costEstimateId: "ce-6",
  supplierSearchId: "ss-6",
  status: "draft",
  generatedBy: "trend_expansion",
  claudeModel: "claude-sonnet-4-20250514",
  createdAt: NOW,
  updatedAt: NOW,
};

const ce6: CostEstimate = {
  id: "ce-6",
  suggestionId: "sug-6",
  sourcingCosts: { unitCost: 22.80, moqUnits: 200, moqTotalCost: 4560, sampleCost: 150 },
  shippingCosts: { seaFreight: 2.20, customsDuty: 1.15, importFees: 0.40, totalPerUnit: 3.75 },
  amazonFees: { fbaFulfillmentFee: 7.50, referralFee: 10.50, storageFeeMonthly: 0.52, totalPerUnit: 18.52 },
  launchBudget: { productPhotography: 1200, brandingAndPackaging: 900, sampleOrdering: 450, ppcLaunchBudget: 4500, amazonStorefront: 600, totalOneTime: 7650 },
  contingencyBuffer: 2940,
  totalStartupCapital: 19500,
  targetSalePrice: 69.99,
  estimatedNetMargin: 0.22,
  breakEvenUnits: 782,
  breakEvenMonths: 7,
  roi12Month: 1.5,
  monthlyProjections: generateProjections(69.99, 22.80, 3.75, 18.52, 19500),
  assumptions: [
    "Pressure sensor array ($4.20) and haptic motor ($1.80) included in unit cost",
    "BLE module (ESP32-C3) at $2.30 included in unit cost",
    "Memory foam body at $8.50 with dual-density reinforced core",
    "Tuya app whitelabel for companion app ($0/unit, setup fee in launch budget)",
    "Higher PPC budget needed for Health & Wellness category competition",
    "FDA compliance review cost ($1,500) included in contingency buffer",
  ],
  claudeModel: "claude-sonnet-4-20250514",
  createdAt: NOW,
};

const ss6: SupplierSearch = {
  id: "ss-6",
  suggestionId: "sug-6",
  searchKeywords: ["smart cushion manufacturer", "memory foam pillow factory IoT", "posture corrector OEM", "haptic feedback cushion supplier", "Bluetooth lumbar support ODM"],
  productSpec: {
    productName: "Smart Posture-Correcting Lumbar Pillow with Haptic Feedback",
    keyMaterials: ["dual-density memory foam", "pressure sensor array", "ERM haptic motor", "ESP32-C3 BLE module", "breathable mesh cover"],
    targetDimensions: "13 x 12 x 4 inches",
    targetWeight: "680g",
    requiredCertifications: ["FCC Part 15", "RoHS", "REACH", "CertiPUR-US (foam)", "CA Prop 65"],
    packagingRequirements: "Retail box with vacuum-compressed pillow, USB-C cable, quick start guide, QR to app download",
    customizationNeeds: ["Embedded sensor array placement", "Haptic motor calibration", "BLE firmware with Tuya SDK", "Custom foam mold", "Adjustable strap system"],
    targetUnitCost: 24.00,
    targetMOQ: 200,
  },
  filterCriteria: {
    minYearsInBusiness: 5,
    minTradeAssuranceUSD: 80000,
    requiredVerifications: ["Trade Assurance", "Verified Supplier"],
    minResponseRate: 75,
    maxMOQ: 500,
    maxLeadTimeDays: 50,
    preferredRegions: ["Guangdong", "Zhejiang", "Fujian"],
  },
  suppliers: [
    {
      id: "sup-16",
      companyName: "Shenzhen Sleepace Technology Co., Ltd",
      location: "Shenzhen, Guangdong, China",
      yearsInBusiness: 10,
      mainProducts: ["smart sleep monitors", "IoT cushions", "smart pillows", "health tracking devices"],
      tradeAssuranceUSD: 250000,
      verifications: ["Trade Assurance", "Verified Supplier", "ISO 13485", "ISO 9001"],
      responseRate: 90,
      reviewScore: 4.6,
      moq: 300,
      leadTimeDays: 45,
      sampleCost: 150,
      totalScore: 85,
      scoreBreakdown: { reliabilityScore: 22, qualityScore: 23, commercialScore: 20, fitScore: 20 },
      rank: 1,
      pros: ["Smart cushion/pillow category leader", "In-house sensor and firmware team", "ISO 13485 medical device quality standard", "Existing Tuya and custom app experience"],
      cons: ["Higher MOQ of 300 units", "Premium pricing", "Long lead time of 45 days"],
      recommendation: "Best overall fit — they have built smart cushions before. ISO 13485 certification provides confidence for health-adjacent products. Worth the premium.",
    },
    {
      id: "sup-17",
      companyName: "Nantong Yimeng Home Textile Co., Ltd",
      location: "Nantong, Jiangsu, China",
      yearsInBusiness: 15,
      mainProducts: ["memory foam pillows", "lumbar cushions", "seat cushions", "mattress toppers"],
      tradeAssuranceUSD: 180000,
      verifications: ["Trade Assurance", "Verified Supplier", "CertiPUR-US", "OEKO-TEX"],
      responseRate: 87,
      reviewScore: 4.5,
      moq: 200,
      leadTimeDays: 25,
      sampleCost: 60,
      totalScore: 76,
      scoreBreakdown: { reliabilityScore: 21, qualityScore: 22, commercialScore: 18, fitScore: 15 },
      rank: 2,
      pros: ["15 years memory foam expertise", "CertiPUR-US certified foam", "Low MOQ and fast lead time", "Competitive pricing on foam products"],
      cons: ["No IoT/electronics capability at all", "Would need separate electronics partner", "No smart product experience"],
      recommendation: "Best foam quality at the best price, but zero electronics capability. Use for foam body sourcing only, paired with Sleepace for electronics integration.",
    },
    {
      id: "sup-18",
      companyName: "Xiamen Richer Electronic Technology Co., Ltd",
      location: "Xiamen, Fujian, China",
      yearsInBusiness: 8,
      mainProducts: ["wearable posture correctors", "smart health devices", "BLE fitness trackers", "haptic feedback devices"],
      tradeAssuranceUSD: 100000,
      verifications: ["Trade Assurance", "Verified Supplier", "FCC Certified"],
      responseRate: 91,
      reviewScore: 4.3,
      moq: 200,
      leadTimeDays: 40,
      sampleCost: 130,
      totalScore: 74,
      scoreBreakdown: { reliabilityScore: 19, qualityScore: 19, commercialScore: 18, fitScore: 18 },
      rank: 3,
      pros: ["Haptic feedback device experience", "FCC pre-certified BLE modules", "Posture corrector category knowledge", "Reasonable MOQ"],
      cons: ["Primarily wearables — cushion form factor is new", "Smaller company", "Foam sourcing would be sub-contracted"],
      recommendation: "Strong electronics and haptic expertise from wearable posture correctors. Good option if you want haptic calibration precision but need to verify cushion manufacturing capability.",
    },
    {
      id: "sup-19",
      companyName: "Dongguan Bosheng Foam Products Co., Ltd",
      location: "Dongguan, Guangdong, China",
      yearsInBusiness: 12,
      mainProducts: ["car seat cushions", "office lumbar pillows", "memory foam products", "automotive headrests"],
      tradeAssuranceUSD: 120000,
      verifications: ["Trade Assurance", "Verified Supplier", "ISO 9001"],
      responseRate: 83,
      reviewScore: 4.2,
      moq: 500,
      leadTimeDays: 20,
      sampleCost: 45,
      totalScore: 68,
      scoreBreakdown: { reliabilityScore: 19, qualityScore: 18, commercialScore: 16, fitScore: 15 },
      rank: 4,
      pros: ["Lumbar pillow specialization", "Fast 20-day lead time", "Competitive pricing on foam products", "Automotive-grade quality standards"],
      cons: ["No electronics capability", "Higher MOQ of 500", "Would need complete electronics sub-contracting"],
      recommendation: "Budget foam supplier with relevant lumbar pillow experience. Best suited as a secondary foam source for cost comparison, not as primary partner for a smart product.",
    },
  ],
  recommendedSupplierId: "sup-16",
  outreachMessage: {
    subject: "Smart Posture Lumbar Pillow — IoT Cushion OEM Project (200-300 units)",
    body: `Dear Sleepace Technology Team,

We are developing a smart lumbar pillow with embedded posture sensing and haptic feedback for the US Amazon market. Your expertise in smart sleep and health products makes you a natural partner for this project.

Product concept:
- Dual-density memory foam lumbar pillow
- Embedded pressure sensor array detects posture deviation from calibrated baseline
- ERM haptic motor provides gentle vibration correction reminders
- BLE connectivity to companion app (posture score, trends, streak tracking)
- Universal strap system for office, gaming, and car seats
- Certifications needed: FCC Part 15, RoHS, REACH, CertiPUR-US, CA Prop 65

Key questions:
1. Have you built a product with this exact sensor + haptic + BLE combination before?
2. Can your firmware team develop the posture detection algorithm, or should we supply it?
3. Tuya app integration vs custom app — your recommendation?
4. Unit pricing at 200 / 300 / 500 tiers
5. Full development timeline from concept to production-ready

We are willing to invest in a proper R&D phase and understand this requires 2-3 prototype iterations.

Best regards,
[Your Name]
[Brand Name]`,
    tone: "professional",
    variants: [
      {
        label: "volume_focused",
        subject: "Smart Health Products Line — Ergonomic Pillow + Future SKUs",
        body: `Dear Sleepace Technology Team,

We are building a smart ergonomic products brand on Amazon US. Our first SKU is a posture-correcting lumbar pillow with haptic feedback, followed by a smart neck pillow and a posture-sensing seat cushion.

Combined Year 1 projection: 3,000+ units across the line. We want a single R&D and manufacturing partner who can own the electronics platform across all SKUs.

Can we schedule a call to discuss partnership terms and shared platform development?

Best regards,
[Your Name]`,
      },
      {
        label: "quality_focused",
        subject: "Smart Lumbar Pillow — Sensor Accuracy and Durability Inquiry",
        body: `Dear Engineering Team at Sleepace Technology,

Our smart lumbar pillow will be positioned as a premium wellness product at $69.99. Before commercial discussions, we need to validate technical feasibility on several fronts:

Sensor Performance:
1. What pressure sensor technology do you recommend for posture detection through foam?
2. Sensor accuracy drift over time — how do you calibrate for foam compression aging?
3. Can the sensor array detect lateral slouching in addition to forward lean?

Haptic Feedback:
1. ERM vs LRA motor — your recommendation for a cushion form factor?
2. Motor lifecycle rating (hours of continuous operation)?
3. User-perceivable vibration through memory foam — minimum intensity required?

Durability:
1. Can the electronics survive 1,000+ wash cycles of the removable cover?
2. Foam compression set after 12 months of daily use — what density do you recommend?

We are engineering-minded buyers who value data over promises.

Best regards,
[Your Name]`,
      },
    ],
  },
  claudeModel: "claude-sonnet-4-20250514",
  createdAt: NOW,
};

// ══════════════════════════════════════════════════════════════════════
// ── Bulk Suggestion Generator (120 deterministic FBA opportunities) ──
// ══════════════════════════════════════════════════════════════════════

/** Mulberry32 PRNG — deterministic 32-bit seeded random */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Product idea templates (120 specific FBA opportunities) ──────────

interface ProductTemplate {
  title: string;
  description: string;
  category: string;
  subcategory: string;
}

const PRODUCT_TEMPLATES: ProductTemplate[] = [
  // ── Kitchen Gadgets (1-6) ──
  {
    title: "Magnetic Spice Rack with Modular Stackable Jars — Clear Acrylic Lids with Built-in Pour Spouts",
    description: "A wall-mounted or fridge-attached magnetic spice rack system with 12 hexagonal jars. Each jar features a dual-mode lid with pour spout and shaker holes. Competitors use flimsy plastic lids that crack within months.",
    category: "Kitchen Gadgets",
    subcategory: "Spice Organization",
  },
  {
    title: "Self-Heating Ceramic Coffee Mug with Temperature Control — 12oz Ember-Style at Half the Price",
    description: "A ceramic mug with an integrated PTC heating element and touch-sensitive temperature dial on the base. Maintains coffee between 120-160F. Current market leader is $130 — this targets the $55 sweet spot with 85% of the functionality.",
    category: "Kitchen Gadgets",
    subcategory: "Drinkware",
  },
  {
    title: "Adjustable Mandoline Slicer with Hand Guard Dock — 18 Thickness Settings",
    description: "A V-blade mandoline with a micro-dial for 18 thickness settings from paper-thin to 8mm. Integrated hand guard dock clips to the unit for safe storage. Top-selling competitors have only 4-5 settings and separate hand guards that get lost.",
    category: "Kitchen Gadgets",
    subcategory: "Cutting & Slicing",
  },
  {
    title: "Silicone Stretch Lid Set with Numbered Sizing System — 14-Piece Universal Fit",
    description: "Premium silicone stretch lids with embossed size numbers and color coding for instant fit identification. Includes 3 rare sizes (odd-diameter) that competitors skip. Competitor lids slip off round containers due to poor sealing ridge design.",
    category: "Kitchen Gadgets",
    subcategory: "Food Storage",
  },
  {
    title: "Electric Herb Stripper and Chopper — USB-C Rechargeable with Collection Cup",
    description: "A one-handed electric herb stripper that pulls leaves from stems (rosemary, thyme, cilantro) and deposits them into a built-in collection cup. Manual herb strippers exist but leave bruised leaves and require two hands.",
    category: "Kitchen Gadgets",
    subcategory: "Herb Tools",
  },
  {
    title: "Anti-Spill Magnetic Spoon Rest — Weighted Silicone with Drip Tray",
    description: "A weighted silicone spoon rest with embedded magnets that grip stainless steel utensils. Elevated rails keep spoons off the counter while a removable drip tray catches liquids. Existing spoon rests slide around and spoons roll off.",
    category: "Kitchen Gadgets",
    subcategory: "Utensil Accessories",
  },

  // ── Fitness Equipment (7-12) ──
  {
    title: "Rotating Push-Up Handles with Digital Rep Counter — Anti-Slip Rubber Base",
    description: "Push-up handles with 360-degree rotation for joint-friendly motion and a built-in accelerometer that counts reps displayed on an integrated LCD. Competitors sell static handles with no tracking, forcing users to count manually or buy separate devices.",
    category: "Fitness Equipment",
    subcategory: "Bodyweight Training",
  },
  {
    title: "Adjustable Ankle Weight Bands with Removable Steel Shot Bags — 1-5lb Per Leg",
    description: "Neoprene ankle weights with a velcro pocket system holding 10 individual 0.5lb steel shot bags per ankle. Adjust in 0.5lb increments. Current products use sand filling that shifts during movement and fixed weights that offer no progression.",
    category: "Fitness Equipment",
    subcategory: "Ankle Weights",
  },
  {
    title: "Compact Folding Ab Roller with Rebound Assist Spring — Knee Pad Included",
    description: "An ab roller with an internal spring providing 15lbs of rebound assist for beginners, disengageable for advanced users. Folds flat for storage. Competitor ab rollers have no assist option, making them inaccessible to beginners who need them most.",
    category: "Fitness Equipment",
    subcategory: "Core Training",
  },
  {
    title: "Smart Jump Rope with LED Rep Display — Ball Bearing Handles and Adjustable Length",
    description: "A speed jump rope with sealed ball bearings for tangle-free rotation and handles with embedded LED displays showing rep count, calories, and timer. Length adjusts with internal cable lock. Existing smart ropes cost $60+ and require phone apps.",
    category: "Fitness Equipment",
    subcategory: "Cardio Accessories",
  },
  {
    title: "Portable Door-Mount Resistance Band Anchor System — 5-Point Multi-Height Design",
    description: "A door-frame anchor plate with 5 attachment points at different heights for resistance band exercises. No permanent installation — foam backing protects door frame. Competitors sell single-anchor straps that limit exercise variety.",
    category: "Fitness Equipment",
    subcategory: "Resistance Training",
  },
  {
    title: "Curved Balance Board with Grip Tape Surface — Anti-Slip Stoppers and Exercise Guide",
    description: "A wooden balance board with a curved rocker base, grip tape deck surface, and rubber end-stoppers that prevent the board from touching the ground. Includes a printed exercise guide. Competitors use smooth finishes that become slippery with sweat.",
    category: "Fitness Equipment",
    subcategory: "Balance & Stability",
  },

  // ── Pet Supplies (13-18) ──
  {
    title: "Slow Feeder Dog Bowl with Suction Cup Base — Dishwasher-Safe Stainless Steel",
    description: "A stainless steel slow feeder with maze-pattern ridges and a silicone suction cup base that locks to any smooth floor. Prevents bowl sliding and flipping. Competitor plastic slow feeders harbor bacteria in scratched ridges and slide across floors.",
    category: "Pet Supplies",
    subcategory: "Feeding Bowls",
  },
  {
    title: "Hands-Free Dog Leash with Shock-Absorbing Bungee — Waist Belt with Poop Bag Dispenser",
    description: "A running/walking leash system with a padded waist belt, dual-handle bungee leash (waist + hand grip), and integrated poop bag roll holder with one-handed tear dispenser. Existing hands-free leashes lack shock absorption, causing jarring pulls.",
    category: "Pet Supplies",
    subcategory: "Leashes & Harnesses",
  },
  {
    title: "Self-Cleaning Cat Litter Scoop with Antimicrobial Coating — Caddy Stand Included",
    description: "A stainless steel litter scoop with a patented sifting mechanism that separates clumps in one motion, plus a matching caddy that stores the scoop hygienically near the litter box. Competitor plastic scoops bend under heavy clumps and have no storage solution.",
    category: "Pet Supplies",
    subcategory: "Litter Accessories",
  },
  {
    title: "Interactive Treat Puzzle Ball for Dogs — Adjustable Difficulty with 3 Insert Levels",
    description: "A durable rubber treat-dispensing ball with 3 swappable internal inserts that change difficulty from easy to expert. Keeps dogs mentally stimulated for 20-45 minutes. Competitor treat balls have fixed difficulty and dogs solve them in under 5 minutes.",
    category: "Pet Supplies",
    subcategory: "Dog Toys",
  },
  {
    title: "Elevated Dog Bed with Breathable Mesh — Waterproof Oxford Frame for Outdoor Use",
    description: "A raised dog cot with 600D Oxford frame and Teslin mesh sleeping surface that stays cool in summer. Reinforced corner joints prevent the wobbling and collapsing that plagues competing elevated beds in Amazon reviews.",
    category: "Pet Supplies",
    subcategory: "Dog Beds",
  },
  {
    title: "Pet Nail Grinder with LED Light and Dust Guard — Whisper-Quiet 40dB Motor",
    description: "A cordless nail grinder with 2-speed diamond bit, LED illumination for nail quick visibility, and a clear dust guard cap. Operates at 40dB vs 65dB+ for competitors. Top complaints in the category are noise-scared pets and grinding without visual guidance.",
    category: "Pet Supplies",
    subcategory: "Grooming Tools",
  },

  // ── Home Office (19-24) ──
  {
    title: "Dual Monitor Arm with Integrated USB Hub — Gas Spring C-Clamp Mount",
    description: "A dual monitor arm with independently articulating gas-spring arms and a 4-port USB 3.0 hub built into the base pole. Cable management channels run through the arms. Competitors require a separate hub and have no integrated cable routing.",
    category: "Home Office",
    subcategory: "Monitor Mounts",
  },
  {
    title: "Acoustic Desk Divider Panel — Sound-Absorbing Felt with Whiteboard Side",
    description: "A clamp-on desk privacy panel made from recycled PET felt (NRC 0.85) with a dry-erase whiteboard surface on the user-facing side. Reduces open-office noise by 12dB. Competitors sell plain fabric panels with no dual-function utility.",
    category: "Home Office",
    subcategory: "Desk Accessories",
  },
  {
    title: "Under-Desk Keyboard Tray with Wrist Rest — Adjustable Tilt and 360-Degree Swivel",
    description: "A slide-out keyboard tray with gel wrist rest, -15 to +15 degree tilt, and full 360 swivel. Accommodates keyboards up to 20 inches wide. Competitor trays lack swivel capability and have flimsy rails that sag under keyboard weight.",
    category: "Home Office",
    subcategory: "Ergonomic Accessories",
  },
  {
    title: "Desktop Document Camera Stand with LED Ring Light — Adjustable Arm for Video Calls",
    description: "A gooseneck arm with a smartphone/webcam mount and an integrated LED ring light for overhead document display during video meetings. A growing use case with no dominant product — existing solutions are cobbled together from generic phone holders.",
    category: "Home Office",
    subcategory: "Video Conferencing",
  },
  {
    title: "Magnetic Desk Organizer with Wireless Charging Pad — Modular Compartments",
    description: "A desk organizer with neodymium magnets holding modular pen cups, card slots, and a phone stand, all on a bamboo base with an embedded 15W Qi wireless charging pad. No competitor combines organization with wireless charging in one footprint.",
    category: "Home Office",
    subcategory: "Desk Organization",
  },
  {
    title: "Footrest with Heating Pad and Massage Rollers — USB-Powered for Under-Desk Use",
    description: "An ergonomic under-desk footrest combining a PTC heating element (3 settings) with textured massage rollers on the surface. USB-powered, no wall outlet needed. Existing footrests are either heated OR have massage features, never both.",
    category: "Home Office",
    subcategory: "Ergonomic Accessories",
  },

  // ── Beauty Tools (25-30) ──
  {
    title: "Ice Roller Face Massager with Stainless Steel Head — Leak-Proof Gel Core",
    description: "A facial ice roller with a sealed stainless steel head containing phase-change gel that stays cold for 20+ minutes. Competitors use cheap zinc alloy that oxidizes and plastic gel-filled rollers that leak after months of freezer cycling.",
    category: "Beauty Tools",
    subcategory: "Facial Massage",
  },
  {
    title: "LED Light Therapy Wand with 3 Wavelengths — Red, Blue, and Near-Infrared",
    description: "A handheld LED therapy device delivering red (630nm), blue (415nm), and near-infrared (850nm) wavelengths through medical-grade LEDs. Timer auto-shutoff at 3/5/10 minute intervals. Competitors offer single-wavelength devices at similar prices.",
    category: "Beauty Tools",
    subcategory: "Skin Care Devices",
  },
  {
    title: "Heated Eyelash Curler with Comb Design — USB-C Rechargeable, 3 Temperature Settings",
    description: "An electric heated eyelash curler using a comb-style design instead of clamp, preventing lash crimping and breakage. Three heat settings for fine, normal, and thick lashes. Clamp-style competitors cause lash breakage — the #1 complaint in the category.",
    category: "Beauty Tools",
    subcategory: "Eye Makeup Tools",
  },
  {
    title: "Scalp Massager Shampoo Brush with Soft Silicone Bristles — Ergonomic Palm Grip",
    description: "A palm-grip silicone scalp massager with two bristle zones: fine tips for sensitive scalps and medium tips for deep cleansing. Drainage holes prevent mildew. Competitor massagers use uniform bristle stiffness that is either too soft or too harsh.",
    category: "Beauty Tools",
    subcategory: "Hair Care Tools",
  },
  {
    title: "Dermaplaning Tool Set with Magnifying Mirror — 6 Precision Blades in Travel Case",
    description: "A stainless steel dermaplaning handle with 6 replaceable surgical-grade blades, a 5x magnifying suction mirror, and a silicone travel case. Disposable dermaplane razors dominate but generate waste and lack precision blade angle control.",
    category: "Beauty Tools",
    subcategory: "Hair Removal",
  },
  {
    title: "UV Sanitizer Box for Makeup Brushes — 99.9% Kill Rate with Drying Fan",
    description: "A compact UV-C sanitizer box sized specifically for makeup brushes and sponges with an integrated drying fan to prevent mold. 5-minute cycle kills 99.9% of bacteria. No dedicated brush sanitizer exists on Amazon — only generic phone sanitizer boxes.",
    category: "Beauty Tools",
    subcategory: "Brush Care",
  },

  // ── Electronics Accessories (31-36) ──
  {
    title: "Magnetic Cable Organizer Clips with Weighted Base — Desktop Cable Management for 6 Cables",
    description: "A weighted (350g) cable organizer with 6 magnetic silicone channels that grip USB-C, Lightning, and micro-USB cables without slipping. Adhesive-backed competitors slide off desks within weeks. The weighted base stays put without any adhesive.",
    category: "Electronics Accessories",
    subcategory: "Cable Management",
  },
  {
    title: "Laptop Stand with Integrated Cooling Fan — Aluminum Alloy, 6-Angle Adjustable",
    description: "An aluminum laptop stand with a silent 2000RPM fan powered via USB pass-through. Adjusts through 6 angles from 15 to 45 degrees. Reduces laptop surface temperature by 8-12C. Competitors offer either stands OR cooling pads, not both in one unit.",
    category: "Electronics Accessories",
    subcategory: "Laptop Accessories",
  },
  {
    title: "Wireless Earbuds Cleaning Kit with UV Sterilizer — 8 Precision Tools in Charging Case",
    description: "A pen-sized cleaning kit with 8 interchangeable tips (brush, pick, sponge, air blower) and a UV-C sterilizer compartment for earbud tips. Designed specifically for AirPods and similar TWS earbuds. Generic cleaning kits lack UV sterilization and earbud-specific tools.",
    category: "Electronics Accessories",
    subcategory: "Cleaning & Maintenance",
  },
  {
    title: "Multi-Device Charging Station with Valet Tray — Bamboo Top with 4-Port USB-C PD",
    description: "A nightstand charging station combining a bamboo valet tray (for keys, wallet, watch) with a hidden 4-port USB-C PD hub delivering up to 100W total. Cable pass-through slots keep wires invisible. Current options are either ugly plastic hubs or decorative trays without charging.",
    category: "Electronics Accessories",
    subcategory: "Charging Solutions",
  },
  {
    title: "Privacy Screen Protector with Blue Light Filter — Anti-Spy for 13-16 inch Laptops",
    description: "A magnetic-attach privacy screen with integrated blue light filtering (cut 50% of 400-450nm light) and anti-glare coating. Attaches and removes in seconds via embedded magnets — no adhesive. Competitor screens require permanent adhesive strips that damage bezels.",
    category: "Electronics Accessories",
    subcategory: "Screen Protection",
  },
  {
    title: "Webcam Cover Slide with Built-in Mic Blocker — Ultra-Thin 0.7mm for Laptops",
    description: "A 0.7mm ultra-thin webcam cover that also physically blocks the laptop microphone port via an integrated sound-dampening plug on a flexible arm. Existing webcam covers only block the camera — this addresses both visual and audio privacy concerns.",
    category: "Electronics Accessories",
    subcategory: "Privacy Accessories",
  },

  // ── Baby Products (37-42) ──
  {
    title: "Silicone Suction Plate with Detachable Utensil Holder — 3-Compartment Divided Design",
    description: "A food-grade silicone suction plate with 3 divided compartments and a snap-on utensil dock that holds a spoon and fork at the plate rim. Strong suction cup rated for 30lbs of pull force. Competitor suction plates have weak suction that toddlers defeat easily.",
    category: "Baby Products",
    subcategory: "Feeding Accessories",
  },
  {
    title: "Portable White Noise Machine for Strollers — Clip-On Design with 20 Sounds",
    description: "A compact clip-on white noise machine designed for strollers and car seats. 20 sound profiles, auto-off timer, and a reactive mode that re-activates when baby cries. Existing portable machines lack the clip mechanism and reactive sound activation.",
    category: "Baby Products",
    subcategory: "Sleep Aids",
  },
  {
    title: "Baby Nail Trimmer with LED Light — Electric File with 4 Pads for Newborn to Toddler",
    description: "An electric baby nail file with integrated LED light for visibility, 4 interchangeable grinding pads (newborn soft, infant, toddler, adult), and a whisper-quiet 35dB motor. Top competitor complaint: grinding pads wear out fast and replacements are unavailable.",
    category: "Baby Products",
    subcategory: "Health & Safety",
  },
  {
    title: "Stroller Organizer with Insulated Cup Holders — Universal Fit with Anti-Theft Zipper",
    description: "A stroller handlebar organizer with two insulated cup holders, a zippered anti-theft main compartment, and a quick-access phone pocket with clear touchscreen window. Universal strap system fits 99% of strollers. Competitor organizers sag under weight and have no insulation.",
    category: "Baby Products",
    subcategory: "Stroller Accessories",
  },
  {
    title: "Teething Mitten with Crinkle Sound — Food-Grade Silicone Fingers with Velcro Strap",
    description: "A teething mitten with textured silicone finger tips for gum relief, a built-in crinkle panel for sensory engagement, and an adjustable velcro wrist strap that toddlers cannot remove. Competitor mittens fall off constantly — the #1 one-star complaint.",
    category: "Baby Products",
    subcategory: "Teething",
  },
  {
    title: "Diaper Caddy Organizer with Changing Mat — Felt Storage with Wipeable Portable Pad",
    description: "A structured felt diaper caddy with 8 compartments and a built-in foldout changing mat with a wipeable PU leather surface. Eliminates the need for a separate changing pad when moving between rooms. No competitor combines caddy and changing mat.",
    category: "Baby Products",
    subcategory: "Diaper Organization",
  },

  // ── Health & Wellness (43-48) ──
  {
    title: "Acupressure Mat and Pillow Set with Carry Bag — 6,210 Points Coconut Fiber Filled",
    description: "An acupressure mat with 6,210 pressure points on a coconut fiber base (not cheap foam) with a matching neck pillow and a drawstring carry bag. Competitor mats use thin foam that bottoms out and plastic tips that break off into skin.",
    category: "Health & Wellness",
    subcategory: "Pain Relief",
  },
  {
    title: "Posture Corrector Brace with Adjustable Tension Straps — Breathable Mesh for All-Day Wear",
    description: "A figure-8 posture corrector with padded underarm straps, adjustable tension dial (not just velcro), and breathable mesh panels for 8+ hour comfort. 78% of posture corrector complaints cite discomfort — this targets all-day wearability.",
    category: "Health & Wellness",
    subcategory: "Posture Support",
  },
  {
    title: "Percussion Mini Massage Gun — Ultra-Compact 12oz with 4 Speeds and Heated Tip",
    description: "A palm-sized massage gun weighing just 12oz with 4 percussion speeds and an optional heated massage tip attachment. USB-C rechargeable with 4 hour battery life. Competing mini guns lack heating capability and weigh 1.5-2lbs.",
    category: "Health & Wellness",
    subcategory: "Massage Devices",
  },
  {
    title: "Blue Light Blocking Glasses with Magnetic Clip-On Sunglasses — Prescription-Ready Frames",
    description: "Blue light filtering glasses with a magnetic clip-on sunglass attachment that converts them for outdoor use. Ships with clear lenses and amber computer lenses. No competitor offers the magnetic dual-purpose design in the blue light glasses category.",
    category: "Health & Wellness",
    subcategory: "Eye Health",
  },
  {
    title: "Aromatherapy Shower Steamers — 18-Pack Variety with Essential Oils and Menthol",
    description: "Shower-activated aromatherapy tablets in 6 scents (eucalyptus, lavender, citrus, peppermint, chamomile, cedar) with 3 of each. Uses pharmaceutical-grade menthol crystals for sinus opening. Competitor steamers dissolve too fast (under 2 minutes) and have weak scent throw.",
    category: "Health & Wellness",
    subcategory: "Aromatherapy",
  },
  {
    title: "Weighted Sleep Mask with Cooling Gel Insert — Contoured 3D Design for Side Sleepers",
    description: "A 0.5lb weighted sleep mask with a removable cooling gel insert, 3D contoured nose bridge for complete blackout, and adjustable buckle strap (not elastic). Addresses three top complaints: masks that press on eyes, let in light at the nose, and elastic that tangles hair.",
    category: "Health & Wellness",
    subcategory: "Sleep Accessories",
  },

  // ── Tools & Home Improvement (49-54) ──
  {
    title: "Magnetic Wristband for Screws and Nails — 15 N52 Magnets with Silicone Grip Padding",
    description: "A wristband embedded with 15 strong N52 neodymium magnets for holding screws, nails, drill bits, and bolts while working overhead or on ladders. Breathable mesh with silicone grip pads. Competitor bands use weak magnets that drop screws mid-project.",
    category: "Tools & Home Improvement",
    subcategory: "Hand Tool Accessories",
  },
  {
    title: "Self-Leveling Laser Line with Rechargeable Battery — Green Beam Cross-Line 50ft Range",
    description: "A compact self-leveling cross-line laser with green beam (4x more visible than red) and USB-C rechargeable battery replacing disposable AA cells. 50ft range with pulse mode for outdoor use. Entry-level lasers still use red beams and disposable batteries.",
    category: "Tools & Home Improvement",
    subcategory: "Measuring & Layout",
  },
  {
    title: "Flexible Drill Bit Extension Shaft — 11.8 inch with Magnetic Bit Holder",
    description: "A flexible extension shaft for drills and screwdrivers that bends up to 140 degrees for tight spaces like cabinet interiors and behind appliances. Magnetic bit holder prevents bit drop. Existing flex shafts lack magnetism and strip bits due to poor chuck grip.",
    category: "Tools & Home Improvement",
    subcategory: "Drill Accessories",
  },
  {
    title: "Caulk Gun with Pressure Gauge and Drip-Stop — Ergonomic Ratchet Rod Design",
    description: "A caulk gun with an integrated pressure gauge showing applied force, drip-stop mechanism, and thumb-release pressure valve. Produces consistent beads for DIYers. Standard caulk guns have no feedback mechanism, leading to inconsistent application and dripping.",
    category: "Tools & Home Improvement",
    subcategory: "Sealants & Adhesives",
  },
  {
    title: "Stud Finder with Edge Detection and LCD Display — Deep Scan to 1.5 inches",
    description: "A stud finder with center and edge detection, AC wire warning, and a backlit LCD showing stud width and depth. Deep scan mode penetrates 1.5 inches through thick drywall. Budget stud finders give false positives and cannot detect edges.",
    category: "Tools & Home Improvement",
    subcategory: "Detectors",
  },
  {
    title: "Paint Brush Cleaner and Dryer Spinner — Battery-Powered Centrifugal Cleaner",
    description: "A battery-operated paint brush and roller spinner that centrifugally removes paint and water in seconds. Compatible with brushes up to 4 inches and mini rollers. Eliminates the messy, time-consuming brush-cleaning process that makes painters dread cleanup.",
    category: "Tools & Home Improvement",
    subcategory: "Painting Supplies",
  },

  // ── Garden & Outdoor (55-60) ──
  {
    title: "Self-Watering Planter with Moisture Meter — Terracotta Look with Hidden Reservoir",
    description: "A self-watering planter with a 2-week water reservoir and an analog moisture meter visible from the exterior. Terracotta-style recycled plastic that looks premium but weighs 60% less. Existing self-watering planters hide the water level — users overwater anyway.",
    category: "Garden & Outdoor",
    subcategory: "Planters & Pots",
  },
  {
    title: "Expandable Garden Hose with Brass Fittings — 100ft, 10-Pattern Nozzle, Wall Mount",
    description: "A latex-core expandable hose with solid brass fittings (not plastic that cracks), a 10-pattern spray nozzle, and a wall-mount storage hanger. Includes rubber washers. Competitor expandable hoses use cheap plastic connectors that leak within one season.",
    category: "Garden & Outdoor",
    subcategory: "Watering Equipment",
  },
  {
    title: "Solar Pathway Lights with Color-Changing RGB — Stainless Steel Stake Design, 10-Pack",
    description: "Solar-powered pathway lights with RGB color-changing LEDs and a warm-white mode, stainless steel bodies, and auto dusk-to-dawn sensor. 600mAh batteries hold charge for 10+ hours. Competitor solar lights dim after 3-4 hours due to undersized 200mAh batteries.",
    category: "Garden & Outdoor",
    subcategory: "Outdoor Lighting",
  },
  {
    title: "Raised Garden Bed with Drainage System — Galvanized Steel 4x2ft with Bottom Liner",
    description: "A modular galvanized steel raised garden bed with integrated drainage holes, a weed-barrier bottom liner, and snap-together assembly requiring no tools. Competitor wooden raised beds rot within 2 seasons. Galvanized steel lasts 15+ years.",
    category: "Garden & Outdoor",
    subcategory: "Raised Beds",
  },
  {
    title: "Seed Starting Kit with Humidity Dome and Heat Mat — 72-Cell Tray System",
    description: "A complete seed starting system with a 72-cell tray, humidity dome with adjustable vents, and a UL-listed seedling heat mat. Includes a digital thermometer probe. Competitor kits sell trays without heat mats — the single biggest factor in germination success.",
    category: "Garden & Outdoor",
    subcategory: "Seed Starting",
  },
  {
    title: "Telescoping Fruit Picker with Cushioned Basket — 8-13ft Reach with Twist Lock",
    description: "A fruit picker with a padded collection basket and a 3-section telescoping pole extending from 8 to 13 feet. Twist-lock sections prevent collapse under fruit weight. Competitor picker baskets drop fruit because they lack the cushioning and retention design.",
    category: "Garden & Outdoor",
    subcategory: "Harvesting Tools",
  },

  // ── Arts & Crafts (61-66) ──
  {
    title: "Self-Healing Cutting Mat with Printed Grid — A2 Size with Angle Guides and Ruler Markings",
    description: "An A2 (24x18 inch) self-healing cutting mat with 5-layer PVC construction, printed grid lines, 15/30/45/60 degree angle guides, and both metric and imperial ruler markings. Competitor mats warp after months of use and have inaccurate grid lines.",
    category: "Arts & Crafts",
    subcategory: "Cutting Tools",
  },
  {
    title: "Posable Wooden Art Mannequin with Magnetic Joints — 13-inch for Drawing Reference",
    description: "A 13-inch wooden artist mannequin with neodymium magnetic joints instead of friction-fit pegs, allowing it to hold poses without sagging. Includes a weighted base. Traditional mannequins have loose joints that droop, making them useless for sustained reference.",
    category: "Arts & Crafts",
    subcategory: "Drawing Aids",
  },
  {
    title: "Epoxy Resin Kit with UV Flashlight — Crystal Clear 32oz with Mixing Cups and Stir Sticks",
    description: "A complete epoxy resin starter kit with 32oz crystal-clear resin, hardener, silicone mixing cups, wooden stir sticks, a UV flashlight for checking cure, and a bubble-popping torch lighter. Competitor kits skimp on accessories, forcing separate purchases.",
    category: "Arts & Crafts",
    subcategory: "Resin & Casting",
  },
  {
    title: "Watercolor Brush Pen Set — 48 Colors with Flexible Nylon Tips and Blending Brush",
    description: "A set of 48 dual-tip watercolor brush pens with flexible nylon brush tips and fine liner tips. Includes a water blending brush and a portable zip case. Competitor pens have stiff brush tips that fray after minimal use and inconsistent ink flow.",
    category: "Arts & Crafts",
    subcategory: "Painting Supplies",
  },
  {
    title: "Embroidery Starter Kit with Bamboo Hoops — 100 Color Threads, Patterns, and Needles",
    description: "A complete embroidery starter kit with 5 bamboo hoops (4-10 inch), 100 DMC-equivalent thread colors, 30 needles, 10 printed patterns on stabilizer, and a thread organizer box. Competitor kits use only 50 colors and flimsy plastic hoops that crack.",
    category: "Arts & Crafts",
    subcategory: "Embroidery",
  },
  {
    title: "3D Printing Pen with LCD Temperature Display — Low-Temperature PCL Filament for Kids",
    description: "A 3D printing pen using low-temperature (70C) PCL filament safe for children, with an LCD showing exact temperature and speed settings. Auto-sleep after 2 minutes idle. Competitor pens use high-temp ABS/PLA that burn skin on contact and lack temperature displays.",
    category: "Arts & Crafts",
    subcategory: "3D Art Tools",
  },

  // ── Travel Accessories (67-72) ──
  {
    title: "Compression Packing Cubes with Vacuum Seal — 6-Piece Set with Laundry Bag",
    description: "Compression packing cubes with dual-zipper vacuum compression that reduces volume by 60%. Water-resistant ripstop nylon with mesh viewing panels. Includes a separate laundry bag. Standard packing cubes only organize — they do not compress.",
    category: "Travel Accessories",
    subcategory: "Packing Organization",
  },
  {
    title: "Universal Travel Adapter with USB-C PD Fast Charge — 4 Plug Types, 200+ Countries",
    description: "A compact universal adapter with slide-out US/UK/EU/AU plugs, 2 USB-A ports, and 1 USB-C PD 30W port. Built-in fuse and safety shutters. Competitor adapters lack USB-C PD and have loose-fitting plug mechanisms that spark in outlets.",
    category: "Travel Accessories",
    subcategory: "Power Adapters",
  },
  {
    title: "Neck Pillow with Memory Foam and Snap Closure — Washable Velour Cover with Phone Pocket",
    description: "A U-shaped memory foam travel pillow with a magnetic snap closure (not button), a removable washable velour cover, and a hidden zippered phone/earbuds pocket. Competitor pillows use cheap fiber fill that flattens after one flight and buttons that pop open.",
    category: "Travel Accessories",
    subcategory: "Comfort & Sleep",
  },
  {
    title: "RFID-Blocking Passport Holder with Luggage Tag — Vegan Leather with Pen Loop",
    description: "A slim passport wallet with RFID-blocking lining, slots for 2 passports, 4 cards, a boarding pass, and a matching luggage tag. Includes a pen loop for customs forms. Built from vegan leather with a premium texture. Competitor holders feel cheap and lack RFID protection.",
    category: "Travel Accessories",
    subcategory: "Document Organizers",
  },
  {
    title: "Portable Door Lock for Hotels — Steel Security Device with Travel Pouch",
    description: "A portable door lock that adds deadbolt-level security to any inward-opening hotel door without permanent modification. Hardened steel construction resists forced entry. Weighs 3oz with a carrying pouch. Growing demand from solo travelers and safety-conscious women.",
    category: "Travel Accessories",
    subcategory: "Travel Safety",
  },
  {
    title: "Collapsible Water Bottle with Filter — 22oz BPA-Free Silicone with Carbon Filter",
    description: "A silicone collapsible water bottle that compresses to 3 inches flat for packing, with an activated carbon filter for tap water improvement. Carabiner clip attachment. Existing collapsible bottles have no filtration and develop mold in the folds.",
    category: "Travel Accessories",
    subcategory: "Hydration",
  },

  // ── Smart Home (73-78) ──
  {
    title: "Smart Plug with Energy Monitoring and USB Ports — Wi-Fi with Alexa/Google Support",
    description: "A smart plug with real-time energy consumption monitoring (kWh, cost, voltage), 2 USB-A charging ports on the side, and compatibility with Alexa, Google Home, and SmartThings. Competitor smart plugs monitor energy OR have USB ports, never both.",
    category: "Smart Home",
    subcategory: "Smart Plugs",
  },
  {
    title: "Zigbee Motion Sensor with Lux Detection — Battery-Powered, 5-Year Life, Compact Design",
    description: "A Zigbee 3.0 motion sensor with ambient light (lux) detection in a 1-inch diameter housing. 5-year battery life on CR2032 cell. Works with all Zigbee hubs (SmartThings, Hubitat, Home Assistant). Competitor sensors are bulky, Wi-Fi-only, and drain batteries in 6 months.",
    category: "Smart Home",
    subcategory: "Sensors",
  },
  {
    title: "Smart LED Light Strip with Music Sync — 32.8ft RGBIC with Segmented Control",
    description: "A 32.8ft RGBIC LED strip with individually addressable segments (16 zones), music synchronization via built-in microphone, and app/voice control. Includes corner connectors for 90-degree turns. Competitor strips have single-color-at-a-time limitations.",
    category: "Smart Home",
    subcategory: "Smart Lighting",
  },
  {
    title: "Wi-Fi Water Leak Detector with 4ft Sensor Cable — 100dB Alarm and Push Notifications",
    description: "A Wi-Fi-connected water leak detector with a 4ft sensor cable (not just a point sensor) that detects leaks anywhere along its length. 100dB local alarm plus smartphone push notifications. Point-sensor competitors miss leaks just inches away from the sensor.",
    category: "Smart Home",
    subcategory: "Leak Detection",
  },
  {
    title: "Smart Door Sensor with Temperature and Humidity — Zigbee 3.0 Ultra-Compact",
    description: "A Zigbee 3.0 door/window sensor that also reports temperature and humidity — three sensors in one. Ultra-compact 1.5-inch design. Competitors sell single-purpose door sensors, requiring 3 separate devices for the same data.",
    category: "Smart Home",
    subcategory: "Door & Window Sensors",
  },
  {
    title: "Smart IR Universal Remote Hub — Wi-Fi to Infrared Bridge for Legacy Devices",
    description: "A compact Wi-Fi-to-IR bridge that controls any infrared device (TV, AC, fan, stereo) via smartphone app or voice assistant. Learns custom IR codes. 360-degree IR emitter covers an entire room. Existing hubs have narrow IR beams requiring line-of-sight.",
    category: "Smart Home",
    subcategory: "Remote Controls",
  },

  // ── Cleaning & Organization (79-84) ──
  {
    title: "Electric Spin Scrubber with 5 Brush Heads — Cordless IPX7 Waterproof Telescoping Handle",
    description: "A cordless electric spin scrubber with IPX7 waterproof rating, 5 interchangeable brush heads (flat, dome, corner, wide, scouring pad), and a telescoping handle from 18 to 43 inches. Competitor scrubbers are not waterproof and die when submerged during shower cleaning.",
    category: "Cleaning & Organization",
    subcategory: "Power Cleaning",
  },
  {
    title: "Stackable Clear Shoe Boxes with Magnetic Door — 12-Pack Large Size for Men's Shoes",
    description: "Clear acrylic shoe storage boxes with magnetic drop-front doors that open with one hand. Stackable up to 8 high with interlocking grooves. Sized for men's shoes up to size 14. Competitor shoe boxes use flimsy snap-on lids that crack and cannot hold men's large sizes.",
    category: "Cleaning & Organization",
    subcategory: "Shoe Storage",
  },
  {
    title: "Under-Sink Pull-Out Organizer with Drip Tray — 2-Tier Sliding Basket System",
    description: "A 2-tier pull-out organizer designed for under-sink cabinets with a removable drip tray to catch leaks. Fits around standard plumbing pipes. No-drill tension rod installation. The under-sink area is the most wasted space in kitchens — no dominant organizer exists.",
    category: "Cleaning & Organization",
    subcategory: "Kitchen Organization",
  },
  {
    title: "Vacuum Storage Bags with Electric Pump — 10-Pack Jumbo with Travel Bags",
    description: "Vacuum compression bags in 4 sizes (2 jumbo, 4 large, 4 travel) with a portable USB-rechargeable electric pump replacing the hand pump. Double-zip seal prevents slow leaks. Competitor bags leak air within days due to single-zip seals and manual pumps are exhausting to use.",
    category: "Cleaning & Organization",
    subcategory: "Vacuum Storage",
  },
  {
    title: "Rotating Makeup Organizer with Drawer — 360-Degree Spinning Acrylic Tower",
    description: "A 360-degree rotating acrylic makeup organizer with a pull-out drawer at the base, adjustable dividers, and slots for lipsticks, brushes, palettes, and skincare bottles. Holds 120+ items. Static competitor organizers require reaching behind to access back items.",
    category: "Cleaning & Organization",
    subcategory: "Bathroom Organization",
  },
  {
    title: "Closet Dividers with Label Holders — 12-Pack Acrylic with Dry-Erase Markers",
    description: "Clear acrylic closet dividers with built-in label holders and 2 dry-erase markers for customizable organization. Fits standard and double-hang closet rods. Competitor cardboard dividers tear within weeks and label printing looks unprofessional.",
    category: "Cleaning & Organization",
    subcategory: "Closet Organization",
  },

  // ── Sports Recovery (85-90) ──
  {
    title: "Ice Bath Tub Portable — 75-Gallon Insulated with Drain Valve and Thermometer",
    description: "A portable cold plunge tub made from triple-layer insulated PVC holding 75 gallons. Includes a built-in analog thermometer and a bottom drain valve. Folds flat for storage. Competitor inflatable tubs leak at seams and have no insulation, warming within 15 minutes.",
    category: "Sports Recovery",
    subcategory: "Cold Therapy",
  },
  {
    title: "Muscle Roller Stick with Ergonomic Handles — 9 Independent Spinning Gears",
    description: "A muscle roller stick with 9 independently spinning ABS gears on a stainless steel core and foam-padded ergonomic handles. The independent gears conform to muscle contours. Competitor sticks use a single rigid roller that cannot adapt to leg and arm shapes.",
    category: "Sports Recovery",
    subcategory: "Foam Rolling",
  },
  {
    title: "Resistance Band Set with Door Anchor and Ankle Straps — 11-Piece Stackable to 150lbs",
    description: "An 11-piece resistance band set with 5 stackable latex bands (10-40lbs each, 150lbs combined), 2 cushioned handles, 2 ankle straps, a door anchor, and a mesh carry bag. Color-coded with weight printed on each band. Competitor sets use unlabeled bands that become indistinguishable.",
    category: "Sports Recovery",
    subcategory: "Resistance Bands",
  },
  {
    title: "Vibrating Foam Roller with 4 Intensity Levels — EPP Foam with Rechargeable Motor",
    description: "A high-density EPP foam roller with an integrated vibrating motor at 4 intensity levels for deep tissue massage. USB-C rechargeable with 3-hour battery life. 30% more effective than static foam rolling per sports medicine research. Standard foam rollers provide only passive pressure.",
    category: "Sports Recovery",
    subcategory: "Foam Rolling",
  },
  {
    title: "Compression Recovery Boots — Full Leg Pneumatic Massage with 4 Chambers",
    description: "Pneumatic compression leg sleeves with 4 sequential air chambers, 3 pressure levels, and 30/45/60 minute timer. Covers foot through upper thigh. Professional-grade recovery at $150 vs $600+ for NormaTec. Competitor budget boots have only 2 chambers and weak pumps.",
    category: "Sports Recovery",
    subcategory: "Compression Therapy",
  },
  {
    title: "Lacrosse Ball Massage Set with Peanut Roller — 5-Piece Myofascial Release Kit",
    description: "A myofascial release kit with 2 lacrosse balls (firm and medium density), 1 peanut-shaped double ball, 1 spiky massage ball, and 1 vibrating ball in a mesh carry pouch. Competitor single-ball sets lack variety for different body areas and pressure needs.",
    category: "Sports Recovery",
    subcategory: "Trigger Point Therapy",
  },

  // ── Camping & Hiking (91-96) ──
  {
    title: "Ultralight Camping Pillow with Memory Foam Insert — 6oz Compressible to Fist Size",
    description: "A camping pillow with a shredded memory foam core that compresses to the size of a fist (4x3 inch stuff sack). Weighs 6oz and inflates to full size by shaking. Competitor inflatable pillows are noisy, cold, and slippery — the top 3 complaints in the category.",
    category: "Camping & Hiking",
    subcategory: "Sleep Gear",
  },
  {
    title: "Water Filter Straw with Squeeze Bag — 0.1 Micron Hollow Fiber, 1500L Capacity",
    description: "A personal water filter straw rated for 0.1 micron filtration (removes 99.9999% bacteria) with a 1L squeeze bag for gravity filtering at camp. 1500L lifetime. Competitor straws require drinking directly from the source — this squeeze bag option adds versatility.",
    category: "Camping & Hiking",
    subcategory: "Water Filtration",
  },
  {
    title: "Rechargeable Headlamp with Red Light Mode — 1000 Lumens, USB-C, Motion Sensor",
    description: "A 1000-lumen USB-C rechargeable headlamp with white/red light modes, a motion sensor for hands-free on/off, and a lockout mode to prevent accidental activation. IPX5 waterproof. Competitor headlamps still use AA batteries and lack the red light mode essential for preserving night vision.",
    category: "Camping & Hiking",
    subcategory: "Lighting",
  },
  {
    title: "Camping Cookware Mess Kit — 13-Piece Nesting Aluminum Set with Carrying Bag",
    description: "A 13-piece camping cookware set (pot, pan, kettle, plates, cups, utensils, cutting board) that nests into a single compact cylinder. Hard-anodized aluminum with folding silicone handles. Competitor mess kits include useless items and have poor nesting that wastes pack space.",
    category: "Camping & Hiking",
    subcategory: "Camp Kitchen",
  },
  {
    title: "Emergency Bivvy with Thermal Retention — Reinforced Mylar with Drawstring Hood",
    description: "A reusable emergency bivvy made from tear-resistant reinforced Mylar that retains 90% of body heat. Drawstring hood seals in warmth. Weighs 4.8oz and packs to the size of a soda can. Cheap Mylar blankets tear immediately and cannot be reused — this is the durable alternative.",
    category: "Camping & Hiking",
    subcategory: "Emergency Gear",
  },
  {
    title: "Trekking Poles with Cork Grips — Carbon Fiber Adjustable with Tungsten Tips",
    description: "Ultralight carbon fiber trekking poles with natural cork grips (absorbs sweat, reduces odor), tungsten carbide tips for rock grip, and flip-lock adjustment from 24 to 54 inches. Competitor aluminum poles are heavier, foam grips get waterlogged, and twist-locks fail under load.",
    category: "Camping & Hiking",
    subcategory: "Trekking Gear",
  },

  // ── Kids & Educational (97-102) ──
  {
    title: "Magnetic Building Tiles Set — 100-Piece with Light-Up LED Tiles and Idea Book",
    description: "A 100-piece magnetic tile set including 10 LED light-up tiles for creative illuminated builds, a 40-page idea book, and a storage bag. Strong N52 magnets in ABS shells. Competitor sets use weak magnets that separate during play and include no LED tiles for STEM light exploration.",
    category: "Kids & Educational",
    subcategory: "Building Toys",
  },
  {
    title: "Kids Microscope Kit with Prepared Slides — 40x-1200x with Phone Adapter",
    description: "A children's compound microscope with 40x, 100x, 400x, and 1200x magnification, LED illumination, 25 prepared specimen slides, and a smartphone adapter for photo/video capture. Competitor kids microscopes have plastic optics that produce blurry images above 200x.",
    category: "Kids & Educational",
    subcategory: "Science Kits",
  },
  {
    title: "Balance Bike for Toddlers — 12-inch with Adjustable Seat and Foam Tires",
    description: "A lightweight (5.5lb) aluminum balance bike with a 3-position adjustable seat, puncture-proof EVA foam tires, and a carry handle for parents. Ages 18 months to 5 years. Competitor steel bikes weigh 9-12lbs, making them too heavy for small toddlers to control.",
    category: "Kids & Educational",
    subcategory: "Ride-On Toys",
  },
  {
    title: "Kids Gardening Tool Set with Carrying Bag — Real Metal Tools Sized for Ages 3-8",
    description: "A 9-piece gardening tool set with real metal heads (not plastic) sized for children ages 3-8, including trowel, rake, fork, watering can, gloves, apron, sun hat, kneeling pad, and a canvas carry bag. Competitor kids tools are flimsy plastic that bends in soil.",
    category: "Kids & Educational",
    subcategory: "Outdoor Learning",
  },
  {
    title: "Felt Busy Board for Toddlers — 20 Activities Including Zippers, Buttons, and Laces",
    description: "A portable felt busy board with 20 Montessori-style activities: zippers, buckles, buttons, snaps, laces, Velcro, clock, shapes, and counting beads. Folds into a carry bag. Competitor busy boards have 8-10 activities and use poor-quality fasteners that toddlers break.",
    category: "Kids & Educational",
    subcategory: "Montessori Toys",
  },
  {
    title: "Kids Binoculars with Neck Strap — 8x21 Compact with Shockproof Rubber Armor",
    description: "Compact 8x21 binoculars designed for children with shockproof rubber armor, slip-proof grip, adjustable eyecups, and a breakaway neck strap for safety. Includes a bird identification field guide card. Competitor kids binoculars are glorified toys with no real optical quality.",
    category: "Kids & Educational",
    subcategory: "Nature Exploration",
  },

  // ── Car & Vehicle (103-108) ──
  {
    title: "Magnetic Phone Mount with MagSafe Ring — Dashboard/Vent Dual Mount System",
    description: "A car phone mount with both dashboard adhesive and vent clip bases, plus a MagSafe-compatible magnetic ring. Holds phones up to 1lb with N52 magnets. One-hand attach/detach. Competitor mounts use suction cups that fail in heat and clamp mechanisms that scratch phones.",
    category: "Car & Vehicle",
    subcategory: "Phone Mounts",
  },
  {
    title: "Car Seat Gap Filler with USB Charging Port — 2-Pack Leather Trim with Cup Holder",
    description: "A 2-pack car seat gap filler made from PU leather with an integrated USB charging port and a cup holder insert. Blocks phones, keys, and coins from falling into the seat gap. Universal fit. Competitor gap fillers are plain foam strips with no additional utility.",
    category: "Car & Vehicle",
    subcategory: "Interior Accessories",
  },
  {
    title: "Windshield Sun Shade with Suction Cup Storage — Foldable Umbrella Design",
    description: "A windshield sun shade using an umbrella-style folding mechanism (opens in 3 seconds vs wrestling with traditional folding shades). Suction cup storage handle attaches to windshield when not in use. Traditional accordion shades are frustrating to fold and store.",
    category: "Car & Vehicle",
    subcategory: "Sun Protection",
  },
  {
    title: "Tire Pressure Gauge with Digital Display — 4 Units (PSI/BAR/KPA/KGF) and LED Flashlight",
    description: "A digital tire pressure gauge with a backlit display, 4-unit toggle, built-in LED flashlight for nighttime use, and audible pressure alerts. Auto-shutoff preserves battery. Analog gauges are impossible to read in the dark and lose accuracy quickly.",
    category: "Car & Vehicle",
    subcategory: "Tire Accessories",
  },
  {
    title: "Car Trunk Organizer with Insulated Cooler Bag — Collapsible 3-Compartment Design",
    description: "A collapsible trunk organizer with 3 reinforced compartments, an insulated removable cooler bag, anti-slip base, and tie-down straps. Folds flat when not in use. Competitor organizers slide around the trunk and have no thermal insulation for groceries.",
    category: "Car & Vehicle",
    subcategory: "Storage & Organization",
  },
  {
    title: "Emergency Car Window Breaker and Seatbelt Cutter — Visor-Mounted Quick-Release",
    description: "A dual-function emergency tool with a spring-loaded window breaker and recessed seatbelt cutter, mounted to the sun visor for instant access. Bright orange for visibility. Competitor tools are stored in glove boxes — inaccessible in an actual emergency.",
    category: "Car & Vehicle",
    subcategory: "Safety Equipment",
  },

  // ── Home Decor (109-114) ──
  {
    title: "Floating Shelves with Hidden Bracket — 3-Pack Rustic Wood with Level Built Into Bracket",
    description: "A 3-pack of solid paulownia wood floating shelves with heavy-duty hidden brackets that include a built-in bubble level for installation. Holds 30lbs each. Competitor floating shelves have visible brackets or come with flimsy wall anchors and no leveling aid.",
    category: "Home Decor",
    subcategory: "Wall Shelving",
  },
  {
    title: "LED Flameless Candles with Remote — 9-Pack Real Wax with Realistic Flickering Wick",
    description: "A 9-pack of real paraffin wax LED candles with embedded LED wicks that produce a realistic warm flicker. Remote control with timer, dimmer, and color temperature settings. Competitor LED candles look fake due to rigid plastic flames and cold-white light.",
    category: "Home Decor",
    subcategory: "Candles & Holders",
  },
  {
    title: "Macrame Wall Hanging with Shelf — Handwoven Cotton with Floating Wood Shelf Insert",
    description: "A large (36x24 inch) handwoven cotton macrame wall hanging incorporating a floating wood shelf for small plants, crystals, or candles. Boho aesthetic with functional storage. Pure decorative macrame hangings miss the functional element trending on Pinterest and Instagram.",
    category: "Home Decor",
    subcategory: "Wall Art",
  },
  {
    title: "Artificial Eucalyptus Stems in Ceramic Vase — 6-Stem Arrangement Ready to Display",
    description: "A pre-arranged set of 6 realistic artificial eucalyptus stems in a matte white ceramic bud vase. Ready to display out of the box — no arranging needed. Customers buying fake eucalyptus separately struggle with arrangement and need to buy a vase too.",
    category: "Home Decor",
    subcategory: "Artificial Plants",
  },
  {
    title: "Decorative Book Stack with Storage — Faux Leather Boxes Disguised as Vintage Books",
    description: "A set of 3 faux leather storage boxes designed to look like vintage hardcover books. Stacks on a coffee table or shelf while hiding remotes, keys, or small items inside. The decorative book trend is huge on TikTok but no dominant product combines aesthetics with actual storage.",
    category: "Home Decor",
    subcategory: "Decorative Storage",
  },
  {
    title: "Peel-and-Stick Tile Backsplash — 10-Pack Marble Look with Grout Lines",
    description: "Self-adhesive 12x12 inch tiles with a realistic marble look and embossed grout lines. Heat-resistant to 170F for kitchen use. Removable without wall damage for renters. Competitor peel-and-stick tiles have flat surfaces with no grout texture, looking obviously fake.",
    category: "Home Decor",
    subcategory: "Wall Tiles",
  },

  // ── Bathroom Accessories (115-120) ──
  {
    title: "Shower Caddy with Suction Cup and Adhesive Dual Mount — Rustproof Stainless Steel",
    description: "A corner shower caddy with both suction cup and adhesive mounting options for renters and homeowners. 304 stainless steel with powder coat finish. Holds up to 15lbs. Competitor suction caddies fall repeatedly — the universal one-star complaint across all shower organizers.",
    category: "Bathroom Accessories",
    subcategory: "Shower Organization",
  },
  {
    title: "Bamboo Bathtub Tray with Wine Glass Holder — Extendable 28-42 Inches with Book Stand",
    description: "An extendable bamboo bathtub caddy tray with a wine glass slot, book/tablet stand with page holder, phone groove, and a soap dish. Adjusts from 28 to 42 inches to fit any tub width. Competitor trays use cheap bamboo that warps within weeks of water exposure.",
    category: "Bathroom Accessories",
    subcategory: "Bath Accessories",
  },
  {
    title: "Electric Toothbrush Holder with UV Sterilizer — Wall-Mount for 4 Heads Plus Toothpaste",
    description: "A wall-mounted toothbrush holder with a UV-C sterilizer compartment for 4 electric brush heads and a toothpaste dispenser with one-touch pump. Eliminates the wet, germ-covered countertop storage that 90% of households use. No dominant product in this specific niche.",
    category: "Bathroom Accessories",
    subcategory: "Dental Organization",
  },
  {
    title: "Hair Catcher Drain Protector — Silicone TubShroom Alternative with Easy Clean Tab",
    description: "A silicone drain protector with a patented easy-clean pull tab that lifts caught hair in one motion without touching it. Fits standard 1.5-inch tub drains. The market leader TubShroom requires pulling hair off a cylinder — this pull-tab design is far less disgusting.",
    category: "Bathroom Accessories",
    subcategory: "Drain Protection",
  },
  {
    title: "Fog-Free Shower Mirror with Squeegee Hook — Anti-Fog Coating with Razor Holder",
    description: "A fogless shower mirror with a nano anti-fog coating (no water fill required), a built-in razor holder, and a removable squeegee that stores on an integrated hook. Competitor fog-free mirrors require filling a reservoir with hot water before each shower — defeating the convenience.",
    category: "Bathroom Accessories",
    subcategory: "Shower Mirrors",
  },
  {
    title: "Toilet Paper Holder with Phone Shelf — Matte Black with Quick-Release Spring Rod",
    description: "A wall-mounted toilet paper holder with a flat top shelf for phone or wet wipes, matte black stainless steel construction, and a spring-loaded rod for one-hand roll changes. The phone shelf addresses a universal behavior (phone in bathroom) that no basic TP holder accommodates.",
    category: "Bathroom Accessories",
    subcategory: "Toilet Accessories",
  },
];

// ── Target customer personas ─────────────────────────────────────────

const TARGET_CUSTOMERS: Record<string, string[]> = {
  "Kitchen Gadgets": [
    "Home cooks looking for time-saving kitchen tools under $50",
    "Meal prep enthusiasts who cook 5+ times per week",
    "First-time homeowners setting up their kitchen on a budget",
    "Health-conscious cooks who prepare fresh meals daily",
    "Gift shoppers looking for unique kitchen gadgets under $40",
    "Small apartment dwellers who need space-efficient kitchen tools",
  ],
  "Fitness Equipment": [
    "Home gym enthusiasts building affordable setups",
    "Busy professionals fitting 30-minute workouts into their day",
    "Beginners starting their fitness journey with basic equipment",
    "Physical therapy patients doing prescribed exercises at home",
    "Apartment dwellers who need compact, quiet workout gear",
    "CrossFit athletes supplementing their gym training at home",
  ],
  "Pet Supplies": [
    "First-time dog owners learning basic pet care essentials",
    "Multi-pet households managing feeding and grooming for 2-3 animals",
    "Cat owners in apartments seeking low-maintenance solutions",
    "Dog owners who walk daily and need durable outdoor gear",
    "Premium pet parents willing to pay more for quality and design",
    "Busy professionals who need automated or simplified pet care",
  ],
  "Home Office": [
    "Remote workers building a productive home workspace",
    "Freelancers and entrepreneurs working from co-working spaces",
    "Students setting up study spaces in dorms or small apartments",
    "IT professionals managing dual-monitor setups at home",
    "Video call professionals who need polished on-camera setups",
    "Corporate employees with employer-funded home office budgets",
  ],
  "Beauty Tools": [
    "Skincare enthusiasts following multi-step routines",
    "Women 25-45 looking for affordable at-home spa treatments",
    "Beauty influencers testing and reviewing new tools",
    "Men entering the skincare and grooming market",
    "Estheticians looking for professional-quality tools at consumer prices",
    "Gift shoppers buying beauty sets for holidays and birthdays",
  ],
  "Electronics Accessories": [
    "Remote workers upgrading their home tech setup",
    "College students managing multiple devices on a budget",
    "Tech enthusiasts who buy accessories for every new device",
    "Minimalists who want clean, organized desk setups",
    "Parents managing family devices and charging stations",
    "Gamers optimizing their desk setup for streaming and play",
  ],
  "Baby Products": [
    "First-time parents overwhelmed by baby product choices",
    "Parents of 6-18 month old toddlers in the feeding transition",
    "On-the-go parents who need portable baby essentials",
    "Baby shower gift shoppers looking for practical registry items",
    "Eco-conscious parents choosing reusable over disposable",
    "Parents of colicky or restless babies seeking sleep solutions",
  ],
  "Health & Wellness": [
    "Office workers dealing with chronic back and neck pain",
    "Wellness enthusiasts incorporating self-care into daily routines",
    "Insomnia sufferers looking for non-pharmaceutical sleep aids",
    "Yoga practitioners supplementing their practice with recovery tools",
    "Adults 40-60 managing age-related aches without medication",
    "Migraine and tension headache sufferers seeking relief tools",
  ],
  "Tools & Home Improvement": [
    "Weekend DIYers tackling home projects 2-3 times per month",
    "New homeowners building a basic tool collection",
    "Apartment renters doing non-permanent improvements",
    "Professional handymen looking for affordable specialty tools",
    "Woodworking hobbyists equipping a home workshop",
    "Women DIYers looking for ergonomic, lighter-weight tools",
  ],
  "Garden & Outdoor": [
    "First-time gardeners starting a backyard vegetable garden",
    "Apartment balcony gardeners with limited space",
    "Homeowners maintaining lawns and gardens on weekends",
    "Raised bed gardeners growing organic vegetables",
    "Urban gardeners creating container gardens on patios",
    "Retirees who garden as a daily hobby and social activity",
  ],
  "Arts & Crafts": [
    "Hobbyist crafters who create 2-3 projects per month",
    "Parents doing art projects with children ages 5-12",
    "Etsy sellers looking for quality supplies for their products",
    "Adult beginners picking up a new creative hobby",
    "Art students building a supply collection for school",
    "Scrapbookers and journalers who buy supplies regularly",
  ],
  "Travel Accessories": [
    "Frequent business travelers taking 2-4 trips per month",
    "Family vacation planners organizing trips for 4+ people",
    "Solo female travelers prioritizing safety and organization",
    "Budget travelers maximizing carry-on packing efficiency",
    "International travelers navigating different power standards",
    "Digital nomads living out of a suitcase for months at a time",
  ],
  "Smart Home": [
    "Smart home beginners building their first automation setup",
    "Home Assistant enthusiasts expanding their Zigbee network",
    "Renters who need non-permanent smart home solutions",
    "Energy-conscious homeowners tracking electricity usage",
    "Parents setting up smart monitoring for home security",
    "Tech-savvy retirees simplifying daily routines with automation",
  ],
  "Cleaning & Organization": [
    "Busy professionals who clean in 30-minute weekend sessions",
    "Marie Kondo-inspired decluttering enthusiasts",
    "Small apartment dwellers maximizing limited storage space",
    "Parents with kids who need constant organization solutions",
    "Airbnb hosts preparing properties for turnover between guests",
    "New homeowners organizing closets and storage areas",
  ],
  "Sports Recovery": [
    "Athletes training 4-6 days per week who need daily recovery",
    "Weekend warriors dealing with Monday morning soreness",
    "Physical therapy patients continuing recovery at home",
    "CrossFit and HIIT athletes managing high-intensity training loads",
    "Runners recovering from long-distance training runs",
    "Older adults (50+) maintaining mobility and reducing joint pain",
  ],
  "Camping & Hiking": [
    "Weekend car campers going on 6-8 trips per year",
    "Ultralight backpackers counting every ounce of pack weight",
    "Family campers with kids ages 5-15 who need durable gear",
    "Thru-hikers preparing for multi-week trail expeditions",
    "Festival and event campers looking for affordable basic gear",
    "Winter campers needing cold-weather specific equipment",
  ],
  "Kids & Educational": [
    "Parents of children ages 3-8 looking for STEM learning toys",
    "Homeschooling families building hands-on curriculum materials",
    "Grandparents buying educational gifts for birthdays and holidays",
    "Teachers looking for classroom activity supplies",
    "Parents seeking screen-free activity alternatives for kids",
    "Montessori-method parents who prioritize tactile learning",
  ],
  "Car & Vehicle": [
    "New car owners accessorizing their first vehicle",
    "Commuters spending 1+ hours daily in their car",
    "Rideshare drivers (Uber/Lyft) upgrading passenger experience",
    "Road trip families needing organization and entertainment",
    "Car detailing enthusiasts who maintain their vehicles weekly",
    "Parents with car seats managing child-related car clutter",
  ],
  "Home Decor": [
    "Apartment renters decorating without permanent modifications",
    "First-time homeowners furnishing on a budget",
    "Interior design enthusiasts refreshing rooms seasonally",
    "Pinterest and Instagram trend followers seeking viral decor items",
    "Minimalist home stylists curating intentional spaces",
    "Gift shoppers looking for housewarming and wedding presents",
  ],
  "Bathroom Accessories": [
    "Renters who cannot make permanent bathroom modifications",
    "New homeowners upgrading builder-grade bathroom fixtures",
    "Small bathroom owners maximizing limited storage space",
    "Couples sharing a bathroom who need organized dual storage",
    "Airbnb hosts outfitting bathrooms for guest comfort",
    "Spa-at-home enthusiasts creating a relaxing bathroom environment",
  ],
};

// ── Pain point templates per category ────────────────────────────────

interface PainPointTemplate {
  issue: string;
  proposedSolution: string;
}

const PAIN_POINTS: Record<string, PainPointTemplate[]> = {
  "Kitchen Gadgets": [
    { issue: "Cheap materials break within weeks of regular use", proposedSolution: "Premium 304 stainless steel and BPA-free silicone construction rated for 10,000+ uses" },
    { issue: "Difficult to clean with food residue trapped in crevices", proposedSolution: "Smooth one-piece design with no hidden grooves — fully dishwasher safe" },
    { issue: "One-size-fits-all design does not adapt to different needs", proposedSolution: "Adjustable settings with clear markings for different cooking scenarios" },
    { issue: "Takes up too much counter or drawer space", proposedSolution: "Compact foldable or nesting design that stores in half the space" },
    { issue: "Poor grip leads to slipping during food prep", proposedSolution: "Textured silicone grip zones with ergonomic contour for wet and dry hands" },
  ],
  "Fitness Equipment": [
    { issue: "Equipment is too loud for apartment use", proposedSolution: "Noise-dampened design operates below 45 dB for neighbor-friendly home workouts" },
    { issue: "Adjustments are slow and interrupt workout flow", proposedSolution: "Quick-change mechanism adjusts in under 3 seconds between sets" },
    { issue: "Cheap construction fails under repeated stress", proposedSolution: "Reinforced steel components rated for 50,000+ cycles of use" },
    { issue: "Too large to store in small living spaces", proposedSolution: "Foldable compact design stores under a bed or in a closet" },
    { issue: "No tracking capability forces manual logging", proposedSolution: "Built-in digital counter or app connectivity tracks reps and progress" },
  ],
  "Pet Supplies": [
    { issue: "Product slides across floor during pet use", proposedSolution: "Non-slip silicone base or suction cup mounting prevents movement on any surface" },
    { issue: "Cheap plastic harbors bacteria even after washing", proposedSolution: "Antimicrobial stainless steel or food-grade silicone that is bacteria resistant" },
    { issue: "Pet destroys the product within weeks", proposedSolution: "Reinforced construction with chew-resistant materials rated for aggressive use" },
    { issue: "Product creates more mess than it solves", proposedSolution: "Integrated containment design with spill guards and splash barriers" },
    { issue: "Sizing does not fit the full range of pet breeds", proposedSolution: "Adjustable sizing system with clear breed-specific size guide included" },
  ],
  "Home Office": [
    { issue: "Installation requires drilling or permanent modification", proposedSolution: "Tool-free clamp or adhesive mounting — fully removable with no damage" },
    { issue: "Wobbles or sags under the weight of equipment", proposedSolution: "Steel reinforced construction with gas spring or counterweight system" },
    { issue: "Cable clutter ruins the clean desk aesthetic", proposedSolution: "Integrated cable management channels hide wires from view" },
    { issue: "Does not fit non-standard desk sizes and shapes", proposedSolution: "Adjustable width and depth accommodate 90% of desk configurations" },
    { issue: "Looks cheap and unprofessional on video calls", proposedSolution: "Premium finish in matte black or brushed aluminum with clean lines" },
  ],
  "Beauty Tools": [
    { issue: "Battery dies mid-use with no low-battery warning", proposedSolution: "USB-C rechargeable with LED battery indicator and 3+ hour runtime" },
    { issue: "Single temperature/speed setting does not suit all skin and hair types", proposedSolution: "Multiple settings with clear labels for different skin sensitivities and hair types" },
    { issue: "Difficult to clean between uses leading to bacterial buildup", proposedSolution: "Detachable heads with antimicrobial coating — rinse-clean design" },
    { issue: "Causes irritation, redness, or breakage when used incorrectly", proposedSolution: "Auto-shutoff timer and gentle-start mode prevent overuse damage" },
    { issue: "No travel case results in damage and unsanitary storage", proposedSolution: "Includes a fitted travel case with UV sterilization compartment" },
  ],
  "Electronics Accessories": [
    { issue: "Adhesive mounting fails within weeks and product falls", proposedSolution: "Weighted base or mechanical clamp eliminates unreliable adhesive dependency" },
    { issue: "Not compatible with latest USB-C and MagSafe standards", proposedSolution: "Full USB-C PD and MagSafe compatibility with future-proof design" },
    { issue: "Cheap plastic feels flimsy and cracks under normal use", proposedSolution: "Aluminum alloy or premium ABS construction with soft-touch finish" },
    { issue: "Generates excessive heat during extended charging or use", proposedSolution: "Integrated heat dissipation design with thermal monitoring circuit" },
    { issue: "Does not fit all device sizes and form factors", proposedSolution: "Adjustable universal fit system accommodates devices from 4 to 16 inches" },
  ],
  "Baby Products": [
    { issue: "Baby easily defeats the safety or containment feature", proposedSolution: "Child-proof locking mechanism tested against ages 12-36 months" },
    { issue: "Product contains materials that are not food-safe or BPA-free", proposedSolution: "100% food-grade silicone and BPA/BPS/phthalate-free materials with CPSC compliance" },
    { issue: "Difficult to clean with milk or food residue in seams", proposedSolution: "One-piece seamless design with no hidden crevices — boil-safe or top-rack dishwasher safe" },
    { issue: "Does not last through the toddler growth stages", proposedSolution: "Adjustable design grows with child from 6 months to 3 years" },
    { issue: "Too bulky to carry in an already-overloaded diaper bag", proposedSolution: "Ultralight and foldable design adds minimal weight and bulk to diaper bag" },
  ],
  "Health & Wellness": [
    { issue: "Provides temporary relief but no lasting improvement", proposedSolution: "Progressive intensity system with a 30-day improvement program guide" },
    { issue: "One-size-fits-all does not account for different body types", proposedSolution: "Adjustable straps and interchangeable inserts fit body types from XS to XXL" },
    { issue: "Materials cause skin irritation with prolonged contact", proposedSolution: "Hypoallergenic, OEKO-TEX certified materials safe for sensitive skin" },
    { issue: "Too complex to use correctly without professional guidance", proposedSolution: "QR code links to video tutorials and a simple printed quick-start guide" },
    { issue: "Cannot be used discreetly at the office or in public", proposedSolution: "Low-profile design that is invisible under clothing or on a desk" },
  ],
  "Tools & Home Improvement": [
    { issue: "Requires an additional trip to the hardware store for missing parts", proposedSolution: "All-inclusive kit with every fastener, anchor, and bit needed for installation" },
    { issue: "Difficult to use in tight or overhead spaces", proposedSolution: "Compact head design with flexible shaft for access in confined areas" },
    { issue: "Measurements are inaccurate or hard to read", proposedSolution: "Backlit digital display with +/-0.1 accuracy and hold button for readings" },
    { issue: "Cheap construction strips, bends, or breaks under torque", proposedSolution: "Chrome vanadium or hardened steel construction rated for professional use" },
    { issue: "No storage solution — tools get lost in a messy toolbox", proposedSolution: "Integrated carry case or wall-mount organizer included in the kit" },
  ],
  "Garden & Outdoor": [
    { issue: "Degrades in UV sunlight within a single season", proposedSolution: "UV-stabilized materials with a 3-year outdoor warranty" },
    { issue: "Difficult to assemble with confusing instructions", proposedSolution: "Tool-free snap assembly in under 10 minutes with visual instruction guide" },
    { issue: "Not durable enough for wet and muddy conditions", proposedSolution: "Waterproof, rust-resistant construction rated for year-round outdoor use" },
    { issue: "Takes up too much storage space in the off-season", proposedSolution: "Collapsible or stackable design stores in a fraction of the footprint" },
    { issue: "Advertised capacity is exaggerated compared to actual use", proposedSolution: "Honest capacity ratings with real-use photos in product listing" },
  ],
  "Arts & Crafts": [
    { issue: "Colors are inaccurate compared to online product photos", proposedSolution: "True-to-color guarantee with calibrated photography and color swatches included" },
    { issue: "Supplies run out mid-project with no individual replacements available", proposedSolution: "Individual component replacement available — no need to rebuy entire kit" },
    { issue: "Cheap tools damage the work surface or material", proposedSolution: "Self-healing mat and precision-ground tools that protect surfaces" },
    { issue: "Kit lacks essential items forcing separate purchases", proposedSolution: "Comprehensive all-in-one kit with every tool needed for first 5 projects" },
    { issue: "No instructions for beginners who are just starting out", proposedSolution: "Step-by-step project guide with QR codes linking to video tutorials" },
  ],
  "Travel Accessories": [
    { issue: "Product is too bulky to fit in carry-on luggage", proposedSolution: "Ultra-compact design weighs under 6oz and fits in a jacket pocket" },
    { issue: "Cheap zippers and seams fail during travel stress", proposedSolution: "YKK zippers and double-stitched seams rated for 10,000+ open/close cycles" },
    { issue: "Does not meet TSA carry-on requirements", proposedSolution: "TSA-compliant design with dimensions verified against current airline policies" },
    { issue: "Falls apart or gets lost because there is no carrying system", proposedSolution: "Integrated carabiner clip or lanyard loop keeps product attached to bag" },
    { issue: "Only works in specific countries or with certain standards", proposedSolution: "Universal compatibility certified for 200+ countries and all major standards" },
  ],
  "Smart Home": [
    { issue: "Requires a proprietary hub adding cost and complexity", proposedSolution: "Works with existing Wi-Fi or Zigbee hub — no proprietary bridge needed" },
    { issue: "Battery dies every 3-6 months requiring constant replacement", proposedSolution: "Ultra-low-power design with 3-5 year battery life on a single cell" },
    { issue: "App is unreliable and loses connection frequently", proposedSolution: "Local processing with cloud backup — works even when internet is down" },
    { issue: "Bulky design looks out of place in home decor", proposedSolution: "Ultra-compact design smaller than a coin — blends into any room" },
    { issue: "Does not integrate with other smart home platforms", proposedSolution: "Works with Alexa, Google Home, HomeKit, SmartThings, and Home Assistant" },
  ],
  "Cleaning & Organization": [
    { issue: "Suction cups and adhesive mounting fail within weeks", proposedSolution: "Dual-mount system with industrial suction cups and backup adhesive strips" },
    { issue: "Cheap plastic cracks or yellows within months", proposedSolution: "Crystal-clear acrylic or stainless steel that maintains appearance for years" },
    { issue: "Organizer is too small for real-world item sizes", proposedSolution: "Oversized compartments designed for actual product dimensions — not sample sizes" },
    { issue: "Difficult to access items stored in the back", proposedSolution: "Pull-out, rotating, or tiered design ensures every item is accessible" },
    { issue: "Creates more clutter instead of reducing it", proposedSolution: "Modular system that configures to available space instead of demanding specific space" },
  ],
  "Sports Recovery": [
    { issue: "Not portable enough to bring to the gym or travel", proposedSolution: "Lightweight design under 2lbs with a carry bag for gym and travel use" },
    { issue: "Single intensity level is either too weak or too intense", proposedSolution: "Multiple intensity settings from gentle warm-up to deep tissue recovery" },
    { issue: "Battery dies mid-session with no warning", proposedSolution: "4+ hour battery with LED indicator and 15-minute low-battery warning" },
    { issue: "Material breaks down and crumbles after months of use", proposedSolution: "High-density EPP or TPE construction rated for 2+ years of daily use" },
    { issue: "No guidance on how to use effectively for specific muscle groups", proposedSolution: "Includes muscle group targeting guide with QR codes to video demonstrations" },
  ],
  "Camping & Hiking": [
    { issue: "Too heavy for backpacking — adds unnecessary pack weight", proposedSolution: "Ultralight design using aerospace aluminum or Dyneema fabric" },
    { issue: "Fails in wet conditions — not truly waterproof", proposedSolution: "IPX7 waterproof rating tested in sustained rainfall and submersion" },
    { issue: "Bulky packed size takes up too much backpack space", proposedSolution: "Compresses to pocket size with included stuff sack and compression strap" },
    { issue: "Cheap construction breaks in the field with no repair option", proposedSolution: "Field-repairable design with included repair kit and replacement parts" },
    { issue: "Single-use design when a multi-function tool would save weight", proposedSolution: "Multi-function design replaces 2-3 separate items in your pack" },
  ],
  "Kids & Educational": [
    { issue: "Loses the child's interest after one or two uses", proposedSolution: "Progressive difficulty levels and expansion packs maintain engagement for months" },
    { issue: "Contains small parts that are choking hazards", proposedSolution: "All components pass CPSC choking hazard test for ages 3+ (or age-appropriate sizing)" },
    { issue: "Breaks after rough play by enthusiastic children", proposedSolution: "Impact-tested ABS or natural wood construction survives drops from 4 feet" },
    { issue: "No educational value beyond basic entertainment", proposedSolution: "Aligned with STEM learning objectives with parent guide explaining concepts" },
    { issue: "Difficult for children to use independently without adult help", proposedSolution: "Child-intuitive design tested with age group — no reading or complex assembly required" },
  ],
  "Car & Vehicle": [
    { issue: "Falls off or dislodges while driving over bumps", proposedSolution: "Triple-point mounting system with anti-vibration padding rated for rough roads" },
    { issue: "Blocks air vents or obstructs driving visibility", proposedSolution: "Low-profile design that mounts without blocking vents, gauges, or sightlines" },
    { issue: "Does not fit all car makes and models", proposedSolution: "Universal adjustable design verified against 50+ popular car models" },
    { issue: "Looks cheap and reduces the interior appearance of the vehicle", proposedSolution: "OEM-quality finish in matte black or carbon fiber that matches modern interiors" },
    { issue: "Becomes dangerously hot in summer heat inside the car", proposedSolution: "Heat-resistant materials rated to 180F with UV-stable color that won't fade" },
  ],
  "Home Decor": [
    { issue: "Looks different from product photos — misleading expectations", proposedSolution: "Professional photography with in-room context and exact color calibration" },
    { issue: "Installation damages walls — not renter-friendly", proposedSolution: "Removable mounting system (command strips, suction, magnetic) with no wall damage" },
    { issue: "Cheap materials look artificial and feel flimsy", proposedSolution: "Premium natural or bio-based materials with handcrafted quality finish" },
    { issue: "Available only in one size that does not fit the intended space", proposedSolution: "Available in 3 sizes with a room-size recommendation guide" },
    { issue: "Arrives damaged due to poor packaging", proposedSolution: "Double-walled box with corner protectors and inspection checklist included" },
  ],
  "Bathroom Accessories": [
    { issue: "Rusts within months in the humid bathroom environment", proposedSolution: "304 stainless steel with powder-coat finish rated for high-humidity environments" },
    { issue: "Suction mount fails and product crashes to the floor", proposedSolution: "Industrial vacuum suction with twist-lock indicator showing secure mount" },
    { issue: "Does not fit standard bathroom fixture sizes", proposedSolution: "Universal design tested against standard US bathroom fixture dimensions" },
    { issue: "Water pools on surfaces creating mold and mildew", proposedSolution: "Sloped drainage design with ventilation holes prevents standing water" },
    { issue: "Mounting hardware strips paint or leaves permanent marks", proposedSolution: "Damage-free mounting with adhesive pads rated for humid tile and glass surfaces" },
  ],
};

// ── Differentiator templates ─────────────────────────────────────────

const DIFFERENTIATORS: string[] = [
  "Premium 304 stainless steel construction where competitors use plastic",
  "USB-C rechargeable — eliminates disposable battery waste",
  "Lifetime replacement warranty backed by US-based customer service",
  "Patent-pending mechanism not available from any competitor",
  "Eco-friendly packaging made from 100% recycled materials",
  "Includes a comprehensive quick-start guide with QR-linked video tutorials",
  "30-day satisfaction guarantee with free returns and full refund",
  "Dual-purpose design replaces two separate products",
  "Independently lab-tested and certified for safety compliance",
  "Compact storage design takes up 50% less space than competitors",
  "Adjustable settings accommodate 90% of use cases without separate SKUs",
  "Integrated carry case or storage solution included at no extra cost",
  "All-inclusive kit — no additional purchases needed to start using",
  "Hand-finished quality control — every unit inspected before shipping",
  "Designed in USA with input from professional users in the category",
  "Compatible with all major brands and standards — universal fit guaranteed",
  "Water-resistant construction rated for everyday splash and spill exposure",
  "Weighted non-slip base eliminates the frustrating sliding problem",
  "Tool-free 5-minute installation with no drilling or permanent mounting",
  "Child-safe and pet-safe materials certified by independent testing labs",
  "Real-time feedback via integrated display — no guesswork needed",
  "Medical-grade materials that exceed consumer product requirements",
  "Modular design with expansion accessories available separately",
  "Energy-efficient operation uses 70% less power than comparable products",
];

// ── Trend signal templates ───────────────────────────────────────────

interface TrendTemplate {
  signal: string;
  source: "google_trends" | "amazon_movers" | "social" | "claude_inference";
  strength: "strong" | "moderate" | "emerging";
}

const TREND_SIGNALS: TrendTemplate[] = [
  { signal: "Category search volume up 85%+ YoY on Google Trends", source: "google_trends", strength: "strong" },
  { signal: "Subcategory climbing Amazon Movers & Shakers list consistently", source: "amazon_movers", strength: "moderate" },
  { signal: "Product type trending on TikTok with 50M+ hashtag views", source: "social", strength: "strong" },
  { signal: "Instagram Reels showing growing creator content in this niche", source: "social", strength: "moderate" },
  { signal: "Related keywords showing emerging search interest (10-30% growth)", source: "google_trends", strength: "emerging" },
  { signal: "Category projected to grow 12-18% CAGR through 2028", source: "claude_inference", strength: "moderate" },
  { signal: "Competitor products in top 100 BSR with only 500-2000 reviews — low moat", source: "amazon_movers", strength: "strong" },
  { signal: "Adjacent product category already validated — natural expansion niche", source: "claude_inference", strength: "moderate" },
  { signal: "Seasonal demand peak approaching — 3-month window to launch", source: "google_trends", strength: "strong" },
  { signal: "Reddit and forum discussions showing unmet demand in this space", source: "social", strength: "emerging" },
  { signal: "YouTube review content generating high engagement with limited product options", source: "social", strength: "moderate" },
  { signal: "Amazon search suggest showing long-tail keywords with low sponsored results", source: "amazon_movers", strength: "emerging" },
  { signal: "Category average price rising 15%+ indicating willingness to pay for quality", source: "claude_inference", strength: "moderate" },
  { signal: "New related patent filings increasing — signals category innovation wave", source: "claude_inference", strength: "emerging" },
  { signal: "Pinterest saves for this product type up 200%+ in last 6 months", source: "social", strength: "strong" },
];

// ── Risk factor templates ────────────────────────────────────────────

interface RiskTemplate {
  risk: string;
  severity: "high" | "medium" | "low";
  mitigation: string;
}

const RISK_FACTORS: RiskTemplate[] = [
  { risk: "Low barrier to entry — competitors can copy quickly", severity: "medium", mitigation: "Build brand recognition fast with strong A+ content and verified purchase reviews in first 90 days" },
  { risk: "Seasonal demand may limit year-round sales", severity: "low", mitigation: "Identify 2-3 seasonal peaks and stock inventory accordingly — plan PPC budget around peaks" },
  { risk: "Amazon fee increases could compress margins", severity: "medium", mitigation: "Build 5% margin buffer into pricing — evaluate FBM fulfillment as backup option" },
  { risk: "Manufacturing quality inconsistency between batches", severity: "medium", mitigation: "Require pre-shipment third-party inspection (SGS/Bureau Veritas) for every production run" },
  { risk: "Product returns could exceed 5% threshold", severity: "low", mitigation: "Clear product dimensions and compatibility in listing — proactive insert card with setup help" },
  { risk: "Shipping delays from supplier could miss peak season", severity: "high", mitigation: "Order 90 days before peak — maintain 30-day safety stock at all times" },
  { risk: "Negative initial reviews could tank organic ranking", severity: "high", mitigation: "Launch with Amazon Vine program and ensure first 30 units are perfect quality" },
  { risk: "Patent or IP infringement risk from established brands", severity: "medium", mitigation: "Conduct freedom-to-operate search before production — file design patent on unique features" },
  { risk: "Category may become gated or require ungating approval", severity: "low", mitigation: "Verify category requirements before sourcing — prepare documentation for ungating if needed" },
  { risk: "PPC costs higher than projected in competitive category", severity: "medium", mitigation: "Start with long-tail keyword strategy at lower CPC — scale to broad match after organic ranking builds" },
  { risk: "Product weight or dimensions may trigger oversize FBA tier", severity: "low", mitigation: "Design packaging to stay within standard-size limits — verify dimensions before production" },
  { risk: "Supply chain disruption could interrupt inventory flow", severity: "medium", mitigation: "Qualify 2 backup suppliers during initial sourcing phase — maintain dual-source capability" },
];

// ── Generator function ───────────────────────────────────────────────

function generateBulkSuggestions(): ProductSuggestion[] {
  const rng = mulberry32(88_031_620); // fixed seed — different from mock-data.ts
  const results: ProductSuggestion[] = [];

  function randRange(min: number, max: number): number {
    return min + rng() * (max - min);
  }
  function randInt(min: number, max: number): number {
    return Math.floor(randRange(min, max + 1));
  }
  function pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(rng() * arr.length)];
  }
  function pickN<T>(arr: readonly T[], n: number): T[] {
    const copy = [...arr];
    const out: T[] = [];
    for (let i = 0; i < Math.min(n, copy.length); i++) {
      const idx = Math.floor(rng() * copy.length);
      out.push(copy[idx]);
      copy.splice(idx, 1);
    }
    return out;
  }

  for (let i = 0; i < PRODUCT_TEMPLATES.length; i++) {
    const tmpl = PRODUCT_TEMPLATES[i];
    const id = `sug-gen-${i + 1}`;

    // Target price in the $25-$75 sweet spot
    const targetPrice = +randRange(25, 75).toFixed(2);

    // Pick target customer
    const customerPool = TARGET_CUSTOMERS[tmpl.category] ?? TARGET_CUSTOMERS["Kitchen Gadgets"];
    const targetCustomer = pick(customerPool);

    // Pick 2-3 pain points
    const painPool = PAIN_POINTS[tmpl.category] ?? PAIN_POINTS["Kitchen Gadgets"];
    const numPains = randInt(2, 3);
    const selectedPains = pickN(painPool, numPains);
    const painPointsAddressed: PainPoint[] = selectedPains.map((pp) => ({
      issue: pp.issue,
      affectedPercentage: randInt(15, 60),
      proposedSolution: pp.proposedSolution,
    }));

    // Pick 3-4 differentiators
    const numDiffs = randInt(3, 4);
    const differentiators = pickN(DIFFERENTIATORS, numDiffs);

    // Pick 1-2 trend signals
    const numTrends = randInt(1, 2);
    const trendSignals: TrendSignal[] = pickN(TREND_SIGNALS, numTrends).map((t) => ({
      signal: t.signal,
      source: t.source,
      strength: t.strength,
    }));

    // Pick 1-2 risk factors
    const numRisks = randInt(1, 2);
    const riskFactors: RiskFactor[] = pickN(RISK_FACTORS, numRisks).map((r) => ({
      risk: r.risk,
      severity: r.severity,
      mitigation: r.mitigation,
    }));

    // Viability score: 65-95 (skewed toward higher for curated opportunities)
    const viabilityScore = randInt(65, 95);

    // Viability breakdown: 4 sub-scores summing to viabilityScore, each 0-25
    const rawScores = [rng(), rng(), rng(), rng()];
    const rawSum = rawScores.reduce((a, b) => a + b, 0);
    const scaled = rawScores.map((s) => Math.round((s / rawSum) * viabilityScore));
    // Clamp each to 0-25
    const clamped = scaled.map((s) => Math.max(0, Math.min(25, s)));
    // Adjust to sum exactly to viabilityScore
    let diff = viabilityScore - clamped.reduce((a, b) => a + b, 0);
    for (let j = 0; diff !== 0 && j < 4; j++) {
      const adjust = diff > 0 ? Math.min(diff, 25 - clamped[j]) : Math.max(diff, -clamped[j]);
      clamped[j] += adjust;
      diff -= adjust;
    }
    const viabilityBreakdown: ViabilityBreakdown = {
      demandConfidence: clamped[0],
      differentiationStrength: clamped[1],
      marginPotential: clamped[2],
      executionFeasibility: clamped[3],
    };

    // Tier derived from viability score
    const tier: ViabilityTier =
      viabilityScore >= 85 ? "S" :
      viabilityScore >= 70 ? "A" :
      viabilityScore >= 55 ? "B" : "C";

    // Generated by: alternate between trend_expansion and hybrid
    const generatedBy: "trend_expansion" | "hybrid" = i % 2 === 0 ? "trend_expansion" : "hybrid";

    results.push({
      id,
      sourceProductIds: [],
      sourceAnalysisIds: [],
      title: tmpl.title,
      description: tmpl.description,
      category: tmpl.category,
      subcategory: tmpl.subcategory,
      targetCustomer,
      targetPrice,
      painPointsAddressed,
      differentiators,
      trendSignals,
      riskFactors,
      viabilityScore,
      viabilityBreakdown,
      tier,
      status: "draft",
      generatedBy,
      claudeModel: "claude-sonnet-4-6",
      createdAt: NOW,
      updatedAt: NOW,
    });
  }

  return results;
}

// ── Data Maps ────────────────────────────────────────────────────────

const handCraftedSuggestions: ProductSuggestion[] = [sug1, sug2, sug3, sug4, sug5, sug6];
const allSuggestions: ProductSuggestion[] = [...handCraftedSuggestions, ...generateBulkSuggestions()];
const costEstimates: CostEstimate[] = [ce1, ce2, ce3, ce4, ce5, ce6];
const supplierSearches: SupplierSearch[] = [ss1, ss2, ss3, ss4, ss5, ss6];

const suggestionMap = new Map(allSuggestions.map((s) => [s.id, s]));
const costEstimateMap = new Map(costEstimates.map((c) => [c.suggestionId, c]));
const supplierSearchMap = new Map(supplierSearches.map((s) => [s.suggestionId, s]));

// ── Exported Helpers ─────────────────────────────────────────────────

export function getMockSuggestions(): ProductSuggestion[] {
  return allSuggestions;
}

export function getMockSuggestion(id: string): ProductSuggestion | undefined {
  return suggestionMap.get(id);
}

export function getMockCostEstimate(suggestionId: string): CostEstimate | undefined {
  return costEstimateMap.get(suggestionId);
}

export function getMockSupplierSearch(suggestionId: string): SupplierSearch | undefined {
  return supplierSearchMap.get(suggestionId);
}

export function getMockScoredSuppliers(suggestionId: string): ScoredSupplier[] {
  return supplierSearchMap.get(suggestionId)?.suppliers ?? [];
}

export function getMockOutreach(suggestionId: string): OutreachMessage | undefined {
  return supplierSearchMap.get(suggestionId)?.outreachMessage;
}

export function getMockSuggestionStats(): {
  total: number;
  avgViability: number;
  sTierCount: number;
  aTierCount: number;
  bTierCount: number;
} {
  const total = allSuggestions.length;
  const avgViability = Math.round(allSuggestions.reduce((sum, s) => sum + s.viabilityScore, 0) / total);
  const sTierCount = allSuggestions.filter((s) => s.tier === "S").length;
  const aTierCount = allSuggestions.filter((s) => s.tier === "A").length;
  const bTierCount = allSuggestions.filter((s) => s.tier === "B").length;
  return { total, avgViability, sTierCount, aTierCount, bTierCount };
}
