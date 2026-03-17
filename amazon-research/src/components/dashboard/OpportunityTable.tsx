"use client";

import { useRef, useState, useMemo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScoreBadge } from "./ScoreBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Tier, Recommendation } from "@/lib/types";

export interface TableProduct {
  id: string;
  asin: string;
  title: string;
  category: string;
  price: number;
  rating: number;
  reviewCount: number;
  bsr: number;
  opportunityScore: number | null;
  tier: Tier | null;
  recommendation: Recommendation | null;
  analysisStatus: "pending" | "processing" | "complete" | "failed" | null;
}

type SortField =
  | "title"
  | "category"
  | "price"
  | "rating"
  | "reviewCount"
  | "bsr"
  | "opportunityScore";

type SortDir = "asc" | "desc";

interface OpportunityTableProps {
  products: TableProduct[];
  isLoading?: boolean;
}

const columns: { key: SortField; label: string; width: string }[] = [
  { key: "title", label: "Product", width: "flex-[2]" },
  { key: "category", label: "Category", width: "w-36" },
  { key: "price", label: "Price", width: "w-20" },
  { key: "rating", label: "Rating", width: "w-20" },
  { key: "reviewCount", label: "Reviews", width: "w-24" },
  { key: "bsr", label: "BSR", width: "w-24" },
  { key: "opportunityScore", label: "Score", width: "w-28" },
];

export function OpportunityTable({ products, isLoading }: OpportunityTableProps) {
  const router = useRouter();
  const parentRef = useRef<HTMLDivElement>(null);
  const [sortField, setSortField] = useState<SortField>("opportunityScore");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("desc");
      }
    },
    [sortField]
  );

  const sorted = useMemo(() => {
    return [...products].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      const aNum = aVal as number;
      const bNum = bVal as number;
      return sortDir === "asc" ? aNum - bNum : bNum - aNum;
    });
  }, [products, sortField, sortDir]);

  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 10,
  });

  if (isLoading) {
    return (
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-8 text-center text-zinc-500">
          <div className="animate-pulse">Loading products...</div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-8 text-center text-zinc-500">
          No products found. Adjust your filters or seed the database.
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center border-b border-zinc-800/50 bg-zinc-900/50">
        {columns.map((col) => (
          <button
            key={col.key}
            onClick={() => handleSort(col.key)}
            className={cn(
              "flex items-center gap-1 px-4 py-3 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors",
              col.width
            )}
          >
            {col.label}
            {sortField === col.key ? (
              sortDir === "asc" ? (
                <ChevronUp className="h-3 w-3 text-indigo-400" />
              ) : (
                <ChevronDown className="h-3 w-3 text-indigo-400" />
              )
            ) : (
              <ArrowUpDown className="h-3 w-3 opacity-30" />
            )}
          </button>
        ))}
        <div className="w-24 px-4 py-3 text-xs font-medium text-zinc-400">
          Status
        </div>
      </div>

      {/* Virtualized rows */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ maxHeight: "calc(100vh - 320px)" }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const product = sorted[virtualRow.index];
            return (
              <div
                key={product.id}
                onClick={() => router.push(`/dashboard/product/${product.asin}`)}
                className="absolute top-0 left-0 w-full flex items-center border-b border-zinc-800/30 hover:bg-zinc-800/30 cursor-pointer transition-colors"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {/* Product */}
                <div className="flex-[2] px-4 truncate">
                  <span className="text-sm text-zinc-200">{product.title}</span>
                </div>
                {/* Category */}
                <div className="w-36 px-4">
                  <span className="text-xs text-zinc-400">{product.category}</span>
                </div>
                {/* Price */}
                <div className="w-20 px-4 text-sm text-zinc-300 font-mono">
                  ${product.price.toFixed(2)}
                </div>
                {/* Rating */}
                <div className="w-20 px-4 text-sm text-zinc-300">
                  {product.rating.toFixed(1)}
                </div>
                {/* Reviews */}
                <div className="w-24 px-4 text-sm text-zinc-400 font-mono">
                  {product.reviewCount.toLocaleString()}
                </div>
                {/* BSR */}
                <div className="w-24 px-4 text-sm text-zinc-400 font-mono">
                  #{product.bsr.toLocaleString()}
                </div>
                {/* Score */}
                <div className="w-28 px-4">
                  {product.opportunityScore !== null && product.tier !== null ? (
                    <ScoreBadge
                      score={product.opportunityScore}
                      tier={product.tier}
                      size="sm"
                    />
                  ) : (
                    <span className="text-xs text-zinc-600">—</span>
                  )}
                </div>
                {/* Status */}
                <div className="w-24 px-4">
                  {product.analysisStatus ? (
                    <StatusBadge status={product.analysisStatus} />
                  ) : (
                    <span className="text-xs text-zinc-600">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
