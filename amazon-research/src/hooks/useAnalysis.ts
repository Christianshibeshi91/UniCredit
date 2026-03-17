"use client";

import { useState, useCallback, useRef } from "react";
import type { AnalysisResult } from "@/lib/types";
import { getIdToken } from "@/lib/firebase/auth";

interface UseAnalysisReturn {
  analyze: (productId: string, forceReanalyze?: boolean) => void;
  isAnalyzing: boolean;
  progress: string;
  result: AnalysisResult | null;
  score: Record<string, unknown> | null;
  error: string | null;
  reset: () => void;
}

export function useAnalysis(): UseAnalysisReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [score, setScore] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const analyze = useCallback(
    async (productId: string, forceReanalyze = false) => {
      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsAnalyzing(true);
      setProgress("Starting analysis...");
      setResult(null);
      setScore(null);
      setError(null);

      try {
        // Include auth token if available (non-blocking)
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        try {
          const token = await getIdToken();
          if (token) headers["Authorization"] = `Bearer ${token}`;
        } catch {
          // Auth not available — continue without token
        }

        const response = await fetch("/api/analyze", {
          method: "POST",
          headers,
          body: JSON.stringify({ productId, forceReanalyze }),
          signal: controller.signal,
        });

        // If response is JSON (cached analysis), handle directly
        const contentType = response.headers.get("Content-Type") ?? "";
        if (contentType.includes("application/json")) {
          const data = await response.json();
          if (data.error) {
            setError(data.error);
          } else if (data.analysis) {
            setResult(data.analysis as AnalysisResult);
            setProgress("Analysis loaded from cache.");
          }
          setIsAnalyzing(false);
          return;
        }

        // SSE stream
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6);

            try {
              const event = JSON.parse(jsonStr) as Record<string, unknown>;

              switch (event.type) {
                case "start":
                  setProgress(
                    `Analyzing ${event.reviewCount} reviews...`
                  );
                  break;
                case "progress":
                  if (event.tokens) {
                    setProgress(
                      `Processing... (${event.tokens} tokens generated)`
                    );
                  }
                  break;
                case "analysis":
                  setResult(event.data as AnalysisResult);
                  setProgress("Calculating opportunity score...");
                  break;
                case "score":
                  setScore(event.data as Record<string, unknown>);
                  setProgress("Analysis complete!");
                  break;
                case "done":
                  setProgress("Done!");
                  break;
                case "error":
                  setError(event.message as string);
                  break;
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return; // User-initiated cancel
        }
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsAnalyzing(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setIsAnalyzing(false);
    setProgress("");
    setResult(null);
    setScore(null);
    setError(null);
  }, []);

  return { analyze, isAnalyzing, progress, result, score, error, reset };
}
