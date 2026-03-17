"use client";

import { motion } from "framer-motion";
import { Gauge, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SuccessProbability } from "@/lib/types/intelligence";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

interface SuccessProbabilityMeterProps {
  probability: SuccessProbability;
}

function scoreColor(score: number): string {
  if (score >= 75) return "#34d399";
  if (score >= 55) return "#818cf8";
  if (score >= 35) return "#f59e0b";
  return "#ef4444";
}

export function SuccessProbabilityMeter({ probability }: SuccessProbabilityMeterProps) {
  const color = scoreColor(probability.overallScore);
  const size = 160;
  const strokeWidth = 10;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = Math.PI * radius; // Semi-circle
  const progress = (probability.overallScore / 100) * circumference;

  // Confidence interval arc
  const ciLow = (probability.confidenceInterval[0] / 100) * circumference;
  const ciHigh = (probability.confidenceInterval[1] / 100) * circumference;

  return (
    <motion.div {...anim(0)} className="glass-card rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200 mb-4 flex items-center gap-2">
        <Gauge className="h-4 w-4 text-violet-400" />
        Success Probability
      </h3>

      {/* Arc Gauge */}
      <div className="flex justify-center mb-4">
        <div className="relative" style={{ width: size, height: size / 2 + 20 }}>
          <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
            {/* Background arc */}
            <path
              d={`M ${strokeWidth} ${size / 2 + 10} A ${radius} ${radius} 0 0 1 ${size - strokeWidth} ${size / 2 + 10}`}
              fill="none"
              stroke="rgba(148, 148, 168, 0.15)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />

            {/* Confidence interval band */}
            <path
              d={`M ${strokeWidth} ${size / 2 + 10} A ${radius} ${radius} 0 0 1 ${size - strokeWidth} ${size / 2 + 10}`}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${circumference}`}
              strokeDashoffset={circumference - ciHigh}
              opacity={0.15}
            />

            {/* Main progress arc */}
            <motion.path
              d={`M ${strokeWidth} ${size / 2 + 10} A ${radius} ${radius} 0 0 1 ${size - strokeWidth} ${size / 2 + 10}`}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${circumference}`}
              strokeDashoffset={circumference}
              animate={{ strokeDashoffset: circumference - progress }}
              transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
            <motion.span
              className="text-3xl font-bold font-mono text-slate-900 dark:text-zinc-100"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {probability.overallScore}%
            </motion.span>
            <span className="text-[10px] text-zinc-500">
              [{probability.confidenceInterval[0]}-{probability.confidenceInterval[1]}%]
            </span>
          </div>
        </div>
      </div>

      {/* Dimension Bars */}
      <div className="space-y-2.5 mb-5">
        {probability.dimensions.map((dim, i) => {
          const pct = (dim.score / 20) * 100;
          return (
            <motion.div key={dim.name} {...anim(0.1 + i * 0.05)}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs text-slate-600 dark:text-zinc-400">{dim.label}</span>
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-zinc-300">{dim.score}/20</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: scoreColor(dim.score * 5) }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, delay: 0.15 * (i + 1) }}
                />
              </div>
              <p className="text-[10px] text-zinc-500 mt-0.5">{dim.explanation}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Honest Assessment */}
      <motion.div {...anim(0.4)} className="mb-4 px-4 py-3 rounded-lg bg-slate-50 dark:bg-zinc-900/30">
        <h4 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">Honest Assessment</h4>
        <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
          {probability.honestAssessment}
        </p>
      </motion.div>

      {/* Failure Scenarios */}
      {probability.failureScenarios.length > 0 && (
        <motion.div {...anim(0.45)}>
          <h4 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 text-amber-400" />
            Failure Scenarios
          </h4>
          <div className="space-y-1.5">
            {probability.failureScenarios.map((fs, i) => (
              <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-900/30">
                <span className={cn(
                  "text-xs font-bold font-mono shrink-0",
                  fs.probability >= 15 ? "text-red-500" : fs.probability >= 10 ? "text-amber-500" : "text-slate-400",
                )}>
                  {fs.probability}%
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-slate-700 dark:text-zinc-300">{fs.scenario}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Trigger: {fs.trigger}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
