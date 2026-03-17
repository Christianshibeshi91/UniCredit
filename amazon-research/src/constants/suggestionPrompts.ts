import type { Anthropic } from "@/lib/analysis/claudeClient";
import type { Product, AnalysisResult, ProductSuggestion } from "@/lib/types";

// ── System Prompts ────────────────────────────────────────────────

export const SUGGESTION_SYSTEM_PROMPT = `You are a seasoned Amazon private-label product developer with 10+ years of experience launching products through FBA. You identify white-space opportunities by cross-referencing customer complaints, feature requests, and market gaps across competing products.

Constraints:
- Products must be manufacturable in China for under $15/unit at MOQ 500
- Target retail price range: $25-$80
- Must be shippable via standard FBA (no hazmat, no oversized)
- Prioritize products with defensible differentiation, not commodity items`;

export const COST_SYSTEM_PROMPT = `You are a meticulous FBA accountant who specializes in startup cost estimation for Amazon private-label products. You always err on the conservative side — it's better to overestimate costs than to leave a new seller underfunded. Never omit cost categories. Include every fee Amazon charges.`;

export const SUPPLIER_SYSTEM_PROMPT = `You are a veteran sourcing agent with 500+ Alibaba orders under your belt. You protect the buyer's interests first. You know the difference between trading companies and actual manufacturers, and you always flag red flags in supplier profiles.`;

export const OUTREACH_SYSTEM_PROMPT = `You are a professional B2B buyer writing to potential manufacturing partners on Alibaba. Your messages are direct, specific about requirements, and under 250 words. You establish credibility without being pushy.`;

// ── Tool Definitions ──────────────────────────────────────────────

export const SUBMIT_SUGGESTIONS_TOOL: Anthropic.Tool = {
  name: "submit_suggestions",
  description: "Submit generated product suggestions based on gap analysis",
  input_schema: {
    type: "object" as const,
    properties: {
      suggestions: {
        type: "array",
        description: "5-8 product suggestions ranked by viability score descending",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Concise product title (e.g., 'Ergonomic Silicone Kitchen Tongs with Built-in Rest')" },
            description: { type: "string", description: "2-3 sentence product description highlighting the key differentiator" },
            category: { type: "string", description: "Top-level Amazon category" },
            subcategory: { type: "string", description: "Amazon subcategory" },
            targetCustomer: { type: "string", description: "1-sentence ideal customer persona" },
            targetPrice: { type: "number", description: "Recommended retail price in USD ($25-$80 range)" },
            painPointsAddressed: {
              type: "array",
              description: "Pain points from the analyzed reviews that this product addresses",
              items: {
                type: "object",
                properties: {
                  issue: { type: "string", description: "The specific customer pain point" },
                  affectedPercentage: { type: "number", description: "Estimated % of buyers affected (0-100)" },
                  proposedSolution: { type: "string", description: "How this product solves the pain point" },
                },
                required: ["issue", "affectedPercentage", "proposedSolution"],
              },
            },
            differentiators: {
              type: "array",
              items: { type: "string" },
              description: "3-5 defensible differentiators vs existing products",
            },
            trendSignals: {
              type: "array",
              description: "Market trend signals supporting demand",
              items: {
                type: "object",
                properties: {
                  signal: { type: "string", description: "The trend observation" },
                  source: {
                    type: "string",
                    enum: ["google_trends", "amazon_movers", "social", "claude_inference"],
                    description: "Where the signal was observed or inferred",
                  },
                  strength: {
                    type: "string",
                    enum: ["strong", "moderate", "emerging"],
                    description: "Signal strength",
                  },
                },
                required: ["signal", "source", "strength"],
              },
            },
            riskFactors: {
              type: "array",
              description: "Key risks and mitigations",
              items: {
                type: "object",
                properties: {
                  risk: { type: "string", description: "The risk" },
                  severity: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                    description: "Risk severity",
                  },
                  mitigation: { type: "string", description: "How to mitigate" },
                },
                required: ["risk", "severity", "mitigation"],
              },
            },
            viabilityScore: { type: "number", description: "Overall viability score 0-100" },
            viabilityBreakdown: {
              type: "object",
              description: "Score breakdown (each sub-score 0-25, sum = viabilityScore)",
              properties: {
                demandConfidence: { type: "number", description: "Confidence in demand (0-25)" },
                differentiationStrength: { type: "number", description: "Strength of differentiation (0-25)" },
                marginPotential: { type: "number", description: "Margin potential (0-25)" },
                executionFeasibility: { type: "number", description: "Ease of execution (0-25)" },
              },
              required: ["demandConfidence", "differentiationStrength", "marginPotential", "executionFeasibility"],
            },
          },
          required: [
            "title", "description", "category", "subcategory", "targetCustomer",
            "targetPrice", "painPointsAddressed", "differentiators", "trendSignals",
            "riskFactors", "viabilityScore", "viabilityBreakdown",
          ],
        },
      },
    },
    required: ["suggestions"],
  },
};

export const SUBMIT_COST_ESTIMATE_TOOL: Anthropic.Tool = {
  name: "submit_cost_estimate",
  description: "Submit a detailed startup cost estimate and unit economics breakdown for a product suggestion",
  input_schema: {
    type: "object" as const,
    properties: {
      sourcingCosts: {
        type: "object",
        description: "Manufacturing and sourcing cost breakdown",
        properties: {
          unitCost: { type: "number", description: "Per-unit manufacturing cost in USD" },
          moqUnits: { type: "number", description: "Minimum order quantity (units)" },
          moqTotalCost: { type: "number", description: "Total cost for MOQ order" },
          sampleCost: { type: "number", description: "Cost for pre-production samples" },
        },
        required: ["unitCost", "moqUnits", "moqTotalCost", "sampleCost"],
      },
      shippingCosts: {
        type: "object",
        description: "Shipping and import cost breakdown (per unit)",
        properties: {
          seaFreight: { type: "number", description: "Sea freight cost per unit" },
          customsDuty: { type: "number", description: "Customs duty per unit" },
          importFees: { type: "number", description: "Import/clearance fees per unit" },
          totalPerUnit: { type: "number", description: "Total shipping cost per unit" },
        },
        required: ["seaFreight", "customsDuty", "importFees", "totalPerUnit"],
      },
      amazonFees: {
        type: "object",
        description: "Amazon FBA fee breakdown (per unit)",
        properties: {
          fbaFulfillmentFee: { type: "number", description: "FBA pick, pack, and ship fee per unit" },
          referralFee: { type: "number", description: "Amazon referral fee per unit (typically 15% of sale price)" },
          storageFeeMonthly: { type: "number", description: "FBA storage fee per unit per month" },
          totalPerUnit: { type: "number", description: "Total Amazon fees per unit" },
        },
        required: ["fbaFulfillmentFee", "referralFee", "storageFeeMonthly", "totalPerUnit"],
      },
      launchBudget: {
        type: "object",
        description: "One-time launch expenses",
        properties: {
          productPhotography: { type: "number", description: "Professional product photography cost" },
          brandingAndPackaging: { type: "number", description: "Logo, packaging design, and print setup" },
          sampleOrdering: { type: "number", description: "Cost for ordering and testing samples" },
          ppcLaunchBudget: { type: "number", description: "Amazon PPC advertising budget for first 90 days" },
          amazonStorefront: { type: "number", description: "Brand registry + A+ content creation" },
          totalOneTime: { type: "number", description: "Sum of all one-time launch costs" },
        },
        required: ["productPhotography", "brandingAndPackaging", "sampleOrdering", "ppcLaunchBudget", "amazonStorefront", "totalOneTime"],
      },
      assumptions: {
        type: "array",
        items: { type: "string" },
        description: "Key assumptions underlying the estimate (e.g., shipping method, sales ramp, fee tiers)",
      },
    },
    required: ["sourcingCosts", "shippingCosts", "amazonFees", "launchBudget", "assumptions"],
  },
};

export const SUBMIT_SEARCH_STRATEGY_TOOL: Anthropic.Tool = {
  name: "submit_search_strategy",
  description: "Submit Alibaba search keywords and a product specification for supplier sourcing",
  input_schema: {
    type: "object" as const,
    properties: {
      searchKeywords: {
        type: "array",
        items: { type: "string" },
        description: "5-10 Alibaba search keywords ordered by relevance (mix of generic and specific terms)",
      },
      productSpec: {
        type: "object",
        description: "Detailed product specification to share with manufacturers",
        properties: {
          productName: { type: "string", description: "Clear product name for supplier communication" },
          keyMaterials: {
            type: "array",
            items: { type: "string" },
            description: "Required materials (e.g., 'food-grade silicone', '304 stainless steel')",
          },
          targetDimensions: { type: "string", description: "Target dimensions with tolerance" },
          targetWeight: { type: "string", description: "Target weight per unit" },
          requiredCertifications: {
            type: "array",
            items: { type: "string" },
            description: "Required certifications (e.g., 'FDA', 'CE', 'FCC')",
          },
          packagingRequirements: { type: "string", description: "Packaging spec (retail-ready, poly bag, etc.)" },
          customizationNeeds: {
            type: "array",
            items: { type: "string" },
            description: "Custom features requiring tooling or mold changes",
          },
          targetUnitCost: { type: "number", description: "Target unit cost in USD" },
          targetMOQ: { type: "number", description: "Preferred minimum order quantity" },
        },
        required: [
          "productName", "keyMaterials", "targetDimensions", "targetWeight",
          "requiredCertifications", "packagingRequirements", "customizationNeeds",
          "targetUnitCost", "targetMOQ",
        ],
      },
      filterCriteria: {
        type: "object",
        description: "Criteria for filtering and ranking supplier results",
        properties: {
          minYearsInBusiness: { type: "number", description: "Minimum years the supplier has been in business" },
          minTradeAssuranceUSD: { type: "number", description: "Minimum Alibaba Trade Assurance coverage in USD" },
          requiredVerifications: {
            type: "array",
            items: { type: "string" },
            description: "Required supplier verifications (e.g., 'Gold Supplier', 'Verified Manufacturer')",
          },
          minResponseRate: { type: "number", description: "Minimum response rate percentage (0-100)" },
          maxMOQ: { type: "number", description: "Maximum acceptable MOQ" },
          maxLeadTimeDays: { type: "number", description: "Maximum acceptable lead time in days" },
          preferredRegions: {
            type: "array",
            items: { type: "string" },
            description: "Preferred manufacturing regions (e.g., 'Guangdong', 'Zhejiang')",
          },
        },
        required: [
          "minYearsInBusiness", "minTradeAssuranceUSD", "requiredVerifications",
          "minResponseRate", "maxMOQ", "maxLeadTimeDays", "preferredRegions",
        ],
      },
    },
    required: ["searchKeywords", "productSpec", "filterCriteria"],
  },
};

export const SUBMIT_SUPPLIER_SCORES_TOOL: Anthropic.Tool = {
  name: "submit_supplier_scores",
  description: "Submit scored and ranked supplier evaluations with pros, cons, and recommendations",
  input_schema: {
    type: "object" as const,
    properties: {
      scoredSuppliers: {
        type: "array",
        description: "Suppliers ranked by total score descending",
        items: {
          type: "object",
          properties: {
            supplierId: { type: "string", description: "ID of the supplier being scored" },
            totalScore: { type: "number", description: "Overall score 0-100" },
            scoreBreakdown: {
              type: "object",
              properties: {
                reliabilityScore: { type: "number", description: "Reliability and track record (0-25)" },
                qualityScore: { type: "number", description: "Product quality indicators (0-25)" },
                commercialScore: { type: "number", description: "Pricing, MOQ, and terms (0-25)" },
                fitScore: { type: "number", description: "Fit for this specific product (0-25)" },
              },
              required: ["reliabilityScore", "qualityScore", "commercialScore", "fitScore"],
            },
            pros: {
              type: "array",
              items: { type: "string" },
              description: "3-5 specific advantages of this supplier",
            },
            cons: {
              type: "array",
              items: { type: "string" },
              description: "2-4 specific concerns or drawbacks",
            },
            recommendation: {
              type: "string",
              description: "1-2 sentence recommendation (order sample, negotiate MOQ, avoid, etc.)",
            },
          },
          required: ["supplierId", "totalScore", "scoreBreakdown", "pros", "cons", "recommendation"],
        },
      },
      recommendedSupplierId: {
        type: "string",
        description: "ID of the top recommended supplier",
      },
    },
    required: ["scoredSuppliers", "recommendedSupplierId"],
  },
};

export const SUBMIT_OUTREACH_TOOL: Anthropic.Tool = {
  name: "submit_outreach",
  description: "Submit a supplier outreach message with tone variants",
  input_schema: {
    type: "object" as const,
    properties: {
      subject: { type: "string", description: "Email/message subject line" },
      body: { type: "string", description: "Primary outreach message body (under 250 words)" },
      tone: {
        type: "string",
        enum: ["professional", "friendly_professional"],
        description: "Tone of the primary message",
      },
      variants: {
        type: "array",
        description: "2-3 alternative versions with different tones or emphasis",
        items: {
          type: "object",
          properties: {
            label: { type: "string", description: "Short label for this variant (e.g., 'Urgent timeline', 'Relationship-first')" },
            subject: { type: "string", description: "Variant subject line" },
            body: { type: "string", description: "Variant message body" },
          },
          required: ["label", "subject", "body"],
        },
      },
    },
    required: ["subject", "body", "tone", "variants"],
  },
};

// ── Prompt Builders ───────────────────────────────────────────────

export function buildGapAnalysisPrompt(
  products: Product[],
  analyses: AnalysisResult[]
): string {
  const sections: string[] = [];

  sections.push("# Cross-Product Gap Analysis\n");
  sections.push(
    `You are analyzing ${products.length} competing products to identify white-space opportunities for a new private-label product.\n`
  );

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const analysis = analyses[i];

    sections.push(`## Product ${i + 1}: ${product.title}`);
    sections.push(`- **Brand:** ${product.brand}`);
    sections.push(`- **Category:** ${product.category} > ${product.subcategory}`);
    sections.push(`- **Price:** $${product.price.toFixed(2)}`);
    sections.push(`- **Rating:** ${product.rating}/5.0 (${product.reviewCount} reviews)`);
    sections.push(`- **BSR:** #${product.bsr.toLocaleString()}`);
    sections.push(`- **Est. Monthly Sales:** ${product.estimatedMonthlySales.toLocaleString()} units\n`);

    if (analysis.complaints.length > 0) {
      sections.push("### Top Complaints");
      for (const c of analysis.complaints) {
        sections.push(`- **[${c.severity}/${c.frequency}]** ${c.issue}`);
        if (c.exampleQuotes.length > 0) {
          sections.push(`  > "${c.exampleQuotes[0]}"`);
        }
      }
      sections.push("");
    }

    if (analysis.featureRequests.length > 0) {
      sections.push("### Feature Requests");
      for (const fr of analysis.featureRequests) {
        sections.push(
          `- **[${fr.demandLevel} demand, ~${fr.mentionCount} mentions]** ${fr.feature}`
        );
      }
      sections.push("");
    }

    if (analysis.productGaps.length > 0) {
      sections.push("### Product Gaps");
      for (const g of analysis.productGaps) {
        sections.push(`- **Gap:** ${g.gap}`);
        sections.push(`  - **Opportunity:** ${g.opportunity}`);
        sections.push(`  - **Competitive Advantage:** ${g.competitiveAdvantage}`);
      }
      sections.push("");
    }

    sections.push(`### Sentiment: ${analysis.sentimentBreakdown.positive}% positive / ${analysis.sentimentBreakdown.neutral}% neutral / ${analysis.sentimentBreakdown.negative}% negative`);
    sections.push(`### Opportunity Summary: ${analysis.opportunitySummary}\n`);
  }

  sections.push(`## Instructions

Cross-reference all complaints, feature requests, and gaps across these ${products.length} products. Identify patterns — recurring pain points that no product solves well, features customers keep asking for, and underserved customer segments.

Generate **5-8 product suggestions** that:
1. Address the most common/severe pain points across multiple products
2. Have defensible differentiation (not just "make it cheaper")
3. Are manufacturable in China for under $15/unit at MOQ 500
4. Target a retail price of $25-$80
5. Are standard FBA-shippable (no hazmat, no oversized)

For each suggestion, score viability on four dimensions (each 0-25, summing to the total viability score):
- **Demand Confidence** — how certain is the demand based on review evidence?
- **Differentiation Strength** — how defensible is the competitive moat?
- **Margin Potential** — what's the likely profit margin at the target price?
- **Execution Feasibility** — how easy is this to manufacture and launch?

Rank suggestions by viability score descending. Use the submit_suggestions tool to submit your findings.`);

  return sections.join("\n");
}

export function buildCostEstimatePrompt(suggestion: ProductSuggestion): string {
  const painPoints = suggestion.painPointsAddressed
    .map((pp) => `- ${pp.issue} → ${pp.proposedSolution}`)
    .join("\n");

  const differentiators = suggestion.differentiators
    .map((d) => `- ${d}`)
    .join("\n");

  return `# Startup Cost Estimate Request

## Product Overview
- **Title:** ${suggestion.title}
- **Description:** ${suggestion.description}
- **Category:** ${suggestion.category} > ${suggestion.subcategory}
- **Target Customer:** ${suggestion.targetCustomer}
- **Target Retail Price:** $${suggestion.targetPrice.toFixed(2)}
- **Viability Score:** ${suggestion.viabilityScore}/100

## Pain Points Addressed
${painPoints}

## Key Differentiators
${differentiators}

## Instructions

Provide a comprehensive startup cost estimate for launching this product on Amazon FBA. Be conservative — it's better to overestimate than leave the seller underfunded.

Break down costs into:

1. **Sourcing Costs** — unit manufacturing cost, MOQ (recommend 500 units for first order), total MOQ cost, and sample costs
2. **Shipping Costs** (per unit) — sea freight, customs duty, and import/clearance fees. Assume ocean shipping from Shenzhen to a US FBA warehouse.
3. **Amazon Fees** (per unit) — FBA fulfillment fee, referral fee (typically 15%), and monthly storage fee. Base these on the product's likely size/weight tier.
4. **Launch Budget** (one-time) — product photography, branding/packaging design, sample ordering, PPC launch budget (first 90 days), and Amazon storefront setup (Brand Registry + A+ content).

Also list your key assumptions (shipping method, product dimensions/weight estimate, fee tier, etc.).

Use the submit_cost_estimate tool to submit your structured estimate.`;
}

export function buildSearchStrategyPrompt(suggestion: ProductSuggestion): string {
  const differentiators = suggestion.differentiators
    .map((d) => `- ${d}`)
    .join("\n");

  return `# Supplier Search Strategy

## Product to Source
- **Title:** ${suggestion.title}
- **Description:** ${suggestion.description}
- **Category:** ${suggestion.category} > ${suggestion.subcategory}
- **Target Unit Cost:** Under $15/unit
- **Target MOQ:** 500 units (first order)
- **Target Retail Price:** $${suggestion.targetPrice.toFixed(2)}

## Key Differentiators (must be achievable by manufacturer)
${differentiators}

## Instructions

Generate:

1. **Search Keywords** (5-10) — Alibaba search terms ordered by relevance. Include a mix of:
   - Generic product terms (what the factory calls it)
   - Specific material/feature terms (to find specialized manufacturers)
   - OEM/ODM terms (to find factories open to customization)

2. **Product Specification** — a detailed spec document suitable for sending to manufacturers. Include materials, dimensions, weight, required certifications, packaging requirements, and customization needs.

3. **Filter Criteria** — minimum requirements for supplier selection (years in business, Trade Assurance coverage, verifications, response rate, max MOQ, max lead time, and preferred manufacturing regions).

Use the submit_search_strategy tool to submit your strategy.`;
}

export function buildSupplierScorePrompt(
  suppliers: unknown[],
  spec: unknown
): string {
  const supplierList = JSON.stringify(suppliers, null, 2);
  const specStr = JSON.stringify(spec, null, 2);

  return `# Supplier Evaluation

## Product Specification
\`\`\`json
${specStr}
\`\`\`

## Supplier Profiles
\`\`\`json
${supplierList}
\`\`\`

## Instructions

Score and rank each supplier on four dimensions (each 0-25, summing to total score 0-100):

1. **Reliability (0-25)** — years in business, Trade Assurance coverage, verification status, response rate
2. **Quality (0-25)** — review scores, certifications, product relevance, whether they're a manufacturer vs trading company
3. **Commercial (0-25)** — MOQ flexibility, pricing, lead time, payment terms
4. **Fit (0-25)** — how well their main products align with our spec, customization capability, sample availability

For each supplier:
- List 3-5 specific pros
- List 2-4 specific cons or red flags
- Write a 1-2 sentence recommendation (e.g., "Order samples immediately", "Negotiate MOQ down from 1000", "Avoid — trading company with inflated claims")

Recommend the single best supplier to start with.

Use the submit_supplier_scores tool to submit your evaluation.`;
}

export function buildOutreachPrompt(
  supplier: unknown,
  spec: unknown
): string {
  const supplierStr = JSON.stringify(supplier, null, 2);
  const specStr = JSON.stringify(spec, null, 2);

  return `# Supplier Outreach Message

## Supplier Profile
\`\`\`json
${supplierStr}
\`\`\`

## Product Specification
\`\`\`json
${specStr}
\`\`\`

## Instructions

Write a professional outreach message to this supplier. The message should:

1. Be under 250 words
2. Reference their specific capabilities (show you did research)
3. Clearly state the product requirements
4. Ask about MOQ flexibility, sample availability, and lead time
5. Mention interest in long-term partnership (factories prioritize repeat buyers)
6. NOT reveal your target price (negotiate after samples)
7. Include your "company" context: you are a US-based Amazon seller launching a new product line

Generate:
- A primary message in "professional" tone
- 2-3 variants with different approaches:
  - One with urgency (compressed timeline)
  - One that's relationship-first (longer-term partnership emphasis)
  - Optionally one that's more technical/spec-focused

Use the submit_outreach tool to submit your message and variants.`;
}
