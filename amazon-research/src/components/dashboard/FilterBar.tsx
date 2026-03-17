"use client";

import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tier, Recommendation } from "@/lib/types";

const CATEGORIES = ["Kitchen Gadgets", "Fitness Equipment", "Pet Supplies"];
const TIERS: Tier[] = ["S", "A", "B", "C", "D"];
const RECOMMENDATIONS: { value: Recommendation; label: string }[] = [
  { value: "strong_buy", label: "Strong Buy" },
  { value: "buy", label: "Buy" },
  { value: "watch", label: "Watch" },
  { value: "avoid", label: "Avoid" },
];

const tierColors: Record<Tier, string> = {
  S: "bg-violet-500/20 text-violet-400 border-violet-500/40",
  A: "bg-indigo-500/20 text-indigo-400 border-indigo-500/40",
  B: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  C: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  D: "bg-red-500/20 text-red-400 border-red-500/40",
};

export function FilterBar() {
  const [category, setCategory] = useQueryState("category", parseAsString);
  const [tier, setTier] = useQueryState("tier", parseAsString);
  const [recommendation, setRecommendation] = useQueryState("rec", parseAsString);
  const [minScore, setMinScore] = useQueryState("minScore", parseAsInteger);
  const [minReviews, setMinReviews] = useQueryState("minReviews", parseAsInteger);

  const hasFilters = category || tier || recommendation || minScore || minReviews;

  const resetAll = () => {
    setCategory(null);
    setTier(null);
    setRecommendation(null);
    setMinScore(null);
    setMinReviews(null);
  };

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <SlidersHorizontal className="h-4 w-4 text-indigo-400" />
        <span className="text-sm font-medium text-zinc-300">Filters</span>
        {hasFilters && (
          <button
            onClick={resetAll}
            className="ml-auto flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {/* Category */}
        <select
          value={category ?? ""}
          onChange={(e) => setCategory(e.target.value || null)}
          className="rounded-lg bg-zinc-800/80 border border-zinc-700/50 px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Tier toggles */}
        <div className="flex items-center gap-1">
          {TIERS.map((t) => (
            <button
              key={t}
              onClick={() => setTier(tier === t ? null : t)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-bold border transition-all",
                tier === t
                  ? tierColors[t]
                  : "bg-zinc-800/50 text-zinc-500 border-zinc-700/30 hover:text-zinc-300"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Recommendation */}
        <select
          value={recommendation ?? ""}
          onChange={(e) => setRecommendation(e.target.value || null)}
          className="rounded-lg bg-zinc-800/80 border border-zinc-700/50 px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
        >
          <option value="">All Recommendations</option>
          {RECOMMENDATIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>

        {/* Min Score */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500">Min Score</label>
          <input
            type="number"
            min={0}
            max={100}
            value={minScore ?? ""}
            onChange={(e) => {
              const val = e.target.value ? parseInt(e.target.value, 10) : null;
              setMinScore(val);
            }}
            placeholder="0"
            className="w-16 rounded-lg bg-zinc-800/80 border border-zinc-700/50 px-2 py-1.5 text-sm text-zinc-300 text-center focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          />
        </div>

        {/* Min Reviews */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500">Min Reviews</label>
          <input
            type="number"
            min={0}
            value={minReviews ?? ""}
            onChange={(e) => {
              const val = e.target.value ? parseInt(e.target.value, 10) : null;
              setMinReviews(val);
            }}
            placeholder="0"
            className="w-20 rounded-lg bg-zinc-800/80 border border-zinc-700/50 px-2 py-1.5 text-sm text-zinc-300 text-center focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          />
        </div>
      </div>
    </div>
  );
}
