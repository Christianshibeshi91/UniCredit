"use client";

import { motion } from "framer-motion";
import {
  Package,
  TrendingUp,
  Zap,
  DollarSign,
  Star,
  MessageSquare,
  BarChart3,
  ArrowUpRight,
  Trophy,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMockStats, MOCK_PRODUCTS } from "@/lib/mock-data";
import { getMockSuggestions } from "@/lib/mock-suggestions";
import { MiniLineChart, MiniBarChart, DonutChart } from "@/components/ui/MiniChart";
import { ScoreBadge } from "@/components/dashboard/ScoreBadge";
import { ViabilityMeter } from "@/components/suggestions/ViabilityMeter";
import type { ViabilityTier } from "@/lib/types";
import Link from "next/link";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

function KpiCard({
  icon: Icon,
  label,
  value,
  subtext,
  iconColor,
  delay,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtext?: string;
  iconColor: string;
  delay: number;
}) {
  return (
    <motion.div {...anim(delay)} className="glass-card rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800/50">
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
          <ArrowUpRight className="h-3 w-3" />
          12%
        </span>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-slate-900 dark:text-zinc-100 font-mono">{value}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
        {subtext && <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">{subtext}</p>}
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const stats = getMockStats();

  const topProducts = [...MOCK_PRODUCTS]
    .filter((p) => p.opportunityScore !== null)
    .sort((a, b) => (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0))
    .slice(0, 5);

  const tierSegments = [
    { label: "S-Tier", value: stats.sProducts, color: "#8b5cf6" },
    { label: "A-Tier", value: stats.aProducts, color: "#6366f1" },
    { label: "B-Tier", value: stats.bProducts, color: "#3b82f6" },
    { label: "C-Tier", value: stats.tierCounts["C"] ?? 0, color: "#f59e0b" },
    { label: "D-Tier", value: stats.tierCounts["D"] ?? 0, color: "#ef4444" },
  ];

  const categoryData = Object.entries(stats.categoryCounts);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div {...anim(0)}>
        <h1 className="text-2xl font-bold gradient-text">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Overview of your Amazon product research pipeline
        </p>
      </motion.div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Package}
          label="Total Products"
          value={stats.totalProducts.toString()}
          subtext={`${stats.analyzedProducts} analyzed`}
          iconColor="text-indigo-400"
          delay={0.05}
        />
        <KpiCard
          icon={BarChart3}
          label="Avg Opportunity Score"
          value={stats.avgScore.toString()}
          subtext="out of 100"
          iconColor="text-violet-400"
          delay={0.1}
        />
        <KpiCard
          icon={DollarSign}
          label="Total Est. Revenue"
          value={`$${(stats.totalRevenue / 1000).toFixed(0)}K`}
          subtext="monthly across tracked products"
          iconColor="text-emerald-400"
          delay={0.15}
        />
        <KpiCard
          icon={MessageSquare}
          label="Reviews Analyzed"
          value={stats.totalReviews.toLocaleString()}
          subtext={`Avg ${stats.avgRating}/5 rating`}
          iconColor="text-cyan-400"
          delay={0.2}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Score Trend */}
        <motion.div {...anim(0.25)} className="glass-card rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200">
                Opportunity Score Trend
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Average score over last 6 months
              </p>
            </div>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +{stats.avgScore - stats.trendScores[0]} pts
            </span>
          </div>
          <MiniLineChart
            data={stats.trendScores}
            labels={stats.trendMonths}
            height={140}
            color="#818cf8"
          />
        </motion.div>

        {/* Tier Distribution */}
        <motion.div {...anim(0.3)} className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200 mb-4">
            Tier Distribution
          </h3>
          <div className="flex items-center justify-center mb-4">
            <DonutChart
              segments={tierSegments}
              size={130}
              thickness={16}
              centerValue={stats.analyzedProducts.toString()}
              centerLabel="products"
            />
          </div>
          <div className="space-y-2">
            {tierSegments.map((seg) => (
              <div key={seg.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="text-slate-500 dark:text-zinc-400">{seg.label}</span>
                </div>
                <span className="text-slate-700 dark:text-zinc-300 font-mono">{seg.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Opportunities */}
        <motion.div {...anim(0.35)} className="glass-card rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              Top Opportunities
            </h3>
            <Link
              href="/dashboard/opportunities"
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {topProducts.map((product, i) => (
              <Link
                key={product.id}
                href={`/dashboard/product/${product.asin}`}
                className="flex items-center gap-4 px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/30 transition-colors group"
              >
                <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 w-5">
                  #{i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 dark:text-zinc-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                    {product.title}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {product.category} · ${product.price} · {product.reviewCount.toLocaleString()} reviews
                  </p>
                </div>
                {product.opportunityScore !== null && product.tier !== null && (
                  <ScoreBadge
                    score={product.opportunityScore}
                    tier={product.tier}
                    size="sm"
                  />
                )}
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Category Breakdown */}
        <motion.div {...anim(0.4)} className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200 mb-4">
            Category Breakdown
          </h3>
          <MiniBarChart
            data={categoryData.map(([, v]) => v)}
            labels={categoryData.map(([k]) => k.split(" ")[0])}
            height={100}
            barColor="bg-indigo-500"
          />
          <div className="mt-4 space-y-3">
            {categoryData.map(([category, count]) => {
              const categoryProducts = MOCK_PRODUCTS.filter(
                (p) => p.category === category
              );
              const avgScore = Math.round(
                categoryProducts.reduce(
                  (s, p) => s + (p.opportunityScore ?? 0),
                  0
                ) / categoryProducts.length
              );
              return (
                <div key={category} className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-700 dark:text-zinc-300">{category}</p>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                      {count} products · avg score {avgScore}
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-500 dark:text-zinc-400">{count}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Recent Suggestions */}
      <motion.div {...anim(0.42)} className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-violet-400" />
            Recent Suggestions
          </h3>
          <Link
            href="/dashboard/suggestions"
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
          >
            View all
          </Link>
        </div>
        <div className="space-y-2">
          {getMockSuggestions()
            .sort((a, b) => b.viabilityScore - a.viabilityScore)
            .slice(0, 3)
            .map((suggestion) => (
              <Link
                key={suggestion.id}
                href={`/dashboard/suggestions/${suggestion.id}`}
                className="flex items-center gap-4 px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/30 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 dark:text-zinc-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                    {suggestion.title}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {suggestion.category} · ${suggestion.targetPrice.toFixed(2)}
                  </p>
                </div>
                <ViabilityMeter
                  score={suggestion.viabilityScore}
                  tier={suggestion.tier}
                  size="sm"
                />
              </Link>
            ))}
        </div>
      </motion.div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <motion.div {...anim(0.45)} className="glass-card rounded-xl p-4 text-center">
          <Star className="h-5 w-5 text-amber-400 mx-auto mb-2" />
          <p className="text-lg font-bold text-slate-900 dark:text-zinc-100 font-mono">{stats.avgRating}</p>
          <p className="text-[10px] text-zinc-500">Avg Rating</p>
        </motion.div>
        <motion.div {...anim(0.48)} className="glass-card rounded-xl p-4 text-center">
          <Zap className="h-5 w-5 text-violet-400 mx-auto mb-2" />
          <p className="text-lg font-bold text-slate-900 dark:text-zinc-100 font-mono">{stats.sProducts}</p>
          <p className="text-[10px] text-zinc-500">S-Tier Products</p>
        </motion.div>
        <motion.div {...anim(0.51)} className="glass-card rounded-xl p-4 text-center">
          <DollarSign className="h-5 w-5 text-emerald-400 mx-auto mb-2" />
          <p className="text-lg font-bold text-slate-900 dark:text-zinc-100 font-mono">${stats.avgPrice}</p>
          <p className="text-[10px] text-zinc-500">Avg Price</p>
        </motion.div>
        <motion.div {...anim(0.54)} className="glass-card rounded-xl p-4 text-center">
          <TrendingUp className="h-5 w-5 text-cyan-400 mx-auto mb-2" />
          <p className="text-lg font-bold text-slate-900 dark:text-zinc-100 font-mono">
            {((stats.sProducts + stats.aProducts) / stats.analyzedProducts * 100).toFixed(0)}%
          </p>
          <p className="text-[10px] text-zinc-500">Buy Rate</p>
        </motion.div>
      </div>
    </div>
  );
}
