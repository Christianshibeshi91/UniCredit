import { NextRequest } from "next/server";
import { runIntelligencePipeline } from "@/lib/analysis/intelligenceEngine";
import { getAdminDb } from "@/lib/firebase/admin";
import type { IntelligenceReport, IntelligenceSSEEvent } from "@/lib/types/intelligence";

export const runtime = "nodejs";
export const maxDuration = 120;

// In-memory report store retained as a fast cache layer.
// Reports are also persisted to Firestore for durability.
const reportStore = new Map<string, IntelligenceReport>();
const MAX_REPORTS = 50;

function storeReport(report: IntelligenceReport) {
  // In-memory cache (fast retrieval for same-instance requests)
  if (reportStore.size >= MAX_REPORTS) {
    const oldest = reportStore.keys().next().value;
    if (oldest !== undefined) {
      reportStore.delete(oldest);
    }
  }
  reportStore.set(report.id, report);
}

/**
 * Persist report to Firestore for cross-instance durability.
 * Non-blocking — errors are logged but don't fail the pipeline.
 */
async function persistReportToFirestore(
  report: IntelligenceReport,
  userId?: string
): Promise<void> {
  try {
    const db = getAdminDb();
    await db.collection("intelligenceReports").doc(report.id).set({
      ...report,
      userId: userId ?? "anonymous",
    });
  } catch (error) {
    console.error("[Intelligence] Firestore persistence failed:", error);
  }
}

export { reportStore };

export async function POST(request: NextRequest) {
  let availableCapital = 3500;

  // Extract user ID from auth header if present (non-blocking)
  let userId: string | undefined;
  try {
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      // Lazy import to avoid circular dependency issues
      const { verifyAuthToken } = await import("@/lib/firebase/auth-admin");
      const auth = await verifyAuthToken(request);
      userId = auth.uid;
    }
  } catch {
    // Auth is optional for this endpoint during transition period
  }

  try {
    const body = await request.json();
    if (typeof body.availableCapital === "number") {
      availableCapital = body.availableCapital;
    }
  } catch {
    // Use default capital
  }

  // Validate
  if (availableCapital < 2000 || availableCapital > 5000) {
    return new Response(
      JSON.stringify({ error: "availableCapital must be between 2000 and 5000" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (data: IntelligenceSSEEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const reportId = crypto.randomUUID();
        emit({ type: "start", reportId, totalStages: 9 });

        const report = await runIntelligencePipeline(
          { availableCapital },
          (event) => emit(event),
        );

        // Override the ID to match what we sent in the start event
        report.id = reportId;

        // Store in-memory (fast cache) and persist to Firestore (durable)
        storeReport(report);
        await persistReportToFirestore(report, userId);

        // Increment user's report counter
        if (userId) {
          try {
            const db = getAdminDb();
            const userRef = db.collection("users").doc(userId);
            const userDoc = await userRef.get();
            if (userDoc.exists) {
              await userRef.update({
                intelligenceReportsRun: (userDoc.data()?.intelligenceReportsRun ?? 0) + 1,
              });
            }
          } catch {
            // Non-critical
          }
        }

        emit({ type: "complete", report });
      } catch (error) {
        const message = error instanceof Error ? error.message : "An unexpected error occurred";
        emit({ type: "error", message });
        console.error("[Intelligence] Pipeline error:", error);
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
