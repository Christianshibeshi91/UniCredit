"use client";

import { motion } from "framer-motion";
import { HelpCircle, AlertTriangle, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QAResult } from "@/lib/types/urlAnalysis";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

interface QAInsightsPanelProps {
  qaResult: QAResult;
}

export function QAInsightsPanel({ qaResult }: QAInsightsPanelProps) {
  return (
    <motion.div {...anim(0)} className="glass-card rounded-xl p-5 space-y-5">
      <div className="flex items-center gap-2">
        <HelpCircle className="h-4 w-4 text-blue-500" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200">Q&A Insights</h3>
        <span className="text-[10px] text-zinc-500 ml-auto">
          {qaResult.totalQuestionsAnalyzed} questions analyzed
        </span>
      </div>

      {/* Listing Gaps */}
      <motion.div {...anim(0.05)}>
        <h4 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3 text-amber-500" />
          Listing Gaps
        </h4>
        <div className="space-y-2">
          {qaResult.listingGaps.map((gap, i) => (
            <div key={i} className="px-3 py-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/20">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">{gap.question}</p>
              <p className="text-[10px] text-zinc-500 mt-1">{gap.gap}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">
                  Add to: {gap.whereToAdd}
                </span>
              </div>
              <p className="text-[10px] text-slate-600 dark:text-zinc-400 mt-1.5 italic">
                Suggested: &ldquo;{gap.suggestedCopy}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Buyer Objections */}
      <motion.div {...anim(0.1)}>
        <h4 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
          <MessageCircle className="h-3 w-3 text-red-500" />
          Buyer Objections
        </h4>
        <div className="space-y-2">
          {qaResult.buyerObjections.map((obj, i) => (
            <div key={i} className="px-3 py-2 rounded-lg bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/20">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-red-700 dark:text-red-400">{obj.objection}</span>
                <span className="text-[10px] text-zinc-500 ml-auto">×{obj.frequency}</span>
              </div>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Overcome: {obj.overcome}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* FAQ Suggestions */}
      {qaResult.faqSuggestions.length > 0 && (
        <motion.div {...anim(0.15)}>
          <h4 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">
            FAQ Suggestions
          </h4>
          <ul className="space-y-1">
            {qaResult.faqSuggestions.map((faq, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-zinc-400">
                <HelpCircle className="h-3 w-3 text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">{faq.question}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{faq.answer}</p>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </motion.div>
  );
}
