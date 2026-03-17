import { NextResponse } from "next/server";
import { getMockOutreach } from "@/lib/mock-suggestions";

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

    // If no API key, return mock data
    if (!process.env.ANTHROPIC_API_KEY) {
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

    // In production, would call draftOutreach() with supplier and spec data
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
  } catch (error) {
    console.error("[API /supplier/draft-message] Error:", error);
    return NextResponse.json(
      { error: "Failed to draft outreach message" },
      { status: 500 }
    );
  }
}
