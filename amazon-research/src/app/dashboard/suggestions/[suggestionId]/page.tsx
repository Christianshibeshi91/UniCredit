"use client";

import { use, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Target,
  AlertTriangle,
  TrendingUp,
  Shield,
  Lightbulb,
  DollarSign,
  Package,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getMockSuggestion,
  getMockCostEstimate,
  getMockSupplierSearch,
} from "@/lib/mock-suggestions";
import { ViabilityMeter } from "@/components/suggestions/ViabilityMeter";
import { CostEstimateBreakdown } from "@/components/suggestions/CostEstimateBreakdown";
import { SupplierSearchPanel } from "@/components/suggestions/SupplierSearchPanel";
import { ScoreBar } from "@/components/dashboard/ScoreBadge";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

const tierBadgeColors: Record<string, string> = {
  S: "text-violet-700 dark:text-violet-400 bg-violet-100 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20",
  A: "text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20",
  B: "text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20",
  C: "text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20",
};

const severityColors: Record<string, string> = {
  high: "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20",
  medium: "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  low: "bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20",
};

const strengthColors: Record<string, string> = {
  strong: "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
  moderate: "bg-teal-100 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-500/20",
  emerging: "bg-cyan-100 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/20",
};

export default function SuggestionDetailPage({
  params,
}: {
  params: Promise<{ suggestionId: string }>;
}) {
  const { suggestionId } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get("tab") === "suppliers" ? "suppliers" : "costs";

  const suggestion = getMockSuggestion(suggestionId);
  const costEstimate = suggestion ? getMockCostEstimate(suggestion.id) : undefined;
  const supplierSearch = suggestion ? getMockSupplierSearch(suggestion.id) : undefined;

  if (!suggestion) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-slate-500 dark:text-zinc-400 mb-4">
            Suggestion not found: {suggestionId}
          </p>
          <button
            onClick={() => router.push("/dashboard/suggestions")}
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-sm"
          >
            Back to Suggestions
          </button>
        </div>
      </div>
    );
  }

  const { viabilityBreakdown } = suggestion;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/dashboard/suggestions"
        className="flex items-center gap-2 text-sm text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Suggestions
      </Link>

      {/* Header Card */}
      <motion.div {...anim(0)} className="glass-card rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100">
              {suggestion.title}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">{suggestion.description}</p>

            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {/* Tier badge */}
              <span
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium border",
                  tierBadgeColors[suggestion.tier]
                )}
              >
                {suggestion.tier}-Tier
              </span>
              {/* Category / Subcategory */}
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700/50">
                {suggestion.category}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700/50">
                {suggestion.subcategory}
              </span>
            </div>
          </div>

          {/* Viability Meter */}
          <ViabilityMeter
            score={suggestion.viabilityScore}
            tier={suggestion.tier}
            size="lg"
          />
        </div>

        {/* Target customer + price */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-indigo-400" />
            <div>
              <p className="text-xs text-zinc-500">Target Customer</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-zinc-200">
                {suggestion.targetCustomer}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-400" />
            <div>
              <p className="text-xs text-zinc-500">Target Price</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-zinc-200">
                ${suggestion.targetPrice.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Score Breakdown */}
      <motion.div {...anim(0.1)} className="glass-card rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-200 mb-4">
          Viability Breakdown
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ScoreBar label="Demand Confidence" value={viabilityBreakdown.demandConfidence} />
          <ScoreBar label="Differentiation" value={viabilityBreakdown.differentiationStrength} />
          <ScoreBar label="Margin Potential" value={viabilityBreakdown.marginPotential} />
          <ScoreBar label="Execution Feasibility" value={viabilityBreakdown.executionFeasibility} />
        </div>
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-zinc-800/50 flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            Total Score: {viabilityBreakdown.demandConfidence + viabilityBreakdown.differentiationStrength + viabilityBreakdown.marginPotential + viabilityBreakdown.executionFeasibility}/100
          </span>
          <span className="text-xs text-zinc-500">
            Each dimension is scored 0-25
          </span>
        </div>
      </motion.div>

      {/* Tags Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Differentiators */}
        <motion.div {...anim(0.15)} className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200 mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-indigo-400" />
            Differentiators
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {suggestion.differentiators.map((d, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/20"
              >
                {d}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Risk Factors */}
        <motion.div {...anim(0.2)} className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Risk Factors
          </h3>
          <div className="space-y-2">
            {suggestion.riskFactors.map((rf, i) => (
              <div key={i}>
                <span
                  className={cn(
                    "inline-block px-2.5 py-1 rounded-full text-xs font-medium border",
                    severityColors[rf.severity]
                  )}
                >
                  {rf.severity.toUpperCase()}: {rf.risk}
                </span>
                <p className="text-[10px] text-slate-500 dark:text-zinc-500 mt-1 ml-1">
                  {rf.mitigation}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Trend Signals */}
        <motion.div {...anim(0.25)} className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200 mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            Trend Signals
          </h3>
          <div className="space-y-2">
            {suggestion.trendSignals.map((ts, i) => (
              <div key={i}>
                <span
                  className={cn(
                    "inline-block px-2.5 py-1 rounded-full text-xs font-medium border",
                    strengthColors[ts.strength]
                  )}
                >
                  {ts.strength.toUpperCase()}: {ts.signal}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Pain Points */}
      <motion.div {...anim(0.3)} className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200 mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-violet-400" />
          Pain Points Addressed
        </h3>
        <div className="space-y-3">
          {suggestion.painPointsAddressed.map((pp, i) => (
            <div
              key={i}
              className="rounded-lg bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-zinc-200">
                    {pp.issue}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    {pp.proposedSolution}
                  </p>
                </div>
                <span className="flex-shrink-0 text-xs font-mono font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 px-2 py-1 rounded-lg border border-violet-100 dark:border-violet-500/20">
                  {pp.affectedPercentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Source Products */}
      {suggestion.sourceProductIds.length > 0 && (
        <motion.div {...anim(0.35)} className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200 mb-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-indigo-400" />
            Source Products
          </h3>
          <div className="flex flex-wrap gap-2">
            {suggestion.sourceProductIds.map((asin) => (
              <Link
                key={asin}
                href={`/dashboard/product/${asin}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-zinc-800/50 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-zinc-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:border-indigo-200 dark:hover:border-indigo-500/20 transition-colors"
              >
                <Package className="h-3 w-3" />
                {asin}
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Tabbed Sections: Startup Costs / Supplier Sourcing */}
      <motion.div {...anim(0.4)}>
        <div className="flex gap-2 mb-4">
          <Link
            href={`/dashboard/suggestions/${suggestionId}?tab=costs`}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === "costs"
                ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                : "glass-card text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/30"
            )}
          >
            <DollarSign className="h-4 w-4" />
            Startup Costs
          </Link>
          <Link
            href={`/dashboard/suggestions/${suggestionId}?tab=suppliers`}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === "suppliers"
                ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                : "glass-card text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/30"
            )}
          >
            <Users className="h-4 w-4" />
            Supplier Sourcing
          </Link>
        </div>

        {/* Tab Content */}
        {activeTab === "costs" && (
          costEstimate ? (
            <CostEstimateBreakdown estimate={costEstimate} />
          ) : (
            <div className="glass-card rounded-xl p-8 text-center">
              <DollarSign className="h-8 w-8 text-slate-300 dark:text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-zinc-400">
                No cost estimate available yet for this suggestion.
              </p>
            </div>
          )
        )}

        {activeTab === "suppliers" && (
          <SupplierSearchPanel supplierSearch={supplierSearch} />
        )}
      </motion.div>
    </div>
  );
}
