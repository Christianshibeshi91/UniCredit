"use client";

import { motion } from "framer-motion";
import { GitCompare, Trophy, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComparisonReport, GradeDimensionName } from "@/lib/types/urlAnalysis";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

function gradeColor(grade: string) {
  if (grade.startsWith("A")) return "text-emerald-600 dark:text-emerald-400";
  if (grade.startsWith("B")) return "text-blue-600 dark:text-blue-400";
  if (grade.startsWith("C")) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

const DIMENSION_LABELS: Record<GradeDimensionName, string> = {
  listingQuality: "Listing Quality",
  reviewSentiment: "Review Sentiment",
  competitivePosition: "Competitive Position",
  profitPotential: "Profit Potential",
  marketMomentum: "Market Momentum",
};

interface ComparisonScorecardProps {
  comparison: ComparisonReport;
}

export function ComparisonScorecard({ comparison }: ComparisonScorecardProps) {
  const { products } = comparison.scorecard;
  const dimensions: GradeDimensionName[] = [
    "listingQuality",
    "reviewSentiment",
    "competitivePosition",
    "profitPotential",
    "marketMomentum",
  ];

  return (
    <motion.div {...anim(0)} className="glass-card rounded-xl p-5 space-y-5">
      <div className="flex items-center gap-2">
        <GitCompare className="h-4 w-4 text-blue-500" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200">Comparison Scorecard</h3>
      </div>

      {/* Winner Banner */}
      {comparison.overallWinner && (
        <motion.div {...anim(0.05)} className="px-4 py-3 rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 border border-emerald-200/50 dark:border-emerald-800/20">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                Overall Winner: {products.find((p) => p.analysisId === comparison.overallWinner)?.title ?? comparison.overallWinner}
              </p>
              <p className="text-[10px] text-emerald-600/70 dark:text-emerald-500/70">{comparison.overallWinnerReason}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Scorecard Table */}
      <motion.div {...anim(0.1)} className="rounded-lg overflow-hidden border border-slate-200/50 dark:border-zinc-800/50 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-zinc-900/50">
              <th className="px-3 py-2.5 text-left font-semibold text-slate-700 dark:text-zinc-300">Dimension</th>
              {products.map((product, i) => (
                <th key={i} className="px-3 py-2.5 text-center font-semibold text-slate-700 dark:text-zinc-300">
                  <div className="truncate max-w-[120px]" title={product.title}>
                    {product.title.slice(0, 25)}{product.title.length > 25 ? "..." : ""}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Overall Grade Row */}
            <tr className="border-t border-slate-100 dark:border-zinc-800/50 bg-blue-50/30 dark:bg-blue-950/10">
              <td className="px-3 py-2.5 font-semibold text-slate-700 dark:text-zinc-300">Overall Grade</td>
              {products.map((product, i) => {
                const isWinner = product.analysisId === comparison.overallWinner;
                return (
                  <td key={i} className="px-3 py-2.5 text-center">
                    <span className={cn("text-lg font-bold font-mono", gradeColor(product.overallGrade))}>
                      {product.overallGrade}
                    </span>
                    <span className="text-[10px] text-zinc-500 ml-1">{product.overallScore}</span>
                    {isWinner && <Trophy className="h-3 w-3 text-emerald-500 inline ml-1" />}
                  </td>
                );
              })}
            </tr>
            {/* Dimension Rows */}
            {dimensions.map((dim, di) => {
              const winner = comparison.dimensionWinners.find((w) => w.dimension === dim);
              return (
                <tr key={di} className={cn("border-t border-slate-100 dark:border-zinc-800/50", di % 2 === 0 && "bg-slate-50/50 dark:bg-zinc-900/20")}>
                  <td className="px-3 py-2 text-slate-600 dark:text-zinc-400">{DIMENSION_LABELS[dim]}</td>
                  {products.map((product, ri) => {
                    const score = product.dimensionScores[dim];
                    const isWinner = winner?.winnerId === product.analysisId;
                    return (
                      <td key={ri} className="px-3 py-2 text-center">
                        <span className={cn(
                          "font-mono font-semibold",
                          score >= 16 ? "text-emerald-600 dark:text-emerald-400" :
                          score >= 12 ? "text-blue-600 dark:text-blue-400" :
                          score >= 8 ? "text-amber-600 dark:text-amber-400" :
                          "text-red-600 dark:text-red-400",
                          isWinner && "underline decoration-emerald-500 decoration-2",
                        )}>
                          {score}/20
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {/* Rank Row */}
            <tr className="border-t border-slate-100 dark:border-zinc-800/50 bg-slate-50/50 dark:bg-zinc-900/20">
              <td className="px-3 py-2 font-semibold text-slate-600 dark:text-zinc-400">Rank</td>
              {products.map((product, i) => (
                <td key={i} className="px-3 py-2 text-center font-bold text-slate-700 dark:text-zinc-300">
                  #{product.rank}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </motion.div>

      {/* Dimension Winners */}
      {comparison.dimensionWinners.length > 0 && (
        <motion.div {...anim(0.15)}>
          <h4 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">
            Best-in-Class
          </h4>
          <div className="flex flex-wrap gap-2">
            {comparison.dimensionWinners.map((winner, i) => (
              <div key={i} className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/20">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {DIMENSION_LABELS[winner.dimension]}: {products.find((p) => p.analysisId === winner.winnerId)?.title.slice(0, 30) ?? "Unknown"}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Sourcing Recommendation */}
      {comparison.sourcingRecommendation && (
        <motion.div {...anim(0.2)} className="px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border-l-2 border-blue-500">
          <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
            <strong>Sourcing Recommendation:</strong> {comparison.sourcingRecommendation}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
