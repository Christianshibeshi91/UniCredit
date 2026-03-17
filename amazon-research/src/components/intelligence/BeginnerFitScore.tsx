"use client";

import { motion } from "framer-motion";
import { AlertTriangle, AlertCircle, Info, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BeginnerFitAssessment, WarningSeverity } from "@/lib/types/intelligence";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

interface BeginnerFitScoreProps {
  assessment: BeginnerFitAssessment;
}

const severityConfig: Record<WarningSeverity, { icon: typeof AlertTriangle; color: string; bg: string; border: string }> = {
  critical: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20", border: "border-red-200 dark:border-red-800/30" },
  important: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-800/30" },
  fyi: { icon: Info, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20", border: "border-blue-200 dark:border-blue-800/30" },
};

function ratingLabel(score: number): { label: string; color: string } {
  if (score >= 17) return { label: "Excellent", color: "text-emerald-500" };
  if (score >= 14) return { label: "Good", color: "text-indigo-500" };
  if (score >= 10) return { label: "Fair", color: "text-amber-500" };
  return { label: "Concern", color: "text-red-500" };
}

export function BeginnerFitScore({ assessment }: BeginnerFitScoreProps) {
  return (
    <motion.div {...anim(0)} className="glass-card rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200">
          Beginner Fit Assessment
        </h3>
        <div className="text-right">
          <span className="text-2xl font-bold font-mono text-slate-900 dark:text-zinc-100">
            {assessment.totalScore}
          </span>
          <span className="text-xs text-zinc-500">/100</span>
        </div>
      </div>

      {/* Dimension Bars */}
      <div className="space-y-3 mb-5">
        {assessment.dimensions.map((dim, i) => {
          const rating = ratingLabel(dim.score);
          const pct = (dim.score / 20) * 100;
          return (
            <motion.div key={dim.name} {...anim(0.05 * (i + 1))}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-600 dark:text-zinc-400">{dim.label}</span>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] font-medium", rating.color)}>{rating.label}</span>
                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-zinc-300">
                    {dim.score}/20
                  </span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-indigo-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, delay: 0.1 * (i + 1), ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <p className="text-[10px] text-zinc-500 mt-0.5">{dim.explanation}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Warnings */}
      {assessment.warnings.length > 0 && (
        <motion.div {...anim(0.3)} className="mb-5">
          <h4 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">
            Warnings
          </h4>
          <div className="space-y-2">
            {assessment.warnings.map((warning, i) => {
              const config = severityConfig[warning.severity];
              const Icon = config.icon;
              return (
                <div key={i} className={cn("flex items-start gap-2 px-3 py-2.5 rounded-lg border", config.bg, config.border)}>
                  <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", config.color)} />
                  <div>
                    <span className={cn("text-[10px] font-bold uppercase", config.color)}>{warning.severity}</span>
                    <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">{warning.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Required Learning */}
      {assessment.requiredLearning.length > 0 && (
        <motion.div {...anim(0.35)}>
          <h4 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Required Learning
          </h4>
          <div className="space-y-1.5">
            {assessment.requiredLearning.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-900/30">
                <div>
                  <p className="text-xs font-medium text-slate-700 dark:text-zinc-300">{item.topic}</p>
                  <p className="text-[10px] text-zinc-500">{item.resource}</p>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 shrink-0">{item.timeEstimate}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
