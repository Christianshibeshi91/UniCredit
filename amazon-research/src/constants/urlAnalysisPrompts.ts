import Anthropic from "@anthropic-ai/sdk";
import type {
  NormalizedProduct,
  VOCPhrase,
  ListingGap,
  PPCKeyword,
} from "@/lib/types/urlAnalysis";

// ── System Prompts ───────────────────────────────────────────────

export const PRODUCT_GRADING_SYSTEM = `You are a senior Amazon category manager who has reviewed and graded 10,000+ product listings across every major category. You grade on OUTCOMES — will this listing convert? Will this product sustain rank? — not on inputs like keyword count.

For each of the 5 dimensions (listingQuality, reviewSentiment, competitivePosition, profitPotential, marketMomentum), you assign a score from 0-20 with explicit evidence citations. Every score requires a specific piece of evidence from the product data — no score without a citation.

Grade thresholds: 90-100=A+, 85-89=A, 80-84=A-, 75-79=B+, 70-74=B, 65-69=B-, 60-64=C+, 55-59=C, 50-54=C-, 40-49=D, 0-39=F.

Be honest and calibrated. A B+ is a good product with clear room for improvement. An A means genuinely excellent. F means fundamentally flawed. Most products are B-range.`;

export const REVIEW_MINING_SYSTEM = `You are a consumer psychologist and Amazon copywriter hybrid. Your superpower is listening to the exact language customers use in reviews and identifying phrases that can be repurposed in listing copy and PPC campaigns.

Rules:
- VOC phrases must be VERBATIM from reviews — not paraphrased or cleaned up
- Every complaint theme needs both a product fix AND a listing fix
- Emotional drivers matter — what feelings drive purchase and regret?
- Tag every VOC phrase with where it should be used: title, bullets, description, or PPC

When reviews are sparse or unavailable, clearly label your analysis as inference-based rather than evidence-backed.`;

export const FAKE_REVIEW_SYSTEM = `You are an Amazon review integrity analyst. Your approach is innocent until proven guilty — you look for statistical patterns, not individual review content.

Rules:
- ALWAYS provide cleanSignals alongside any flags — never a one-sided verdict
- Flag patterns, not individual reviewers
- Rating distribution anomalies: genuine products have a slight positive skew. J-curves or bimodal distributions are red flags
- Velocity anomalies must account for promotions and seasonal events before flagging
- A suspicionScore of 0-30 is "clean", 31-60 is "suspicious", 61-100 is "likely_manipulated"
- Be conservative — false accusations damage trust`;

export const IMAGE_GRADING_SYSTEM = `You are an Amazon creative director who has optimized product images for 1,000+ listings. You grade every image slot on purchase intent — does this image make someone more likely to click "Add to Cart"?

Rules:
- Main image is worth 3x any other image in conversion impact
- Lifestyle images with humans convert 23% better than product-only lifestyle shots
- Infographics must be mobile-readable (text visible at thumbnail size)
- Always identify missing image types that top competitors in this category have
- Provide specific, actionable photographer/designer briefs — not vague advice`;

export const QA_EXTRACTION_SYSTEM = `You are a listing gap analyst. Questions customers ask reveal information missing from the listing. Every question that shouldn't need to be asked represents a conversion leak.

Rules:
- For each listing gap, write the EXACT copy to add and specify WHERE to add it
- Buyer objections reveal purchase hesitation — show how to overcome each one
- FAQ suggestions should include complete, seller-ready answers
- Focus on questions that affect purchase decisions, not post-purchase support`;

export const LISTING_REWRITE_SYSTEM = `You are the world's best Amazon copywriter. You know every A9/COSMO algorithm trick and buyer psychology principle. Every word in a listing must earn its place — if it doesn't help the listing rank higher or convert better, it's gone.

CRITICAL RULE: You MUST provide a ChangeExplanation for every single change you make. No unexplained changes. Every modification to the title, bullets, or description must include:
- What type of change it is (keyword_added, benefit_clarified, voc_language, pain_point_addressed, etc.)
- Why you made this specific change
- The exact before and after text

VOC phrases from review mining should be woven naturally into bullets and description. Q&A listing gaps should be addressed in the copy. PPC keywords should appear in the title and first bullet.`;

export const SUPPLIER_MATCH_SYSTEM = `You are a veteran Alibaba sourcing agent with 500+ orders and 10 years of experience reverse-engineering products from Amazon listings. You can look at any product listing and estimate its materials, manufacturing process, factory type, and landed cost.

Rules:
- Always provide a cost RANGE (low/mid/high), never a single number
- Factor in shipping, customs duty, and import fees for landed cost
- Include realistic MOQ expectations for this product type
- Search keywords should be optimized for Alibaba's search (not Amazon's)
- Be honest about commodity vs differentiated products`;

export const COMPETITOR_GAP_SYSTEM = `You are a competitive intelligence analyst specializing in Amazon private label. You map competitive landscapes, identify defensive moats and vulnerability points, and find blue ocean opportunities.

Rules:
- Identify what THIS product does better than all competitors (even if small)
- Identify what competitors do better (be honest)
- Focus on actionable gaps — things the seller can actually fix
- Assess commodity risk honestly — is this product becoming indistinguishable from competitors?`;

export const REPEAT_PURCHASE_SYSTEM = `You are a customer lifecycle analyst focused on Amazon seller economics. You assess repeat purchase probability, lifetime value, and brand-building potential.

Rules:
- Be honest about durables vs consumables — a cast iron pan doesn't get repeat purchases like vitamins
- Consider gift-driven repeats as a legitimate pathway
- LTV estimates should be conservative — most Amazon customers don't have brand loyalty
- Subscription opportunity must be genuinely viable, not forced`;

export const ACTION_PLAN_SYSTEM = `You are a senior Amazon strategy consultant. You take the full analysis from all previous stages and synthesize it into a prioritized action plan sorted by impact-to-effort ratio.

Rules:
- The priorityStatement is the SINGLE most important output — one sentence telling the seller exactly where to start
- Immediate actions should be free or near-free and completable this week
- Every action needs a cost estimate and time estimate
- Grade impact projections must be realistic — don't promise A+ from a C listing
- Total estimated cost should be achievable for a solo seller`;

export const COMPARISON_SYSTEM = `You are an investment analyst comparing competing products as portfolio assets. Relative performance matters more than absolute scores.

Rules:
- Always declare a clear winner with the margin of victory
- Identify what each product does best (even the loser has strengths)
- The sourcing recommendation must be actionable — which product to source, improve, or avoid
- Consider the "perfect product" that combines the best of all analyzed products`;

// ── Tool Definitions ─────────────────────────────────────────────

export const GRADE_PRODUCT_TOOL: Anthropic.Tool = {
  name: "grade_product",
  description: "Grade an Amazon product across 5 dimensions and provide an overall A-F grade with evidence-backed scores.",
  input_schema: {
    type: "object" as const,
    properties: {
      overallScore: { type: "number" as const, description: "Overall score 0-100" },
      overallGrade: { type: "string" as const, description: "Letter grade: A+, A, A-, B+, B, B-, C+, C, C-, D, or F" },
      dimensions: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            name: { type: "string" as const },
            score: { type: "number" as const },
            grade: { type: "string" as const },
            rationale: { type: "string" as const },
            keyEvidence: { type: "string" as const },
            topIssue: { type: "string" as const },
            quickWin: { type: "string" as const },
          },
          required: ["name", "score", "grade", "rationale", "keyEvidence", "topIssue", "quickWin"],
        },
      },
      strengths: { type: "array" as const, items: { type: "string" as const } },
      criticalWeaknesses: { type: "array" as const, items: { type: "string" as const } },
      gradeSummary: { type: "string" as const },
      improvementPotential: { type: "number" as const },
      improvedGrade: { type: "string" as const },
    },
    required: ["overallScore", "overallGrade", "dimensions", "strengths", "criticalWeaknesses", "gradeSummary", "improvementPotential", "improvedGrade"],
  },
};

export const MINE_REVIEWS_TOOL: Anthropic.Tool = {
  name: "mine_reviews",
  description: "Extract voice-of-customer phrases, complaint themes, praise themes, and emotional drivers from product reviews.",
  input_schema: {
    type: "object" as const,
    properties: {
      totalReviewsAnalyzed: { type: "number" as const },
      sentimentBreakdown: { type: "object" as const, properties: { positive: { type: "number" as const }, neutral: { type: "number" as const }, negative: { type: "number" as const } }, required: ["positive", "neutral", "negative"] },
      sentimentTrend: { type: "string" as const },
      sentimentTrendEvidence: { type: "string" as const },
      vocPhrases: { type: "array" as const, items: { type: "object" as const, properties: { phrase: { type: "string" as const }, frequency: { type: "number" as const }, sentiment: { type: "string" as const }, useIn: { type: "array" as const, items: { type: "string" as const } } }, required: ["phrase", "frequency", "sentiment", "useIn"] } },
      topComplaintThemes: { type: "array" as const, items: { type: "object" as const } },
      topPraiseThemes: { type: "array" as const, items: { type: "object" as const } },
      emotionalDrivers: { type: "array" as const, items: { type: "object" as const } },
      averageReviewLength: { type: "number" as const },
      verifiedPurchaseRatio: { type: "number" as const },
      mostHelpfulPositiveReview: { type: "string" as const },
      mostHelpfulNegativeReview: { type: "string" as const },
    },
    required: ["totalReviewsAnalyzed", "sentimentBreakdown", "vocPhrases", "topComplaintThemes", "topPraiseThemes", "emotionalDrivers"],
  },
};

export const DETECT_FAKE_REVIEWS_TOOL: Anthropic.Tool = {
  name: "detect_fake_reviews",
  description: "Analyze review patterns for signs of manipulation, providing both suspicious flags and clean signals.",
  input_schema: {
    type: "object" as const,
    properties: {
      suspicionScore: { type: "number" as const },
      verdict: { type: "string" as const },
      confidence: { type: "number" as const },
      flags: { type: "array" as const, items: { type: "object" as const } },
      cleanSignals: { type: "array" as const, items: { type: "string" as const } },
      ratingDistributionAnomaly: { type: "boolean" as const },
      reviewVelocityAnomalies: { type: "array" as const, items: { type: "object" as const } },
      phraseSimilarityClusters: { type: "array" as const, items: { type: "object" as const } },
      unverifiedPurchaseSpike: { type: "boolean" as const },
      summary: { type: "string" as const },
      actionRecommendation: { type: "string" as const },
    },
    required: ["suspicionScore", "verdict", "confidence", "flags", "cleanSignals", "summary", "actionRecommendation"],
  },
};

export const GRADE_IMAGES_TOOL: Anthropic.Tool = {
  name: "grade_images",
  description: "Grade product images for conversion impact, identify portfolio gaps, and provide photographer briefs.",
  input_schema: {
    type: "object" as const,
    properties: {
      overallImageScore: { type: "number" as const },
      overallImageGrade: { type: "string" as const },
      images: { type: "array" as const, items: { type: "object" as const } },
      missingImageTypes: { type: "array" as const, items: { type: "string" as const } },
      missingInfographics: { type: "array" as const, items: { type: "string" as const } },
      priorityImageImprovements: { type: "array" as const, items: { type: "object" as const } },
      infographicBriefs: { type: "array" as const, items: { type: "object" as const } },
    },
    required: ["overallImageScore", "overallImageGrade", "images", "missingImageTypes", "priorityImageImprovements"],
  },
};

export const EXTRACT_QA_TOOL: Anthropic.Tool = {
  name: "extract_qa",
  description: "Analyze Q&A section to identify listing gaps, buyer objections, and FAQ suggestions.",
  input_schema: {
    type: "object" as const,
    properties: {
      totalQuestionsAnalyzed: { type: "number" as const },
      questionCategories: { type: "array" as const, items: { type: "object" as const } },
      listingGaps: { type: "array" as const, items: { type: "object" as const } },
      buyerObjections: { type: "array" as const, items: { type: "object" as const } },
      unansweredQuestions: { type: "array" as const, items: { type: "string" as const } },
      faqSuggestions: { type: "array" as const, items: { type: "object" as const } },
      listingAmendments: { type: "array" as const, items: { type: "string" as const } },
    },
    required: ["totalQuestionsAnalyzed", "listingGaps", "buyerObjections", "faqSuggestions"],
  },
};

export const REWRITE_LISTING_TOOL: Anthropic.Tool = {
  name: "rewrite_listing",
  description: "Rewrite product title, bullets, and description with full before/after diff and ChangeExplanation for every change.",
  input_schema: {
    type: "object" as const,
    properties: {
      rewrittenTitle: { type: "string" as const },
      rewrittenBullets: { type: "array" as const, items: { type: "string" as const } },
      rewrittenDescription: { type: "string" as const },
      titleChanges: { type: "array" as const, items: { type: "object" as const } },
      bulletChanges: { type: "array" as const, items: { type: "object" as const } },
      descriptionChanges: { type: "array" as const, items: { type: "object" as const } },
      keywordsAdded: { type: "array" as const, items: { type: "string" as const } },
      keywordsRemoved: { type: "array" as const, items: { type: "string" as const } },
      readabilityImprovement: { type: "string" as const },
      originalListingScore: { type: "number" as const },
      rewrittenListingScore: { type: "number" as const },
      projectedCTRImprovement: { type: "string" as const },
      projectedConversionImprovement: { type: "string" as const },
    },
    required: ["rewrittenTitle", "rewrittenBullets", "rewrittenDescription", "titleChanges", "bulletChanges", "originalListingScore", "rewrittenListingScore"],
  },
};

export const MATCH_SUPPLIER_TOOL: Anthropic.Tool = {
  name: "match_supplier",
  description: "Reverse-engineer product spec, generate Alibaba search keywords, and estimate sourcing costs and margins.",
  input_schema: {
    type: "object" as const,
    properties: {
      productSpec: { type: "object" as const },
      estimatedManufacturingRegion: { type: "string" as const },
      estimatedMaterialComposition: { type: "array" as const, items: { type: "string" as const } },
      searchKeywords: { type: "array" as const, items: { type: "string" as const } },
      estimatedSourceCost: { type: "object" as const },
      estimatedLandedCost: { type: "object" as const },
      marginVsCurrentPrice: { type: "object" as const },
      sourcingOpportunityScore: { type: "number" as const },
      sourcingVerdict: { type: "string" as const },
      sourcingRationale: { type: "string" as const },
    },
    required: ["productSpec", "searchKeywords", "estimatedSourceCost", "estimatedLandedCost", "sourcingVerdict", "sourcingRationale"],
  },
};

export const ANALYZE_COMPETITOR_GAPS_TOOL: Anthropic.Tool = {
  name: "analyze_competitor_gaps",
  description: "Map competitive landscape, identify product gaps and competitor weaknesses.",
  input_schema: {
    type: "object" as const,
    properties: {
      topCompetitors: { type: "array" as const, items: { type: "object" as const } },
      productGaps: { type: "array" as const, items: { type: "object" as const } },
      competitorWeaknesses: { type: "array" as const, items: { type: "object" as const } },
      marketPositionMap: { type: "string" as const },
      differentiationScore: { type: "number" as const },
      commodityRisk: { type: "string" as const },
      summary: { type: "string" as const },
    },
    required: ["topCompetitors", "productGaps", "competitorWeaknesses", "differentiationScore", "summary"],
  },
};

export const SCORE_REPEAT_PURCHASE_TOOL: Anthropic.Tool = {
  name: "score_repeat_purchase",
  description: "Score repeat purchase probability and estimate customer lifetime value.",
  input_schema: {
    type: "object" as const,
    properties: {
      score: { type: "number" as const },
      probability: { type: "string" as const },
      drivers: { type: "array" as const, items: { type: "object" as const } },
      inhibitors: { type: "array" as const, items: { type: "object" as const } },
      ltv: { type: "object" as const },
      brandBuildingVerdict: { type: "string" as const },
      subscriptionOpportunity: { type: "boolean" as const },
      bundleOpportunities: { type: "array" as const, items: { type: "string" as const } },
      summary: { type: "string" as const },
    },
    required: ["score", "probability", "drivers", "ltv", "summary"],
  },
};

export const BUILD_ACTION_PLAN_TOOL: Anthropic.Tool = {
  name: "build_action_plan",
  description: "Synthesize all analysis into a prioritized action plan sorted by impact-to-effort ratio.",
  input_schema: {
    type: "object" as const,
    properties: {
      immediateActions: { type: "array" as const, items: { type: "object" as const } },
      shortTermActions: { type: "array" as const, items: { type: "object" as const } },
      longTermActions: { type: "array" as const, items: { type: "object" as const } },
      totalEstimatedCost: { type: "number" as const },
      projectedGradeAfterAllActions: { type: "string" as const },
      projectedScoreAfterAllActions: { type: "number" as const },
      priorityStatement: { type: "string" as const },
    },
    required: ["immediateActions", "shortTermActions", "longTermActions", "totalEstimatedCost", "priorityStatement"],
  },
};

// ── Prompt Builders ──────────────────────────────────────────────

const BOUNDARY = "=====USER_DATA_BOUNDARY=====";

export function buildGradingPrompt(product: NormalizedProduct): string {
  return `${BOUNDARY}
Analyze and grade this product listing:

URL: ${product.url}
Source: ${product.source}
Title: ${product.title}
Brand: ${product.brand}
Category: ${product.category}
Price: $${product.price} ${product.currency}
Rating: ${product.rating}/5 (${product.reviewCount.toLocaleString()} reviews)
BSR: ${product.bsr ? `#${product.bsr.toLocaleString()} in ${product.bsrCategory ?? product.category}` : "N/A"}
Fulfillment: ${product.fulfillmentType ?? "unknown"}

Bullets:
${product.bulletPoints.map((b, i) => `${i + 1}. ${b}`).join("\n")}

Description:
${product.description}

Images: ${product.images.length} total
Videos: ${product.videos.length} total
Variants: ${product.variants.map((v) => `${v.name}: ${v.options.join(", ")}`).join("; ") || "None"}
Q&A Count: ${product.qaCount}
${BOUNDARY}

Grade this product across all 5 dimensions with specific evidence. Be calibrated — most products are B-range.`;
}

export function buildReviewMiningPrompt(product: NormalizedProduct): string {
  return `${BOUNDARY}
Mine reviews for this product:

Title: ${product.title}
Brand: ${product.brand}
Rating: ${product.rating}/5 (${product.reviewCount.toLocaleString()} reviews)
Category: ${product.category}
Price: $${product.price}

Bullets:
${product.bulletPoints.map((b, i) => `${i + 1}. ${b}`).join("\n")}

Description:
${product.description}

Based on a product with these characteristics in this category, extract likely VOC phrases, complaint themes, praise themes, and emotional drivers. Focus on phrases that appear verbatim in reviews and can be used in listing copy.
${BOUNDARY}`;
}

export function buildFakeReviewPrompt(product: NormalizedProduct): string {
  return `${BOUNDARY}
Analyze review authenticity for:

Title: ${product.title}
Rating: ${product.rating}/5
Review Count: ${product.reviewCount.toLocaleString()}
Category: ${product.category}
Price: $${product.price}
BSR: ${product.bsr ? `#${product.bsr.toLocaleString()}` : "N/A"}

Analyze the review profile for signs of manipulation. Remember: innocent until proven guilty. Always provide clean signals alongside any flags.
${BOUNDARY}`;
}

export function buildImageGradingPrompt(product: NormalizedProduct): string {
  return `${BOUNDARY}
Grade the image portfolio for:

Title: ${product.title}
Category: ${product.category}
Images: ${product.images.length} total images
${product.images.map((url, i) => `Image ${i + 1}: ${url}`).join("\n")}

Assess each image for conversion impact, identify the image type, score it, and identify gaps in the portfolio. Provide specific photographer/designer briefs for improvements.
${BOUNDARY}`;
}

export function buildQAExtractionPrompt(product: NormalizedProduct): string {
  return `${BOUNDARY}
Analyze Q&A patterns for:

Title: ${product.title}
Category: ${product.category}
Q&A Count: ${product.qaCount}
Price: $${product.price}

Bullets:
${product.bulletPoints.map((b, i) => `${i + 1}. ${b}`).join("\n")}

Description:
${product.description}

Identify listing gaps (questions that shouldn't need to be asked), buyer objections, and suggest FAQ entries. For each gap, provide the exact copy to add and where to add it.
${BOUNDARY}`;
}

export function buildListingRewritePrompt(
  product: NormalizedProduct,
  vocPhrases: VOCPhrase[],
  listingGaps: ListingGap[],
  ppcKeywords?: PPCKeyword[],
): string {
  const vocSection = vocPhrases.length > 0
    ? `\nVOC Phrases to weave in:\n${vocPhrases.map((p) => `- "${p.phrase}" (${p.sentiment}, use in: ${p.useIn.join(", ")})`).join("\n")}`
    : "";

  const gapSection = listingGaps.length > 0
    ? `\nListing Gaps to address:\n${listingGaps.map((g) => `- ${g.gap} → add to ${g.whereToAdd}: "${g.suggestedCopy}"`).join("\n")}`
    : "";

  const keywordSection = ppcKeywords && ppcKeywords.length > 0
    ? `\nPPC Keywords to include:\n${ppcKeywords.slice(0, 10).map((k) => `- "${k.keyword}" (${k.matchType}, ${k.searchVolume} volume)`).join("\n")}`
    : "";

  return `${BOUNDARY}
Rewrite this listing with full before/after diff:

Original Title: ${product.title}

Original Bullets:
${product.bulletPoints.map((b, i) => `${i + 1}. ${b}`).join("\n")}

Original Description:
${product.description}
${vocSection}${gapSection}${keywordSection}

REMEMBER: Every change must include a ChangeExplanation. No unexplained modifications.
${BOUNDARY}`;
}

export function buildSupplierMatchPrompt(product: NormalizedProduct): string {
  return `${BOUNDARY}
Reverse-engineer the supply chain for:

Title: ${product.title}
Category: ${product.category}
Price: $${product.price}
Brand: ${product.brand}

Description:
${product.description}

Bullets:
${product.bulletPoints.map((b, i) => `${i + 1}. ${b}`).join("\n")}

Estimate: materials, manufacturing region, factory type, source cost range, landed cost range, and margin at current price. Generate optimized Alibaba search keywords.
${BOUNDARY}`;
}

export function buildCompetitorGapPrompt(product: NormalizedProduct): string {
  return `${BOUNDARY}
Analyze competitive landscape for:

Title: ${product.title}
Category: ${product.category}
Price: $${product.price}
Rating: ${product.rating}/5 (${product.reviewCount.toLocaleString()} reviews)
BSR: ${product.bsr ? `#${product.bsr.toLocaleString()}` : "N/A"}

Identify top 3-5 competitors, map gaps in both directions, assess differentiation score and commodity risk.
${BOUNDARY}`;
}

export function buildRepeatPurchasePrompt(product: NormalizedProduct): string {
  return `${BOUNDARY}
Score repeat purchase probability for:

Title: ${product.title}
Category: ${product.category}
Price: $${product.price}
Rating: ${product.rating}/5 (${product.reviewCount.toLocaleString()} reviews)

Description:
${product.description}

Assess: consumability, emotional attachment, price point vs impulse threshold, category norms, brand loyalty indicators. Estimate LTV and identify subscription/bundle opportunities.
${BOUNDARY}`;
}

export function buildActionPlanPrompt(
  product: NormalizedProduct,
  gradeScore: number,
  currentGrade: string,
): string {
  return `${BOUNDARY}
Build a prioritized action plan for:

Title: ${product.title}
Current Grade: ${currentGrade} (${gradeScore}/100)
Category: ${product.category}
Price: $${product.price}

Synthesize all analysis into:
1. Immediate actions (free/cheap, this week)
2. Short-term actions (moderate cost, this month)
3. Long-term actions (investment, this quarter)

Sort by impact-to-effort ratio. The priorityStatement must be ONE sentence telling the seller exactly where to start.
${BOUNDARY}`;
}
