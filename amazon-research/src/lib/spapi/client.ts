import type { SPAPICatalogItem, SPAPIPricing, SPAPIReviewData, SPAPIBSRData, SPAPIInventoryData, SPAPIFeeEstimate, LiveDataEnvelope } from "@/lib/types/spapi";
import { tokenManager } from "./tokenManager";
import { rateLimiter } from "./rateLimiter";
import { spapiCache } from "./cache";

const SP_API_BASE = "https://sellingpartnerapi-na.amazon.com";

function isEnabled(): boolean {
  return process.env.AMAZON_SP_API_ENABLED === "true";
}

async function makeRequest<T>(
  endpoint: string,
  rateLimitKey: string,
  cacheKey: string,
  cacheTtl: number,
): Promise<LiveDataEnvelope<T>> {
  // Check cache first
  const cached = spapiCache.get<LiveDataEnvelope<T>>(cacheKey);
  if (cached) return cached;

  // Rate limit check
  await rateLimiter.waitForSlot(rateLimitKey);

  // Get fresh token
  const token = await tokenManager.getAccessToken();

  const response = await fetch(`${SP_API_BASE}${endpoint}`, {
    headers: {
      "x-amz-access-token": token,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 429) {
    throw new Error(`SP-API rate limited on ${endpoint}`);
  }

  if (response.status === 403) {
    await tokenManager.refreshToken();
    throw new Error("SP-API token expired, refreshing");
  }

  if (!response.ok) {
    throw new Error(`SP-API error ${response.status}: ${await response.text()}`);
  }

  const data = await response.json() as T;
  const envelope: LiveDataEnvelope<T> = {
    source: "live",
    data,
    fetchedAt: new Date().toISOString(),
    ttlSeconds: cacheTtl,
  };

  spapiCache.set(cacheKey, envelope, cacheTtl);
  return envelope;
}

export const spapiClient = {
  isEnabled,

  async getCatalogItem(asin: string): Promise<LiveDataEnvelope<SPAPICatalogItem>> {
    return makeRequest<SPAPICatalogItem>(
      `/catalog/2022-04-01/items/${asin}?marketplaceIds=ATVPDKIKX0DER`,
      "catalog",
      `catalog:${asin}`,
      86400,
    );
  },

  async getPricing(asin: string): Promise<LiveDataEnvelope<SPAPIPricing>> {
    return makeRequest<SPAPIPricing>(
      `/products/pricing/v0/price?MarketplaceId=ATVPDKIKX0DER&Asins=${asin}`,
      "pricing",
      `pricing:${asin}`,
      3600,
    );
  },

  async getReviews(asin: string): Promise<LiveDataEnvelope<SPAPIReviewData>> {
    return makeRequest<SPAPIReviewData>(
      `/products/reviews/v0/${asin}?MarketplaceId=ATVPDKIKX0DER`,
      "reviews",
      `reviews:${asin}`,
      21600,
    );
  },

  async getBSR(asin: string): Promise<LiveDataEnvelope<SPAPIBSRData>> {
    return makeRequest<SPAPIBSRData>(
      `/sales/v1/orderMetrics?marketplaceIds=ATVPDKIKX0DER&asin=${asin}`,
      "bsr",
      `bsr:${asin}`,
      1800,
    );
  },

  async getInventory(asin: string): Promise<LiveDataEnvelope<SPAPIInventoryData>> {
    return makeRequest<SPAPIInventoryData>(
      `/fba/inventory/v1/summaries?marketplaceIds=ATVPDKIKX0DER&sellerSkus=${asin}`,
      "inventory",
      `inventory:${asin}`,
      3600,
    );
  },

  async getFees(asin: string): Promise<LiveDataEnvelope<SPAPIFeeEstimate>> {
    return makeRequest<SPAPIFeeEstimate>(
      `/products/fees/v0/items/${asin}/feesEstimate`,
      "fees",
      `fees:${asin}`,
      7200,
    );
  },
};
