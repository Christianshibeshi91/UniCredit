"use client";

import { motion } from "framer-motion";
import { MessageSquare, ThumbsUp, ThumbsDown, Heart, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReviewMiningResult } from "@/lib/types/urlAnalysis";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

const SENTIMENT_COLORS = {
  positive: "bg-emerald-500",
  neutral: "bg-slate-400",
  negative: "bg-red-500",
};

interface ReviewMiningViewProps {
  reviewMining: ReviewMiningResult;
}

export function ReviewMiningView({ reviewMining }: ReviewMiningViewProps) {
  const { sentimentBreakdown, vocPhrases, topComplaintThemes, topPraiseThemes, emotionalDrivers } = reviewMining;

  return (
    <motion.div {...anim(0)} className="glass-card rounded-xl p-5 space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <MessageSquare className="h-4 w-4 text-blue-500" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200">Review Mining</h3>
        <span className="text-[10px] text-zinc-500 ml-auto">
          {reviewMining.totalReviewsAnalyzed.toLocaleString()} reviews analyzed
        </span>
      </div>

      {/* Sentiment Bar */}
      <motion.div {...anim(0.05)}>
        <div className="flex h-3 rounded-full overflow-hidden">
          <div className={cn(SENTIMENT_COLORS.positive)} style={{ width: `${sentimentBreakdown.positive}%` }} />
          <div className={cn(SENTIMENT_COLORS.neutral)} style={{ width: `${sentimentBreakdown.neutral}%` }} />
          <div className={cn(SENTIMENT_COLORS.negative)} style={{ width: `${sentimentBreakdown.negative}%` }} />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-zinc-500">
          <span className="text-emerald-500">{sentimentBreakdown.positive}% positive</span>
          <span>{sentimentBreakdown.neutral}% neutral</span>
          <span className="text-red-500">{sentimentBreakdown.negative}% negative</span>
        </div>
      </motion.div>

      {/* VOC Phrases */}
      <motion.div {...anim(0.1)}>
        <h4 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">
          Voice of Customer Phrases
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {vocPhrases.slice(0, 12).map((voc, i) => (
            <button
              key={i}
              onClick={() => navigator.clipboard.writeText(voc.phrase)}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] transition-colors group",
                voc.sentiment === "positive" && "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/30",
                voc.sentiment === "neutral" && "bg-slate-100 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800",
                voc.sentiment === "negative" && "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/30",
              )}
            >
              &ldquo;{voc.phrase}&rdquo;
              <span className="text-[9px] opacity-60">×{voc.frequency}</span>
              <Copy className="h-2.5 w-2.5 opacity-0 group-hover:opacity-50 transition-opacity" />
            </button>
          ))}
        </div>
      </motion.div>

      {/* Complaint Themes */}
      <motion.div {...anim(0.15)}>
        <h4 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
          <ThumbsDown className="h-3 w-3 text-red-500" />
          Top Complaints
        </h4>
        <div className="space-y-2">
          {topComplaintThemes.slice(0, 5).map((theme, i) => (
            <div key={i} className="px-3 py-2.5 rounded-lg bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/20">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-red-700 dark:text-red-400">{theme.theme}</span>
                <span className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded font-semibold",
                  theme.severity === "critical" && "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
                  theme.severity === "major" && "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
                  theme.severity === "minor" && "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400",
                )}>
                  {theme.severity}
                </span>
                <span className="text-[10px] text-zinc-500 ml-auto">{theme.reviewCount} mentions</span>
              </div>
              {theme.exampleQuotes[0] && (
                <p className="text-[10px] text-zinc-500 italic">&ldquo;{theme.exampleQuotes[0]}&rdquo;</p>
              )}
              <div className="flex gap-4 mt-1.5 text-[10px]">
                <span className="text-red-500">Fix: {theme.productFix}</span>
                <span className="text-amber-500">Listing: {theme.listingFix}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Praise Themes */}
      <motion.div {...anim(0.2)}>
        <h4 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
          <ThumbsUp className="h-3 w-3 text-emerald-500" />
          Top Praise
        </h4>
        <div className="space-y-2">
          {topPraiseThemes.slice(0, 4).map((theme, i) => (
            <div key={i} className="px-3 py-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/20">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">{theme.theme}</span>
                <span className="text-[10px] text-zinc-500 ml-auto">{theme.reviewCount} mentions</span>
              </div>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-500">Leverage: {theme.leverageOpportunity}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Emotional Drivers */}
      <motion.div {...anim(0.25)}>
        <h4 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
          <Heart className="h-3 w-3 text-pink-500" />
          Emotional Drivers
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {emotionalDrivers.map((driver, i) => (
            <div key={i} className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-900/30">
              <span className="text-xs font-medium text-slate-700 dark:text-zinc-300 capitalize">{driver.emotion}</span>
              <p className="text-[10px] text-zinc-500 mt-0.5">{driver.trigger}</p>
              <p className="text-[10px] text-blue-500 mt-0.5">{driver.implication}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
