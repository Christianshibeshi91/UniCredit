import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken, AuthError } from "@/lib/firebase/auth-admin";
import { getAllSyncStatuses } from "@/lib/services/syncStatus";
import { isSellerConfigured, getSellerConfig } from "@/lib/spapi/sellerConfig";
import { spapiClient } from "@/lib/spapi/client";
import { getMockLiveDataStatus } from "@/lib/mock-spapi";
import type { LiveDataStatus } from "@/lib/types/liveData";

export const dynamic = "force-dynamic";

/**
 * GET /api/live-data/status
 * Returns live data integration status.
 * Uses real Firestore-tracked sync statuses when SP-API is enabled,
 * falls back to mock status otherwise.
 */
export async function GET(request: NextRequest) {
  try {
    await verifyAuthToken(request);

    const enabled = spapiClient.isEnabled();
    const sellerConfigured = isSellerConfigured();

    // If SP-API is not enabled, return mock status for UI compatibility
    if (!enabled) {
      const mockStatus = getMockLiveDataStatus();
      return NextResponse.json({
        ...mockStatus,
        sellerId: null,
        marketplaceId: null,
        sellerConfigured: false,
      });
    }

    let sellerId: string | null = null;
    let marketplaceId: string | null = null;
    if (sellerConfigured) {
      const config = getSellerConfig();
      sellerId = config.sellerId;
      marketplaceId = config.marketplaceId;
    }

    // Get real sync statuses from Firestore
    const syncs = await getAllSyncStatuses();

    // Determine API health from sync statuses
    const recentErrors = syncs.filter((s) => s.status === "error").length;
    const apiHealth: LiveDataStatus["apiHealth"] =
      recentErrors === 0 ? "healthy" :
      recentErrors < 3 ? "degraded" : "down";

    // Last full sync is the oldest successful sync time
    const successfulSyncs = syncs
      .filter((s) => s.lastSyncAt)
      .map((s) => s.lastSyncAt!);
    const lastFullSync = successfulSyncs.length > 0
      ? successfulSyncs.sort()[0]
      : null;

    const status: LiveDataStatus = {
      enabled,
      syncs,
      lastFullSync,
      apiHealth,
    };

    return NextResponse.json({
      ...status,
      sellerId,
      marketplaceId,
      sellerConfigured,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("[API /live-data/status] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch live data status" },
      { status: 500 }
    );
  }
}
