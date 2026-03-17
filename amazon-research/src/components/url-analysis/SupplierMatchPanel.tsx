"use client";

import { motion } from "framer-motion";
import { Factory, Copy, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { SupplierMatchResult } from "@/lib/types/urlAnalysis";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

function CopyPill({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-zinc-800/50 text-[10px] text-slate-600 dark:text-zinc-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
    >
      {text}
      {copied ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5 opacity-40" />}
    </button>
  );
}

interface SupplierMatchPanelProps {
  supplierMatch: SupplierMatchResult;
}

export function SupplierMatchPanel({ supplierMatch }: SupplierMatchPanelProps) {
  const { productSpec } = supplierMatch;

  return (
    <motion.div {...anim(0)} className="glass-card rounded-xl p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Factory className="h-4 w-4 text-blue-500" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200">Supplier Match</h3>
      </div>

      {/* Product Spec Table */}
      <motion.div {...anim(0.05)}>
        <h4 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">
          Reverse-Engineered Spec
        </h4>
        <div className="rounded-lg overflow-hidden border border-slate-200/50 dark:border-zinc-800/50">
          <table className="w-full text-xs">
            <tbody>
              {[
                ["Product", productSpec.productName],
                ["Key Materials", productSpec.keyMaterials.join(", ")],
                ["Target Dimensions", productSpec.targetDimensions],
                ["Target Weight", productSpec.targetWeight],
                ["Packaging", productSpec.packagingRequirements],
                ["Certifications", productSpec.requiredCertifications.join(", ")],
                ["Target Unit Cost", `$${productSpec.targetUnitCost}`],
                ["Target MOQ", `${productSpec.targetMOQ} units`],
              ].filter(([, v]) => v).map(([label, value], i) => (
                <tr key={i} className={cn(i % 2 === 0 ? "bg-slate-50 dark:bg-zinc-900/30" : "bg-white dark:bg-transparent")}>
                  <td className="px-3 py-2 font-medium text-slate-700 dark:text-zinc-300 w-36">{label}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-zinc-400">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Search Keywords */}
      <motion.div {...anim(0.1)}>
        <h4 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">
          Alibaba Search Keywords
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {supplierMatch.searchKeywords.map((kw, i) => (
            <CopyPill key={i} text={kw} />
          ))}
        </div>
      </motion.div>

      {/* Cost Breakdown */}
      <motion.div {...anim(0.15)}>
        <h4 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">
          Cost Analysis
        </h4>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-zinc-900/30">
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-zinc-100">
              ${supplierMatch.estimatedSourceCost.mid.toFixed(2)}
            </div>
            <div className="text-[9px] text-zinc-500">Est. Source Cost</div>
            <div className="text-[8px] text-zinc-400">${supplierMatch.estimatedSourceCost.low} – ${supplierMatch.estimatedSourceCost.high}</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-zinc-900/30">
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-zinc-100">
              ${supplierMatch.estimatedLandedCost.mid.toFixed(2)}
            </div>
            <div className="text-[9px] text-zinc-500">Est. Landed Cost</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-zinc-900/30">
            <div className={cn(
              "text-lg font-bold font-mono",
              supplierMatch.marginVsCurrentPrice.projectedNetMargin > 50 ? "text-emerald-600 dark:text-emerald-400" :
              supplierMatch.marginVsCurrentPrice.projectedNetMargin > 30 ? "text-blue-600 dark:text-blue-400" :
              "text-amber-600 dark:text-amber-400",
            )}>
              {supplierMatch.marginVsCurrentPrice.projectedNetMargin}%
            </div>
            <div className="text-[9px] text-zinc-500">Projected Net Margin</div>
          </div>
        </div>
      </motion.div>

      {/* Sourcing Verdict */}
      <motion.div {...anim(0.2)} className="px-3 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/20">
        <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">{supplierMatch.sourcingVerdict}</p>
      </motion.div>
    </motion.div>
  );
}
