import type {
  ListingRewriteResult,
  ImageGradingResult,
  QAResult,
  PriceHistoryResult,
  SupplierMatchResult,
  RepeatPurchaseResult,
  CompetitorGapResult,
  PPCKeywordResult,
  PricingStrategyResult,
  URLActionPlan,
} from "@/lib/types/urlAnalysis";

// ── Listing Rewrite ──────────────────────────────────────────────

export const MOCK_LISTING_REWRITE: ListingRewriteResult = {
  originalTitle: "Bamboo Cutting Board Set (3-Piece) with Juice Groove & Easy-Grip Handles — Organic, Pre-Oiled, BPA-Free Kitchen Boards for Meat, Vegetables & Cheese",
  originalBullets: [
    "3-PIECE SET: Large (18x12\"), medium (14x10\"), small (11x8\") — one board for every task",
    "DEEP JUICE GROOVE: Catches liquid runoff from meats and fruits, keeping counters clean",
    "EASY-GRIP HANDLES: Built-in side handles for secure, comfortable lifting even when wet",
    "100% ORGANIC BAMBOO: Naturally antimicrobial, BPA-free, and eco-friendly renewable material",
    "PRE-OILED & READY: Arrives pre-treated with food-safe mineral oil — use right out of the box",
  ],
  originalDescription: "Upgrade your kitchen prep with our premium 3-piece bamboo cutting board set. Each board features deep juice grooves to catch runoff, easy-grip side handles for secure lifting, and a smooth, knife-friendly surface that won't dull your blades. Made from 100% organic Moso bamboo — one of the fastest-growing renewable resources — these boards are naturally antimicrobial and pre-oiled for lasting durability. Includes large (18x12\"), medium (14x10\"), and small (11x8\") sizes for every task from carving roasts to slicing fruit.",
  rewrittenTitle: "Bamboo Cutting Board Set of 3 with Deep Juice Groove & Handles — Organic Kitchen Chopping Boards for Meat & Vegetables, Pre-Oiled, BPA-Free | Perfect Gift",
  rewrittenBullets: [
    "COMPLETE 3-BOARD SET — Large (18x12\"), Medium (14x10\") & Small (11x8\") sizes cover every kitchen task from carving roasts to slicing fruit, so you never reach for the wrong board again",
    "GAME-CHANGING JUICE GROOVE — Deep channel catches every drop of runoff from steaks, chicken, and juicy fruits. No more puddles on your counter (customers call it 'a game changer' — 300+ reviews agree)",
    "WON'T DULL YOUR KNIVES — Bamboo's naturally soft, self-healing surface keeps blades sharp 3x longer than plastic or glass cutting boards. Your knives will thank you",
    "HAND WASH ONLY · 100% ORGANIC BAMBOO — Naturally antimicrobial and BPA-free. Hand wash with warm soapy water to maintain the board's shape for years (never dishwasher — bamboo warps in high heat)",
    "SKIP THE PREP, START CHOPPING — Arrives pre-oiled with FDA-approved food-safe mineral oil so it's ready to use the moment you unbox it. Makes a beautiful housewarming or wedding gift",
  ],
  rewrittenDescription: "Stop settling for cutting boards that dull your knives, stain on first use, or slide around the counter.\n\nThe GreenChef Essentials 3-Piece Bamboo Cutting Board Set gives you the right board for every task — a large board for roasts and meal prep, a medium board for everyday vegetables, and a small board for quick fruit and cheese cuts.\n\nWhat 3,800+ customers love most:\n• The deep juice groove that actually catches runoff (no more counter puddles)\n• Easy-grip side handles that stay secure even with wet hands\n• A knife-friendly surface that keeps blades sharp\n\nMade from sustainably harvested Moso bamboo — one of the planet's fastest-growing renewable resources — each board is naturally antimicrobial and pre-oiled with food-safe mineral oil.\n\nCare tip: Hand wash only with warm soapy water. Re-oil monthly with mineral oil to prevent drying. Never put bamboo in the dishwasher — high heat causes warping.\n\nPerfect as a housewarming gift, wedding present, or a well-deserved kitchen upgrade for yourself.",
  titleChanges: [
    {
      type: "keyword_added",
      explanation: "Added 'Set of 3' — higher search volume than '(3-Piece)'. Added 'Chopping Boards' as a secondary keyword. Added 'Perfect Gift' to capture gift-intent searches (74 reviews mention gifting).",
      before: "Bamboo Cutting Board Set (3-Piece) with Juice Groove & Easy-Grip Handles",
      after: "Bamboo Cutting Board Set of 3 with Deep Juice Groove & Handles",
    },
    {
      type: "length_optimized",
      explanation: "Reduced from 149 to 142 characters. Removed redundant 'Cheese' (low search volume) and moved 'Perfect Gift' to the end as a pipe-separated tag.",
      before: "for Meat, Vegetables & Cheese",
      after: "for Meat & Vegetables, Pre-Oiled, BPA-Free | Perfect Gift",
    },
  ],
  bulletChanges: [
    {
      originalBullet: "3-PIECE SET: Large (18x12\"), medium (14x10\"), small (11x8\") — one board for every task",
      rewrittenBullet: "COMPLETE 3-BOARD SET — Large (18x12\"), Medium (14x10\") & Small (11x8\") sizes cover every kitchen task from carving roasts to slicing fruit, so you never reach for the wrong board again",
      changes: [
        { type: "benefit_clarified", explanation: "Added specific use cases ('carving roasts to slicing fruit') and emotional payoff ('never reach for the wrong board again') — transforms a spec into a benefit.", before: "one board for every task", after: "cover every kitchen task from carving roasts to slicing fruit, so you never reach for the wrong board again" },
      ],
    },
    {
      originalBullet: "DEEP JUICE GROOVE: Catches liquid runoff from meats and fruits, keeping counters clean",
      rewrittenBullet: "GAME-CHANGING JUICE GROOVE — Deep channel catches every drop of runoff from steaks, chicken, and juicy fruits. No more puddles on your counter (customers call it 'a game changer' — 300+ reviews agree)",
      changes: [
        { type: "voc_language", explanation: "Injected verbatim VOC phrase 'game changer' from 312 customer reviews. Social proof ('300+ reviews agree') adds credibility.", before: "DEEP JUICE GROOVE", after: "GAME-CHANGING JUICE GROOVE" },
        { type: "pain_point_addressed", explanation: "Added 'No more puddles on your counter' — directly addresses the frustration that drives buyers to search for juice groove boards.", before: "keeping counters clean", after: "No more puddles on your counter" },
      ],
    },
    {
      originalBullet: "EASY-GRIP HANDLES: Built-in side handles for secure, comfortable lifting even when wet",
      rewrittenBullet: "WON'T DULL YOUR KNIVES — Bamboo's naturally soft, self-healing surface keeps blades sharp 3x longer than plastic or glass cutting boards. Your knives will thank you",
      changes: [
        { type: "benefit_clarified", explanation: "Replaced the handle bullet (low-impact feature) with knife-friendliness (mentioned in 156 reviews). The handle info moves to the description.", before: "EASY-GRIP HANDLES: Built-in side handles for secure, comfortable lifting even when wet", after: "WON'T DULL YOUR KNIVES — Bamboo's naturally soft, self-healing surface keeps blades sharp 3x longer than plastic or glass" },
      ],
    },
    {
      originalBullet: "100% ORGANIC BAMBOO: Naturally antimicrobial, BPA-free, and eco-friendly renewable material",
      rewrittenBullet: "HAND WASH ONLY · 100% ORGANIC BAMBOO — Naturally antimicrobial and BPA-free. Hand wash with warm soapy water to maintain the board's shape for years (never dishwasher — bamboo warps in high heat)",
      changes: [
        { type: "pain_point_addressed", explanation: "Added 'HAND WASH ONLY' as the lead callout. 89 negative reviews cite dishwasher warping — this single change could eliminate the #1 source of 1-star reviews.", before: "100% ORGANIC BAMBOO:", after: "HAND WASH ONLY · 100% ORGANIC BAMBOO —" },
      ],
    },
    {
      originalBullet: "PRE-OILED & READY: Arrives pre-treated with food-safe mineral oil — use right out of the box",
      rewrittenBullet: "SKIP THE PREP, START CHOPPING — Arrives pre-oiled with FDA-approved food-safe mineral oil so it's ready to use the moment you unbox it. Makes a beautiful housewarming or wedding gift",
      changes: [
        { type: "cta_added", explanation: "Added gift positioning ('housewarming or wedding gift') to capture gift-intent searches. 74 reviews praise gift-worthiness.", before: "use right out of the box", after: "ready to use the moment you unbox it. Makes a beautiful housewarming or wedding gift" },
        { type: "specificity_added", explanation: "Changed 'food-safe mineral oil' to 'FDA-approved food-safe mineral oil' — addresses chemical smell concern (34 reviews) by building regulatory trust.", before: "food-safe mineral oil", after: "FDA-approved food-safe mineral oil" },
      ],
    },
  ],
  descriptionChanges: [
    {
      type: "pain_point_addressed",
      explanation: "Added explicit care section with 'NEVER put bamboo in the dishwasher' — addresses the #1 complaint theme directly in the description.",
      before: "pre-oiled for lasting durability",
      after: "Care tip: Hand wash only with warm soapy water. Re-oil monthly with mineral oil to prevent drying. Never put bamboo in the dishwasher.",
    },
    {
      type: "voc_language",
      explanation: "Added 'What 3,800+ customers love most' section using verbatim VOC phrases — builds social proof and addresses key purchase drivers.",
      before: "Each board features deep juice grooves",
      after: "What 3,800+ customers love most: • The deep juice groove that actually catches runoff",
    },
  ],
  keywordsAdded: ["chopping boards", "perfect gift", "housewarming gift", "set of 3", "won't dull knives", "hand wash only"],
  keywordsRemoved: ["cheese"],
  readabilityImprovement: "Flesch-Kincaid grade level reduced from 11.2 to 7.8 — now readable by a wider audience. Sentences shortened from avg 24 words to 16 words.",
  originalListingScore: 62,
  rewrittenListingScore: 84,
  projectedCTRImprovement: "+18–25%",
  projectedConversionImprovement: "+12–18%",
};

// ── Image Grading ────────────────────────────────────────────────

export const MOCK_IMAGE_GRADING: ImageGradingResult = {
  overallImageScore: 68,
  overallImageGrade: "B-",
  images: [
    { imageUrl: "https://images-na.ssl-images-amazon.com/images/I/71kxBcZ7lL._AC_SL1500_.jpg", imageIndex: 0, type: "main", score: 82, grade: "A-", strengths: ["Clean white background", "All 3 boards visible", "Good lighting"], weaknesses: ["Flat lay angle — lacks depth"], specificImprovements: ["Angle the boards to show the juice groove depth"] },
    { imageUrl: "https://images-na.ssl-images-amazon.com/images/I/81jKpReT4L._AC_SL1500_.jpg", imageIndex: 1, type: "lifestyle", score: 75, grade: "B", strengths: ["Kitchen context", "Warm lighting"], weaknesses: ["No human hands — feels staged"], specificImprovements: ["Add hands actively chopping to show the product in use"] },
    { imageUrl: "https://images-na.ssl-images-amazon.com/images/I/71QmR3pXkL._AC_SL1500_.jpg", imageIndex: 2, type: "infographic", score: 70, grade: "B", strengths: ["Dimensions labeled", "Clear text"], weaknesses: ["Text too small on mobile", "No size comparison object"], specificImprovements: ["Add a common object (apple, knife) for scale reference"] },
    { imageUrl: "https://images-na.ssl-images-amazon.com/images/I/81xYzK3nFL._AC_SL1500_.jpg", imageIndex: 3, type: "detail", score: 65, grade: "B-", strengths: ["Close-up of juice groove"], weaknesses: ["Dark lighting", "No liquid in the groove"], specificImprovements: ["Show juice actively being caught in the groove with bright lighting"] },
    { imageUrl: "https://images-na.ssl-images-amazon.com/images/I/71hJwPqR2L._AC_SL1500_.jpg", imageIndex: 4, type: "detail", score: 55, grade: "C", strengths: ["Shows handle grip"], weaknesses: ["Low contrast", "Blurry edges"], specificImprovements: ["Reshoot with sharper focus and higher contrast background"] },
    { imageUrl: "https://images-na.ssl-images-amazon.com/images/I/81mN7k3JxL._AC_SL1500_.jpg", imageIndex: 5, type: "lifestyle", score: 72, grade: "B", strengths: ["Food styling on the board"], weaknesses: ["No person in frame"], specificImprovements: ["Add hands serving — lifestyle images with people convert 23% better"] },
    { imageUrl: "https://images-na.ssl-images-amazon.com/images/I/71vXcZ8qRL._AC_SL1500_.jpg", imageIndex: 6, type: "packaging", score: 60, grade: "C+", strengths: ["Shows the gift box"], weaknesses: ["Generic angle", "No 'gift' context"], specificImprovements: ["Stage with ribbon/bow and a gift tag to reinforce gift positioning"] },
  ],
  mainImageScore: 82,
  lifestyleImageCount: 2,
  infographicCount: 1,
  whiteBackgroundCount: 1,
  videoPresent: false,
  aplusContentPresent: false,
  missingImageTypes: ["Scale reference image with common foods", "Comparison image vs competitors"],
  missingInfographics: ["Care instructions infographic (HAND WASH ONLY)", "Material sourcing story (organic bamboo)"],
  priorityImageImprovements: [
    { priority: 1, improvement: "Add a 'HAND WASH ONLY' care instruction infographic", impact: "high", estimatedCost: "$80–150 for graphic design", briefForPhotographer: "Create a clean infographic with icons: checkmark next to 'Hand wash with warm water', X next to 'Dishwasher', checkmark next to 'Monthly mineral oil'. Use brand colors. Large, mobile-readable text." },
    { priority: 2, improvement: "Add product video showing the juice groove in action", impact: "high", estimatedCost: "$300–600 for 30-second product video", briefForPhotographer: "30-second video: hands carving a juicy steak on the board, juice flowing into the groove (slow-mo close-up), then easy wipe-clean. End with the 3-board set on a beautiful counter." },
    { priority: 3, improvement: "Replace image 5 (blurry handle shot) with a scale reference", impact: "medium", estimatedCost: "$100–200 for reshoot", briefForPhotographer: "Overhead shot of all 3 boards with common foods for scale: whole chicken on large, bell peppers on medium, lemon on small. Clean white background, bright even lighting." },
  ],
  infographicBriefs: [
    { infographicType: "Care Instructions", headline: "Keep Your Boards Beautiful for Years", keyPoints: ["Hand wash with warm soapy water", "Never put in dishwasher", "Re-oil monthly with mineral oil", "Store upright to air dry"], visualDirection: "Icon-based layout with green checkmarks and red X marks. Large text readable on mobile. Brand color palette.", priority: "must_have" },
    { infographicType: "Feature Callout", headline: "Why 3,800+ Customers Love This Set", keyPoints: ["Deep juice groove catches every drop", "Won't dull your knives", "3 sizes for every task", "Pre-oiled and ready to use"], visualDirection: "Close-up photos with callout arrows pointing to each feature. Customer quote badges ('game changer!') next to features.", priority: "should_have" },
  ],
};

// ── Q&A Extraction ───────────────────────────────────────────────

export const MOCK_QA_RESULT: QAResult = {
  totalQuestionsAnalyzed: 142,
  questionCategories: [
    { category: "Care & Maintenance", count: 47 },
    { category: "Size & Dimensions", count: 31 },
    { category: "Material & Safety", count: 28 },
    { category: "Usage & Compatibility", count: 22 },
    { category: "Warranty & Returns", count: 14 },
  ],
  listingGaps: [
    { question: "Can this go in the dishwasher?", gap: "Care instructions not prominent — 47 questions about washing despite being in the description", whereToAdd: "bullets", suggestedCopy: "HAND WASH ONLY — bamboo warps in dishwashers. Warm soapy water is all you need." },
    { question: "What's the weight of the large board?", gap: "Weight not listed anywhere in the listing", whereToAdd: "bullets", suggestedCopy: "Large board weighs 2.8 lbs — sturdy enough to stay put, light enough to lift with one hand." },
    { question: "Is the mineral oil food-safe?", gap: "Oil type specified but FDA approval not mentioned", whereToAdd: "description", suggestedCopy: "Pre-treated with FDA-approved, food-grade mineral oil. 100% safe for food contact." },
    { question: "Does it come with a warranty?", gap: "No warranty information in the listing", whereToAdd: "description", suggestedCopy: "Backed by our 1-year satisfaction guarantee. If your board cracks or warps under normal use, we'll replace it free." },
  ],
  buyerObjections: [
    { objection: "Price is higher than competitors", frequency: 18, overcome: "Emphasize the 3-piece value proposition — most competitors sell single boards for $25-30. The set effectively costs $11.66/board." },
    { objection: "Bamboo might not be durable enough", frequency: 12, overcome: "Cite bamboo's Janka hardness rating (1,380 lbf — harder than most hardwoods) and the naturally antimicrobial properties." },
    { objection: "Will it fit in my sink for washing?", frequency: 8, overcome: "Add dimensions relative to standard sink sizes: 'Large board fits standard 22\" kitchen sinks with room to spare.'" },
  ],
  unansweredQuestions: [
    "Does the set come with mineral oil for re-oiling?",
    "Can I use it as a serving board for a charcuterie spread?",
    "Is the bamboo sourced sustainably? Any certifications?",
  ],
  faqSuggestions: [
    { question: "Can I put this cutting board in the dishwasher?", answer: "No — bamboo warps in high heat. Hand wash with warm soapy water and towel dry. It takes less than 30 seconds!", priority: "high" },
    { question: "How often should I re-oil the board?", answer: "Once a month with food-grade mineral oil. Apply a thin coat, let it soak for 20 minutes, then wipe off excess. This keeps the bamboo hydrated and prevents cracking.", priority: "high" },
    { question: "Is this set a good gift?", answer: "Absolutely! The set comes in a beautiful kraft gift box. It's one of our most popular housewarming and wedding gifts. Many customers buy two — one to keep and one to gift.", priority: "medium" },
  ],
  listingAmendments: [
    "Add weight (2.8 lbs large, 1.9 lbs medium, 1.1 lbs small) to the dimensions bullet",
    "Add 'FDA-approved' before 'food-safe mineral oil' in bullet 5",
    "Add '1-Year Satisfaction Guarantee' to the description footer",
    "Add 'Fits standard kitchen sinks' to address the wash-ability concern",
  ],
};

// ── Price History ────────────────────────────────────────────────

function generatePriceHistory(): PriceHistoryResult {
  const dataPoints = [];
  const basePrice = 34.99;
  const baseBSR = 2341;
  const now = new Date();

  for (let i = 89; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const priceNoise = (Math.sin(i * 0.15) * 2) + (Math.random() - 0.5) * 1.5;
    const bsrNoise = (Math.sin(i * 0.1) * 300) + (Math.random() - 0.5) * 200;
    const isPrimeDay = i >= 55 && i <= 57;
    const price = isPrimeDay ? basePrice - 8 : Math.round((basePrice + priceNoise) * 100) / 100;
    const bsr = isPrimeDay ? Math.round(baseBSR - 1200) : Math.round(Math.max(500, baseBSR + bsrNoise));
    dataPoints.push({ date: date.toISOString().split("T")[0], price, bsr });
  }

  return {
    priceDataPoints: dataPoints,
    priceVolatility: "low",
    priceDirection: "stable",
    lowestPrice90Days: 26.99,
    highestPrice90Days: 37.49,
    averagePrice90Days: 34.12,
    currentVsAverage: 2.5,
    bsrDirection: "stable",
    bestBSR90Days: 1141,
    worstBSR90Days: 2987,
    detectedEvents: [
      { date: new Date(now.getTime() - 56 * 86400000).toISOString().split("T")[0], type: "lightning_deal", magnitude: 22.9, possibleReason: "Prime Big Deal Days promotional pricing — $26.99 (23% off)" },
      { date: new Date(now.getTime() - 55 * 86400000).toISOString().split("T")[0], type: "bsr_spike", magnitude: 51.3, possibleReason: "BSR improved to #1,141 during Prime deal — 3.2x normal sales velocity" },
      { date: new Date(now.getTime() - 21 * 86400000).toISOString().split("T")[0], type: "price_increase", magnitude: 2.50, possibleReason: "Price increased from $34.99 to $37.49 briefly — likely testing price elasticity" },
    ],
    priceElasticitySignal: "Moderate elasticity — the Prime Day deal at $26.99 drove a 3.2x sales spike, suggesting significant price sensitivity in this category. However, the brief $37.49 test didn't appear to crash BSR, indicating some willingness to pay a premium.",
    optimalPriceWindow: "$31.99–$34.99",
    pricingInsight: "Current price of $34.99 is at the top of the optimal window. A permanent $2 reduction to $32.99 would likely improve BSR by 15-20% while only reducing margin by ~$2/unit. For aggressive ranking, a temporary price of $29.99 with a 15% coupon would drive significant velocity.",
  };
}

export const MOCK_PRICE_HISTORY: PriceHistoryResult = generatePriceHistory();

// ── Supplier Match ───────────────────────────────────────────────

export const MOCK_SUPPLIER_MATCH: SupplierMatchResult = {
  productSpec: {
    productName: "3-Piece Bamboo Cutting Board Set with Juice Groove",
    keyMaterials: ["Moso bamboo (strand-woven)", "Food-grade mineral oil finish"],
    targetDimensions: "Large: 18x12x0.75\", Medium: 14x10x0.7\", Small: 11x8x0.6\"",
    targetWeight: "Total set: 5.8 lbs",
    requiredCertifications: ["FDA food contact", "FSC bamboo sourcing"],
    packagingRequirements: "Kraft gift box with individual board sleeves and care instruction card",
    customizationNeeds: ["Laser-engraved logo on each board", "Custom juice groove depth (5mm)"],
    targetUnitCost: 3.50,
    targetMOQ: 500,
  },
  estimatedManufacturingRegion: "Fujian Province, China (Bamboo capital — 90%+ of global bamboo products originate here)",
  estimatedMaterialComposition: ["Moso bamboo (strand-woven, 16+ strip lamination)", "Food-grade mineral oil coating", "Kraft cardboard packaging"],
  searchKeywords: ["bamboo cutting board set manufacturer", "bamboo chopping board 3 piece OEM", "moso bamboo kitchen board factory Fujian", "custom bamboo board with juice groove"],
  filterCriteria: {
    minYearsInBusiness: 5,
    minTradeAssuranceUSD: 50000,
    requiredVerifications: ["Gold Supplier", "Verified Manufacturer"],
    minResponseRate: 85,
    maxMOQ: 500,
    maxLeadTimeDays: 35,
    preferredRegions: ["Fujian", "Zhejiang", "Jiangxi"],
  },
  estimatedSourceCost: { low: 2.80, mid: 3.50, high: 4.20, currency: "USD" },
  estimatedLandedCost: { low: 7.80, mid: 8.50, high: 9.70, currency: "USD" },
  marginVsCurrentPrice: {
    atCurrentPrice: 47.7,
    atLowPrice: 42.1,
    recommendedSalePrice: 32.99,
    projectedNetMargin: 43.2,
  },
  sourcingOpportunityScore: 78,
  sourcingVerdict: "viable",
  sourcingRationale: "Strong sourcing opportunity with healthy margins even at the recommended lower price point of $32.99. Bamboo cutting boards are a commodity product with well-established supply chains in Fujian province. The key differentiation must come from the listing quality and brand positioning, not the product itself. MOQ of 500 units at ~$3.50/unit = $1,750 initial inventory investment — very accessible for a first-time seller.",
};

// ── Repeat Purchase ──────────────────────────────────────────────

export const MOCK_REPEAT_PURCHASE: RepeatPurchaseResult = {
  score: 62,
  probability: "medium",
  drivers: [
    { driver: "Multi-board set creates different use occasions", strength: "moderate", evidence: "Customers assign specific boards to specific tasks (meat board, veggie board) — creating habitual use patterns." },
    { driver: "Gift-giving potential drives secondary purchases", strength: "strong", evidence: "74 reviews mention buying as gifts. Gift buyers who like the product often buy one for themselves." },
    { driver: "Bamboo maintenance creates accessory cross-sell", strength: "moderate", evidence: "Monthly mineral oil requirement creates a recurring need that can drive repeat visits to the brand." },
  ],
  inhibitors: [
    { inhibitor: "Durable product with long replacement cycle", severity: "high", mitigation: "Bamboo boards last 3-5 years with proper care. Focus on gift-driven repeat purchases rather than replacement cycles." },
    { inhibitor: "Low brand loyalty in commodity kitchen category", severity: "medium", mitigation: "Build brand through care guide inserts, email follow-up sequences, and a loyalty discount on the mineral oil refill." },
  ],
  ltv: {
    averageOrderValue: 34.99,
    estimatedOrdersPerYear: 1.3,
    estimatedLTV12Month: 45.49,
    estimatedLTV36Month: 68.23,
  },
  brandBuildingVerdict: "Moderate brand-building potential. The product itself is a commodity, but the gift positioning and care maintenance ecosystem create opportunities for repeat engagement. Invest in a brand presence (mineral oil refill, cutting board conditioner, matching kitchen accessories) to extend LTV beyond single purchase.",
  subscriptionOpportunity: false,
  bundleOpportunities: [
    "Mineral oil conditioning kit (board oil + applicator cloth) — $9.99 add-on",
    "Matching bamboo utensil set (spatula, tongs, spoons) — $24.99 bundle",
    "Bamboo board stand/organizer for counter display — $14.99 upsell",
    "Charcuterie accessories set (cheese knives, serving picks) — $19.99 cross-sell",
  ],
  summary: "Medium repeat purchase probability (62/100). The product's durability works against replacement-driven repeats, but the gift positioning and care maintenance ecosystem create genuine pathways to recurring revenue. The best LTV strategy is to build a kitchen accessories brand around the cutting board as the entry point — not to expect the cutting board itself to drive repeats.",
};

// ── Competitor Gap ───────────────────────────────────────────────

export const MOCK_COMPETITOR_GAP: CompetitorGapResult = {
  topCompetitors: [
    { asin: "B08M3H7D5P", title: "RoyalCraft Premium Bamboo Cutting Board", price: 29.99, rating: 4.7, reviewCount: 8200, bsr: 412, keyStrengths: ["Lower price", "More reviews", "Better BSR"], keyWeaknesses: ["Single board only", "No juice groove", "Generic branding"] },
    { asin: "B07QXMPZ3V", title: "Totally Bamboo 3-Piece Board Set", price: 32.99, rating: 4.5, reviewCount: 5100, bsr: 891, keyStrengths: ["Established brand", "5K+ reviews"], keyWeaknesses: ["Thinner boards", "Shallow groove", "No handle cutouts"] },
    { asin: "B09DK7P2NR", title: "Home Hero Bamboo Cutting Board Set", price: 27.99, rating: 4.4, reviewCount: 2800, bsr: 1567, keyStrengths: ["Lowest price", "Includes board stand"], keyWeaknesses: ["Lower quality bamboo", "More complaints about warping", "4.4 rating"] },
  ],
  productGaps: [
    { gap: "No included board stand or organizer", competitorsThatHaveIt: ["Home Hero"], impactOnGrade: "medium", fixDifficulty: "easy", recommendation: "Add a simple bamboo stand to the set for ~$1.50 additional COGS — creates a strong differentiator and solves the counter storage problem." },
    { gap: "No A+ Content or brand story page", competitorsThatHaveIt: ["RoyalCraft", "Totally Bamboo"], impactOnGrade: "medium", fixDifficulty: "easy", recommendation: "Create A+ Content with comparison chart, lifestyle photos, and sustainability story. RoyalCraft's A+ Content likely contributes to their conversion advantage." },
    { gap: "No product video", competitorsThatHaveIt: ["RoyalCraft", "Totally Bamboo"], impactOnGrade: "high", fixDifficulty: "medium", recommendation: "Add a 30-second product video showing the juice groove in action. Videos increase conversion by 9-15% on average." },
  ],
  competitorWeaknesses: [
    { weakness: "RoyalCraft only offers a single board — no set option", affectedCompetitors: ["RoyalCraft"], opportunityFor: "The 3-piece set format is a genuine differentiator vs the category leader", actionableStep: "Emphasize 'Complete Set' positioning in title and main image. Add a comparison infographic showing value per board." },
    { weakness: "Home Hero has significantly more warping complaints despite lower price", affectedCompetitors: ["Home Hero"], opportunityFor: "Quality positioning against the budget option", actionableStep: "If reviews allow, create a competitor comparison that highlights material quality and thickness advantage." },
    { weakness: "None of the top 3 competitors effectively address gift positioning", affectedCompetitors: ["RoyalCraft", "Totally Bamboo", "Home Hero"], opportunityFor: "Gift-intent keyword capture is a blue ocean in this category", actionableStep: "Add 'Perfect Gift' to title, create gift-themed A+ Content, target 'kitchen gift set' and 'housewarming gift' in PPC." },
  ],
  marketPositionMap: "Mid-premium position: higher quality than budget options (Home Hero), better value proposition than premium single-boards (RoyalCraft), similar positioning to Totally Bamboo but with better groove design. The gift angle is an unexploited differentiator that no competitor owns.",
  differentiationScore: 58,
  commodityRisk: "medium",
  summary: "The product occupies a defensible mid-premium position with the 3-piece set format and deep juice groove as genuine differentiators. However, competitors are starting to copy the set format (Totally Bamboo, Home Hero), and the commodity risk is medium. The gift positioning represents the strongest untapped opportunity — no competitor in the top 10 effectively targets gift-intent searches. Investing in A+ Content, product video, and an optional board stand would close the key gaps and strengthen competitive position from B- to B+.",
};

// ── PPC Keywords ─────────────────────────────────────────────────

export const MOCK_PPC_KEYWORDS: PPCKeywordResult = {
  exactMatchTargets: [
    { keyword: "bamboo cutting board set", matchType: "exact", searchVolume: "high", competition: "high", estimatedBid: 2.45, intent: "Direct product search — highest conversion intent" },
    { keyword: "bamboo cutting board with juice groove", matchType: "exact", searchVolume: "medium", competition: "medium", estimatedBid: 1.85, intent: "Feature-specific search — buyer knows what they want" },
    { keyword: "3 piece cutting board set", matchType: "exact", searchVolume: "medium", competition: "medium", estimatedBid: 1.92, intent: "Set-specific search — matches our format exactly" },
    { keyword: "organic bamboo cutting board", matchType: "exact", searchVolume: "medium", competition: "medium", estimatedBid: 1.78, intent: "Material-conscious buyer — health and eco-focused" },
  ],
  broadMatchOpportunities: [
    { keyword: "cutting board", matchType: "broad", searchVolume: "high", competition: "high", estimatedBid: 3.10, intent: "Category-level discovery — high volume, lower conversion rate" },
    { keyword: "kitchen cutting board set", matchType: "broad", searchVolume: "medium", competition: "medium", estimatedBid: 2.15, intent: "Kitchen-specific — slightly more qualified than generic" },
    { keyword: "wooden cutting board", matchType: "broad", searchVolume: "high", competition: "high", estimatedBid: 2.80, intent: "Material preference — bamboo is a subset of 'wooden'" },
  ],
  longTailGems: [
    { keyword: "bamboo cutting board set with juice groove and handles", matchType: "exact", searchVolume: "low", competition: "low", estimatedBid: 0.85, intent: "Ultra-specific — buyer describing exactly our product. Near-100% conversion if we rank." },
    { keyword: "best cutting board gift set", matchType: "phrase", searchVolume: "low", competition: "low", estimatedBid: 1.12, intent: "Gift-intent long tail — low competition, high conversion" },
    { keyword: "cutting board that won't dull knives", matchType: "phrase", searchVolume: "low", competition: "low", estimatedBid: 0.95, intent: "VOC-derived — 156 reviews mention knife-friendliness" },
    { keyword: "easy clean bamboo chopping board", matchType: "phrase", searchVolume: "low", competition: "low", estimatedBid: 0.78, intent: "VOC-derived — 201 reviews mention easy cleaning" },
    { keyword: "housewarming gift kitchen", matchType: "broad", searchVolume: "low", competition: "low", estimatedBid: 0.92, intent: "Gift occasion — captures non-product-specific gift searches" },
  ],
  totalEstimatedMonthlyBudget: 1850,
  topKeywordInsight: "The long-tail VOC-derived keywords ('won't dull knives', 'easy clean') are the biggest opportunity. They have low competition ($0.78–0.95 CPC vs $2.45 for broad terms) and high conversion intent because they mirror the exact language customers use to describe what they want. Allocate 40% of PPC budget to long-tail exact and phrase match campaigns.",
};

// ── Pricing Strategy ─────────────────────────────────────────────

export const MOCK_PRICING_STRATEGY: PricingStrategyResult = {
  optimalPrice: 32.99,
  priceRationale: "Reducing from $34.99 to $32.99 hits the psychological $32 threshold while staying above the $29.99 budget tier. The $2 reduction is offset by an estimated 15-20% BSR improvement from increased velocity. Net margin at $32.99 is still 43.2% — well above the 30% minimum threshold for sustainable FBA products.",
  promotionalSequence: [
    { phase: "Launch/Relaunch", duration: "Weeks 1-2", price: 29.99, coupon: "15% off", rationale: "Aggressive introductory pricing to drive velocity and rank improvement. The 15% coupon stacks visually on the listing and triggers deal-seeker traffic." },
    { phase: "Velocity Building", duration: "Weeks 3-6", price: 31.99, coupon: "10% off", rationale: "Gradually raise price while maintaining coupon visibility. The perceived deal keeps conversion rate high during the critical rank-building window." },
    { phase: "Steady State", duration: "Week 7+", price: 32.99, rationale: "Remove coupon and settle at optimal price. By this point, improved BSR and review velocity should sustain organic traffic without promotional pricing." },
  ],
  couponStrategy: "Use clip-to-save coupons (not price drops) — they increase click-through rate by 12% on average and create a sense of exclusive savings. During Q4 holiday season, add a 20% holiday coupon to capture gift traffic. Subscribe & Save is not applicable for this product category.",
  longTermPricingRoadmap: "Hold at $32.99 through Q1-Q3. During Q4 (Nov-Dec), raise base price to $36.99 with a 15% holiday coupon — effectively $31.44, which is the same margin as steady state but the higher base price anchors perceived value. In Year 2, if review count exceeds 5,000, test $34.99 without coupon — the social proof should support the premium.",
  priceVsCompetitors: "At $32.99, the product sits between Totally Bamboo ($32.99 — now matched) and RoyalCraft ($29.99 single board). The 3-piece set at $32.99 is effectively $11/board vs RoyalCraft's $29.99 for 1 board — this value proposition should be made explicit in the listing copy.",
};

// ── Action Plan ──────────────────────────────────────────────────

export const MOCK_ACTION_PLAN: URLActionPlan = {
  immediateActions: [
    { action: "Add 'HAND WASH ONLY' to bullet 4 and create care infographic image", category: "listing", specificSteps: ["Rewrite bullet 4 to lead with 'HAND WASH ONLY'", "Commission care instruction infographic ($80-150)", "Upload as image slot 4 or 5"], estimatedCost: 100, estimatedTimeHours: 2, expectedImpact: "Eliminate #1 source of 1-star reviews (89 complaints). Could raise rating from 4.6 to 4.7+.", gradeImpact: "B+ → A-", priority: 1 },
    { action: "Rewrite all 5 bullets with VOC language and benefit-first structure", category: "listing", specificSteps: ["Use the rewritten bullets from the Listing Rewrite section", "A/B test the new bullets using Amazon Experiments"], estimatedCost: 0, estimatedTimeHours: 1, expectedImpact: "Projected +18-25% CTR improvement and +12-18% conversion improvement", gradeImpact: "Listing Quality: B → A-", priority: 2 },
    { action: "Add 'Perfect Gift' to title and target gift-intent PPC keywords", category: "ppc", specificSteps: ["Update title to include '| Perfect Gift'", "Create a new PPC campaign targeting 'kitchen gift set', 'housewarming gift', 'wedding gift kitchen'", "Set initial daily budget at $15"], estimatedCost: 450, estimatedTimeHours: 3, expectedImpact: "Capture untapped gift-intent traffic that no competitor is targeting", gradeImpact: "Market Momentum: B- → B", priority: 3 },
    { action: "Launch long-tail PPC campaign with VOC-derived keywords", category: "ppc", specificSteps: ["Create exact match campaign with 5 long-tail keywords from the PPC analysis", "Set bids at $0.80-1.20 (vs $2.45 broad match)", "Monitor ACOS weekly — target <25%"], estimatedCost: 300, estimatedTimeHours: 2, expectedImpact: "Lower CPC by 60% while targeting high-conversion-intent searches", gradeImpact: "Profit Potential: B+ → A-", priority: 4 },
    { action: "Reduce price from $34.99 to $32.99 with 15% launch coupon", category: "pricing", specificSteps: ["Change price to $29.99 for weeks 1-2", "Add 15% clip-to-save coupon", "Ramp to $31.99 in week 3, $32.99 in week 7"], estimatedCost: 0, estimatedTimeHours: 0.5, expectedImpact: "Estimated 15-20% BSR improvement from increased velocity", gradeImpact: "Competitive Position: B- → B", priority: 5 },
  ],
  shortTermActions: [
    { action: "Commission product video showing juice groove in action", category: "images", specificSteps: ["Hire product videographer ($300-600)", "Script: 30 seconds showing carving, juice catching, easy cleanup", "Upload to listing video slot"], estimatedCost: 450, estimatedTimeHours: 8, expectedImpact: "Product videos increase conversion by 9-15% on average", gradeImpact: "Image Grade: B- → B+", priority: 6 },
    { action: "Create A+ Content with comparison chart and brand story", category: "listing", specificSteps: ["Design comparison module: this set vs single-board competitors", "Add lifestyle module with the brand story", "Include FAQ module addressing top 5 customer questions"], estimatedCost: 200, estimatedTimeHours: 6, expectedImpact: "A+ Content typically increases conversion by 5-10%", gradeImpact: "Listing Quality: A- → A", priority: 7 },
    { action: "Replace blurry handle image with scale reference photo", category: "images", specificSteps: ["Reshoot: overhead of all 3 boards with foods for scale", "Remove current image 5 (low-scoring handle shot)", "Upload new scale reference as image 3 or 4"], estimatedCost: 150, estimatedTimeHours: 4, expectedImpact: "Address size expectation gap (41 complaints about smaller-than-expected)", gradeImpact: "Image Grade improvement", priority: 8 },
    { action: "Add warranty/guarantee statement to listing", category: "listing", specificSteps: ["Add '1-Year Satisfaction Guarantee' to description", "Create a simple warranty card insert for the packaging"], estimatedCost: 50, estimatedTimeHours: 1, expectedImpact: "Reduces purchase hesitation and addresses 14 warranty-related Q&A questions", gradeImpact: "Review Sentiment: A- → A", priority: 9 },
  ],
  longTermActions: [
    { action: "Add bamboo board stand to the set (product differentiation)", category: "product", specificSteps: ["Source bamboo stands from existing supplier (~$1.50/unit additional)", "Update listing title, images, and description", "Raise price to $36.99 (stand justifies premium)"], estimatedCost: 750, estimatedTimeHours: 20, expectedImpact: "Creates unique differentiator that competitors don't offer in a set", gradeImpact: "Competitive Position: B → B+", priority: 10 },
    { action: "Launch mineral oil care kit as cross-sell product", category: "product", specificSteps: ["Source mineral oil applicator kit ($2-3/unit)", "List as separate ASIN with virtual bundle to the board set", "Create Subscribe & Save option for recurring revenue"], estimatedCost: 500, estimatedTimeHours: 15, expectedImpact: "Extends LTV from $45 to $65+ per customer over 12 months", gradeImpact: "Profit Potential: A- → A", priority: 11 },
    { action: "Develop exclusive colorway or engraving option", category: "product", specificSteps: ["Work with supplier on natural color staining (walnut tone, charcoal tone)", "Add as variant option on the listing", "Test personalized engraving as premium upsell (+$8)"], estimatedCost: 1200, estimatedTimeHours: 30, expectedImpact: "Breaks commodity cycle — colored/engraved boards are harder for competitors to copy", gradeImpact: "Market Momentum: B- → B+", priority: 12 },
  ],
  totalEstimatedCost: 4150,
  projectedGradeAfterAllActions: "A",
  projectedScoreAfterAllActions: 88,
  priorityStatement: "If you only do one thing, add 'HAND WASH ONLY' prominently to bullet 4 and commission a care instruction infographic. This single change addresses the #1 source of negative reviews (89 complaints), costs under $150, takes 2 hours, and could push your rating from 4.6 to 4.7+ — which compounds into every other metric.",
};
