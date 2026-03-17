import { NextRequest, NextResponse } from "next/server";
import { spapiClient } from "@/lib/spapi/client";
import { getSellerProductASINs } from "@/lib/services/productSource";
import { markSyncStarted, markSyncCompleted, markSyncFailed } from "@/lib/services/syncStatus";
import { syncCatalog } from "@/lib/spapi/sync/catalogSync";
import { syncPricing } from "@/lib/spapi/sync/pricingSync";
import { syncReviews } from "@/lib/spapi/sync/reviewSync";
import { syncBSR } from "@/lib/spapi/sync/bsrSync";
import { syncFees } from "@/lib/spapi/sync/feeSync";
import type { SyncType, SyncResult } from "@/lib/types/spapi";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min for bulk sync

const SYNC_MAP: Record<string, (asins: string[]) => Promise<SyncResult>> = {
  catalog: syncCatalog,
  pricing: syncPricing,
  reviews: syncReviews,
  bsr: syncBSR,
  fees: syncFees,
};

const VALID_SYNC_TYPES = new Set<string>(["catalog", "pricing", "reviews", "bsr", "inventory", "fees"]);

/**
 * POST /api/live-data/sync
 * Trigger a manual sync for specified data types.
 * Auth: Bearer token via CRON_SECRET.
 *
 * If no asins provided, syncs all seller products from Firestore.
 * If no types provided, syncs all available types.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!spapiClient.isEnabled()) {
    return NextResponse.json({
      error: "SP-API is not enabled. Set AMAZON_SP_API_ENABLED=true",
    }, { status: 400 });
  }

  let body: { types?: string[]; asins?: string[] };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const types = (body.types ?? ["catalog", "pricing", "bsr", "reviews", "fees"])
    .filter((t: string) => VALID_SYNC_TYPES.has(t));
  const asins = body.asins ?? await getSellerProductASINs();

  if (asins.length === 0) {
    return NextResponse.json({
      message: "No products to sync. Add products first via /api/products or /api/live-data/discover.",
      results: [],
    });
  }

  const results: SyncResult[] = [];

  for (const type of types) {
    const syncFn = SYNC_MAP[type];
    if (!syncFn) continue;

    try {
      await markSyncStarted(type as SyncType);
      const result = await syncFn(asins);
      results.push(result);

      if (result.errors.length > 0) {
        await markSyncFailed(type as SyncType, result.errors);
      } else {
        await markSyncCompleted(type as SyncType, result.synced);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      results.push({ type: type as SyncType, synced: 0, errors: [msg] });
      await markSyncFailed(type as SyncType, [msg]).catch(() => {});
    }
  }

  return NextResponse.json({
    totalAsins: asins.length,
    results,
    syncedAt: new Date().toISOString(),
  });
}
