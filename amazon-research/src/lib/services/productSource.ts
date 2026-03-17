/**
 * Product Source Service.
 * Provides seller-specific product ASINs from Firestore for cron sync jobs.
 * Replaces hardcoded MOCK_PRODUCTS with real seller inventory.
 *
 * Products enter Firestore via:
 * 1. Manual ingestion (user adds ASIN via dashboard)
 * 2. SP-API catalog discovery (searchCatalogItems by seller)
 * 3. Reports API (GET_MERCHANT_LISTINGS_DATA)
 */

import { getAdminDb } from "@/lib/firebase/admin";
import { getSellerConfig, isSellerConfigured } from "@/lib/spapi/sellerConfig";

/**
 * Get all product ASINs owned by the configured seller from Firestore.
 * Falls back to all products if seller filtering is not applicable.
 */
export async function getSellerProductASINs(): Promise<string[]> {
  const db = getAdminDb();

  // Query products collection — filter by seller if configured
  let query = db.collection("products").select("asin");

  if (isSellerConfigured()) {
    const config = getSellerConfig();
    // Products tagged with this seller ID get priority
    // Also include products without a sellerId (legacy/manually added)
    const sellerDocs = await db
      .collection("products")
      .where("sellerId", "==", config.sellerId)
      .select("asin")
      .get();

    if (sellerDocs.size > 0) {
      return sellerDocs.docs
        .map((doc) => doc.data().asin as string)
        .filter(Boolean);
    }
  }

  // Fallback: return all products in Firestore
  const snapshot = await query.limit(1000).get();
  return snapshot.docs
    .map((doc) => doc.data().asin as string)
    .filter(Boolean);
}

/**
 * Check if we have any products in Firestore at all.
 */
export async function hasProducts(): Promise<boolean> {
  const db = getAdminDb();
  const snapshot = await db.collection("products").limit(1).get();
  return !snapshot.empty;
}
