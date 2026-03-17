/**
 * Review Ingestion Service.
 * Fetches and stores reviews for a product from SP-API.
 */
import { getAdminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { spapiClient } from "@/lib/spapi/client";
import type { Review } from "@/lib/types";

/**
 * Fetch and store reviews for a product ASIN.
 * Returns the number of reviews ingested.
 *
 * NOTE: SP-API review data is limited — initial implementation stores what
 * SP-API provides (recent reviews, rating breakdown). For full review access,
 * Amazon Product Advertising API or scraping may be needed (out of MVP scope).
 */
export async function ingestReviews(asin: string): Promise<number> {
  if (!spapiClient.isEnabled()) {
    console.warn("[ReviewIngestion] SP-API not enabled, skipping review fetch");
    return 0;
  }

  const db = getAdminDb();

  try {
    const reviewEnvelope = await spapiClient.getReviews(asin);
    const reviewData = reviewEnvelope.data;

    if (!reviewData.recentReviews || reviewData.recentReviews.length === 0) {
      return 0;
    }

    // Batch write reviews (Firestore batch max 500 writes)
    const MAX_BATCH_SIZE = 500;
    let totalWritten = 0;
    const reviews = reviewData.recentReviews;

    for (let i = 0; i < reviews.length; i += MAX_BATCH_SIZE) {
      const chunk = reviews.slice(i, i + MAX_BATCH_SIZE);
      const batch = db.batch();

      for (const review of chunk) {
        // Sanitize review content — strip any potential XSS in review text
        const sanitizedBody = stripHtml(review.body ?? "");
        const sanitizedTitle = stripHtml(review.title ?? "");

        const reviewId = `${asin}-${crypto.randomUUID()}`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const reviewDoc: Record<string, any> = {
          id: reviewId,
          productId: asin,
          reviewerName: "Anonymous",
          rating: Math.max(1, Math.min(5, review.rating ?? 3)),
          title: sanitizedTitle.slice(0, 500),
          body: sanitizedBody.slice(0, 5000),
          verifiedPurchase: false,
          helpfulVotes: 0,
          reviewDate: Timestamp.fromDate(
            review.date ? new Date(review.date) : new Date()
          ),
          createdAt: Timestamp.now(),
        };

        batch.set(
          db.collection("reviews").doc(reviewDoc.id),
          reviewDoc
        );
      }

      await batch.commit();
      totalWritten += chunk.length;
    }

    return totalWritten;
  } catch (error) {
    console.error(`[ReviewIngestion] Failed for ${asin}:`, error);
    return 0;
  }
}

/**
 * Strip HTML tags to prevent XSS from review content.
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}
