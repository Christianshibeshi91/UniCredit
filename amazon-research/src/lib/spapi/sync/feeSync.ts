import type { SyncResult } from "@/lib/types/spapi";
import { spapiClient } from "../client";
import { getAdminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

export async function syncFees(asins: string[]): Promise<SyncResult> {
  const errors: string[] = [];
  let synced = 0;
  const db = getAdminDb();

  for (const asin of asins) {
    try {
      const envelope = await spapiClient.getFees(asin);
      const feeData = envelope.data;

      // Persist to Firestore
      await db.collection("products").doc(asin).set(
        {
          referralFee: feeData.referralFee,
          fbaFee: feeData.fbaFee,
          storageFee: feeData.storageFee,
          totalFees: feeData.totalFees,
          updatedAt: Timestamp.now(),
          lastFeeSync: Timestamp.now(),
        },
        { merge: true }
      );

      synced++;
    } catch (error) {
      errors.push(`${asin}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  return { type: "fees", synced, errors };
}
