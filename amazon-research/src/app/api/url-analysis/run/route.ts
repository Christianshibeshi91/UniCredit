import { NextRequest } from "next/server";
import { runURLAnalysisPipeline } from "@/lib/analysis/urlAnalysisEngine";
import type { URLAnalysisReport, URLAnalysisSSEEvent } from "@/lib/types/urlAnalysis";

// In-memory report store (max 20, LRU eviction)
const analysisStore = new Map<string, URLAnalysisReport>();
const MAX_STORE_SIZE = 20;

function storeReport(report: URLAnalysisReport) {
  if (analysisStore.size >= MAX_STORE_SIZE) {
    const oldest = analysisStore.keys().next().value;
    if (oldest !== undefined) analysisStore.delete(oldest);
  }
  analysisStore.set(report.id, report);
}

export { analysisStore };

export async function POST(request: NextRequest) {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { url } = body;

  if (!url || typeof url !== "string") {
    return Response.json({ error: "URL is required" }, { status: 400 });
  }

  // Validate URL format — reject non-HTTP(S)
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return Response.json({ error: "Only HTTP(S) URLs are supported" }, { status: 400 });
    }
  } catch {
    return Response.json({ error: "Invalid URL format" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: URLAnalysisSSEEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        const report = await runURLAnalysisPipeline(url, emit);
        storeReport(report);
        emit({ type: "complete", report });
      } catch (err) {
        emit({
          type: "error",
          message: err instanceof Error ? err.message : "Analysis pipeline failed",
        });
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
