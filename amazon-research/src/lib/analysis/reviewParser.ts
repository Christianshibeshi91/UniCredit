import type { Review } from "@/lib/types";

const DEFAULT_BATCH_SIZE = 50;

export function batchReviews(
  reviews: Review[],
  batchSize: number = DEFAULT_BATCH_SIZE
): Review[][] {
  if (reviews.length === 0) return [];

  const batches: Review[][] = [];
  for (let i = 0; i < reviews.length; i += batchSize) {
    batches.push(reviews.slice(i, i + batchSize));
  }
  return batches;
}

export function formatReviewForPrompt(review: Review, index: number): string {
  return [
    `[Review #${index + 1}] Rating: ${review.rating}/5 | Verified: ${review.verifiedPurchase ? "Yes" : "No"} | Helpful: ${review.helpfulVotes}`,
    `Title: ${review.title}`,
    `Body: ${review.body}`,
    "---",
  ].join("\n");
}
