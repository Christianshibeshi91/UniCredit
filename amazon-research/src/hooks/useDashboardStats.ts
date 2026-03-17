"use client";

import { useState, useEffect, useCallback } from "react";

export interface DashboardStats {
  totalProducts: number;
  analyzedProducts: number;
  avgScore: number;
  totalRevenue: number;
  totalReviews: number;
  avgRating: number;
  avgPrice: number;
  sProducts: number;
  aProducts: number;
  bProducts: number;
  tierCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  trendScores: number[];
  trendMonths: string[];
}

interface UseDashboardStatsReturn {
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useDashboardStats(): UseDashboardStatsReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/dashboard/stats");
      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }
      const data: DashboardStats = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch dashboard stats");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, error, refresh: fetchStats };
}
