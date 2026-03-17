import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const minScore = searchParams.get("minScore");
    const tier = searchParams.get("tier");
    const recommendation = searchParams.get("recommendation");
    const limitParam = searchParams.get("limit");

    const limit = Math.min(100, Math.max(1, parseInt(limitParam ?? "50", 10) || 50));

    let query = adminDb
      .collection("opportunities")
      .orderBy("opportunityScore", "desc")
      .limit(limit);

    if (tier) {
      query = query.where("tier", "==", tier);
    }

    if (recommendation) {
      query = query.where("recommendation", "==", recommendation);
    }

    if (minScore) {
      const min = parseInt(minScore, 10);
      if (!isNaN(min)) {
        query = query.where("opportunityScore", ">=", min);
      }
    }

    const snapshot = await query.get();
    const opportunities = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ opportunities });
  } catch (error) {
    console.error("[API /opportunities] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch opportunities" },
      { status: 500 }
    );
  }
}
