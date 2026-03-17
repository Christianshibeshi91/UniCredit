"use client";

import { motion } from "framer-motion";
import { Trophy, CheckCircle, AlertTriangle, XCircle, Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductVerdict } from "@/lib/types/intelligence";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

interface VerdictCardProps {
  verdict: ProductVerdict;
}

function WinBadge({ name, score, met }: { name: string; score: number; met: boolean }) {
  const color = score >= 20 ? "emerald" : score >= 15 ? "amber" : "red";
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border",
        color === "emerald" && "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/30",
        color === "amber" && "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30",
        color === "red" && "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30",
      )}
    >
      {met ? (
        <CheckCircle className={cn("h-4 w-4 shrink-0", color === "emerald" ? "text-emerald-500" : color === "amber" ? "text-amber-500" : "text-red-500")} />
      ) : (
        <XCircle className="h-4 w-4 text-red-500 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">{name}</span>
      </div>
      <span className={cn(
        "text-sm font-bold font-mono",
        color === "emerald" && "text-emerald-600 dark:text-emerald-400",
        color === "amber" && "text-amber-600 dark:text-amber-400",
        color === "red" && "text-red-600 dark:text-red-400",
      )}>
        {score}/25
      </span>
    </div>
  );
}

export function VerdictCard({ verdict }: VerdictCardProps) {
  return (
    <motion.div {...anim(0)} className="glass-card rounded-xl p-6">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shrink-0">
          <Trophy className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-indigo-500 font-semibold mb-1">
            Recommended Product
          </p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100 leading-tight">
            {verdict.productName}
          </h2>
          <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
            <span>{verdict.category}</span>
            <span className="font-mono">${verdict.targetPrice}</span>
            <span>MOQ {verdict.minimumOrderQuantity}</span>
            <span>Unit cost ${verdict.estimatedUnitCost}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-3xl font-bold font-mono text-slate-900 dark:text-zinc-100">
            {verdict.totalWinScore}
          </div>
          <div className="text-[10px] text-zinc-500">Win Score</div>
        </div>
      </div>

      {/* Investment Thesis */}
      <motion.div {...anim(0.1)} className="mb-6 px-4 py-3 rounded-lg bg-slate-50 dark:bg-zinc-900/30 border-l-2 border-indigo-500">
        <div className="flex items-start gap-2">
          <Quote className="h-3.5 w-3.5 text-indigo-400 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
            {verdict.investmentThesis}
          </p>
        </div>
      </motion.div>

      {/* Win Conditions */}
      <motion.div {...anim(0.15)}>
        <h3 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">
          Win Conditions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {verdict.winConditionAssessment.map((wc) => (
            <WinBadge key={wc.name} name={wc.name} score={wc.score} met={wc.met} />
          ))}
        </div>
      </motion.div>

      {/* Must-Have Features */}
      <motion.div {...anim(0.2)} className="mt-6">
        <h3 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">
          Must-Have Features
        </h3>
        <div className="flex flex-wrap gap-2">
          {verdict.mustHaveFeatures.map((f, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-zinc-800/50 text-xs text-slate-600 dark:text-zinc-400">
              <CheckCircle className="h-3 w-3 text-emerald-500" />
              {f}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Beginner Advantages */}
      <motion.div {...anim(0.25)} className="mt-6">
        <h3 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">
          Beginner Advantages
        </h3>
        <ul className="space-y-1">
          {verdict.beginnerAdvantages.map((adv, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-zinc-400">
              <CheckCircle className="h-3 w-3 text-indigo-400 mt-0.5 shrink-0" />
              {adv}
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Alternatives */}
      {verdict.alternativesConsidered.length > 0 && (
        <motion.div {...anim(0.3)} className="mt-6">
          <h3 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">
            Alternatives Considered
          </h3>
          <div className="space-y-2">
            {verdict.alternativesConsidered.map((alt, i) => (
              <div key={i} className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-900/30">
                <p className="text-xs font-medium text-slate-700 dark:text-zinc-300">{alt.productName}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  <AlertTriangle className="h-3 w-3 inline mr-1 text-amber-400" />
                  {alt.whyNotChosen}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
