"use client";

import { motion } from "framer-motion";
import { Star, TrendingUp, Package } from "lucide-react";
import { ScoreBadge } from "./ScoreBadge";
import type { Tier } from "@/lib/types";

interface ProductCardProps {
  title: string;
  brand: string;
  category: string;
  price: number;
  rating: number;
  reviewCount: number;
  bsr: number;
  score: number | null;
  tier: Tier | null;
  onClick: () => void;
  delay?: number;
}

export function ProductCard({
  title,
  brand,
  category,
  price,
  rating,
  reviewCount,
  bsr,
  score,
  tier,
  onClick,
  delay = 0,
}: ProductCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className="glass-card rounded-xl p-5 cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
            {title}
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {brand} &middot; {category}
          </p>
        </div>
        {score !== null && tier !== null && (
          <ScoreBadge score={score} tier={tier} size="sm" />
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-zinc-500">
            <Package className="h-3 w-3" />
            <span className="text-xs">Price</span>
          </div>
          <p className="text-sm font-semibold text-slate-900 dark:text-zinc-200">
            ${price.toFixed(2)}
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1 text-zinc-500">
            <Star className="h-3 w-3" />
            <span className="text-xs">Rating</span>
          </div>
          <p className="text-sm font-semibold text-slate-900 dark:text-zinc-200">
            {rating.toFixed(1)}
            <span className="text-zinc-500 font-normal ml-1">({reviewCount.toLocaleString()})</span>
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1 text-zinc-500">
            <TrendingUp className="h-3 w-3" />
            <span className="text-xs">BSR</span>
          </div>
          <p className="text-sm font-semibold text-slate-900 dark:text-zinc-200">
            #{bsr.toLocaleString()}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
