import { NextRequest } from "next/server";
import { getAnalysisReport } from "@/lib/stores/analysisStore";
import { getMockURLAnalysisReport } from "@/lib/mock-url-analysis";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const { reportId } = await params;

  // Check in-memory store
  const stored = getAnalysisReport(reportId);
  if (stored) {
    return Response.json(stored);
  }

  // Fall back to mock for mock-prefixed IDs
  if (reportId.startsWith("mock-")) {
    return Response.json(getMockURLAnalysisReport(reportId));
  }

  return Response.json({ error: "Report not found" }, { status: 404 });
}
