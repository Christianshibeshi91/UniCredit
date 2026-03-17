import { NextRequest } from "next/server";
import { runComparisonPipeline } from "@/lib/analysis/urlAnalysisEngine";
import type { URLAnalysisSSEEvent } from "@/lib/types/urlAnalysis";

export async function POST(request: NextRequest) {
  let body: { urls?: string[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { urls } = body;

  if (!Array.isArray(urls) || urls.length < 2 || urls.length > 5) {
    return Response.json(
      { error: "Comparison requires 2-5 URLs" },
      { status: 400 },
    );
  }

  // Validate all URLs
  for (const url of urls) {
    if (typeof url !== "string") {
      return Response.json({ error: "All URLs must be strings" }, { status: 400 });
    }
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return Response.json({ error: `Invalid URL protocol: ${url}` }, { status: 400 });
      }
    } catch {
      return Response.json({ error: `Invalid URL format: ${url}` }, { status: 400 });
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: URLAnalysisSSEEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        const comparison = await runComparisonPipeline(urls, emit);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "comparison_complete", comparison })}\n\n`),
        );
      } catch (err) {
        emit({
          type: "error",
          message: err instanceof Error ? err.message : "Comparison pipeline failed",
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
