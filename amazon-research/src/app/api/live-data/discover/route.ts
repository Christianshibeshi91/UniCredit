import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken, AuthError } from "@/lib/firebase/auth-admin";
import { spapiClient } from "@/lib/spapi/client";
import { isSellerConfigured, getSellerConfig } from "@/lib/spapi/sellerConfig";
import { getAdminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

export const runtime = "nodejs";

/**
 * POST /api/live-data/discover
 * Discovers seller's products via SP-API Catalog Items search
 * and stores them in Firestore. Uses official SP-API only.
 */
export async function POST(request: NextRequest) {
  try {
    await verifyAuthToken(request);

    if (!spapiClient.isEnabled()) {
      return NextResponse.json(
        { error: "SP-API is not enabled" },
        { status: 400 }
      );
    }

    if (!isSellerConfigured()) {
      return NextResponse.json(
        { error: "Seller ID not configured. Set AMAZON_SELLER_ID." },
        { status: 400 }
      );
    }

    const config = getSellerConfig();
    const db = getAdminDb();
    const now = Timestamp.now();

    let totalDiscovered = 0;
    let totalNew = 0;
    let pageToken: string | undefined;

    // Paginate through seller's catalog (max 5 pages = 100 products per call)
    const maxPages = 5;
    for (let page = 0; page < maxPages; page++) {
      try {
        const result = await spapiClient.searchSellerCatalog(pageToken);
        const items = result.data.items ?? [];

        for (const item of items) {
          totalDiscovered++;

          // Check if already exists
          const existing = await db.collection("products").doc(item.asin).get();
          if (existing.exists) continue;

          // Store new product with seller ownership
          await db.collection("products").doc(item.asin).set({
            id: item.asin,
            asin: item.asin,
            title: item.title ?? `Product ${item.asin}`,
            brand: item.brand ?? "Unknown",
            category: item.category ?? "Uncategorized",
            subcategory: "",
            price: 0,
            rating: 0,
            reviewCount: 0,
            bsr: 0,
            imageUrl: item.images?.[0] ?? "",
            sellerId: config.sellerId,
            dataSource: "spapi-discover",
            createdAt: now,
            updatedAt: now,
          });
          totalNew++;
        }

        pageToken = result.data.nextPageToken;
        if (!pageToken) break;
      } catch (error) {
        console.error(`[Discover] Page ${page} failed:`, error);
        break;
      }
    }

    return NextResponse.json({
      sellerId: config.sellerId,
      totalDiscovered,
      totalNew,
      message: `Discovered ${totalDiscovered} products, ${totalNew} new added to Firestore.`,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("[API /live-data/discover] Error:", error);
    return NextResponse.json(
      { error: "Discovery failed" },
      { status: 500 }
    );
  }
}
