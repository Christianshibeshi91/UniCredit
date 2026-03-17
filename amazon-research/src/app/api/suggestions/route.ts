import { NextResponse } from "next/server";
import { getMockSuggestions } from "@/lib/mock-suggestions";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Always return mock data (no ANTHROPIC_API_KEY check needed for GET)
    const suggestions = getMockSuggestions();
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("[API /suggestions] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // If no API key, return mock data
    if (!process.env.ANTHROPIC_API_KEY) {
      const suggestions = getMockSuggestions();
      return NextResponse.json({ suggestions, source: "mock" });
    }

    const body = await request.json();
    const { productIds, categoryFilter } = body as {
      productIds?: string[];
      categoryFilter?: string;
    };

    // Validate input
    if (productIds && !Array.isArray(productIds)) {
      return NextResponse.json(
        { error: "productIds must be an array" },
        { status: 400 }
      );
    }

    // In production, would call generateSuggestions() with real product/analysis data
    // For now, return mock data
    let suggestions = getMockSuggestions();
    if (categoryFilter) {
      suggestions = suggestions.filter((s) => s.category === categoryFilter);
    }

    return NextResponse.json({ suggestions, source: "mock" });
  } catch (error) {
    console.error("[API /suggestions] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
