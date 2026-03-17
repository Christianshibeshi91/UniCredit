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
  change,
  iconColor,
  delay,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtext?: string;
  change?: string;
  iconColor: string;
  delay: number;
}) {
  return (
    <motion.div {...anim(delay)} className="glass-card gradient-border-glow rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-zinc-800/80 dark:to-zinc-800/40">
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
        {change && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5 bg-emerald-500/10 px-2 py-0.5 rounded-full">
            <ArrowUpRight className="h-3 w-3" />
            {change}
          </span>
        )}
      </div>
      <div>
        <p className="text-3xl font-extrabold text-slate-900 dark:text-zinc-50 font-mono tracking-tight">{value}</p>
        <p className="text-sm text-zinc-500 mt-1 font-medium">{label}</p>
        {subtext && <p className="text-xs text-slate-400 dark:text-zinc-600 mt-0.5">{subtext}</p>}
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
        <h1 className="text-3xl font-extrabold gradient-text tracking-tight">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Overview of your Amazon product research pipeline
        </p>
      </motion.div>

      {/* Bento KPI Grid */}
      <div className="bento-grid">
        <KpiCard
          icon={Package}
          label="Total Products"
          value={stats.totalProducts.toString()}
          subtext={`${stats.analyzedProducts} analyzed`}
          change="12%"
          iconColor="text-indigo-500"
          delay={0.05}
        />
        <KpiCard
          icon={BarChart3}
          label="Avg Opportunity Score"
          value={stats.avgScore.toString()}
          subtext="out of 100"
          change="8%"
          iconColor="text-violet-500"
          delay={0.1}
        />
        <KpiCard
          icon={DollarSign}
          label="Total Est. Revenue"
          value={`$${(stats.totalRevenue / 1000).toFixed(0)}K`}
          subtext="monthly across tracked products"
          change="15%"
          iconColor="text-emerald-500"
          delay={0.15}
        />
        <KpiCard
          icon={MessageSquare}
          label="Reviews Analyzed"
          value={stats.totalReviews.toLocaleString()}
          subtext={`Avg ${stats.avgRating}/5 rating`}
          change="23%"
          iconColor="text-cyan-500"
          delay={0.2}
        />
      </div>

      {/* Charts Row - Bento style */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Score Trend - spans 2 cols */}
        <motion.div {...anim(0.25)} className="glass-card gradient-border-glow rounded-xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                Opportunity Score Trend
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Average score over last 6 months
              </p>
            </div>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-full">
              <TrendingUp className="h-3 w-3" />
              +{stats.avgScore - stats.trendScores[0]} pts
            </span>
          </div>
          <MiniLineChart
            data={stats.trendScores}
            labels={stats.trendMonths}
            height={160}
            color="#818cf8"
          />
        </motion.div>

        {/* Tier Distribution - larger and more impactful */}
        <motion.div {...anim(0.3)} className="glass-card gradient-border-glow rounded-xl p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100 mb-5">
            Tier Distribution
          </h3>
          <div className="flex items-center justify-center mb-5">
            <DonutChart
              segments={tierSegments}
              size={150}
              thickness={18}
              centerValue={stats.analyzedProducts.toString()}
              centerLabel="products"
            />
          </div>
          <div className="space-y-2.5">
            {tierSegments.map((seg) => (
              <div key={seg.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="text-slate-600 dark:text-zinc-400 font-medium">{seg.label}</span>
                </div>
                <span className="text-slate-800 dark:text-zinc-200 font-bold font-mono">{seg.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Opportunities */}
        <motion.div {...anim(0.35)} className="glass-card gradient-border-glow rounded-xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400" />
              Top Opportunities
            </h3>
            <Link
              href="/dashboard/opportunities"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="space-y-1">
            {topProducts.map((product, i) => (
              <Link
                key={product.id}
                href={`/dashboard/product/${product.asin}`}
                className="flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-all group"
              >
                <span className="text-sm font-bold text-slate-300 dark:text-zinc-600 w-6 text-center font-mono">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-zinc-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                    {product.title}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
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
        <motion.div {...anim(0.4)} className="glass-card gradient-border-glow rounded-xl p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100 mb-5">
            Category Breakdown
          </h3>
          <MiniBarChart
            data={categoryData.map(([, v]) => v)}
            labels={categoryData.map(([k]) => k.split(" ")[0])}
            height={100}
            barColor="bg-indigo-500"
          />
          <div className="mt-5 space-y-3">
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
                    <p className="text-xs font-medium text-slate-700 dark:text-zinc-300">{category}</p>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                      {count} products · avg score {avgScore}
                    </p>
                  </div>
                  <span className="text-xs font-bold font-mono text-slate-600 dark:text-zinc-400">{count}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Recent Suggestions */}
      <motion.div {...anim(0.42)} className="glass-card gradient-border-glow rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-violet-400" />
            Recent Suggestions
          </h3>
          <Link
            href="/dashboard/suggestions"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
          >
            View all
          </Link>
        </div>
        <div className="space-y-1">
          {getMockSuggestions()
            .sort((a, b) => b.viabilityScore - a.viabilityScore)
            .slice(0, 3)
            .map((suggestion) => (
              <Link
                key={suggestion.id}
                href={`/dashboard/suggestions/${suggestion.id}`}
                className="flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-zinc-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                    {suggestion.title}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
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
        <motion.div {...anim(0.45)} className="glass-card gradient-border-glow rounded-xl p-5 text-center">
          <Star className="h-5 w-5 text-amber-400 mx-auto mb-2" />
          <p className="text-2xl font-extrabold text-slate-900 dark:text-zinc-100 font-mono">{stats.avgRating}</p>
          <p className="text-xs text-zinc-500 mt-0.5">Avg Rating</p>
        </motion.div>
        <motion.div {...anim(0.48)} className="glass-card gradient-border-glow rounded-xl p-5 text-center">
          <Zap className="h-5 w-5 text-violet-400 mx-auto mb-2" />
          <p className="text-2xl font-extrabold text-slate-900 dark:text-zinc-100 font-mono">{stats.sProducts}</p>
          <p className="text-xs text-zinc-500 mt-0.5">S-Tier Products</p>
        </motion.div>
        <motion.div {...anim(0.51)} className="glass-card gradient-border-glow rounded-xl p-5 text-center">
          <DollarSign className="h-5 w-5 text-emerald-400 mx-auto mb-2" />
          <p className="text-2xl font-extrabold text-slate-900 dark:text-zinc-100 font-mono">${stats.avgPrice}</p>
          <p className="text-xs text-zinc-500 mt-0.5">Avg Price</p>
        </motion.div>
        <motion.div {...anim(0.54)} className="glass-card gradient-border-glow rounded-xl p-5 text-center">
          <TrendingUp className="h-5 w-5 text-cyan-400 mx-auto mb-2" />
          <p className="text-2xl font-extrabold text-slate-900 dark:text-zinc-100 font-mono">
            {((stats.sProducts + stats.aProducts) / stats.analyzedProducts * 100).toFixed(0)}%
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">Buy Rate</p>
        </motion.div>
      </div>
    </div>
  );
}
