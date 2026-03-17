import { NextRequest, NextResponse } from "next/server";
import { syncPricing } from "@/lib/spapi/sync/pricingSync";
import { MOCK_PRODUCTS } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.AMAZON_SP_API_ENABLED !== "true") {
    return NextResponse.json({ message: "SP-API disabled", synced: 0 });
  }

  const asins = MOCK_PRODUCTS.map((p) => p.asin);
  const result = await syncPricing(asins);
  return NextResponse.json(result);
}
