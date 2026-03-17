"use client";

import { useState, useCallback, useRef } from "react";
import type {
  URLAnalysisReport,
  URLAnalysisSSEEvent,
  URLAnalysisStage,
  ComparisonReport,
} from "@/lib/types/urlAnalysis";

interface StageState {
  stage: URLAnalysisStage;
  index: number;
  status: "pending" | "running" | "complete" | "error";
  message: string;
}

const STAGE_DEFAULTS: StageState[] = [
  { stage: "url_detection", index: 0, status: "pending", message: "Detecting URL source" },
  { stage: "normalization", index: 1, status: "pending", message: "Normalizing product data" },
  { stage: "grading", index: 2, status: "pending", message: "Grading product (5 dimensions)" },
  { stage: "review_mining", index: 3, status: "pending", message: "Mining review insights" },
  { stage: "fake_review_detection", index: 4, status: "pending", message: "Detecting fake reviews" },
  { stage: "image_grading", index: 5, status: "pending", message: "Grading product images" },
  { stage: "qa_extraction", index: 6, status: "pending", message: "Extracting Q&A insights" },
  { stage: "price_history", index: 7, status: "pending", message: "Analyzing price history" },
  { stage: "supplier_match", index: 8, status: "pending", message: "Matching suppliers" },
  { stage: "listing_rewrite", index: 9, status: "pending", message: "Rewriting listing copy" },
  { stage: "competitor_gap", index: 10, status: "pending", message: "Analyzing competitor gaps" },
  { stage: "ppc_keywords", index: 11, status: "pending", message: "Generating PPC keywords" },
  { stage: "pricing_strategy", index: 12, status: "pending", message: "Building pricing strategy" },
  { stage: "repeat_purchase", index: 13, status: "pending", message: "Scoring repeat purchase" },
  { stage: "action_plan", index: 14, status: "pending", message: "Synthesizing action plan" },
];

export function useURLAnalysis() {
  const [isRunning, setIsRunning] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [stages, setStages] = useState<StageState[]>(STAGE_DEFAULTS);
  const [currentStage, setCurrentStage] = useState<number>(-1);
  const [report, setReport] = useState<URLAnalysisReport | null>(null);
  const [comparison, setComparison] = useState<ComparisonReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const processSSEStream = useCallback(async (response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response stream");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const dataLine = line.trim();
        if (!dataLine.startsWith("data: ")) continue;

        const event = JSON.parse(dataLine.slice(6));

        if (event.type === "start") {
          setReportId(event.reportId);
        } else if (event.type === "stage") {
          setCurrentStage(event.index);
          setStages((prev) =>
            prev.map((s) =>
              s.index === event.index
                ? { ...s, status: event.status, message: event.message }
                : s
            )
          );
        } else if (event.type === "complete") {
          setReport(event.report as URLAnalysisReport);
        } else if (event.type === "comparison_complete") {
          setComparison(event.comparison as ComparisonReport);
        } else if (event.type === "error") {
          setError(event.message);
        }
      }
    }
  }, []);

  const startAnalysis = useCallback(async (url: string) => {
    setIsRunning(true);
    setReport(null);
    setComparison(null);
    setError(null);
    setCurrentStage(-1);
    setStages(STAGE_DEFAULTS.map((s) => ({ ...s, status: "pending" })));

    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/url-analysis/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Analysis request failed");
      }

      await processSSEStream(response);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Analysis cancelled");
      } else {
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
      }
    } finally {
      setIsRunning(false);
      abortRef.current = null;
    }
  }, [processSSEStream]);

  const startComparison = useCallback(async (urls: string[]) => {
    setIsRunning(true);
    setReport(null);
    setComparison(null);
    setError(null);
    setCurrentStage(-1);
    setStages(STAGE_DEFAULTS.map((s) => ({ ...s, status: "pending" })));

    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/url-analysis/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Comparison request failed");
      }

      await processSSEStream(response);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Comparison cancelled");
      } else {
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
      }
    } finally {
      setIsRunning(false);
      abortRef.current = null;
    }
  }, [processSSEStream]);

  const fetchReport = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/url-analysis/report/${encodeURIComponent(id)}`);
      if (!response.ok) throw new Error("Report not found");
      const data = await response.json();
      setReport(data);
      setReportId(id);
      return data as URLAnalysisReport;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch report");
      return null;
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    isRunning,
    reportId,
    stages,
    currentStage,
    report,
    comparison,
    error,
    startAnalysis,
    startComparison,
    fetchReport,
    cancel,
  };
}
