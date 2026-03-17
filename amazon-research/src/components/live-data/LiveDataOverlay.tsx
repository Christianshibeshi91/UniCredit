"use client";

import { motion } from "framer-motion";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComparisonRow {
  label: string;
  mockValue: string;
  liveValue: string;
  delta: number; // percentage change
}

interface LiveDataOverlayProps {
  rows: ComparisonRow[];
  className?: string;
}

function DeltaIndicator({ delta }: { delta: number }) {
  if (Math.abs(delta) < 0.5) {
    return <Minus className="h-3 w-3 text-zinc-400" />;
  }
  const isUp = delta > 0;
  return (
    <span className={cn("flex items-center gap-0.5 text-[10px] font-mono", isUp ? "text-emerald-500" : "text-red-500")}>
      {isUp ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
      {Math.abs(delta).toFixed(1)}%
    </span>
  );
}

export function LiveDataOverlay({ rows, className }: LiveDataOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-3 shadow-lg", className)}
    >
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between text-xs">
            <span className="text-zinc-500 w-20">{row.label}</span>
            <span className="text-slate-400 dark:text-zinc-500 font-mono line-through text-[10px]">
              {row.mockValue}
            </span>
            <span className="text-slate-900 dark:text-zinc-100 font-mono font-semibold">
              {row.liveValue}
            </span>
            <DeltaIndicator delta={row.delta} />
          </div>
        ))}
      </div>
    </motion.div>
  );
}
