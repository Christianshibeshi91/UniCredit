import { NextResponse } from "next/server";
import { getMockCostEstimate } from "@/lib/mock-suggestions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { suggestionId } = body as { suggestionId: string };

    if (!suggestionId || typeof suggestionId !== "string") {
      return NextResponse.json(
        { error: "suggestionId is required" },
        { status: 400 }
      );
    }

    // If no API key, return mock data
    if (!process.env.ANTHROPIC_API_KEY) {
      const estimate = getMockCostEstimate(suggestionId);
      if (!estimate) {
        return NextResponse.json(
          { error: "Cost estimate not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ estimate, source: "mock" });
    }

    // In production, would call estimateStartupCost()
    const estimate = getMockCostEstimate(suggestionId);
    if (!estimate) {
      return NextResponse.json(
        { error: "Cost estimate not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ estimate, source: "mock" });
  } catch (error) {
    console.error("[API /cost-estimate] Error:", error);
    return NextResponse.json(
      { error: "Failed to estimate costs" },
      { status: 500 }
    );
  }
}
