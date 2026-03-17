"use client";

import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { SuggestionCard } from "./SuggestionCard";
import type { ProductSuggestion } from "@/lib/types";

interface SuggestionFeedProps {
  suggestions: ProductSuggestion[];
  onEstimateCosts: (id: string) => void;
  onFindSuppliers: (id: string) => void;
}

function anim(delay: number) {
  return {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
  };
}

export function SuggestionFeed({
  suggestions,
  onEstimateCosts,
  onFindSuppliers,
}: SuggestionFeedProps) {
  if (suggestions.length === 0) {
    return (
      <motion.div
        {...anim(0)}
        className="glass-card rounded-xl p-10 text-center"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
            <Lightbulb className="h-6 w-6 text-indigo-500 dark:text-indigo-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200">
            No suggestions yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm">
            Run analysis on 2+ products to unlock suggestions. The AI will
            identify gaps, trends, and viable product opportunities across your
            analyzed products.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-4")}>
      {suggestions.map((suggestion, i) => (
        <SuggestionCard
          key={suggestion.id}
          suggestion={suggestion}
          rank={i + 1}
          onEstimateCosts={onEstimateCosts}
          onFindSuppliers={onFindSuppliers}
          delay={i * 0.05}
        />
      ))}
    </div>
  );
}
