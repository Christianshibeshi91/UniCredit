"use client";

import { motion } from "framer-motion";
import { Award, TrendingUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductGradeResult, NormalizedProduct, ProductGrade } from "@/lib/types/urlAnalysis";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

const GRADE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "A+": { bg: "from-emerald-500 to-green-600", text: "text-emerald-500", border: "border-emerald-500/20" },
  A: { bg: "from-emerald-500 to-green-600", text: "text-emerald-500", border: "border-emerald-500/20" },
  "A-": { bg: "from-emerald-400 to-green-500", text: "text-emerald-500", border: "border-emerald-500/20" },
  "B+": { bg: "from-blue-500 to-indigo-600", text: "text-blue-500", border: "border-blue-500/20" },
  B: { bg: "from-blue-500 to-indigo-600", text: "text-blue-500", border: "border-blue-500/20" },
  "B-": { bg: "from-blue-400 to-indigo-500", text: "text-blue-400", border: "border-blue-400/20" },
  "C+": { bg: "from-amber-500 to-orange-600", text: "text-amber-500", border: "border-amber-500/20" },
  C: { bg: "from-amber-500 to-orange-600", text: "text-amber-500", border: "border-amber-500/20" },
  "C-": { bg: "from-amber-400 to-orange-500", text: "text-amber-400", border: "border-amber-400/20" },
  D: { bg: "from-red-500 to-rose-600", text: "text-red-500", border: "border-red-500/20" },
  F: { bg: "from-red-600 to-rose-700", text: "text-red-600", border: "border-red-600/20" },
};

function getGradeColor(grade: ProductGrade) {
  return GRADE_COLORS[grade] ?? GRADE_COLORS["C"];
}

interface ProductGradeCardProps {
  grade: ProductGradeResult;
  product: NormalizedProduct;
}

export function ProductGradeCard({ grade, product }: ProductGradeCardProps) {
  const colors = getGradeColor(grade.overallGrade);

  return (
    <motion.div {...anim(0)} className="glass-card rounded-xl p-6">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className={cn("p-4 rounded-xl bg-gradient-to-br shrink-0", colors.bg)}>
          <span className="text-3xl font-bold text-white font-mono">{grade.overallGrade}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-blue-500 font-semibold mb-1">
            Product Analysis
          </p>
          <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100 leading-tight">
            {product.title}
          </h2>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-zinc-500">
            <span className="font-mono">{product.currency}{product.price}</span>
            <span>{product.rating} stars</span>
            <span>{product.reviewCount.toLocaleString()} reviews</span>
            {product.bsr && <span>BSR #{product.bsr.toLocaleString()}</span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-3xl font-bold font-mono text-slate-900 dark:text-zinc-100">
            {grade.overallScore}
          </div>
          <div className="text-[10px] text-zinc-500">/ 100</div>
        </div>
      </div>

      {/* Grade Summary */}
      <motion.div {...anim(0.05)} className="mb-6 px-4 py-3 rounded-lg bg-slate-50 dark:bg-zinc-900/30 border-l-2 border-blue-500">
        <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
          {grade.gradeSummary}
        </p>
      </motion.div>

      {/* Strengths + Weaknesses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div {...anim(0.1)}>
          <h3 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            Strengths
          </h3>
          <ul className="space-y-1.5">
            {grade.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div {...anim(0.15)}>
          <h3 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            Critical Weaknesses
          </h3>
          <ul className="space-y-1.5">
            {grade.criticalWeaknesses.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                {w}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* Improvement Potential */}
      <motion.div {...anim(0.2)} className="mt-5 px-4 py-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-800/30">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-indigo-500" />
          <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
            Improvement Potential: {grade.improvementPotential}/100
          </span>
          <span className="text-[10px] text-indigo-500 ml-auto">
            Could reach {grade.overallScore + Math.round((100 - grade.overallScore) * grade.improvementPotential / 200)} with optimizations
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
