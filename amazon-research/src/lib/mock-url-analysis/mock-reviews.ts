import type { ReviewMiningResult, FakeReviewResult } from "@/lib/types/urlAnalysis";

export const MOCK_REVIEW_MINING: ReviewMiningResult = {
  totalReviewsAnalyzed: 3847,
  sentimentBreakdown: { positive: 68, neutral: 18, negative: 14 },
  sentimentTrend: "stable",
  sentimentTrendEvidence: "Monthly sentiment ratio has stayed within ±3% for the last 6 months. No significant shift detected.",
  vocPhrases: [
    { phrase: "juice groove is a game changer", frequency: 312, sentiment: "positive", useIn: ["title", "bullets"] },
    { phrase: "perfect size for everything", frequency: 187, sentiment: "positive", useIn: ["bullets", "description"] },
    { phrase: "knife-friendly surface", frequency: 156, sentiment: "positive", useIn: ["bullets", "ppc"] },
    { phrase: "warped after dishwasher", frequency: 89, sentiment: "negative", useIn: ["bullets"] },
    { phrase: "beautiful gift packaging", frequency: 74, sentiment: "positive", useIn: ["title", "ppc"] },
    { phrase: "easy to clean", frequency: 201, sentiment: "positive", useIn: ["bullets", "description"] },
    { phrase: "smells like chemicals", frequency: 34, sentiment: "negative", useIn: ["description"] },
    { phrase: "handles make it easy to carry", frequency: 143, sentiment: "positive", useIn: ["bullets"] },
    { phrase: "looks great on the counter", frequency: 98, sentiment: "positive", useIn: ["description", "ppc"] },
    { phrase: "cracked after a month", frequency: 27, sentiment: "negative", useIn: [] },
    { phrase: "wish it came with oil", frequency: 62, sentiment: "neutral", useIn: ["bullets"] },
    { phrase: "best cutting board I've owned", frequency: 221, sentiment: "positive", useIn: ["title", "ppc"] },
  ],
  topComplaintThemes: [
    {
      theme: "Warping after dishwasher use",
      reviewCount: 89,
      severity: "major",
      exampleQuotes: [
        "Loved it until I put it in the dishwasher — now it rocks on the counter.",
        "The large board warped completely after one wash cycle. Very disappointed.",
        "Why doesn't the listing make it CLEAR this can't go in the dishwasher?",
      ],
      productFix: "No product fix needed — bamboo naturally warps in dishwashers. This is a messaging problem.",
      listingFix: "Add 'HAND WASH ONLY' as a prominent callout in bullet 2 and add a care instruction infographic image.",
    },
    {
      theme: "Chemical smell on arrival",
      reviewCount: 34,
      severity: "minor",
      exampleQuotes: [
        "Had a slight chemical odor when I opened the box. Went away after washing.",
        "The mineral oil coating smelled off — made me question if it was food-safe.",
      ],
      productFix: "Switch to odorless food-grade mineral oil or coconut oil treatment.",
      listingFix: "Add to description: 'Pre-treated with FDA-approved food-safe mineral oil. Light scent dissipates after first wash.'",
    },
    {
      theme: "Cracking over time",
      reviewCount: 27,
      severity: "minor",
      exampleQuotes: [
        "Small crack appeared along the grain after about 6 weeks of daily use.",
        "The medium board split near the handle — disappointing for the price.",
      ],
      productFix: "Improve bamboo strand density in manufacturing or add edge reinforcement.",
      listingFix: "Add maintenance tip: 'Re-oil monthly with mineral oil to prevent drying and cracking.'",
    },
    {
      theme: "Size smaller than expected",
      reviewCount: 41,
      severity: "minor",
      exampleQuotes: [
        "The 'large' board is honestly more like a medium. Barely fits a whole chicken.",
        "Dimensions are accurate but I expected the large to be bigger for $35.",
      ],
      productFix: "Consider offering a 4th XL option (20x14\") for customers who need more surface area.",
      listingFix: "Add a scale reference image with common foods (whole chicken, watermelon) to set expectations.",
    },
    {
      theme: "Juice groove too shallow",
      reviewCount: 19,
      severity: "minor",
      exampleQuotes: [
        "The groove overflows when carving a juicy steak. Needs to be deeper.",
        "Works for small fruits but overwhelmed by roast drippings.",
      ],
      productFix: "Deepen juice groove from 3mm to 5mm on next production run.",
      listingFix: "Set expectations in description: 'Designed for everyday prep — for heavy-duty carving, pair with a drip tray.'",
    },
  ],
  topPraiseThemes: [
    {
      theme: "Juice groove design",
      reviewCount: 312,
      exampleQuotes: [
        "The juice groove is what sold me — no more countertop puddles!",
        "Finally a cutting board that actually catches the juice. Game changer.",
      ],
      leverageOpportunity: "Lead every marketing asset with the juice groove — it's the #1 purchase driver. Use VOC language: 'game changer' and 'no more puddles'.",
    },
    {
      theme: "Gift-worthy presentation",
      reviewCount: 74,
      exampleQuotes: [
        "Bought this as a housewarming gift and the packaging was beautiful.",
        "Looks way more expensive than it is — perfect gift for new homeowners.",
      ],
      leverageOpportunity: "Add 'PERFECT GIFT' to title. Create holiday-themed A+ Content. Target gift keywords in PPC: 'kitchen gift set', 'housewarming gift'.",
    },
    {
      theme: "Knife-friendly surface",
      reviewCount: 156,
      exampleQuotes: [
        "My knives stay sharp — this board doesn't chew up the blade like plastic ones.",
        "Gentle on knives but still gives good grip when cutting.",
      ],
      leverageOpportunity: "Add to bullet: 'Won't dull your knives — bamboo's self-healing surface keeps blades sharp longer than plastic or glass boards.'",
    },
    {
      theme: "Easy to clean and maintain",
      reviewCount: 201,
      exampleQuotes: [
        "Quick rinse and wipe down — doesn't stain or hold odors.",
        "So much easier to clean than my old wooden board.",
      ],
      leverageOpportunity: "Emphasize low-maintenance angle for busy families. Add to PPC: 'easy clean cutting board'.",
    },
  ],
  emotionalDrivers: [
    {
      emotion: "delight",
      trigger: "Unboxing experience — the 3-piece set looks premium and gift-worthy",
      frequency: 74,
      implication: "The unboxing moment is a conversion driver. Invest in packaging photography and gift positioning.",
    },
    {
      emotion: "frustration",
      trigger: "Product warping due to undisclosed care requirements",
      frequency: 89,
      implication: "This is the #1 source of 1-star reviews. Fixing messaging alone could raise the rating to 4.7+.",
    },
    {
      emotion: "trust",
      trigger: "Organic bamboo and food-safe claims resonate with health-conscious buyers",
      frequency: 156,
      implication: "The 'organic' and 'BPA-free' claims build trust. Double down on certifications in imagery.",
    },
    {
      emotion: "loyalty",
      trigger: "Customers who maintain the board properly become repeat buyers and brand advocates",
      frequency: 45,
      implication: "Create a care guide insert that drives repeat purchases (mineral oil, board conditioner) and cross-sells.",
    },
  ],
  averageReviewLength: 142,
  verifiedPurchaseRatio: 0.84,
  mostHelpfulPositiveReview: "I've been through dozens of cutting boards over the years and this set is honestly the best value I've found. The juice groove actually works (unlike the shallow ones on cheaper boards), the handles make it easy to move from counter to sink, and the bamboo feels substantial without being crazy heavy. The pre-oiling is a nice touch — I hate having to season new boards. Only wish the large was a bit bigger for whole chickens, but for everyday meal prep these are perfect. Already bought a second set for my daughter's apartment.",
  mostHelpfulNegativeReview: "I LOVED this cutting board set for the first 3 weeks. Beautiful, functional, great quality feel. Then I made the mistake of putting the large board in the dishwasher ONE TIME and it warped so badly it rocks back and forth on the counter. The listing should make it WAY more obvious that these are hand-wash only. I had to really dig into the description to find that information. Would have still bought it, but I would have known to hand-wash from day one. Dropping from 5 stars to 2 because the lack of clear care instructions cost me a $35 board.",
};

export const MOCK_FAKE_REVIEW_RESULT: FakeReviewResult = {
  suspicionScore: 22,
  verdict: "clean",
  confidence: 85,
  flags: [
    {
      flag: "Minor velocity spike in October 2025",
      severity: "low",
      evidence: "142 reviews in October vs ~85/month average. Coincides with Prime Big Deal Days — likely organic.",
      affectedReviewCount: 57,
    },
    {
      flag: "12 reviews share phrase 'exceeded my expectations'",
      severity: "low",
      evidence: "Common generic phrase across Amazon. No other shared language patterns detected in these reviews. Different review lengths and styles suggest independent reviewers.",
      affectedReviewCount: 12,
    },
  ],
  cleanSignals: [
    "84% verified purchase ratio — well above the 70% threshold for organic review profiles",
    "Rating distribution follows natural J-curve: 72% 5-star, 12% 4-star, 5% 3-star, 3% 2-star, 8% 1-star",
    "Review lengths vary widely (12–487 words) — inconsistent with incentivized review campaigns which cluster around 80–120 words",
    "Negative reviews contain specific, detailed complaints (dishwasher warping, groove depth) — not the vague 'great product' pattern of fake reviews",
  ],
  ratingDistributionAnomaly: false,
  reviewVelocityAnomalies: [
    {
      period: "October 2025",
      reviewsInPeriod: 142,
      expectedReviews: 85,
      deviationMultiple: 1.67,
      possibleExplanation: "Prime Big Deal Days promotional period — velocity spike consistent with increased sales volume during the event.",
    },
  ],
  phraseSimilarityClusters: [],
  unverifiedPurchaseSpike: false,
  summary: "This product's review profile appears authentic. The 84% verified purchase ratio, natural J-curve rating distribution, varied review lengths, and specific complaint patterns all indicate organic reviews. The only flag — a minor velocity spike in October — aligns with Prime Big Deal Days and is not suspicious. No phrase similarity clusters detected.",
  actionRecommendation: "No action needed. This review profile is healthy and authentic. Continue focusing on organic review generation through follow-up emails and product insert cards.",
};
