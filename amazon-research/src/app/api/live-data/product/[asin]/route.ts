import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken, AuthError } from "@/lib/firebase/auth-admin";
import { spapiClient } from "@/lib/spapi/client";
import { enrichSingleProduct } from "@/lib/spapi/dataBridge";
import { getAdminDb } from "@/lib/firebase/admin";
import { validateAsin } from "@/lib/services/productIngestion";
import { getMockLiveDataForProduct } from "@/lib/mock-spapi";

export const dynamic = "force-dynamic";

/**
 * GET /api/live-data/product/[asin]
 * Returns live-enriched product data via SP-API.
 * Falls back to mock data when SP-API is disabled.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ asin: string }> },
) {
  try {
    await verifyAuthToken(request);

    const { asin } = await params;

    if (!validateAsin(asin)) {
      return NextResponse.json(
        { error: "Invalid ASIN format" },
        { status: 400 }
      );
    }

    // Get base product from Firestore
    const db = getAdminDb();
    const productDoc = await db.collection("products").doc(asin).get();

    if (!productDoc.exists) {
      return NextResponse.json(
        { error: "Product not found. Ingest it first via /api/products." },
        { status: 404 }
      );
    }

    const baseProduct = { id: productDoc.id, ...productDoc.data() } as unknown as import("@/lib/types/product").Product;

    // If SP-API is disabled, return mock-enriched data
    if (!spapiClient.isEnabled()) {
      const mockLive = getMockLiveDataForProduct(asin);
      return NextResponse.json({
        ...baseProduct,
        livePrice: mockLive.livePrice,
        liveBSR: mockLive.liveBSR,
        liveReviewCount: mockLive.liveReviewCount,
        liveRating: mockLive.liveRating,
        lastSynced: mockLive.lastSynced,
        dataSource: "mock",
        liveDataEnabled: false,
      });
    }

    // Fetch live data from SP-API (respects cache + rate limits)
    const [pricingResult, bsrResult, reviewResult] = await Promise.allSettled([
      spapiClient.getPricing(asin),
      spapiClient.getBSR(asin),
      spapiClient.getReviews(asin),
    ]);

    const pricing = pricingResult.status === "fulfilled" ? pricingResult.value : null;
    const bsr = bsrResult.status === "fulfilled" ? bsrResult.value : null;
    const reviews = reviewResult.status === "fulfilled" ? reviewResult.value : null;

    const enriched = enrichSingleProduct(
      baseProduct,
      pricing,
      bsr,
      reviews
    );

    return NextResponse.json({
      ...enriched,
      liveDataEnabled: true,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("[API /live-data/product] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch live product data" },
      { status: 500 }
    );
  }
}
