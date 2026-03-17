"use client";

import { cn } from "@/lib/utils";
import type { Tier } from "@/lib/types";

interface ScoreBadgeProps {
  score: number;
  tier: Tier;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const tierColors: Record<Tier, { bg: string; text: string; border: string }> = {
  S: { bg: "bg-violet-500/20", text: "text-violet-400", border: "border-violet-500/30" },
  A: { bg: "bg-indigo-500/20", text: "text-indigo-400", border: "border-indigo-500/30" },
  B: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
  C: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" },
  D: { bg: "bg-rose-500/20", text: "text-rose-400", border: "border-rose-500/30" },
};

const sizeClasses = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-sm",
  lg: "px-4 py-1.5 text-base",
};

export function ScoreBadge({ score, tier, size = "md", className }: ScoreBadgeProps) {
  const colors = tierColors[tier];

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "font-mono font-bold tabular-nums",
          sizeClasses[size],
          colors.text
        )}
      >
        {score}
      </span>
      <span
        className={cn(
          "rounded-full font-bold border",
          sizeClasses[size],
          colors.bg,
          colors.text,
          colors.border
        )}
      >
        {tier}
      </span>
    </div>
  );
}

export function ScoreBar({
  label,
  value,
  max = 25,
}: {
  label: string;
  value: number;
  max?: number;
}) {
  const pct = Math.min(100, (value / max) * 100);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-500 dark:text-zinc-400">{label}</span>
        <span className="text-slate-700 dark:text-zinc-300 font-mono">{value}/{max}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
