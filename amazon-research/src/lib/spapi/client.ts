import type { SPAPICatalogItem, SPAPIPricing, SPAPIReviewData, SPAPIBSRData, SPAPIInventoryData, SPAPIFeeEstimate, LiveDataEnvelope } from "@/lib/types/spapi";
import { tokenManager } from "./tokenManager";
import { rateLimiter } from "./rateLimiter";
import { spapiCache } from "./cache";
import { getSPAPIBaseUrl, getSellerConfig } from "./sellerConfig";

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
  const baseUrl = getSPAPIBaseUrl();

  const response = await fetch(`${baseUrl}${endpoint}`, {
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
    const { marketplaceId } = getSellerConfig();
    return makeRequest<SPAPICatalogItem>(
      `/catalog/2022-04-01/items/${encodeURIComponent(asin)}?marketplaceIds=${marketplaceId}`,
      "catalog",
      `catalog:${asin}`,
      86400,
    );
  },

  async getPricing(asin: string): Promise<LiveDataEnvelope<SPAPIPricing>> {
    const { marketplaceId } = getSellerConfig();
    return makeRequest<SPAPIPricing>(
      `/products/pricing/v0/price?MarketplaceId=${marketplaceId}&Asins=${encodeURIComponent(asin)}`,
      "pricing",
      `pricing:${asin}`,
      3600,
    );
  },

  async getReviews(asin: string): Promise<LiveDataEnvelope<SPAPIReviewData>> {
    const { marketplaceId } = getSellerConfig();
    return makeRequest<SPAPIReviewData>(
      `/products/reviews/v0/${encodeURIComponent(asin)}?MarketplaceId=${marketplaceId}`,
      "reviews",
      `reviews:${asin}`,
      21600,
    );
  },

  async getBSR(asin: string): Promise<LiveDataEnvelope<SPAPIBSRData>> {
    const { marketplaceId } = getSellerConfig();
    return makeRequest<SPAPIBSRData>(
      `/sales/v1/orderMetrics?marketplaceIds=${marketplaceId}&asin=${encodeURIComponent(asin)}`,
      "bsr",
      `bsr:${asin}`,
      1800,
    );
  },

  async getInventory(asin: string): Promise<LiveDataEnvelope<SPAPIInventoryData>> {
    const { marketplaceId } = getSellerConfig();
    return makeRequest<SPAPIInventoryData>(
      `/fba/inventory/v1/summaries?marketplaceIds=${marketplaceId}&sellerSkus=${encodeURIComponent(asin)}`,
      "inventory",
      `inventory:${asin}`,
      3600,
    );
  },

  async getFees(asin: string): Promise<LiveDataEnvelope<SPAPIFeeEstimate>> {
    return makeRequest<SPAPIFeeEstimate>(
      `/products/fees/v0/items/${encodeURIComponent(asin)}/feesEstimate`,
      "fees",
      `fees:${asin}`,
      7200,
    );
  },

  /**
   * Search catalog items by seller ID via official SP-API Catalog Items API.
   * Used to discover the seller's product inventory.
   */
  async searchSellerCatalog(
    pageToken?: string
  ): Promise<LiveDataEnvelope<{ items: SPAPICatalogItem[]; nextPageToken?: string }>> {
    const { marketplaceId, sellerId } = getSellerConfig();
    const params = new URLSearchParams({
      marketplaceIds: marketplaceId,
      sellerId,
      includedData: "summaries,identifiers",
      pageSize: "20",
    });
    if (pageToken) params.set("pageToken", pageToken);

    return makeRequest(
      `/catalog/2022-04-01/items?${params.toString()}`,
      "catalog",
      `catalog-search:${sellerId}:${pageToken ?? "first"}`,
      3600,
    );
  },
};
