import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAuthToken, AuthError } from "@/lib/firebase/auth-admin";

export const runtime = "nodejs";

/**
 * GET /api/dashboard/stats
 * Aggregated KPI data for the dashboard page.
 * Computes stats from products and opportunities collections.
 */
export async function GET(request: NextRequest) {
  try {
    // Auth verification — TODO: uncomment when auth is fully wired in UI
    // await verifyAuthToken(request);

    const db = getAdminDb();

    // Fetch all products
    const productsSnapshot = await db.collection("products").get();
    const products = productsSnapshot.docs.map((doc) => doc.data());

    // Fetch all opportunities
    const opportunitiesSnapshot = await db.collection("opportunities").get();
    const opportunities = opportunitiesSnapshot.docs.map((doc) => doc.data());

    // Fetch analyzed count
    const analysisSnapshot = await db
      .collection("analysis")
      .where("status", "==", "complete")
      .get();

    const totalProducts = products.length;
    const analyzedProducts = analysisSnapshot.size;

    // Compute averages
    const avgScore =
      opportunities.length > 0
        ? Math.round(
            opportunities.reduce(
              (sum, o) => sum + (o.opportunityScore as number ?? 0),
              0
            ) / opportunities.length
          )
        : 0;

    const totalRevenue = products.reduce(
      (sum, p) => sum + (p.estimatedMonthlyRevenue as number ?? 0),
      0
    );

    const totalReviews = products.reduce(
      (sum, p) => sum + (p.reviewCount as number ?? 0),
      0
    );

    const avgRating =
      products.length > 0
        ? Math.round(
            (products.reduce((sum, p) => sum + (p.rating as number ?? 0), 0) /
              products.length) *
              10
          ) / 10
        : 0;

    const avgPrice =
      products.length > 0
        ? Math.round(
            (products.reduce((sum, p) => sum + (p.price as number ?? 0), 0) /
              products.length) *
              100
          ) / 100
        : 0;

    // Tier distribution
    const tierCounts: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 };
    for (const opp of opportunities) {
      const tier = opp.tier as string;
      if (tier in tierCounts) {
        tierCounts[tier]++;
      }
    }

    // Category distribution
    const categoryCounts: Record<string, number> = {};
    for (const p of products) {
      const cat = (p.category as string) ?? "Uncategorized";
      categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
    }

    // Trend scores (last 6 months placeholder — would need time-series data)
    const now = new Date();
    const trendMonths: string[] = [];
    const trendScores: number[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      trendMonths.push(
        d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
      );
      // Use current avgScore as baseline with slight variance for now
      trendScores.push(Math.max(0, avgScore + Math.round((Math.random() - 0.5) * 10)));
    }

    return NextResponse.json({
      totalProducts,
      analyzedProducts,
      avgScore,
      totalRevenue: Math.round(totalRevenue),
      totalReviews,
      avgRating,
      avgPrice,
      sProducts: tierCounts.S,
      aProducts: tierCounts.A,
      bProducts: tierCounts.B,
      tierCounts,
      categoryCounts,
      trendScores,
      trendMonths,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("[API /dashboard/stats] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
