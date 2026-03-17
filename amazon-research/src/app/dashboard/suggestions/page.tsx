"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Lightbulb, Zap, TrendingUp, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMockSuggestions, getMockSuggestionStats } from "@/lib/mock-suggestions";
import { SuggestionFeed } from "@/components/suggestions/SuggestionFeed";
import { ViabilityMeter } from "@/components/suggestions/ViabilityMeter";
import type { ProductSuggestion, ViabilityTier } from "@/lib/types";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

export default function SuggestionsPage() {
  const allSuggestions = getMockSuggestions();
  const stats = getMockSuggestionStats();

  // Filter state
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 200]);
  const [minViability, setMinViability] = useState(0);
  const [tierFilter, setTierFilter] = useState<ViabilityTier | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = [...new Set(allSuggestions.map(s => s.category))];
    return cats.sort();
  }, [allSuggestions]);

  // Apply filters
  const filtered = useMemo(() => {
    return allSuggestions.filter(s => {
      if (s.targetPrice < priceRange[0] || s.targetPrice > priceRange[1]) return false;
      if (s.viabilityScore < minViability) return false;
      if (tierFilter !== "all" && s.tier !== tierFilter) return false;
      if (categoryFilter !== "all" && s.category !== categoryFilter) return false;
      return true;
    });
  }, [allSuggestions, priceRange, minViability, tierFilter, categoryFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div {...anim(0)} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Product Suggestions</h1>
          <p className="text-sm text-zinc-500 mt-1">
            AI-generated product ideas from gap analysis
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            showFilters
              ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
              : "glass-card text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/30"
          )}
        >
          <Filter className="h-4 w-4" />
          Filters
          {(tierFilter !== "all" || categoryFilter !== "all" || minViability > 0 || priceRange[0] > 0 || priceRange[1] < 200) && (
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
          )}
        </button>
      </motion.div>

      {/* KPI Row - 4 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div {...anim(0.05)} className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-violet-400" />
            <span className="text-xs text-zinc-500">Total Ideas</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-zinc-100 font-mono">{stats.total}</p>
        </motion.div>
        <motion.div {...anim(0.1)} className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-indigo-400" />
            <span className="text-xs text-zinc-500">Avg Viability</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-zinc-100 font-mono">{stats.avgViability}</p>
        </motion.div>
        <motion.div {...anim(0.15)} className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-violet-400" />
            <span className="text-xs text-zinc-500">S-Tier</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-zinc-100 font-mono">{stats.sTierCount}</p>
        </motion.div>
        <motion.div {...anim(0.2)} className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-indigo-400" />
            <span className="text-xs text-zinc-500">A-Tier</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-zinc-100 font-mono">{stats.aTierCount}</p>
        </motion.div>
      </div>

      {/* Filter Panel (collapsible) */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="glass-card rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200">Filters</h3>
            <button
              onClick={() => {
                setPriceRange([0, 200]);
                setMinViability(0);
                setTierFilter("all");
                setCategoryFilter("all");
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
            >
              Reset all
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Price Range */}
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Max Price</label>
              <input
                type="range"
                min={0}
                max={200}
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                className="w-full accent-indigo-500"
              />
              <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1">Up to ${priceRange[1]}</p>
            </div>
            {/* Min Viability */}
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Min Viability Score</label>
              <input
                type="range"
                min={0}
                max={100}
                value={minViability}
                onChange={(e) => setMinViability(parseInt(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1">{minViability}+ score</p>
            </div>
            {/* Tier Filter */}
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Tier</label>
              <div className="flex gap-2">
                {(["all", "S", "A", "B", "C"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTierFilter(t)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      tierFilter === t
                        ? "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30"
                        : "bg-slate-100 dark:bg-zinc-800/50 text-slate-500 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700/50"
                    )}
                  >
                    {t === "all" ? "All" : t}
                  </button>
                ))}
              </div>
            </div>
            {/* Category Filter */}
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300"
              >
                <option value="all">All Categories</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-3">
            Showing {filtered.length} of {allSuggestions.length} suggestions
          </p>
        </motion.div>
      )}

      {/* Suggestion Feed */}
      <SuggestionFeed
        suggestions={filtered}
        onEstimateCosts={(id) => {
          window.location.href = `/dashboard/suggestions/${id}?tab=costs`;
        }}
        onFindSuppliers={(id) => {
          window.location.href = `/dashboard/suggestions/${id}?tab=suppliers`;
        }}
      />
    </div>
  );
}
