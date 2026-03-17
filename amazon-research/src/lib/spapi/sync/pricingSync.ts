import type { SyncResult } from "@/lib/types/spapi";
import { spapiClient } from "../client";
import { getAdminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

export async function syncPricing(asins: string[]): Promise<SyncResult> {
  const errors: string[] = [];
  let synced = 0;
  const db = getAdminDb();

  for (const asin of asins) {
    try {
      const envelope = await spapiClient.getPricing(asin);
      const pricing = envelope.data;

      // Persist to Firestore
      await db.collection("products").doc(asin).set(
        {
          price: pricing.buyBoxPrice ?? pricing.lowestPrice ?? 0,
          competitorCount: pricing.competitorCount,
          fbaFees: pricing.fbaFees,
          referralFee: pricing.referralFee,
          updatedAt: Timestamp.now(),
          lastPricingSync: Timestamp.now(),
        },
        { merge: true }
      );

      synced++;
    } catch (error) {
      errors.push(`${asin}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  return { type: "pricing", synced, errors };
}
