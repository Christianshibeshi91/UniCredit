import type { SyncStatus, SyncType } from "@/lib/types/spapi";
import type { LiveDataStatus } from "@/lib/types/liveData";

const NOW = "2026-03-16T00:00:00.000Z";
const HOUR_AGO = "2026-03-15T23:00:00.000Z";
const SIX_HOURS_AGO = "2026-03-15T18:00:00.000Z";

function jitter(base: number, range: number): number {
  return +(base + (Math.random() * 2 - 1) * range).toFixed(2);
}

export function getMockLiveDataForProduct(asin: string): {
  livePrice: number;
  liveBSR: number | null;
  liveReviewCount: number;
  liveRating: number;
  lastSynced: string;
} {
  // Use asin hash for deterministic but varied mock data
  const hash = asin.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const priceBase = 15 + (hash % 30);
  return {
    livePrice: jitter(priceBase, priceBase * 0.05),
    liveBSR: hash % 3 === 0 ? null : 1000 + (hash * 137) % 50000,
    liveReviewCount: 50 + (hash * 31) % 5000,
    liveRating: +(3.5 + (hash % 15) / 10).toFixed(1),
    lastSynced: HOUR_AGO,
  };
}

export function getMockSyncStatuses(): SyncStatus[] {
  const types: SyncType[] = ["catalog", "pricing", "reviews", "bsr", "inventory", "fees"];
  return types.map((type) => ({
    type,
    lastSyncAt: type === "catalog" ? SIX_HOURS_AGO : HOUR_AGO,
    nextSyncAt: NOW,
    status: "success" as const,
    itemCount: 516,
    errors: [],
  }));
}

export function getMockLiveDataStatus(): LiveDataStatus {
  return {
    enabled: false,
    syncs: getMockSyncStatuses(),
    lastFullSync: HOUR_AGO,
    apiHealth: "healthy",
  };
}
