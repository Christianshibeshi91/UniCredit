import { NextRequest, NextResponse } from "next/server";
import { reportStore } from "@/app/api/intelligence/run/route";
import { getAdminDb } from "@/lib/firebase/admin";
import { getMockIntelligenceReport } from "@/lib/mock-intelligence";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const { reportId } = await params;

  // 1. Check in-memory store first (fastest)
  const stored = reportStore.get(reportId);
  if (stored) {
    return NextResponse.json(stored);
  }

  // 2. Check Firestore (durable storage)
  try {
    const db = getAdminDb();
    const reportDoc = await db.collection("intelligenceReports").doc(reportId).get();
    if (reportDoc.exists) {
      return NextResponse.json(reportDoc.data());
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
