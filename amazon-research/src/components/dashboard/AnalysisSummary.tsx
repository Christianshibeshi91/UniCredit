"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  ChevronDown,
  MessageSquare,
  Sparkles,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnalysisResult, ComplaintSeverity, DemandLevel } from "@/lib/types";

interface AnalysisSummaryProps {
  analysis: AnalysisResult;
}

const severityColors: Record<ComplaintSeverity, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  major: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  minor: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const demandColors: Record<DemandLevel, string> = {
  high: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  medium: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  low: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

export function AnalysisSummary({ analysis }: AnalysisSummaryProps) {
  return (
    <div className="space-y-6">
      {/* 1. Opportunity Summary */}
      <Section icon={Sparkles} title="Opportunity Summary" iconColor="text-violet-400">
        <blockquote className="border-l-2 border-transparent bg-gradient-to-r from-indigo-500/5 to-transparent pl-4 py-3 rounded-r-lg relative">
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 to-violet-500 rounded-full" />
          <p className="text-slate-600 dark:text-zinc-300 text-sm leading-relaxed italic">
            {analysis.opportunitySummary}
          </p>
        </blockquote>
      </Section>

      {/* 2. Complaints Accordion */}
      <Section icon={AlertTriangle} title={`Complaints (${analysis.complaints.length})`} iconColor="text-amber-400">
        <div className="space-y-2">
          {analysis.complaints.map((complaint, i) => (
            <ComplaintAccordion key={i} complaint={complaint} />
          ))}
        </div>
      </Section>

      {/* 3. Feature Requests */}
      <Section icon={Lightbulb} title={`Feature Requests (${analysis.featureRequests.length})`} iconColor="text-emerald-400">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {analysis.featureRequests.map((fr, i) => (
            <div key={i} className="glass-card rounded-lg p-4 space-y-2">
              <p className="text-sm text-slate-900 dark:text-zinc-200 font-medium">{fr.feature}</p>
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium border",
                    demandColors[fr.demandLevel]
                  )}
                >
                  {fr.demandLevel}
                </span>
                <span className="text-xs text-zinc-500">
                  ~{fr.mentionCount} mentions
                </span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 4. Product Gaps */}
      <Section icon={TrendingUp} title={`Product Gaps (${analysis.productGaps.length})`} iconColor="text-blue-400">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {analysis.productGaps.map((gap, i) => (
            <div key={i} className="glass-card rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Gap</p>
                <p className="text-sm text-slate-900 dark:text-zinc-200">{gap.gap}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Opportunity</p>
                <p className="text-sm text-slate-600 dark:text-zinc-300">{gap.opportunity}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                  Competitive Advantage
                </p>
                <p className="text-sm text-indigo-600 dark:text-indigo-300">{gap.competitiveAdvantage}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 5. Sentiment Breakdown */}
      <Section icon={MessageSquare} title="Sentiment Breakdown" iconColor="text-cyan-400">
        <SentimentBar sentiment={analysis.sentimentBreakdown} />
      </Section>

      {/* 6. Key Themes */}
      <Section icon={Tag} title="Key Themes" iconColor="text-pink-400">
        <div className="flex flex-wrap gap-2">
          {analysis.keyThemes.map((theme, i) => (
            <span
              key={i}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/20"
            >
              {theme}
            </span>
          ))}
        </div>
      </Section>

      {/* 7. Improvement Ideas */}
      <Section icon={Lightbulb} title="Improvement Ideas" iconColor="text-yellow-400">
        <ol className="space-y-3">
          {analysis.improvementIdeas.map((idea, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed pt-0.5">
                {idea}
              </p>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  iconColor,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card rounded-xl p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon className={cn("h-4 w-4", iconColor)} />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

function ComplaintAccordion({
  complaint,
}: {
  complaint: AnalysisResult["complaints"][number];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/50 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-zinc-800/30 transition-colors"
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 text-zinc-500 transition-transform",
            open && "rotate-180"
          )}
        />
        <span className="flex-1 text-sm text-slate-900 dark:text-zinc-200">{complaint.issue}</span>
        <span
          className={cn(
            "px-2 py-0.5 rounded-full text-xs font-medium border",
            severityColors[complaint.severity]
          )}
        >
          {complaint.severity}
        </span>
        <span className="text-xs text-zinc-500">{complaint.frequency}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="px-4 pb-3 border-t border-slate-200 dark:border-zinc-800/30 pt-3">
              <p className="text-xs text-zinc-500 mb-2">Example quotes:</p>
              <div className="space-y-2">
                {complaint.exampleQuotes.map((quote, i) => (
                  <blockquote
                    key={i}
                    className="text-xs text-slate-500 dark:text-zinc-400 italic border-l-2 border-slate-300 dark:border-zinc-700 pl-3 py-1"
                  >
                    &ldquo;{quote}&rdquo;
                  </blockquote>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SentimentBar({
  sentiment,
}: {
  sentiment: AnalysisResult["sentimentBreakdown"];
}) {
  return (
    <div className="space-y-3">
      <div className="flex h-4 rounded-full overflow-hidden bg-slate-200 dark:bg-zinc-800">
        {sentiment.positive > 0 && (
          <div
            className="bg-emerald-500 transition-all duration-500"
            style={{ width: `${sentiment.positive}%` }}
          />
        )}
        {sentiment.neutral > 0 && (
          <div
            className="bg-zinc-500 transition-all duration-500"
            style={{ width: `${sentiment.neutral}%` }}
          />
        )}
        {sentiment.negative > 0 && (
          <div
            className="bg-red-500 transition-all duration-500"
            style={{ width: `${sentiment.negative}%` }}
          />
        )}
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-emerald-600 dark:text-emerald-400">
          Positive: {sentiment.positive}%
        </span>
        <span className="text-slate-500 dark:text-zinc-400">
          Neutral: {sentiment.neutral}%
        </span>
        <span className="text-rose-600 dark:text-red-400">
          Negative: {sentiment.negative}%
        </span>
      </div>
    </div>
  );
}
