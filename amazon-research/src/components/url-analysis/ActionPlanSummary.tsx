"use client";

import { motion } from "framer-motion";
import { Target, Clock, Calendar, Rocket, DollarSign, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { URLActionPlan, ActionItem } from "@/lib/types/urlAnalysis";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

function getPriorityColor(priority: number) {
  if (priority >= 8) return "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400";
  if (priority >= 5) return "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400";
  return "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400";
}

function getPriorityLabel(priority: number) {
  if (priority >= 8) return "high";
  if (priority >= 5) return "medium";
  return "low";
}

function ActionCard({ item, index }: { item: ActionItem; index: number }) {
  return (
    <div className="px-3 py-3 rounded-lg bg-slate-50 dark:bg-zinc-900/30 border border-slate-200/50 dark:border-zinc-800/50">
      <div className="flex items-start gap-2 mb-2">
        <span className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold shrink-0">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-700 dark:text-zinc-300">{item.action}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">
              {item.category}
            </span>
            <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-semibold", getPriorityColor(item.priority))}>
              {getPriorityLabel(item.priority)}
            </span>
          </div>
        </div>
      </div>

      {/* Steps */}
      <ul className="ml-7 space-y-0.5">
        {item.specificSteps.map((step, i) => (
          <li key={i} className="flex items-start gap-1.5 text-[10px] text-slate-500 dark:text-zinc-500">
            <CheckCircle className="h-2.5 w-2.5 text-slate-300 dark:text-zinc-600 mt-0.5 shrink-0" />
            {step}
          </li>
        ))}
      </ul>

      {/* Cost + Impact */}
      <div className="flex items-center gap-3 mt-2 ml-7 text-[9px] text-zinc-500">
        <span className="flex items-center gap-0.5">
          <DollarSign className="h-2.5 w-2.5" />${item.estimatedCost}
        </span>
        <span className="flex items-center gap-0.5">
          <Rocket className="h-2.5 w-2.5" />{item.expectedImpact}
        </span>
        {item.gradeImpact && (
          <span className="text-emerald-500">Grade: {item.gradeImpact}</span>
        )}
      </div>
    </div>
  );
}

interface ActionPlanSummaryProps {
  actionPlan: URLActionPlan;
}

export function ActionPlanSummary({ actionPlan }: ActionPlanSummaryProps) {
  return (
    <motion.div {...anim(0)} className="glass-card rounded-xl p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-blue-500" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200">Action Plan</h3>
      </div>

      {/* Priority Statement */}
      <motion.div {...anim(0.05)} className="px-4 py-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-l-2 border-blue-500">
        <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed font-medium">
          {actionPlan.priorityStatement}
        </p>
      </motion.div>

      {/* Immediate Actions */}
      <motion.div {...anim(0.1)}>
        <h4 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-3 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-red-500" />
          Immediate (This Week)
        </h4>
        <div className="space-y-2">
          {actionPlan.immediateActions.map((item, i) => (
            <ActionCard key={i} item={item} index={i} />
          ))}
        </div>
      </motion.div>

      {/* Short-Term Actions */}
      <motion.div {...anim(0.15)}>
        <h4 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-3 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="h-3 w-3 text-amber-500" />
          Short-Term (This Month)
        </h4>
        <div className="space-y-2">
          {actionPlan.shortTermActions.map((item, i) => (
            <ActionCard key={i} item={item} index={i} />
          ))}
        </div>
      </motion.div>

      {/* Long-Term Actions */}
      <motion.div {...anim(0.2)}>
        <h4 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-3 uppercase tracking-wider flex items-center gap-1.5">
          <Rocket className="h-3 w-3 text-blue-500" />
          Long-Term (This Quarter)
        </h4>
        <div className="space-y-2">
          {actionPlan.longTermActions.map((item, i) => (
            <ActionCard key={i} item={item} index={i} />
          ))}
        </div>
      </motion.div>

      {/* Total Estimated Cost */}
      <motion.div {...anim(0.25)} className="px-4 py-3 rounded-lg bg-slate-50 dark:bg-zinc-900/30 border border-slate-200/50 dark:border-zinc-800/50">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">Total Estimated Investment</span>
          <span className="text-sm font-bold font-mono text-slate-900 dark:text-zinc-100">
            ${actionPlan.totalEstimatedCost.toLocaleString()}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
