"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Trophy,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Shield,
  Eye,
  Ban,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MOCK_PRODUCTS, type MockProduct } from "@/lib/mock-data";
import { ScoreBadge, ScoreBar } from "@/components/dashboard/ScoreBadge";
import type { Recommendation, Tier } from "@/lib/types";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

const PAGE_SIZE = 50;

const recConfig: Record<
  Recommendation,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
> = {
  strong_buy: {
    label: "Strong Buy",
    icon: Sparkles,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
  },
  buy: {
    label: "Buy",
    icon: TrendingUp,
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-500/10 border-indigo-500/20",
  },
  watch: {
    label: "Watch",
    icon: Eye,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  avoid: {
    label: "Avoid",
    icon: Ban,
    color: "text-slate-400 dark:text-zinc-500",
    bg: "bg-zinc-500/10 border-zinc-500/20",
  },
};

function OpportunityCard({ product, rank }: { product: MockProduct; rank: number }) {
  const rec = product.recommendation ? recConfig[product.recommendation] : null;
  const RecIcon = rec?.icon ?? Shield;

  return (
    <Link href={`/dashboard/product/${product.asin}`}>
      <div className="glass-card rounded-xl p-5 group hover:border-indigo-500/30 transition-all">
        <div className="flex items-start gap-4">
          {/* Rank */}
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 dark:bg-zinc-800/80 flex items-center justify-center">
            <span
              className={cn(
                "text-sm font-bold font-mono",
                rank <= 3 ? "gradient-text" : "text-slate-400 dark:text-zinc-500"
              )}
            >
              #{rank}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
              {product.title}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {product.brand} · {product.category} · ${product.price}
            </p>

            {/* Score breakdown bars */}
            {product.scoreBreakdown && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
                <ScoreBar label="Demand" value={product.scoreBreakdown.demandScore} />
                <ScoreBar label="Competition" value={product.scoreBreakdown.competitionScore} />
                <ScoreBar label="Margin" value={product.scoreBreakdown.marginScore} />
                <ScoreBar label="Sentiment" value={product.scoreBreakdown.sentimentScore} />
              </div>
            )}

            {/* Recommendation */}
            {rec && (
              <div className={cn("inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full border text-xs font-medium", rec.bg, rec.color)}>
                <RecIcon className="h-3 w-3" />
                {rec.label}
              </div>
            )}
          </div>

          {/* Score */}
          <div className="flex-shrink-0 flex flex-col items-end gap-2">
            {product.opportunityScore !== null && product.tier !== null && (
              <ScoreBadge
                score={product.opportunityScore}
                tier={product.tier}
                size="md"
              />
            )}
            <ArrowRight className="h-4 w-4 text-slate-300 dark:text-zinc-700 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function OpportunitiesPage() {
  const [visible, setVisible] = useState(PAGE_SIZE);

  const ranked = useMemo(() => {
    return [...MOCK_PRODUCTS]
      .filter((p) => p.opportunityScore !== null)
      .sort((a, b) => (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0));
  }, []);

  const strongBuys = ranked.filter((p) => p.recommendation === "strong_buy");
  const buys = ranked.filter((p) => p.recommendation === "buy");
  const watches = ranked.filter((p) => p.recommendation === "watch");
  const avoids = ranked.filter((p) => p.recommendation === "avoid");

  const displayed = ranked.slice(0, visible);
  const hasMore = visible < ranked.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div {...anim(0)}>
        <h1 className="text-2xl font-bold gradient-text">Opportunities</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {ranked.length.toLocaleString()} products ranked by opportunity score — showing top {Math.min(visible, ranked.length).toLocaleString()}
        </p>
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {([
          { rec: "strong_buy" as Recommendation, items: strongBuys },
          { rec: "buy" as Recommendation, items: buys },
          { rec: "watch" as Recommendation, items: watches },
          { rec: "avoid" as Recommendation, items: avoids },
        ]).map(({ rec, items }, i) => {
          const cfg = recConfig[rec];
          const Icon = cfg.icon;
          return (
            <motion.div
              key={rec}
              {...anim(0.05 + i * 0.05)}
              className={cn("rounded-xl p-4 border", cfg.bg)}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={cn("h-4 w-4", cfg.color)} />
                <span className={cn("text-xs font-medium", cfg.color)}>
                  {cfg.label}
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-zinc-100 font-mono">
                {items.length.toLocaleString()}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">products</p>
            </motion.div>
          );
        })}
      </div>

      {/* Ranked List — paginated */}
      <div className="space-y-3">
        {displayed.map((product, i) => (
          <motion.div key={product.id} {...anim(Math.min(0.15 + i * 0.01, 0.5))}>
            <OpportunityCard product={product} rank={i + 1} />
          </motion.div>
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <motion.div {...anim(0)} className="flex justify-center pt-2">
          <button
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl glass-card text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors"
          >
            <ChevronDown className="h-4 w-4" />
            Show {Math.min(PAGE_SIZE, ranked.length - visible).toLocaleString()} more of {(ranked.length - visible).toLocaleString()} remaining
          </button>
        </motion.div>
      )}
    </div>
  );
}
