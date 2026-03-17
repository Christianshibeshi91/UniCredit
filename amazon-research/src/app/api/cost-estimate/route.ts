import { NextResponse } from "next/server";
import { getMockCostEstimate, getMockSuggestions } from "@/lib/mock-suggestions";
import { estimateStartupCost } from "@/lib/analysis/costEstimator";

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

    // If no LLM configured, return mock data
    if (!process.env.OLLAMA_BASE_URL) {
      const estimate = getMockCostEstimate(suggestionId);
      if (!estimate) {
        return NextResponse.json(
          { error: "Cost estimate not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ estimate, source: "mock" });
    }

    // Look up the suggestion to feed into the cost estimator
    const suggestions = getMockSuggestions();
    const suggestion = suggestions.find((s) => s.id === suggestionId);
    if (!suggestion) {
      return NextResponse.json(
        { error: "Suggestion not found" },
        { status: 404 }
      );
    }

    const estimate = await estimateStartupCost(suggestion);
    return NextResponse.json({ estimate, source: "ollama" });
  } catch (error) {
    console.error("[API /cost-estimate] Error:", error);
    return NextResponse.json(
      { error: "Failed to estimate costs" },
      { status: 500 }
    );
  }
}
