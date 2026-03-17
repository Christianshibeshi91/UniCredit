import { NextRequest, NextResponse } from "next/server";
import { syncBSR } from "@/lib/spapi/sync/bsrSync";
import { getSellerProductASINs } from "@/lib/services/productSource";
import { markSyncStarted, markSyncCompleted, markSyncFailed } from "@/lib/services/syncStatus";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.AMAZON_SP_API_ENABLED !== "true") {
    return NextResponse.json({ message: "SP-API disabled", synced: 0 });
  }

  try {
    await markSyncStarted("bsr");
    const asins = await getSellerProductASINs();

    if (asins.length === 0) {
      return NextResponse.json({ message: "No products to sync", synced: 0 });
    }

    const result = await syncBSR(asins);

    if (result.errors.length > 0) {
      await markSyncFailed("bsr", result.errors);
    } else {
      await markSyncCompleted("bsr", result.synced);
    }

    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    await markSyncFailed("bsr", [msg]).catch(() => {});
    return NextResponse.json({ error: "Sync failed", detail: msg }, { status: 500 });
  }
}
