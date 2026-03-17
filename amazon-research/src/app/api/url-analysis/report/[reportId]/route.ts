import { NextRequest } from "next/server";
import { analysisStore } from "../../run/route";
import { getMockURLAnalysisReport } from "@/lib/mock-url-analysis";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const { reportId } = await params;

  // Check in-memory store
  const stored = analysisStore.get(reportId);
  if (stored) {
    return Response.json(stored);
  }

  // Fall back to mock for mock-prefixed IDs
  if (reportId.startsWith("mock-")) {
    return Response.json(getMockURLAnalysisReport(reportId));
  }

  return Response.json({ error: "Report not found" }, { status: 404 });
}
