"use client";

import { useState, useCallback, useRef } from "react";
import type {
  IntelligenceReport,
  IntelligenceSSEEvent,
  PipelineStage,
} from "@/lib/types/intelligence";
import { getIdToken } from "@/lib/firebase/auth";

interface StageState {
  stage: PipelineStage;
  index: number;
  status: "pending" | "running" | "complete" | "error";
  message: string;
}

const STAGE_DEFAULTS: StageState[] = [
  { stage: "context_aggregation", index: 0, status: "pending", message: "Aggregating product data and market context" },
  { stage: "beginner_filter", index: 1, status: "pending", message: "Applying beginner seller filters" },
  { stage: "market_synthesis", index: 2, status: "pending", message: "Synthesizing market opportunities" },
  { stage: "product_definition", index: 3, status: "pending", message: "Defining optimal product specification" },
  { stage: "financial_viability_check", index: 4, status: "pending", message: "Modeling financial viability" },
  { stage: "ninety_day_feasibility_check", index: 5, status: "pending", message: "Building 90-day launch playbook" },
  { stage: "risk_analysis", index: 6, status: "pending", message: "Analyzing risks with beginner multipliers" },
  { stage: "confidence_scoring", index: 7, status: "pending", message: "Scoring success probability" },
  { stage: "final_synthesis", index: 8, status: "pending", message: "Running final consistency check" },
];

export function useIntelligence() {
  const [isRunning, setIsRunning] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [stages, setStages] = useState<StageState[]>(STAGE_DEFAULTS);
  const [currentStage, setCurrentStage] = useState<number>(-1);
  const [report, setReport] = useState<IntelligenceReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startPipeline = useCallback(async (availableCapital: number) => {
    // Reset state
    setIsRunning(true);
    setReport(null);
    setError(null);
    setCurrentStage(-1);
    setStages(STAGE_DEFAULTS.map((s) => ({ ...s, status: "pending" })));

    abortRef.current = new AbortController();

    try {
      // Include auth token if available
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      try {
        const token = await getIdToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
      } catch {
        // Auth not available — continue without token
      }

      const response = await fetch("/api/intelligence/run", {
        method: "POST",
        headers,
        body: JSON.stringify({ availableCapital }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Pipeline request failed");
      }

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

          const event: IntelligenceSSEEvent = JSON.parse(dataLine.slice(6));

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
            setReport(event.report);
          } else if (event.type === "error") {
            setError(event.message);
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Pipeline cancelled");
      } else {
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
      }
    } finally {
      setIsRunning(false);
      abortRef.current = null;
    }
  }, []);

  const fetchReport = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/intelligence/report/${encodeURIComponent(id)}`);
      if (!response.ok) {
        throw new Error("Report not found");
      }
      const data = await response.json();
      setReport(data);
      setReportId(id);
      return data as IntelligenceReport;
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
    error,
    startPipeline,
    fetchReport,
    cancel,
  };
}
