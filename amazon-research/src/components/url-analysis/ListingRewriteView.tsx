"use client";

import { motion } from "framer-motion";
import { PenTool, Copy, Check, ArrowRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ListingRewriteResult } from "@/lib/types/urlAnalysis";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1 text-zinc-400 hover:text-blue-500 transition-colors">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

interface ListingRewriteViewProps {
  rewrite: ListingRewriteResult;
}

export function ListingRewriteView({ rewrite }: ListingRewriteViewProps) {
  return (
    <motion.div {...anim(0)} className="glass-card rounded-xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <PenTool className="h-4 w-4 text-blue-500" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200">Listing Rewrite</h3>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs font-mono text-red-500">{rewrite.originalListingScore}</span>
          <ArrowRight className="h-3 w-3 text-zinc-400" />
          <span className="text-xs font-mono text-emerald-500">{rewrite.rewrittenListingScore}</span>
          {rewrite.projectedCTRImprovement && (
            <span className="text-[10px] text-blue-500 ml-1">+{rewrite.projectedCTRImprovement}% CTR</span>
          )}
        </div>
      </div>

      {/* Title Comparison */}
      <motion.div {...anim(0.05)}>
        <h4 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">
          Title
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="px-3 py-2.5 rounded-lg bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/20">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">{rewrite.originalTitle}</p>
            </div>
            <p className="text-[9px] text-red-500 mt-1.5">Original</p>
          </div>
          <div className="px-3 py-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/20">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed font-medium">{rewrite.rewrittenTitle}</p>
              <CopyButton text={rewrite.rewrittenTitle} />
            </div>
            <p className="text-[9px] text-emerald-500 mt-1.5">Rewritten</p>
          </div>
        </div>
        {rewrite.titleChanges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {rewrite.titleChanges.map((ch, i) => (
              <span key={i} className="text-[9px] px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">
                {ch.type}: {ch.explanation}
              </span>
            ))}
          </div>
        )}
      </motion.div>

      {/* Bullets Comparison */}
      <motion.div {...anim(0.1)}>
        <h4 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">
          Bullet Points
        </h4>
        <div className="space-y-3">
          {rewrite.bulletChanges.map((bullet, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-900/30 border-l-2 border-red-300 dark:border-red-800">
                <p className="text-[11px] text-slate-500 dark:text-zinc-500 leading-relaxed">{bullet.originalBullet}</p>
              </div>
              <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-900/30 border-l-2 border-emerald-300 dark:border-emerald-800">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] text-slate-700 dark:text-zinc-300 leading-relaxed">{bullet.rewrittenBullet}</p>
                  <CopyButton text={bullet.rewrittenBullet} />
                </div>
                {bullet.changes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {bullet.changes.map((ch, j) => (
                      <span key={j} className="text-[8px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/20 text-blue-500">
                        {ch.type}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Description */}
      <motion.div {...anim(0.15)}>
        <h4 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">
          Description
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900/30 border-l-2 border-red-300 dark:border-red-800">
            <p className="text-[11px] text-slate-500 dark:text-zinc-500 leading-relaxed whitespace-pre-line">{rewrite.originalDescription}</p>
            <p className="text-[9px] text-red-500 mt-1.5">Original</p>
          </div>
          <div className="px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900/30 border-l-2 border-emerald-300 dark:border-emerald-800">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">{rewrite.rewrittenDescription}</p>
              <CopyButton text={rewrite.rewrittenDescription} />
            </div>
            <p className="text-[9px] text-emerald-500 mt-1.5">Rewritten</p>
          </div>
        </div>
      </motion.div>

      {/* Keywords Added */}
      {rewrite.keywordsAdded.length > 0 && (
        <motion.div {...anim(0.2)}>
          <h4 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">
            Keywords Added
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {rewrite.keywordsAdded.map((kw, i) => (
              <span key={i} className="text-[10px] px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400">
                {kw}
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
