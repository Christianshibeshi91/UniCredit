"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PriceHistoryResult } from "@/lib/types/urlAnalysis";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

interface PriceHistoryChartProps {
  priceHistory: PriceHistoryResult;
}

function MiniLineChart({ dataPoints }: { dataPoints: { price: number }[] }) {
  if (dataPoints.length < 2) return null;

  const prices = dataPoints.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const width = 320;
  const height = 80;
  const padding = 4;

  const points = dataPoints.map((d, i) => {
    const x = padding + (i / (dataPoints.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((d.price - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-20">
      <defs>
        <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(59,130,246)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(59,130,246)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <polygon
        points={`${padding},${height - padding} ${points.join(" ")} ${width - padding},${height - padding}`}
        fill="url(#priceGrad)"
      />
      {/* Line */}
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="rgb(59,130,246)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const DIRECTION_ICON: Record<string, typeof TrendingUp> = {
  increasing: TrendingUp,
  decreasing: TrendingDown,
  stable: Minus,
};

export function PriceHistoryChart({ priceHistory }: PriceHistoryChartProps) {
  const Icon = DIRECTION_ICON[priceHistory.priceDirection] ?? Minus;

  return (
    <motion.div {...anim(0)} className="glass-card rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-blue-500" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200">Price History</h3>
        <div className="flex items-center gap-1 ml-auto">
          <Icon className={cn(
            "h-3.5 w-3.5",
            priceHistory.priceDirection === "increasing" && "text-red-500",
            priceHistory.priceDirection === "decreasing" && "text-emerald-500",
            priceHistory.priceDirection === "stable" && "text-slate-400",
          )} />
          <span className="text-[10px] text-zinc-500 capitalize">{priceHistory.priceDirection} trend</span>
        </div>
      </div>

      {/* Chart */}
      <motion.div {...anim(0.05)} className="rounded-lg bg-slate-50 dark:bg-zinc-900/30 p-3">
        <MiniLineChart dataPoints={priceHistory.priceDataPoints} />
        <div className="flex justify-between mt-1 text-[9px] text-zinc-500">
          <span>{priceHistory.priceDataPoints[0]?.date ?? ""}</span>
          <span>{priceHistory.priceDataPoints[priceHistory.priceDataPoints.length - 1]?.date ?? ""}</span>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div {...anim(0.1)} className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-zinc-900/30">
          <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
            ${priceHistory.lowestPrice90Days.toFixed(2)}
          </div>
          <div className="text-[9px] text-zinc-500">90-Day Low</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-zinc-900/30">
          <div className="text-sm font-bold font-mono text-red-600 dark:text-red-400">
            ${priceHistory.highestPrice90Days.toFixed(2)}
          </div>
          <div className="text-[9px] text-zinc-500">90-Day High</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-zinc-900/30">
          <div className="text-sm font-bold font-mono text-slate-900 dark:text-zinc-100">
            {priceHistory.priceVolatility}
          </div>
          <div className="text-[9px] text-zinc-500">Volatility</div>
        </div>
      </motion.div>

      {/* Optimal Price Window */}
      <motion.div {...anim(0.15)} className="px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/20">
        <p className="text-xs text-blue-700 dark:text-blue-400">
          <strong>Optimal Window:</strong> {priceHistory.optimalPriceWindow}
        </p>
      </motion.div>

      {/* Pricing Insight */}
      <motion.div {...anim(0.2)} className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-900/30">
        <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">{priceHistory.pricingInsight}</p>
      </motion.div>
    </motion.div>
  );
}
