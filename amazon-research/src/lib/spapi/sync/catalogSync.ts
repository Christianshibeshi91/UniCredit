import type { SyncResult } from "@/lib/types/spapi";
import { spapiClient } from "../client";

export async function syncCatalog(asins: string[]): Promise<SyncResult> {
  const errors: string[] = [];
  let synced = 0;

  for (const asin of asins) {
    try {
      await spapiClient.getCatalogItem(asin);
      synced++;
    } catch (error) {
      errors.push(`${asin}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  return { type: "catalog", synced, errors };
}
