import type { IntelligenceReport } from "@/lib/types/intelligence";

/**
 * In-memory intelligence report store (max 50, LRU eviction).
 * Shared between the run route (writes) and the report route (reads).
 * Reports are also persisted to Firestore for durability.
 */
const reportStore = new Map<string, IntelligenceReport>();
const MAX_REPORTS = 50;

export function storeIntelligenceReport(report: IntelligenceReport): void {
  if (reportStore.size >= MAX_REPORTS) {
    const oldest = reportStore.keys().next().value;
    if (oldest !== undefined) {
      reportStore.delete(oldest);
    }
  }
  reportStore.set(report.id, report);
}

export function getIntelligenceReport(id: string): IntelligenceReport | undefined {
  return reportStore.get(id);
}

export { reportStore };
