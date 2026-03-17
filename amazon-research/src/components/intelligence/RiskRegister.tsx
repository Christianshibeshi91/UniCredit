"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ChevronDown, ChevronUp, AlertTriangle, AlertCircle, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RiskRegister as RiskRegisterType, Risk } from "@/lib/types/intelligence";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

interface RiskRegisterProps {
  register: RiskRegisterType;
}

function severityColor(score: number): string {
  if (score >= 20) return "text-red-500";
  if (score >= 12) return "text-amber-500";
  return "text-emerald-500";
}

function severityBg(score: number): string {
  if (score >= 20) return "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30";
  if (score >= 12) return "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30";
  return "bg-slate-50 dark:bg-zinc-900/30 border-slate-200 dark:border-zinc-800/50";
}

function RiskCard({ risk, index }: { risk: Risk; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      {...anim(0.05 * index)}
      className={cn("rounded-lg border overflow-hidden", severityBg(risk.adjustedSeverity))}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/30 dark:hover:bg-zinc-800/10 transition-colors"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {risk.isBeginnerSpecific && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 shrink-0">
              BEGINNER
            </span>
          )}
          <span className="text-xs font-medium text-slate-700 dark:text-zinc-300 truncate">{risk.title}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={cn("text-sm font-bold font-mono", severityColor(risk.adjustedSeverity))}>
            {risk.adjustedSeverity.toFixed(1)}
          </span>
          {risk.beginnerMultiplier > 1.0 && (
            <span className="text-[9px] text-violet-500 font-mono">×{risk.beginnerMultiplier}</span>
          )}
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-zinc-400" /> : <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-2.5">
              <p className="text-xs text-slate-600 dark:text-zinc-400">{risk.description}</p>

              <div className="flex items-center gap-4 text-[10px] text-zinc-500">
                <span>Likelihood: {risk.likelihood}/5</span>
                <span>Impact: {risk.impact}/5</span>
                <span>Beginner ×{risk.beginnerMultiplier}</span>
              </div>

              {/* Early Warning Signals */}
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Eye className="h-3 w-3 text-amber-400" />
                  <span className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">Early Warning Signals</span>
                </div>
                <ul className="space-y-0.5">
                  {risk.earlyWarningSignals.map((signal, i) => (
                    <li key={i} className="text-[10px] text-zinc-500 pl-4">• {signal}</li>
                  ))}
                </ul>
              </div>

              {/* Mitigation */}
              <div className="px-2.5 py-2 rounded-md bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-800/20">
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Mitigation: </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300">{risk.mitigation}</span>
              </div>

              {/* Contingency */}
              <div className="px-2.5 py-2 rounded-md bg-slate-100 dark:bg-zinc-800/30">
                <span className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">Contingency: </span>
                <span className="text-[10px] text-slate-500 dark:text-zinc-500">{risk.contingency}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function RiskRegister({ register }: RiskRegisterProps) {
  const sorted = [...register.risks].sort((a, b) => b.adjustedSeverity - a.adjustedSeverity);

  return (
    <motion.div {...anim(0)} className="glass-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200 flex items-center gap-2">
          <Shield className="h-4 w-4 text-red-400" />
          Risk Register
        </h3>
        <span className="text-xs text-zinc-500">{register.risks.length} risks identified</span>
      </div>

      {/* Top Beginner Risk Callout */}
      <motion.div {...anim(0.05)} className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase">Top Beginner Risk</span>
            <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">{register.topBeginnerRisk}</p>
          </div>
        </div>
      </motion.div>

      {/* Risk Cards */}
      <div className="space-y-2">
        {sorted.map((risk, i) => (
          <RiskCard key={risk.title} risk={risk} index={i} />
        ))}
      </div>

      {/* Unmitigatable Risks */}
      {register.unmitigatableRisks.length > 0 && (
        <motion.div {...anim(0.4)} className="mt-4">
          <h4 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
            <AlertTriangle className="h-3 w-3 text-zinc-400" />
            Unmitigatable Risks
          </h4>
          <div className="space-y-1">
            {register.unmitigatableRisks.map((risk, i) => (
              <p key={i} className="text-xs text-zinc-500 pl-5">• {risk}</p>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
