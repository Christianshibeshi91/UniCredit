import type { SyncResult } from "@/lib/types/spapi";
import { spapiClient } from "../client";
import { getAdminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

export async function syncReviews(asins: string[]): Promise<SyncResult> {
  const errors: string[] = [];
  let synced = 0;
  const db = getAdminDb();

  for (const asin of asins) {
    try {
      const envelope = await spapiClient.getReviews(asin);
      const reviewData = envelope.data;

      // Persist to Firestore
      await db.collection("products").doc(asin).set(
        {
          rating: reviewData.rating,
          reviewCount: reviewData.reviewCount,
          updatedAt: Timestamp.now(),
          lastReviewSync: Timestamp.now(),
        },
        { merge: true }
      );

      synced++;
    } catch (error) {
      errors.push(`${asin}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  return { type: "reviews", synced, errors };
}
