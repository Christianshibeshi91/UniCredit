import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAuthToken, AuthError } from "@/lib/firebase/auth-admin";

export const runtime = "nodejs";

/**
 * GET /api/intelligence/reports
 * List the authenticated user's intelligence reports.
 * Returns summary data (not full reports) for efficient listing.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request);
    const { searchParams } = request.nextUrl;

    const limitParam = searchParams.get("limit");
    const cursor = searchParams.get("cursor");
    const parsedLimit = parseInt(limitParam ?? "20", 10);
    const limit = Math.min(50, Math.max(1, Number.isNaN(parsedLimit) ? 20 : parsedLimit));

    const db = getAdminDb();

    let query = db
      .collection("intelligenceReports")
      .where("userId", "==", auth.uid)
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (cursor) {
      const cursorDoc = await db.collection("intelligenceReports").doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();

    const reports = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        status: data.status ?? "unknown",
        productName: data.verdict?.productName ?? null,
        successProbability: data.successProbability?.overallScore ?? null,
        availableCapital: data.inputContext?.availableCapital ?? 0,
        createdAt: data.createdAt ?? null,
      };
    });

    const nextCursor =
      snapshot.docs.length === limit
        ? snapshot.docs[snapshot.docs.length - 1].id
        : null;

    return NextResponse.json({ reports, nextCursor });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("[API /intelligence/reports] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
