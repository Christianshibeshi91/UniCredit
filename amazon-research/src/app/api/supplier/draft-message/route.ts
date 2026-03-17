import { NextResponse } from "next/server";
import { getMockOutreach, getMockSupplierSearch, getMockCostEstimate } from "@/lib/mock-suggestions";
import { draftOutreach } from "@/lib/analysis/supplierAdvisor";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { suggestionId, supplierId } = body as {
      suggestionId: string;
      supplierId: string;
    };

    if (!suggestionId || typeof suggestionId !== "string") {
      return NextResponse.json(
        { error: "suggestionId is required" },
        { status: 400 }
      );
    }

    if (!supplierId || typeof supplierId !== "string") {
      return NextResponse.json(
        { error: "supplierId is required" },
        { status: 400 }
      );
    }

    // If no LLM configured, return mock data
    if (!process.env.OLLAMA_BASE_URL) {
      const outreach = getMockOutreach(suggestionId);
      if (!outreach) {
        return NextResponse.json(
          { error: "Outreach message not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({
        outreach,
        supplierId,
        source: "mock",
      });
    }

    // Get supplier search data for this suggestion
    const search = getMockSupplierSearch(suggestionId);
    if (!search) {
      return NextResponse.json(
        { error: "Supplier search not found" },
        { status: 404 }
      );
    }

    // Find the specific supplier to draft outreach for
    const supplier = search.suppliers.find((s) => s.id === supplierId);
    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    // Include cost estimate for richer context if available
    const costEstimate = getMockCostEstimate(suggestionId) || undefined;

    const outreach = await draftOutreach(supplier, search.productSpec, costEstimate);
    return NextResponse.json({
      outreach,
      supplierId,
      source: "ollama",
    });
  } catch (error) {
    console.error("[API /supplier/draft-message] Error:", error);
    return NextResponse.json(
      { error: "Failed to draft outreach message" },
      { status: 500 }
    );
  }
}
