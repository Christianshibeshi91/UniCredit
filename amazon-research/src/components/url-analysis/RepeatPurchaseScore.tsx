"use client";

import { motion } from "framer-motion";
import { RefreshCw, Repeat, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RepeatPurchaseResult } from "@/lib/types/urlAnalysis";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

function CircularGauge({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#3b82f6" : "#f59e0b";

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={4}
        className="text-slate-100 dark:text-zinc-800"
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: circumference - progress }}
        transition={{ duration: 1, ease: "easeOut" }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        className="text-lg font-bold font-mono fill-slate-900 dark:fill-zinc-100"
      >
        {score}
      </text>
    </svg>
  );
}

interface RepeatPurchaseScoreProps {
  repeatPurchase: RepeatPurchaseResult;
}

export function RepeatPurchaseScore({ repeatPurchase }: RepeatPurchaseScoreProps) {
  return (
    <motion.div {...anim(0)} className="glass-card rounded-xl p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Repeat className="h-4 w-4 text-blue-500" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200">Repeat Purchase</h3>
      </div>

      {/* Score + Stats */}
      <motion.div {...anim(0.05)} className="flex items-center gap-6">
        <CircularGauge score={repeatPurchase.score} />
        <div className="flex-1 space-y-2">
          <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-900/30">
            <div className="text-xs text-zinc-500">Probability</div>
            <div className="text-sm font-bold text-slate-900 dark:text-zinc-100">
              {repeatPurchase.probability}
            </div>
          </div>
          <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-900/30">
            <div className="text-xs text-zinc-500">12-Month LTV</div>
            <div className="text-sm font-bold font-mono text-slate-900 dark:text-zinc-100">
              ${repeatPurchase.ltv.estimatedLTV12Month}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Drivers */}
      <motion.div {...anim(0.1)}>
        <h4 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
          <RefreshCw className="h-3 w-3 text-blue-400" />
          Purchase Drivers
        </h4>
        <ul className="space-y-1">
          {repeatPurchase.drivers.map((driver, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
              <span>{driver.driver} <span className="text-[9px] text-zinc-400">({driver.strength})</span></span>
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Subscription Opportunity */}
      {repeatPurchase.subscriptionOpportunity && (
        <motion.div {...anim(0.15)} className="px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-800/20">
          <p className="text-xs text-indigo-700 dark:text-indigo-400">
            <strong>Subscribe & Save Eligible:</strong> This product has subscription potential
          </p>
        </motion.div>
      )}

      {/* Bundle Opportunities */}
      {repeatPurchase.bundleOpportunities.length > 0 && (
        <motion.div {...anim(0.2)}>
          <h4 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
            <Package className="h-3 w-3 text-amber-500" />
            Bundle Opportunities
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {repeatPurchase.bundleOpportunities.map((bundle, i) => (
              <span key={i} className="text-[10px] px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400">
                {bundle}
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
