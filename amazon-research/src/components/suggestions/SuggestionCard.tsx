"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { DollarSign, Search, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ViabilityMeter } from "./ViabilityMeter";
import type { ProductSuggestion } from "@/lib/types";

interface SuggestionCardProps {
  suggestion: ProductSuggestion;
  rank: number;
  onEstimateCosts: (id: string) => void;
  onFindSuppliers: (id: string) => void;
  delay?: number;
}

function anim(delay: number) {
  return {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
  };
}

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function SuggestionCard({
  suggestion,
  rank,
  onEstimateCosts,
  onFindSuppliers,
  delay = 0,
}: SuggestionCardProps) {
  const topPainPoints = suggestion.painPointsAddressed.slice(0, 3);

  return (
    <motion.div
      {...anim(delay)}
      className="glass-card rounded-xl p-5 group"
    >
      {/* Top row: rank + category */}
      <div className="flex items-center justify-between mb-3">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
          #{rank}
        </span>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700">
          {suggestion.category}
        </span>
      </div>

      {/* Title + viability meter row */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <Link
            href={`/dashboard/suggestions/${suggestion.id}`}
            className="text-sm font-semibold text-slate-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors line-clamp-2"
          >
            {suggestion.title}
          </Link>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2">
            {suggestion.description}
          </p>
        </div>
        <ViabilityMeter
          score={suggestion.viabilityScore}
          tier={suggestion.tier}
          size="sm"
        />
      </div>

      {/* Target price */}
      <div className="mb-3">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <DollarSign className="h-3 w-3" />
          Target: {fmt.format(suggestion.targetPrice)}
        </span>
      </div>

      {/* Top pain points */}
      {topPainPoints.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {topPainPoints.map((pp, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <AlertCircle className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
              <span className="text-slate-600 dark:text-zinc-300 line-clamp-1">
                {pp.issue}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Differentiator pills */}
      {suggestion.differentiators.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {suggestion.differentiators.map((diff, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/20"
            >
              {diff}
            </span>
          ))}
        </div>
      )}

      {/* CTAs */}
      <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-zinc-800">
        <button
          onClick={() => onEstimateCosts(suggestion.id)}
          className={cn(
            "flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
            "bg-indigo-600 hover:bg-indigo-700 text-white"
          )}
        >
          <DollarSign className="h-3.5 w-3.5" />
          Estimate Costs
        </button>
        <button
          onClick={() => onFindSuppliers(suggestion.id)}
          className={cn(
            "flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
            "bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700",
            "text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700"
          )}
        >
          <Search className="h-3.5 w-3.5" />
          Find Suppliers
        </button>
      </div>
    </motion.div>
  );
}
