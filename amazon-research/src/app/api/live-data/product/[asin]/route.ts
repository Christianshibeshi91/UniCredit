import { NextRequest, NextResponse } from "next/server";
import { MOCK_PRODUCTS } from "@/lib/mock-data";
import { getMockLiveDataForProduct } from "@/lib/mock-spapi";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ asin: string }> },
) {
  const { asin } = await params;

  const product = MOCK_PRODUCTS.find((p) => p.asin === asin);
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const mockLive = getMockLiveDataForProduct(product.asin);
  const enriched = {
    ...product,
    livePrice: mockLive.livePrice,
    liveBSR: mockLive.liveBSR,
    liveReviewCount: mockLive.liveReviewCount,
    liveRating: mockLive.liveRating,
    lastSynced: mockLive.lastSynced,
    dataSource: "mock" as const,
  };

  return NextResponse.json(enriched);
}
