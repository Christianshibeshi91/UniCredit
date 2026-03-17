"use client";

import { useState, useEffect, useCallback } from "react";
import type { TableProduct } from "@/components/dashboard/OpportunityTable";

interface UseProductsParams {
  category?: string | null;
  tier?: string | null;
  minScore?: number | null;
  maxScore?: number | null;
  minReviews?: number | null;
}

interface UseProductsReturn {
  products: TableProduct[];
  isLoading: boolean;
  error: string | null;
  loadMore: () => void;
  hasMore: boolean;
  refresh: () => void;
}

export function useProducts(params: UseProductsParams = {}): UseProductsReturn {
  const [products, setProducts] = useState<TableProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchProducts = useCallback(
    async (append = false) => {
      setIsLoading(true);
      setError(null);

      try {
        const searchParams = new URLSearchParams();
        searchParams.set("limit", "50");

        if (params.category) searchParams.set("category", params.category);
        if (params.tier) searchParams.set("tier", params.tier);
        if (params.minScore) searchParams.set("minScore", String(params.minScore));
        if (params.maxScore) searchParams.set("maxScore", String(params.maxScore));
        if (append && cursor) searchParams.set("cursor", cursor);

        const response = await fetch(`/api/products?${searchParams.toString()}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch products: ${response.status}`);
        }

        const data = await response.json();
        const mapped: TableProduct[] = data.products.map(
          (p: Record<string, unknown>) => {
            const opp = p.opportunity as Record<string, unknown> | null;
            return {
              id: p.id as string,
              asin: (p.asin as string) ?? (p.id as string),
              title: p.title as string,
              category: p.category as string,
              price: p.price as number,
              rating: p.rating as number,
              reviewCount: p.reviewCount as number,
              bsr: p.bsr as number,
              opportunityScore: opp
                ? (opp.opportunityScore as number)
                : null,
              tier: opp ? (opp.tier as TableProduct["tier"]) : null,
              recommendation: opp
                ? (opp.recommendation as TableProduct["recommendation"])
                : null,
              analysisStatus: null,
            };
          }
        );

        // Client-side filter: minReviews
        const filtered = params.minReviews
          ? mapped.filter((p) => p.reviewCount >= (params.minReviews ?? 0))
          : mapped;

        if (append) {
          setProducts((prev) => [...prev, ...filtered]);
        } else {
          setProducts(filtered);
        }

        setCursor(data.nextCursor);
        setHasMore(data.nextCursor !== null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    },
    [params.category, params.tier, params.minScore, params.maxScore, params.minReviews, cursor]
  );

  useEffect(() => {
    setCursor(null);
    fetchProducts(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.category, params.tier, params.minScore, params.maxScore, params.minReviews]);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      fetchProducts(true);
    }
  }, [hasMore, isLoading, fetchProducts]);

  const refresh = useCallback(() => {
    setCursor(null);
    fetchProducts(false);
  }, [fetchProducts]);

  return { products, isLoading, error, loadMore, hasMore, refresh };
}
