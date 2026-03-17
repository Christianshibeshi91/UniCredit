import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import {
  analyzeProductReviewsStreaming,
  AnalysisError,
  CircuitOpenError,
} from "@/lib/analysis/claudeReviewAnalyzer";
import { calculateScore } from "@/lib/analysis/opportunityScorer";
import type { Product, Review } from "@/lib/types";

export const runtime = "nodejs";

const ASIN_PATTERN = /^[A-Z0-9]{10}$/;
const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function POST(request: NextRequest) {
  let productId: string;
  let forceReanalyze: boolean;

  try {
    const body = await request.json();
    productId = body.productId;
    forceReanalyze = body.forceReanalyze === true;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!productId || !ASIN_PATTERN.test(productId)) {
    return new Response(
      JSON.stringify({ error: "Invalid productId. Must be 10 alphanumeric characters (uppercase)." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Check if fresh analysis exists
  if (!forceReanalyze) {
    const existingAnalysis = await getAdminDb()
      .collection("analysis")
      .doc(productId)
      .get();

    if (existingAnalysis.exists) {
      const data = existingAnalysis.data();
      if (data?.status === "complete" && data?.createdAt) {
        const age = Date.now() - data.createdAt.toMillis();
        if (age < STALE_THRESHOLD_MS) {
          return new Response(
            JSON.stringify({
              message: "Analysis is fresh",
              analysis: data,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
      }
    }
  }

  // Fetch product
  const productDoc = await getAdminDb().collection("products").doc(productId).get();
  if (!productDoc.exists) {
    return new Response(
      JSON.stringify({ error: "Product not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }
  const product = { id: productDoc.id, ...productDoc.data() } as Product;

  // Fetch reviews
  const reviewsSnapshot = await getAdminDb()
    .collection("reviews")
    .where("productId", "==", productId)
    .get();
  const reviews = reviewsSnapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() }) as Review
  );

  if (reviews.length === 0) {
    return new Response(
      JSON.stringify({ error: "No reviews found for this product" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // Set analysis status to processing
  await getAdminDb().collection("analysis").doc(productId).set(
    {
      productId,
      status: "processing",
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );

  // Stream response via SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (data: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        emit({ type: "start", productId, reviewCount: reviews.length });

        const startTime = Date.now();
        const analysisResult = await analyzeProductReviewsStreaming(
          product,
          reviews,
          (event) => {
            const { type: _eventType, ...rest } = event;
            emit({ type: "progress", ...rest });
          }
        );

        const processingTimeMs = Date.now() - startTime;
        emit({ type: "analysis", data: analysisResult });

        // Calculate opportunity score
        const score = calculateScore(analysisResult, product);
        emit({ type: "score", data: score });

        // Atomic batch write: analysis + opportunity
        const batch = getAdminDb().batch();

        batch.set(getAdminDb().collection("analysis").doc(productId), {
          id: productId,
          productId,
          status: "complete",
          reviewsAnalyzed: reviews.length,
          complaints: analysisResult.complaints,
          featureRequests: analysisResult.featureRequests,
          productGaps: analysisResult.productGaps,
          sentimentBreakdown: analysisResult.sentimentBreakdown,
          opportunitySummary: analysisResult.opportunitySummary,
          improvementIdeas: analysisResult.improvementIdeas,
          keyThemes: analysisResult.keyThemes,
          claudeModel: "claude-sonnet-4-20250514",
          promptTokens: 0,
          completionTokens: 0,
          processingTimeMs,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        batch.set(getAdminDb().collection("opportunities").doc(productId), {
          id: productId,
          productId,
          ...score,
          createdAt: Timestamp.now(),
        });

        await batch.commit();
        emit({ type: "done" });
      } catch (error) {
        // Mark analysis as failed
        await getAdminDb()
          .collection("analysis")
          .doc(productId)
          .set(
            { status: "failed", updatedAt: Timestamp.now() },
            { merge: true }
          )
          .catch(() => {});

        if (error instanceof CircuitOpenError) {
          emit({
            type: "error",
            message: "Service temporarily unavailable. Please try again later.",
          });
        } else if (error instanceof AnalysisError) {
          emit({
            type: "error",
            message: `Analysis failed after ${error.attemptCount} attempts.`,
          });
          console.error(
            `[Analyze] Failed: context=${error.context} attempts=${error.attemptCount}`,
            error.originalError
          );
        } else {
          emit({ type: "error", message: "An unexpected error occurred." });
          console.error("[Analyze] Unexpected error:", error);
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
