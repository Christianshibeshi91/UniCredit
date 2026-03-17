import type { Product } from "./product";
import type { SyncStatus } from "./spapi";

export interface EnrichedProduct extends Product {
  livePrice?: number;
  liveBSR?: number | null;
  liveReviewCount?: number;
  liveRating?: number;
  competitorCount?: number;
  fbaFees?: number;
  lastSynced?: string;
  dataSource?: "live" | "mock" | "cached";
}

export interface LiveDataStatus {
  enabled: boolean;
  syncs: SyncStatus[];
  lastFullSync: string | null;
  apiHealth: "healthy" | "degraded" | "down";
}

export interface DataFreshness {
  field: string;
  age: number; // seconds since last update
  status: "fresh" | "stale" | "expired" | "mock";
}
