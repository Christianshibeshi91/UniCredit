import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifyAuthToken, AuthError } from "@/lib/firebase/auth-admin";
import { ingestProduct, IngestionError } from "@/lib/services/productIngestion";
import { ingestReviews } from "@/lib/services/reviewIngestion";

export const runtime = "nodejs";

const VALID_SORT_FIELDS = new Set([
  "title",
  "price",
  "rating",
  "reviewCount",
  "bsr",
  "createdAt",
]);

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

export async function GET(request: NextRequest) {
  try {
    // Auth verification — TODO: uncomment when auth is fully wired in UI
    // await verifyAuthToken(request);
    const { searchParams } = request.nextUrl;

    const category = searchParams.get("category");
    const tier = searchParams.get("tier");
    const minScore = searchParams.get("minScore");
    const maxScore = searchParams.get("maxScore");
    const cursor = searchParams.get("cursor");
    const sortBy = searchParams.get("sortBy") ?? "createdAt";
    const limitParam = searchParams.get("limit");

    // Validate sortBy
    if (!VALID_SORT_FIELDS.has(sortBy)) {
      return NextResponse.json(
        { error: `Invalid sortBy field. Valid: ${Array.from(VALID_SORT_FIELDS).join(", ")}` },
        { status: 400 }
      );
    }

    // Validate limit
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(limitParam ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
    );

    // Build Firestore query
    let query = adminDb.collection("products").orderBy(sortBy, "desc").limit(limit);

    if (category) {
      query = query.where("category", "==", category);
    }

    if (cursor) {
      const cursorDoc = await adminDb.collection("products").doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();
    const products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Fetch opportunity scores for these products
    const productIds = products.map((p) => p.id);
    const opportunityMap = new Map<string, Record<string, unknown>>();

    if (productIds.length > 0) {
      // Firestore 'in' queries support max 30 values
      const chunks: string[][] = [];
      for (let i = 0; i < productIds.length; i += 30) {
        chunks.push(productIds.slice(i, i + 30));
      }

      for (const chunk of chunks) {
        const oppSnapshot = await adminDb
          .collection("opportunities")
          .where("productId", "in", chunk)
          .get();
        oppSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          opportunityMap.set(data.productId as string, data);
        });
      }
    }

    // Join and filter
    let enrichedProducts = products.map((p) => ({
      ...p,
      opportunity: opportunityMap.get(p.id) ?? null,
    }));

    // Client-side filtering by opportunity fields (these live in the joined collection)
    if (tier) {
      enrichedProducts = enrichedProducts.filter(
        (p) => p.opportunity && (p.opportunity as Record<string, unknown>).tier === tier
      );
    }

    if (minScore) {
      const min = parseInt(minScore, 10);
      if (!isNaN(min)) {
        enrichedProducts = enrichedProducts.filter(
          (p) =>
            p.opportunity &&
            ((p.opportunity as Record<string, unknown>).opportunityScore as number) >= min
        );
      }
    }

    if (maxScore) {
      const max = parseInt(maxScore, 10);
      if (!isNaN(max)) {
        enrichedProducts = enrichedProducts.filter(
          (p) =>
            p.opportunity &&
            ((p.opportunity as Record<string, unknown>).opportunityScore as number) <= max
        );
      }
    }

    const nextCursor =
      snapshot.docs.length === limit
        ? snapshot.docs[snapshot.docs.length - 1].id
        : null;

    return NextResponse.json({
      products: enrichedProducts,
      nextCursor,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("[API /products] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 * Add a product by ASIN. Fetches data from Amazon SP-API and stores in Firestore.
 *
 * Rate limit consideration: Each POST triggers 2-4 SP-API calls (catalog, pricing,
 * BSR, reviews). Consider adding per-user rate limiting (e.g., 10 products/hour).
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request);

    let body: { asin?: string; autoAnalyze?: boolean };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const asin = body.asin?.toUpperCase()?.trim();
    if (!asin) {
      return NextResponse.json(
        { error: "ASIN is required" },
        { status: 400 }
      );
    }

    const result = await ingestProduct(asin, auth.uid);

    if (result.exists) {
      return NextResponse.json({
        product: result.product,
        exists: true,
      });
    }

    // Ingest reviews for new products (non-blocking, best-effort)
    const reviewCount = await ingestReviews(asin);

    // Optionally trigger auto-analysis
    let analysisTriggered = false;
    if (body.autoAnalyze !== false && reviewCount > 0) {
      // Fire-and-forget: trigger analysis asynchronously
      // The analysis endpoint handles its own error handling
      analysisTriggered = true;
      // Note: actual analysis is triggered client-side via the useAnalysis hook
      // after receiving the product data. We set the flag to inform the client.
    }

    return NextResponse.json(
      {
        product: result.product,
        exists: false,
        analysisTriggered,
        reviewsIngested: reviewCount,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    if (error instanceof IngestionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("[API /products] POST error:", error);
    return NextResponse.json(
      { error: "Failed to add product" },
      { status: 500 }
    );
  }
}
