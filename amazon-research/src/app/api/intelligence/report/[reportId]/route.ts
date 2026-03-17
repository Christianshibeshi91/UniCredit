import { NextRequest, NextResponse } from "next/server";
import { getIntelligenceReport } from "@/lib/stores/reportStore";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAuthToken, AuthError } from "@/lib/firebase/auth-admin";
import { getMockIntelligenceReport } from "@/lib/mock-intelligence";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const { reportId } = await params;

  // Verify authentication
  let userId: string;
  try {
    const auth = await verifyAuthToken(request);
    userId = auth.uid;
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  // 1. Check in-memory store first (fastest)
  const stored = getIntelligenceReport(reportId);
  if (stored) {
    return NextResponse.json(stored);
  }

  // 2. Check Firestore (durable storage) — scoped to the requesting user
  try {
    const db = getAdminDb();
    const reportDoc = await db.collection("intelligenceReports").doc(reportId).get();
    if (reportDoc.exists) {
      const data = reportDoc.data();
      // Verify the report belongs to the requesting user
      if (data?.userId && data.userId !== userId && data.userId !== "anonymous") {
        return NextResponse.json(
          { error: "Report not found" },
          { status: 404 },
        );
      }
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error("[Intelligence] Firestore fetch error:", error);
    // Fall through to mock data
  }

  // 3. Fall back to mock data for known mock IDs (dev/demo mode)
  if (reportId.startsWith("mock-")) {
    return NextResponse.json(getMockIntelligenceReport(reportId));
  }

  return NextResponse.json(
    { error: "Report not found" },
    { status: 404 },
  );
}
