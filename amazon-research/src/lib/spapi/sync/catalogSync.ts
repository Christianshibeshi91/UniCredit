import type { SyncResult } from "@/lib/types/spapi";
import { spapiClient } from "../client";
import { getAdminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

export async function syncCatalog(asins: string[]): Promise<SyncResult> {
  const errors: string[] = [];
  let synced = 0;
  const db = getAdminDb();

  for (const asin of asins) {
    try {
      const envelope = await spapiClient.getCatalogItem(asin);
      const catalog = envelope.data;

      // Persist to Firestore
      await db.collection("products").doc(asin).set(
        {
          title: catalog.title,
          brand: catalog.brand,
          category: catalog.category,
          imageUrl: catalog.images?.[0] ?? "",
          updatedAt: Timestamp.now(),
          lastCatalogSync: Timestamp.now(),
        },
        { merge: true }
      );

      synced++;
    } catch (error) {
      errors.push(`${asin}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  return { type: "catalog", synced, errors };
}
