"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  LayoutGrid,
  LayoutList,
  SlidersHorizontal,
  X,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MOCK_PRODUCTS, type MockProduct } from "@/lib/mock-data";
import { ScoreBadge } from "@/components/dashboard/ScoreBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProductCard } from "@/components/dashboard/ProductCard";
import type { Tier } from "@/lib/types";

const TIERS: Tier[] = ["S", "A", "B", "C", "D"];
const CATEGORIES = [...new Set(MOCK_PRODUCTS.map((p) => p.category))].sort();
const PAGE_SIZE = 100;

const tierColors: Record<Tier, string> = {
  S: "bg-violet-500/20 text-violet-400 border-violet-500/40",
  A: "bg-indigo-500/20 text-indigo-400 border-indigo-500/40",
  B: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  C: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  D: "bg-red-500/20 text-red-400 border-red-500/40",
};

type SortField = "title" | "price" | "rating" | "reviewCount" | "bsr" | "opportunityScore";
type SortDir = "asc" | "desc";
type ViewMode = "table" | "grid";

const columns: { key: SortField; label: string; width: string }[] = [
  { key: "title", label: "Product", width: "flex-[2.5]" },
  { key: "price", label: "Price", width: "w-20" },
  { key: "rating", label: "Rating", width: "w-20" },
  { key: "reviewCount", label: "Reviews", width: "w-24" },
  { key: "bsr", label: "BSR", width: "w-24" },
  { key: "opportunityScore", label: "Score", width: "w-28" },
];

export default function ProductsPage() {
  const [view, setView] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<Tier | null>(null);
  const [sortField, setSortField] = useState<SortField>("opportunityScore");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const hasFilters = search || categoryFilter || tierFilter;

  const filtered = useMemo(() => {
    let items = [...MOCK_PRODUCTS];

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.asin.toLowerCase().includes(q)
      );
    }

    if (categoryFilter) {
      items = items.filter((p) => p.category === categoryFilter);
    }

    if (tierFilter) {
      items = items.filter((p) => p.tier === tierFilter);
    }

    items.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return items;
  }, [search, categoryFilter, tierFilter, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const resetFilters = () => {
    setSearch("");
    setCategoryFilter(null);
    setTierFilter(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold gradient-text">Products</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {filtered.length} of {MOCK_PRODUCTS.length} products
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("table")}
            className={cn(
              "p-2 rounded-lg transition-colors",
              view === "table"
                ? "bg-slate-200 text-slate-900 dark:bg-zinc-800 dark:text-zinc-200"
                : "text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300"
            )}
          >
            <LayoutList className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("grid")}
            className={cn(
              "p-2 rounded-lg transition-colors",
              view === "grid"
                ? "bg-slate-200 text-slate-900 dark:bg-zinc-800 dark:text-zinc-200"
                : "text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card rounded-xl p-4"
      >
        <div className="flex items-center gap-3 mb-3">
          <SlidersHorizontal className="h-4 w-4 text-indigo-400" />
          <span className="text-sm font-medium text-slate-900 dark:text-zinc-300">Filters</span>
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="ml-auto flex items-center gap-1 text-xs text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 transition-colors"
            >
              <X className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="pl-9 pr-3 py-1.5 w-56 rounded-lg bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/50 text-sm text-slate-900 dark:text-zinc-300 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            />
          </div>

          {/* Category */}
          <select
            value={categoryFilter ?? ""}
            onChange={(e) => setCategoryFilter(e.target.value || null)}
            className="rounded-lg bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/50 px-3 py-1.5 text-sm text-slate-900 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Tier toggles */}
          <div className="flex items-center gap-1">
            {TIERS.map((t) => (
              <button
                key={t}
                onClick={() => setTierFilter(tierFilter === t ? null : t)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-bold border transition-all",
                  tierFilter === t
                    ? tierColors[t]
                    : "bg-slate-100 dark:bg-zinc-800/50 text-slate-400 dark:text-zinc-500 border-slate-200 dark:border-zinc-700/30 hover:text-slate-700 dark:hover:text-zinc-300"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Table View */}
      <AnimatePresence mode="wait">
        {view === "table" ? (
          <motion.div
            key="table"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card rounded-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center border-b border-slate-200 dark:border-zinc-800/50 bg-slate-50 dark:bg-zinc-900/50">
              {columns.map((col) => (
                <button
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={cn(
                    "flex items-center gap-1 px-4 py-3 text-xs font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 transition-colors",
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
              <div className="w-24 px-4 py-3 text-xs font-medium text-slate-500 dark:text-zinc-400">
                Status
              </div>
            </div>

            {/* Rows */}
            <div className="max-h-[calc(100vh-380px)] overflow-auto">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-sm">
                  No products match your filters.
                </div>
              ) : (
                filtered.slice(0, visible).map((product) => (
                  <Link
                    key={product.id}
                    href={`/dashboard/product/${product.asin}`}
                    className="flex items-center border-b border-slate-100 dark:border-zinc-800/30 hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    <div className="flex-[2.5] px-4 py-3 truncate">
                      <p className="text-sm text-slate-900 dark:text-zinc-200 truncate">{product.title}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {product.brand} · {product.category}
                      </p>
                    </div>
                    <div className="w-20 px-4 text-sm text-slate-700 dark:text-zinc-300 font-mono">
                      ${product.price.toFixed(2)}
                    </div>
                    <div className="w-20 px-4 text-sm text-slate-700 dark:text-zinc-300">
                      {product.rating.toFixed(1)}
                    </div>
                    <div className="w-24 px-4 text-sm text-slate-500 dark:text-zinc-400 font-mono">
                      {product.reviewCount.toLocaleString()}
                    </div>
                    <div className="w-24 px-4 text-sm text-slate-500 dark:text-zinc-400 font-mono">
                      #{product.bsr.toLocaleString()}
                    </div>
                    <div className="w-28 px-4">
                      {product.opportunityScore !== null && product.tier !== null ? (
                        <ScoreBadge
                          score={product.opportunityScore}
                          tier={product.tier}
                          size="sm"
                        />
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-zinc-500">—</span>
                      )}
                    </div>
                    <div className="w-24 px-4">
                      {product.analysisStatus ? (
                        <StatusBadge status={product.analysisStatus} />
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-zinc-500">—</span>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {filtered.length === 0 ? (
              <div className="col-span-full glass-card rounded-xl p-8 text-center text-zinc-500 text-sm">
                No products match your filters.
              </div>
            ) : (
              filtered.slice(0, visible).map((product, i) => (
                <ProductCard
                  key={product.id}
                  title={product.title}
                  brand={product.brand}
                  category={product.category}
                  price={product.price}
                  rating={product.rating}
                  reviewCount={product.reviewCount}
                  bsr={product.bsr}
                  score={product.opportunityScore}
                  tier={product.tier}
                  onClick={() => {
                    window.location.href = `/dashboard/product/${product.asin}`;
                  }}
                  delay={i * 0.03}
                />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Load More */}
      {visible < filtered.length && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl glass-card text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors"
          >
            <ChevronDown className="h-4 w-4" />
            Show {Math.min(PAGE_SIZE, filtered.length - visible).toLocaleString()} more of {(filtered.length - visible).toLocaleString()} remaining
          </button>
        </div>
      )}
    </div>
  );
}
