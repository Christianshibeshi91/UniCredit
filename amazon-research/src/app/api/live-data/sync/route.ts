import { NextRequest, NextResponse } from "next/server";
import type { SyncType } from "@/lib/types/spapi";
import { syncCatalog } from "@/lib/spapi/sync/catalogSync";
import { syncPricing } from "@/lib/spapi/sync/pricingSync";
import { syncReviews } from "@/lib/spapi/sync/reviewSync";
import { syncBSR } from "@/lib/spapi/sync/bsrSync";
import { syncFees } from "@/lib/spapi/sync/feeSync";

export const dynamic = "force-dynamic";

const SYNC_MAP: Record<string, (asins: string[]) => Promise<unknown>> = {
  catalog: syncCatalog,
  pricing: syncPricing,
  reviews: syncReviews,
  bsr: syncBSR,
  fees: syncFees,
};

const VALID_SYNC_TYPES = new Set<string>(["catalog", "pricing", "reviews", "bsr", "inventory", "fees"]);

export async function POST(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.AMAZON_SP_API_ENABLED !== "true") {
    return NextResponse.json({ message: "SP-API disabled" });
  }

  let asins: string[];
  let types: SyncType[];

  try {
    const body = await request.json();
    asins = body.asins;
    types = body.types;

    if (!Array.isArray(asins) || asins.length === 0) {
      return NextResponse.json({ error: "asins must be a non-empty array" }, { status: 400 });
    }
    if (!Array.isArray(types) || types.some((t: string) => !VALID_SYNC_TYPES.has(t))) {
      return NextResponse.json({ error: "Invalid sync types" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const results = [];
  for (const type of types) {
    const syncFn = SYNC_MAP[type];
    if (syncFn) {
      results.push(await syncFn(asins));
    }
  }

  return NextResponse.json({ results });
}
