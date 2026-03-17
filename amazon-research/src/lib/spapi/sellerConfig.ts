/**
 * Seller Configuration.
 * Manages Amazon seller identity for SP-API requests.
 *
 * Uses only official Amazon SP-API — no scraping, no Seller Central automation.
 * Fully compliant with Amazon's Acceptable Use Policy.
 */

export interface SellerConfig {
  sellerId: string;
  marketplaceId: string;
  marketplaceRegion: "na" | "eu" | "fe";
}

const MARKETPLACE_IDS: Record<string, string> = {
  US: "ATVPDKIKX0DER",
  CA: "A2EUQ1WTGCTBG2",
  MX: "A1AM78C64UM0Y8",
  UK: "A1F83G8C2ARO7P",
  DE: "A1PA6795UKMFR9",
  FR: "A13V1IB3VIYZZH",
  IT: "APJ6JRA9NG5V4",
  ES: "A1RKKUPIHCS9HS",
  JP: "A1VC38T7YXB528",
  AU: "A39IBJ37TRP1C6",
};

/**
 * Get the configured seller identity.
 * Fails secure — crashes if seller ID is missing.
 */
export function getSellerConfig(): SellerConfig {
  const sellerId = process.env.AMAZON_SELLER_ID;
  if (!sellerId) {
    throw new Error(
      "AMAZON_SELLER_ID is required. Set it in your environment variables."
    );
  }

  // Validate seller ID format (alphanumeric, typically 14 chars)
  if (!/^[A-Z0-9]{10,20}$/.test(sellerId)) {
    throw new Error(
      "Invalid AMAZON_SELLER_ID format. Must be 10-20 uppercase alphanumeric characters."
    );
  }

  const marketplaceId =
    process.env.AMAZON_MARKETPLACE_ID ?? MARKETPLACE_IDS.US;

  const region = (process.env.AMAZON_MARKETPLACE_REGION ?? "na") as
    | "na"
    | "eu"
    | "fe";

  return { sellerId, marketplaceId, marketplaceRegion: region };
}

/**
 * Get the SP-API base URL for the configured region.
 */
export function getSPAPIBaseUrl(): string {
  const config = getSellerConfig();
  switch (config.marketplaceRegion) {
    case "eu":
      return "https://sellingpartnerapi-eu.amazon.com";
    case "fe":
      return "https://sellingpartnerapi-fe.amazon.com";
    case "na":
    default:
      return "https://sellingpartnerapi-na.amazon.com";
  }
}

/**
 * Check whether seller configuration is complete.
 */
export function isSellerConfigured(): boolean {
  try {
    getSellerConfig();
    return true;
  } catch {
    return false;
  }
}
