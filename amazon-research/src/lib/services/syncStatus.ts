/**
 * Sync Status Service.
 * Persists sync job status in Firestore for dashboard visibility.
 */

import { getAdminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import type { SyncType, SyncStatus, SyncStatusState } from "@/lib/types/spapi";

const COLLECTION = "syncStatus";

/**
 * Record the start of a sync job.
 */
export async function markSyncStarted(type: SyncType): Promise<void> {
  const db = getAdminDb();
  await db
    .collection(COLLECTION)
    .doc(type)
    .set(
      {
        type,
        status: "syncing" as SyncStatusState,
        lastSyncStartedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );
}

/**
 * Record successful completion of a sync job.
 */
export async function markSyncCompleted(
  type: SyncType,
  itemCount: number
): Promise<void> {
  const db = getAdminDb();
  const now = Timestamp.now();

  // Calculate next sync time based on type
  const intervalMs = getSyncIntervalMs(type);
  const nextSync = new Date(Date.now() + intervalMs);

  await db
    .collection(COLLECTION)
    .doc(type)
    .set(
      {
        type,
        status: "success" as SyncStatusState,
        lastSyncAt: now,
        nextSyncAt: Timestamp.fromDate(nextSync),
        itemCount,
        errors: [],
        updatedAt: now,
      },
      { merge: true }
    );
}

/**
 * Record a failed sync job.
 */
export async function markSyncFailed(
  type: SyncType,
  errors: string[]
): Promise<void> {
  const db = getAdminDb();
  await db
    .collection(COLLECTION)
    .doc(type)
    .set(
      {
        type,
        status: "error" as SyncStatusState,
        errors: errors.slice(0, 50), // Cap stored errors
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );
}

/**
 * Get the current sync status for all sync types.
 */
export async function getAllSyncStatuses(): Promise<SyncStatus[]> {
  const db = getAdminDb();
  const snapshot = await db.collection(COLLECTION).get();

  const allTypes: SyncType[] = [
    "catalog",
    "pricing",
    "reviews",
    "bsr",
    "fees",
    "inventory",
  ];

  const stored = new Map(
    snapshot.docs.map((doc) => [doc.id, doc.data()])
  );

  return allTypes.map((type) => {
    const data = stored.get(type);
    if (!data) {
      return {
        type,
        lastSyncAt: null,
        nextSyncAt: null,
        status: "idle" as SyncStatusState,
        itemCount: 0,
        errors: [],
      };
    }

    return {
      type,
      lastSyncAt: data.lastSyncAt?.toDate?.()?.toISOString?.() ?? null,
      nextSyncAt: data.nextSyncAt?.toDate?.()?.toISOString?.() ?? null,
      status: (data.status as SyncStatusState) ?? "idle",
      itemCount: (data.itemCount as number) ?? 0,
      errors: (data.errors as string[]) ?? [],
    };
  });
}

/**
 * Get sync interval in ms for each data type.
 * Matches the vercel.json cron schedule spacing.
 */
function getSyncIntervalMs(type: SyncType): number {
  switch (type) {
    case "bsr":
      return 30 * 60 * 1000; // 30 minutes
    case "pricing":
      return 60 * 60 * 1000; // 1 hour
    case "inventory":
      return 60 * 60 * 1000; // 1 hour
    case "fees":
      return 2 * 60 * 60 * 1000; // 2 hours
    case "reviews":
      return 6 * 60 * 60 * 1000; // 6 hours
    case "catalog":
      return 24 * 60 * 60 * 1000; // 24 hours
    default:
      return 60 * 60 * 1000;
  }
}
