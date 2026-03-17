"use client";

import { useState, useEffect, useCallback } from "react";
import type { LiveDataStatus } from "@/lib/types/liveData";
import type { EnrichedProduct } from "@/lib/types/liveData";
import type { DataFreshness } from "@/lib/types/liveData";

export function useLiveData() {
  const [status, setStatus] = useState<LiveDataStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/live-data/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // Silently fail — status widget will show stale data
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    // Poll every 60s when tab is focused
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchStatus();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchStatus]);

  return {
    status,
    isEnabled: status?.enabled ?? false,
    isLoading,
    refetch: fetchStatus,
  };
}

export function useLiveProduct(asin: string) {
  const [product, setProduct] = useState<EnrichedProduct | null>(null);
  const [freshness, setFreshness] = useState<DataFreshness[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchProduct() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/live-data/product/${encodeURIComponent(asin)}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setProduct(data);

          // Calculate freshness for each live field
          const now = Date.now();
          const synced = data.lastSynced ? new Date(data.lastSynced).getTime() : 0;
          const ageSec = synced ? Math.round((now - synced) / 1000) : Infinity;
          const status = data.dataSource === "mock" ? "mock" as const
            : ageSec < 3600 ? "fresh" as const
            : ageSec < 21600 ? "stale" as const
            : "expired" as const;

          setFreshness([
            { field: "price", age: ageSec, status },
            { field: "bsr", age: ageSec, status },
            { field: "reviews", age: ageSec, status },
          ]);
        }
      } catch {
        // Keep existing data
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchProduct();
    return () => { cancelled = true; };
  }, [asin]);

  return { product, freshness, isLoading };
}
