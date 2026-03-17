"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ShieldAlert, ShieldX, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FakeReviewResult } from "@/lib/types/urlAnalysis";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

const VERDICT_CONFIG: Record<string, { icon: typeof ShieldCheck; color: string; bg: string; border: string; label: string }> = {
  clean: { icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-200 dark:border-emerald-800/30", label: "Clean" },
  suspicious: { icon: ShieldAlert, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-800/30", label: "Suspicious" },
  likely_manipulated: { icon: ShieldX, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20", border: "border-red-200 dark:border-red-800/30", label: "Likely Manipulated" },
};

interface FakeReviewPanelProps {
  fakeReview: FakeReviewResult;
}

export function FakeReviewPanel({ fakeReview }: FakeReviewPanelProps) {
  const [showClean, setShowClean] = useState(false);
  const config = VERDICT_CONFIG[fakeReview.verdict];
  const Icon = config.icon;

  return (
    <motion.div {...anim(0)} className="glass-card rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className={cn("flex items-center gap-3 px-4 py-3 rounded-lg border", config.bg, config.border)}>
        <Icon className={cn("h-6 w-6", config.color)} />
        <div className="flex-1">
          <span className={cn("text-sm font-semibold", config.color)}>{config.label}</span>
          <p className="text-[10px] text-zinc-500">Review Authenticity Assessment</p>
        </div>
        <div className="text-right">
          <div className={cn("text-2xl font-bold font-mono", config.color)}>
            {fakeReview.suspicionScore}
          </div>
          <div className="text-[10px] text-zinc-500">/ 100 suspicion</div>
        </div>
      </div>

      {/* Suspicion Gauge */}
      <motion.div {...anim(0.05)}>
        <div className="h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
          <motion.div
            className={cn(
              "h-full rounded-full",
              fakeReview.suspicionScore < 30 ? "bg-emerald-500" : fakeReview.suspicionScore < 60 ? "bg-amber-500" : "bg-red-500",
            )}
            initial={{ width: 0 }}
            animate={{ width: `${fakeReview.suspicionScore}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[9px] text-zinc-500">
          <span>Clean</span>
          <span>Suspicious</span>
          <span>Likely Fake</span>
        </div>
      </motion.div>

      {/* Summary */}
      <motion.div {...anim(0.1)} className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-900/30">
        <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">{fakeReview.summary}</p>
      </motion.div>

      {/* Flags */}
      {fakeReview.flags.length > 0 && (
        <motion.div {...anim(0.15)}>
          <h4 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">
            Flags ({fakeReview.flags.length})
          </h4>
          <div className="space-y-2">
            {fakeReview.flags.map((flag, i) => (
              <div key={i} className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-900/30 border-l-2 border-amber-400">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">{flag.flag}</span>
                  <span className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded font-semibold",
                    flag.severity === "high" && "bg-red-100 dark:bg-red-900/30 text-red-600",
                    flag.severity === "medium" && "bg-amber-100 dark:bg-amber-900/30 text-amber-600",
                    flag.severity === "low" && "bg-slate-100 dark:bg-zinc-800 text-slate-500",
                  )}>
                    {flag.severity}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500">{flag.evidence}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">~{flag.affectedReviewCount} reviews affected</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Clean Signals (collapsible) */}
      {fakeReview.cleanSignals.length > 0 && (
        <motion.div {...anim(0.2)}>
          <button
            onClick={() => setShowClean(!showClean)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase tracking-wider hover:text-blue-500 transition-colors"
          >
            Clean Signals ({fakeReview.cleanSignals.length})
            {showClean ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showClean && (
            <ul className="mt-2 space-y-1">
              {fakeReview.cleanSignals.map((signal, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-zinc-400">
                  <ShieldCheck className="h-3 w-3 text-emerald-400 mt-0.5 shrink-0" />
                  {signal}
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      )}

      {/* Rating Distribution */}
      {fakeReview.ratingDistributionAnomaly && (
        <motion.div {...anim(0.25)} className="px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-800/20">
          <p className="text-[10px] text-amber-700 dark:text-amber-400">
            <ShieldAlert className="h-3 w-3 inline mr-1" />
            Rating Distribution: {fakeReview.ratingDistributionAnomaly}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
