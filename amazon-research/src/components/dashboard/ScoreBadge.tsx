"use client";

import { cn } from "@/lib/utils";
import type { Tier } from "@/lib/types";

interface ScoreBadgeProps {
  score: number;
  tier: Tier;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const tierConfig: Record<Tier, { bg: string; text: string; border: string; ring: string }> = {
  S: { bg: "bg-violet-500/15", text: "text-violet-400", border: "border-violet-500/30", ring: "ring-violet-500/20" },
  A: { bg: "bg-indigo-500/15", text: "text-indigo-400", border: "border-indigo-500/30", ring: "ring-indigo-500/20" },
  B: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30", ring: "ring-blue-500/20" },
  C: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30", ring: "ring-amber-500/20" },
  D: { bg: "bg-rose-500/15", text: "text-rose-400", border: "border-rose-500/30", ring: "ring-rose-500/20" },
};

const sizeConfig = {
  sm: { badge: "w-10 h-10", tier: "text-xs", score: "text-[9px]" },
  md: { badge: "w-12 h-12", tier: "text-sm", score: "text-[10px]" },
  lg: { badge: "w-14 h-14", tier: "text-base", score: "text-xs" },
};

export function ScoreBadge({ score, tier, size = "md", className }: ScoreBadgeProps) {
  const colors = tierConfig[tier];
  const sizes = sizeConfig[size];

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-full border ring-2 transition-all",
        sizes.badge,
        colors.bg,
        colors.border,
        colors.ring,
        className
      )}
    >
      <span className={cn("font-extrabold leading-none", sizes.tier, colors.text)}>
        {tier}
      </span>
      <span className={cn("font-mono font-bold leading-none mt-0.5 text-slate-500 dark:text-zinc-400", sizes.score)}>
        {score}
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
