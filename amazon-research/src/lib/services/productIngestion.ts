/**
 * Product Ingestion Service.
 * Fetches product data by ASIN via SP-API (or mock fallback),
 * validates, and stores in Firestore.
 */
import { getAdminDb } from "@/lib/firebase/admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { spapiClient } from "@/lib/spapi/client";
import type { Product } from "@/lib/types";

const ASIN_PATTERN = /^[A-Z0-9]{10}$/;

export interface IngestionResult {
  product: Product & { dataSource: string; addedBy: string };
  exists: boolean;
  analysisTriggered: boolean;
}

/**
 * Validate an ASIN string format.
 */
export function validateAsin(asin: string): boolean {
  return ASIN_PATTERN.test(asin);
}

/**
 * Ingest a product by ASIN.
 * 1. Validates format
 * 2. Checks if already in Firestore
 * 3. Fetches from SP-API (if enabled) or returns error
 * 4. Writes to Firestore
 */
export async function ingestProduct(
  asin: string,
  userId: string
): Promise<IngestionResult> {
  if (!validateAsin(asin)) {
    throw new IngestionError(
      "Invalid ASIN format. Must be 10 alphanumeric characters (uppercase).",
      400
    );
  }

  const db = getAdminDb();

  // Check if product already exists
  const existingDoc = await db.collection("products").doc(asin).get();
  if (existingDoc.exists) {
    const data = existingDoc.data() as Product & { dataSource: string; addedBy: string };
    return {
      product: { ...data, id: existingDoc.id },
      exists: true,
      analysisTriggered: false,
    };
  }

  // Fetch from SP-API if enabled
  if (!spapiClient.isEnabled()) {
    throw new IngestionError(
      "Amazon SP-API is not configured. Enable AMAZON_SP_API_ENABLED to fetch product data.",
      400
    );
  }

  try {
    // Fetch catalog data
    const catalogEnvelope = await spapiClient.getCatalogItem(asin);
    const catalog = catalogEnvelope.data;

    // Fetch pricing data
    const pricingEnvelope = await spapiClient.getPricing(asin);
    const pricing = pricingEnvelope.data;

    // Fetch BSR data
    let bsr = 0;
    try {
      const bsrEnvelope = await spapiClient.getBSR(asin);
      bsr = bsrEnvelope.data.bsr ?? 0;
    } catch {
      // BSR fetch failure is non-critical
      console.warn(`[Ingestion] BSR fetch failed for ${asin}, defaulting to 0`);
    }

    // Fetch review data
    let reviewCount = 0;
    let rating = 0;
    try {
      const reviewEnvelope = await spapiClient.getReviews(asin);
      reviewCount = reviewEnvelope.data.reviewCount ?? 0;
      rating = reviewEnvelope.data.rating ?? 0;
    } catch {
      console.warn(`[Ingestion] Review fetch failed for ${asin}, defaulting to 0`);
    }

    const now = Timestamp.now();
    const price = pricing.buyBoxPrice ?? pricing.lowestPrice ?? 0;

    // Estimate monthly sales from BSR (rough heuristic)
    const estimatedMonthlySales = estimateMonthlySalesFromBSR(bsr);
    const estimatedMonthlyRevenue = estimatedMonthlySales * price;
    // Assume ~30% margin as initial estimate (refined by analysis later)
    const profitMarginEstimate = 0.3;

    const productData = {
      id: asin,
      asin,
      title: catalog.title ?? `Product ${asin}`,
      brand: catalog.brand ?? "Unknown",
      category: catalog.category ?? "Uncategorized",
      subcategory: "",
      price,
      rating,
      reviewCount,
      bsr,
      imageUrl: catalog.images[0] ?? "",
      productUrl: `https://www.amazon.com/dp/${asin}`,
      estimatedMonthlySales,
      estimatedMonthlyRevenue,
      profitMarginEstimate,
      dataSource: "spapi" as const,
      addedBy: userId,
      createdAt: now,
      updatedAt: now,
    };

    // Write to Firestore
    await db.collection("products").doc(asin).set(productData);

    // Atomically increment user's product count
    await db
      .collection("users")
      .doc(userId)
      .update({
        productsAdded: FieldValue.increment(1),
        updatedAt: now,
      })
      .catch(() => {
        // Non-critical — user doc may not exist yet
      });

    return {
      product: productData as Product & { dataSource: string; addedBy: string },
      exists: false,
      analysisTriggered: false,
    };
  } catch (error) {
    if (error instanceof IngestionError) throw error;

    console.error(`[Ingestion] SP-API fetch failed for ${asin}:`, error);
    throw new IngestionError(
      "Failed to fetch product data from Amazon. Please try again later.",
      500
    );
  }
}

/**
 * Rough heuristic to estimate monthly sales from BSR.
 * Based on common Amazon BSR-to-sales estimation curves.
 */
function estimateMonthlySalesFromBSR(bsr: number): number {
  if (bsr <= 0) return 0;
  if (bsr <= 100) return 10000;
  if (bsr <= 500) return 5000;
  if (bsr <= 1000) return 3000;
  if (bsr <= 3000) return 1500;
  if (bsr <= 5000) return 800;
  if (bsr <= 10000) return 400;
  if (bsr <= 50000) return 150;
  if (bsr <= 100000) return 50;
  return 20;
}

export class IngestionError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "IngestionError";
    this.statusCode = statusCode;
  }
}
