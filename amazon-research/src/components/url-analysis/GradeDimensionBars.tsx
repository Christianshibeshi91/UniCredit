"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { GradeDimension } from "@/lib/types/urlAnalysis";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

function gradeColor(grade: string) {
  if (grade.startsWith("A")) return { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" };
  if (grade.startsWith("B")) return { bar: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" };
  if (grade.startsWith("C")) return { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" };
  return { bar: "bg-red-500", text: "text-red-600 dark:text-red-400" };
}

interface GradeDimensionBarsProps {
  dimensions: GradeDimension[];
}

export function GradeDimensionBars({ dimensions }: GradeDimensionBarsProps) {
  return (
    <motion.div {...anim(0.1)} className="glass-card rounded-xl p-5">
      <h3 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-4 uppercase tracking-wider">
        Dimension Breakdown
      </h3>
      <div className="space-y-4">
        {dimensions.map((dim, i) => {
          const colors = gradeColor(dim.grade);
          return (
            <motion.div key={dim.name} {...anim(0.15 + i * 0.05)}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">{dim.name}</span>
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-bold font-mono", colors.text)}>
                    {dim.grade}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">{dim.score}/20</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                <motion.div
                  className={cn("h-full rounded-full", colors.bar)}
                  initial={{ width: 0 }}
                  animate={{ width: `${(dim.score / 20) * 100}%` }}
                  transition={{ duration: 0.6, delay: 0.2 + i * 0.05, ease: "easeOut" }}
                />
              </div>
              <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">{dim.rationale}</p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
