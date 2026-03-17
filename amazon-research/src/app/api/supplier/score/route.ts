import { NextResponse } from "next/server";
import { getMockScoredSuppliers, getMockSupplierSearch } from "@/lib/mock-suggestions";
import { scoreSuppliers } from "@/lib/analysis/supplierAdvisor";
import type { SupplierProfile } from "@/lib/types";

export const runtime = "nodejs";

const HTML_TAG_RE = /<[^>]*>/g;
const MAX_SUPPLIERS = 10;

function stripHtmlFromProfile(profile: SupplierProfile): SupplierProfile {
  return {
    ...profile,
    companyName: profile.companyName.replace(HTML_TAG_RE, ""),
    location: profile.location.replace(HTML_TAG_RE, ""),
    mainProducts: profile.mainProducts.map((s) => s.replace(HTML_TAG_RE, "")),
    verifications: profile.verifications.map((s) => s.replace(HTML_TAG_RE, "")),
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { suggestionId, suppliers } = body as {
      suggestionId: string;
      suppliers?: SupplierProfile[];
    };

    if (!suggestionId || typeof suggestionId !== "string") {
      return NextResponse.json(
        { error: "suggestionId is required" },
        { status: 400 }
      );
    }

    // Validate suppliers array if provided
    if (suppliers) {
      if (!Array.isArray(suppliers)) {
        return NextResponse.json(
          { error: "suppliers must be an array" },
          { status: 400 }
        );
      }
      if (suppliers.length > MAX_SUPPLIERS) {
        return NextResponse.json(
          { error: `Maximum ${MAX_SUPPLIERS} suppliers allowed` },
          { status: 400 }
        );
      }
    }

    // Sanitize supplier profiles if provided
    const sanitized = suppliers?.map(stripHtmlFromProfile);

    // If no LLM configured, return mock data
    if (!process.env.OLLAMA_BASE_URL) {
      const scored = getMockScoredSuppliers(suggestionId);
      if (!scored || scored.length === 0) {
        return NextResponse.json(
          { error: "Scored suppliers not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({
        scoredSuppliers: scored,
        sanitizedInput: sanitized ? sanitized.length : 0,
        source: "mock",
      });
    }

    // Get the product spec from mock supplier search for scoring context
    const search = getMockSupplierSearch(suggestionId);
    if (!search) {
      return NextResponse.json(
        { error: "Supplier search not found for this suggestion" },
        { status: 404 }
      );
    }

    // Use provided suppliers or fall back to mock suppliers from the search
    const suppliersToScore = sanitized || search.suppliers;
    if (!suppliersToScore || suppliersToScore.length === 0) {
      return NextResponse.json(
        { error: "No suppliers to score" },
        { status: 400 }
      );
    }

    const scored = await scoreSuppliers(suppliersToScore, search.productSpec);
    return NextResponse.json({
      scoredSuppliers: scored,
      sanitizedInput: sanitized ? sanitized.length : 0,
      source: "ollama",
    });
  } catch (error) {
    console.error("[API /supplier/score] Error:", error);
    return NextResponse.json(
      { error: "Failed to score suppliers" },
      { status: 500 }
    );
  }
}
