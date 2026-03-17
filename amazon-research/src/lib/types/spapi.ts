// ── SP-API Types ─────────────────────────────────────────────────

export interface SPAPIConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  marketplaceId: string;
  sellerId: string;
}

export interface SPAPIToken {
  accessToken: string;
  expiresAt: number;
  tokenType: string;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  burstLimit: number;
}

export type SyncType = "catalog" | "pricing" | "reviews" | "bsr" | "inventory" | "fees";

export type SyncStatusState = "idle" | "syncing" | "success" | "error";

export interface SPAPICatalogItem {
  asin: string;
  title: string;
  brand: string;
  category: string;
  images: string[];
  bulletPoints: string[];
  dimensions: { length: number; width: number; height: number; weight: number } | null;
}

export interface SPAPIPricing {
  asin: string;
  buyBoxPrice: number | null;
  lowestPrice: number | null;
  competitorCount: number;
  fbaFees: number;
  referralFee: number;
}

export interface SPAPIReviewData {
  asin: string;
  rating: number;
  reviewCount: number;
  recentReviews: { title: string; rating: number; date: string; body: string }[];
  ratingBreakdown: Record<string, number>;
}

export interface SPAPIBSRData {
  asin: string;
  bsr: number | null;
  categoryRank: number | null;
  subcategoryRanks: { subcategory: string; rank: number }[];
  bsrHistory: { date: string; bsr: number }[];
}

export interface SPAPIInventoryData {
  asin: string;
  fulfillableQuantity: number;
  inboundQuantity: number;
  reservedQuantity: number;
}

export interface SPAPIFeeEstimate {
  asin: string;
  referralFee: number;
  fbaFee: number;
  storageFee: number;
  totalFees: number;
}

export interface SyncStatus {
  type: SyncType;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  status: SyncStatusState;
  itemCount: number;
  errors: string[];
}

export interface SyncResult {
  type: SyncType;
  synced: number;
  errors: string[];
}

export interface LiveDataEnvelope<T = unknown> {
  source: "live" | "mock" | "cached";
  data: T;
  fetchedAt: string;
  ttlSeconds: number;
}
