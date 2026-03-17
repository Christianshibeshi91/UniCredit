import type { Product } from "@/lib/types/product";
import type { EnrichedProduct, LiveDataStatus } from "@/lib/types/liveData";
import type { SyncStatus, LiveDataEnvelope, SPAPIPricing, SPAPIBSRData, SPAPIReviewData } from "@/lib/types/spapi";
import { spapiCache } from "./cache";
import { getMockLiveDataStatus, getMockLiveDataForProduct } from "@/lib/mock-spapi";

function isEnabled(): boolean {
  return process.env.AMAZON_SP_API_ENABLED === "true";
}

export function enrichSingleProduct(
  product: Product,
  pricingData: LiveDataEnvelope<SPAPIPricing> | null,
  bsrData: LiveDataEnvelope<SPAPIBSRData> | null,
  reviewData: LiveDataEnvelope<SPAPIReviewData> | null,
): EnrichedProduct {
  return {
    ...product,
    livePrice: pricingData?.data.buyBoxPrice ?? undefined,
    liveBSR: bsrData?.data.bsr ?? undefined,
    liveReviewCount: reviewData?.data.reviewCount ?? undefined,
    liveRating: reviewData?.data.rating ?? undefined,
    competitorCount: pricingData?.data.competitorCount ?? undefined,
    fbaFees: pricingData?.data.fbaFees ?? undefined,
    lastSynced: pricingData?.fetchedAt ?? bsrData?.fetchedAt ?? reviewData?.fetchedAt ?? undefined,
    dataSource: pricingData?.source ?? bsrData?.source ?? reviewData?.source ?? "mock",
  };
}

export function enrichProducts(products: Product[]): EnrichedProduct[] {
  if (!isEnabled()) {
    return products.map((p) => {
      const mockData = getMockLiveDataForProduct(p.asin);
      return {
        ...p,
        livePrice: mockData.livePrice,
        liveBSR: mockData.liveBSR,
        liveReviewCount: mockData.liveReviewCount,
        liveRating: mockData.liveRating,
        lastSynced: mockData.lastSynced,
        dataSource: "mock" as const,
      };
    });
  }

  return products.map((p) => {
    const pricing = spapiCache.get<LiveDataEnvelope<SPAPIPricing>>(`pricing:${p.asin}`);
    const bsr = spapiCache.get<LiveDataEnvelope<SPAPIBSRData>>(`bsr:${p.asin}`);
    const reviews = spapiCache.get<LiveDataEnvelope<SPAPIReviewData>>(`reviews:${p.asin}`);
    return enrichSingleProduct(p, pricing, bsr, reviews);
  });
}

export function getLiveDataStatus(): LiveDataStatus {
  if (!isEnabled()) {
    return getMockLiveDataStatus();
  }

  // Real implementation would aggregate sync statuses from a persistent store
  return getMockLiveDataStatus();
}
