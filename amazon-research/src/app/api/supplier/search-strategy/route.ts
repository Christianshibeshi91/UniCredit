import { NextResponse } from "next/server";
import { getMockSupplierSearch } from "@/lib/mock-suggestions";

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

    // In production, would call generateSearchStrategy()
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
  } catch (error) {
    console.error("[API /supplier/search-strategy] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate search strategy" },
      { status: 500 }
    );
  }
}
