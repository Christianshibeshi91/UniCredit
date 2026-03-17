"use client";

import { motion } from "framer-motion";
import {
  MapPin,
  CheckCircle,
  XCircle,
  Award,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScoredSupplier } from "@/lib/types";

interface SupplierCardProps {
  supplier: ScoredSupplier;
  isRecommended?: boolean;
}

function anim(delay: number) {
  return {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
  };
}

const rankColors: Record<number, string> = {
  1: "bg-amber-400/20 text-amber-500 border-amber-400/30",
  2: "bg-zinc-400/20 text-zinc-400 border-zinc-400/30",
  3: "bg-amber-700/20 text-amber-700 dark:text-amber-600 border-amber-700/30",
};

interface ScoreBarInlineProps {
  label: string;
  value: number;
  max?: number;
}

function ScoreBarInline({ label, value, max = 25 }: ScoreBarInlineProps) {
  const pct = Math.min(100, (value / max) * 100);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-500 dark:text-zinc-400">{label}</span>
        <span className="text-slate-700 dark:text-zinc-300 font-mono">
          {value}/{max}
        </span>
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

function ScoreCircle({ score }: { score: number }) {
  const size = 48;
  const strokeWidth = 3;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score));
  const dashLength = (progress / 100) * circumference;
  const center = size / 2;

  const color =
    score >= 80
      ? "#8b5cf6"
      : score >= 60
        ? "#6366f1"
        : score >= 40
          ? "#3b82f6"
          : "#f59e0b";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(148, 148, 168, 0.2)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={circumference}
          animate={{ strokeDashoffset: circumference - dashLength }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] as const }}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <span
        className="absolute text-xs font-bold font-mono"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}

export function SupplierCard({ supplier, isRecommended = false }: SupplierCardProps) {
  const rankColor =
    rankColors[supplier.rank] ||
    "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700";

  return (
    <motion.div
      {...anim(0)}
      className={cn(
        "glass-card rounded-xl p-5 relative",
        isRecommended && "ring-2 ring-indigo-500/40"
      )}
    >
      {/* Recommended badge */}
      {isRecommended && (
        <div className="absolute -top-2.5 left-4">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shadow-sm">
            <Star className="h-3 w-3" />
            Recommended
          </span>
        </div>
      )}

      {/* Header: rank, name, location, score */}
      <div className="flex items-start gap-3 mb-4">
        {/* Rank badge */}
        <span
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold border flex-shrink-0",
            rankColor
          )}
        >
          #{supplier.rank}
        </span>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 truncate">
            {supplier.companyName}
          </h4>
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            <MapPin className="h-3 w-3" />
            {supplier.location}
          </div>
        </div>

        <ScoreCircle score={supplier.totalScore} />
      </div>

      {/* Score dimension bars */}
      <div className="space-y-2 mb-4">
        <ScoreBarInline label="Reliability" value={supplier.scoreBreakdown.reliabilityScore} />
        <ScoreBarInline label="Quality" value={supplier.scoreBreakdown.qualityScore} />
        <ScoreBarInline label="Commercial" value={supplier.scoreBreakdown.commercialScore} />
        <ScoreBarInline label="Fit" value={supplier.scoreBreakdown.fitScore} />
      </div>

      {/* Pros / Cons */}
      {(supplier.pros.length > 0 || supplier.cons.length > 0) && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Pros */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-medium">
              Pros
            </span>
            {supplier.pros.map((pro, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs">
                <CheckCircle className="h-3 w-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span className="text-slate-600 dark:text-zinc-300">{pro}</span>
              </div>
            ))}
          </div>
          {/* Cons */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-red-600 dark:text-red-400 uppercase tracking-wider font-medium">
              Cons
            </span>
            {supplier.cons.map((con, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs">
                <XCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-slate-600 dark:text-zinc-300">{con}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation callout */}
      {supplier.recommendation && (
        <div className="rounded-lg bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 p-3 flex items-start gap-2">
          <Award className="h-4 w-4 text-indigo-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
            {supplier.recommendation}
          </p>
        </div>
      )}
    </motion.div>
  );
}
