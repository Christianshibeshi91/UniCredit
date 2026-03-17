import { NextResponse } from "next/server";
import { getMockSupplierSearch, getMockSuggestions } from "@/lib/mock-suggestions";
import { generateSearchStrategy } from "@/lib/analysis/supplierAdvisor";

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
      const search = getMockSupplierSearch(suggestionId);
      if (!search) {
        return NextResponse.json(
          { error: "Supplier search not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({
        keywords: search.searchKeywords,
        spec: search.productSpec,
        filters: search.filterCriteria,
        source: "mock",
      });
    }

    // Look up the suggestion to generate a real search strategy
    const suggestions = getMockSuggestions();
    const suggestion = suggestions.find((s) => s.id === suggestionId);
    if (!suggestion) {
      return NextResponse.json(
        { error: "Suggestion not found" },
        { status: 404 }
      );
    }

    const result = await generateSearchStrategy(suggestion);
    return NextResponse.json({ ...result, source: "ollama" });
  } catch (error) {
    console.error("[API /supplier/search-strategy] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate search strategy" },
      { status: 500 }
    );
  }
}
