import type { URLAnalysisReport } from "@/lib/types/urlAnalysis";

/**
 * In-memory URL analysis report store (max 20, LRU eviction).
 * Shared between the run route (writes) and the report route (reads).
 */
const analysisStore = new Map<string, URLAnalysisReport>();
const MAX_STORE_SIZE = 20;

export function storeAnalysisReport(report: URLAnalysisReport): void {
  if (analysisStore.size >= MAX_STORE_SIZE) {
    const oldest = analysisStore.keys().next().value;
    if (oldest !== undefined) analysisStore.delete(oldest);
  }
  analysisStore.set(report.id, report);
}

export function getAnalysisReport(id: string): URLAnalysisReport | undefined {
  return analysisStore.get(id);
}

export { analysisStore };
