import { NextRequest } from "next/server";
import { runURLAnalysisPipeline } from "@/lib/analysis/urlAnalysisEngine";
import { storeAnalysisReport } from "@/lib/stores/analysisStore";
import type { URLAnalysisSSEEvent } from "@/lib/types/urlAnalysis";

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

  // Validate URL format — reject non-HTTP(S) and block SSRF targets
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return Response.json({ error: "Only HTTP(S) URLs are supported" }, { status: 400 });
    }

    // Block SSRF: private/internal IPs, localhost, and cloud metadata endpoints
    const hostname = parsed.hostname.toLowerCase();
    const BLOCKED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]", "169.254.169.254"];
    if (BLOCKED_HOSTS.includes(hostname)) {
      return Response.json({ error: "Internal/private URLs are not allowed" }, { status: 400 });
    }

    // Block private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
    const ipMatch = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipMatch) {
      const [, a, b] = ipMatch.map(Number);
      if (
        a === 10 ||
        a === 127 ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 169 && b === 254) ||
        a === 0
      ) {
        return Response.json({ error: "Internal/private URLs are not allowed" }, { status: 400 });
      }
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
        storeAnalysisReport(report);
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
