import type {
  ProductVerdict,
  BeginnerFitAssessment,
  DisqualifiedProduct,
} from "@/lib/types/intelligence";

export const MOCK_VERDICT: ProductVerdict = {
  productName: "Self-Cleaning Silicone Garlic Press with Ergonomic Rocker Design",
  targetPrice: 22.99,
  estimatedUnitCost: 3.45,
  minimumOrderQuantity: 300,
  category: "Kitchen Gadgets",
  investmentThesis: "The garlic press market on Amazon is dominated by legacy stainless steel designs with 3 recurring complaints: difficult cleaning, poor ergonomics, and inability to handle small cloves. A silicone-hybrid rocker design with self-cleaning mechanism addresses all three while maintaining premium positioning at $22.99 — well within impulse-buy range for kitchen enthusiasts. With 4,200+ monthly searches and only 2 listings above 4.5 stars, there's a clear gap for a differentiated product that a beginner can launch within 85 days on a $4,342 budget.",
  winConditionAssessment: [
    {
      name: "Low Competition",
      met: true,
      score: 22,
      evidence: "Only 47 listings in primary keyword, 2 above 4.5 stars. Top 3 sellers control 68% of revenue but have aging listings (2+ years) with no recent innovation.",
      caveat: "One seller has 12,000+ reviews creating social proof barrier.",
    },
    {
      name: "High Margin",
      met: true,
      score: 21,
      evidence: "Unit cost $3.45 + $1.12 shipping + $6.24 Amazon fees = $10.81 total. At $22.99 selling price, gross margin is 53%. After PPC stabilization, net margin targets 35-40%.",
      caveat: "PPC costs in Month 1-3 will compress margins to 15-20% during launch phase.",
    },
    {
      name: "Fast Launch",
      met: true,
      score: 20,
      evidence: "Simple product with no electronics, no FDA requirements, no certifications beyond basic food-safety silicone. Supplier lead time 25-30 days. Can go live in under 60 days.",
      caveat: "Photography and A+ Content creation may add 5-7 days if perfectionist approach taken.",
    },
    {
      name: "Scalable",
      met: true,
      score: 19,
      evidence: "Kitchen gadgets category has year-round demand with Q4 uplift. Product design allows color variants and bundle expansion without new tooling. Reorder point economics improve at 500+ units.",
      caveat: "Seasonal Q4 surge requires inventory planning 90 days ahead — working capital may constrain growth.",
    },
  ],
  totalWinScore: 82,
  alternativesConsidered: [
    {
      productName: "Collapsible Silicone Measuring Cups (Set of 4)",
      reason: "Strong gap analysis signal — 72% of negative reviews cite poor durability and inaccurate measurements",
      whyNotChosen: "Requires FDA food-contact certification ($800+) and 6-color minimum from suppliers, pushing MOQ to 1,000 units ($6,200 minimum order). Exceeds beginner budget ceiling.",
    },
    {
      productName: "Magnetic Spice Jar Labels (120-pack)",
      reason: "Low competition and high margin — only 23 listings, 89% profit margin at scale",
      whyNotChosen: "Extremely low barrier to entry means copycat risk is critical. Product requires custom printing setup ($1,200 NRE fee). Market size ceiling of $45K/month limits long-term potential.",
    },
  ],
  beginnerAdvantages: [
    "No electronics or batteries — eliminates UL certification requirement",
    "Simple, single-piece design — minimal QC complexity",
    "Kitchen gadget category has forgiving return rate (under 3%)",
    "Visual product photographs well — reduces need for expensive lifestyle shoots",
  ],
  mustHaveFeatures: [
    "Food-grade silicone with stainless steel inner frame",
    "Self-cleaning wiper mechanism (push-through design)",
    "Ergonomic rocker handle (reduces hand strain vs squeeze design)",
    "Dual-chamber for different clove sizes",
    "Dishwasher-safe construction",
  ],
};

export const MOCK_BEGINNER_FIT: BeginnerFitAssessment = {
  totalScore: 78,
  dimensions: [
    {
      name: "capitalAdequacy",
      label: "Capital Adequacy",
      score: 16,
      explanation: "Total launch cost $4,342 fits within $5K ceiling with $658 buffer. However, reorder capital ($1,035) needed by month 3 leaves thin margin for unexpected costs.",
    },
    {
      name: "skillAlignment",
      label: "Skill Alignment",
      score: 14,
      explanation: "Product listing, photography, and basic PPC are learnable skills. No technical expertise required. Main skill gap is supplier negotiation and quality control protocols.",
    },
    {
      name: "timeCommitment",
      label: "Time Commitment",
      score: 17,
      explanation: "Estimated 15-20 hours/week during launch phase (weeks 1-8), dropping to 5-10 hours/week during optimization. Compatible with part-time schedule.",
    },
    {
      name: "riskTolerance",
      label: "Risk Tolerance",
      score: 15,
      explanation: "Maximum loss scenario is $4,342 (full startup capital). Product has no expiration date and silicone has liquidation value. Moderate risk profile suitable for beginners.",
    },
    {
      name: "operationalComplexity",
      label: "Operational Complexity",
      score: 16,
      explanation: "FBA handles fulfillment. Single SKU simplifies inventory. No bundling complexity. Main operational challenge is initial supplier communication and sample evaluation.",
    },
  ],
  warnings: [
    {
      severity: "critical",
      message: "Account suspension risk: New Amazon seller accounts face heightened scrutiny in first 90 days. Any policy violation (even accidental) can result in immediate suspension. Follow TOS exactly.",
    },
    {
      severity: "important",
      message: "PPC learning curve: Expect to overspend on advertising in Month 1-2 while learning campaign optimization. Budget $600/month for PPC with acceptance that initial ACOS will be 40-60%.",
    },
    {
      severity: "fyi",
      message: "Seasonal Q4 surge: Kitchen gadgets see 2-3x volume increase Oct-Dec. If launching in Q3, plan inventory accordingly or risk stockout during peak demand.",
    },
  ],
  requiredLearning: [
    {
      topic: "Amazon Seller Central Navigation",
      timeEstimate: "4-6 hours",
      resource: "Amazon Seller University (free)",
    },
    {
      topic: "Product Photography Basics",
      timeEstimate: "3-4 hours",
      resource: "YouTube: Product Photography on a Budget",
    },
    {
      topic: "PPC Campaign Setup & Management",
      timeEstimate: "6-8 hours",
      resource: "Jungle Scout PPC Academy (free tier)",
    },
    {
      topic: "Supplier Communication & QC",
      timeEstimate: "2-3 hours",
      resource: "Alibaba Supplier Vetting Checklist",
    },
  ],
};

export const MOCK_DISQUALIFIED: DisqualifiedProduct[] = [
  {
    productName: "Bluetooth Meat Thermometer",
    rejectionReason: "Requires FCC certification for Bluetooth module ($3,000-$5,000) — exceeds budget ceiling",
    failedFilter: "budget_ceiling",
    wouldWorkIf: "Budget increased to $8,000+ or partnered with existing certified manufacturer",
  },
  {
    productName: "Stainless Steel Travel Mug (Self-Heating)",
    rejectionReason: "Electronics + lithium battery requires UL certification and hazmat shipping classification",
    failedFilter: "complexity",
    wouldWorkIf: "Removed self-heating feature and competed on insulation/design only",
  },
  {
    productName: "Premium Knife Set (8-piece)",
    rejectionReason: "Top 10 listings average 15,000+ reviews. New entrant cannot compete on social proof within 90 days.",
    failedFilter: "review_barrier",
    wouldWorkIf: "Targeted ultra-niche sub-category (e.g., left-handed knife set) with <500 reviews in top listings",
  },
  {
    productName: "Organic Turmeric Supplement",
    rejectionReason: "Requires FDA facility registration, GMP compliance, and third-party lab testing ($2,000+ before first unit)",
    failedFilter: "regulatory",
    wouldWorkIf: "Partnered with existing GMP-certified contract manufacturer (increases per-unit cost by $1.50-2.00)",
  },
  {
    productName: "Yoga Mat (Premium TPE)",
    rejectionReason: "Average BSR in Yoga Mats is 15,000+. Shipping cost per unit ($4.80) and weight (5.2 lbs) erode margins below viability.",
    failedFilter: "shipping_economics",
    wouldWorkIf: "Sourced ultra-lightweight material (<2 lbs) or sold at $45+ premium positioning",
  },
  {
    productName: "LED Strip Lights (50ft)",
    rejectionReason: "Race to bottom pricing — average selling price dropped 34% in 12 months. Current leader sells at $9.99 with 50,000+ reviews.",
    failedFilter: "price_compression",
    wouldWorkIf: "Targeted commercial/professional segment at $39.99+ with contractor-grade certification",
  },
  {
    productName: "Bamboo Cutting Board Set",
    rejectionReason: "MOQ from quality suppliers is 1,000 units minimum ($4,800 for product alone). Exceeds available capital for first order.",
    failedFilter: "moq_limit",
    wouldWorkIf: "Found supplier willing to do 300-unit trial run or used domestic supplier at higher per-unit cost",
  },
  {
    productName: "Portable Blender (USB-C)",
    rejectionReason: "Lithium battery + motor combination creates import complications, high return rate (8-12%), and potential liability exposure",
    failedFilter: "return_risk",
    wouldWorkIf: "Secured product liability insurance ($500/year) and partnered with established electronics importer",
  },
];
