"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Play,
  RefreshCw,
  Star,
  Package,
  TrendingUp,
  DollarSign,
  Loader2,
  ExternalLink,
  BarChart3,
  ShoppingCart,
} from "lucide-react";
import { ScoreBadge, ScoreBar } from "@/components/dashboard/ScoreBadge";
import { AnalysisSummary } from "@/components/dashboard/AnalysisSummary";
import { Skeleton } from "@/components/ui/Skeleton";
import { getMockProduct, getMockAnalysis } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { ScoreBreakdown, Tier, Recommendation } from "@/lib/types";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

const recLabels: Record<Recommendation, { label: string; color: string }> = {
  strong_buy: { label: "Strong Buy", color: "text-violet-700 dark:text-violet-400 bg-violet-100 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20" },
  buy: { label: "Buy", color: "text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20" },
  watch: { label: "Watch", color: "text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20" },
  avoid: { label: "Avoid", color: "text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-500/10 border-slate-200 dark:border-zinc-500/20" },
};

export default function ProductDetailPage() {
  const params = useParams<{ asin: string }>();
  const router = useRouter();
  const asin = params.asin;
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const product = getMockProduct(asin);
  const analysis = getMockAnalysis(asin);

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-slate-500 dark:text-zinc-400 mb-4">Product not found: {asin}</p>
          <button
            onClick={() => router.push("/dashboard/products")}
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-sm"
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowAnalysis(true);
    }, 2000);
  };

  const rec = product.recommendation ? recLabels[product.recommendation] : null;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push("/dashboard/products")}
        className="flex items-center gap-2 text-sm text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Products
      </button>

      {/* Product Header */}
      <motion.div {...anim(0)} className="glass-card rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100">
              {product.title}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              {product.brand} · {product.category} · {product.subcategory} · ASIN: {product.asin}
            </p>
            <div className="flex items-center gap-3 mt-3">
              {rec && (
                <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border", rec.color)}>
                  {rec.label}
                </span>
              )}
              <a
                href={`https://www.amazon.com/dp/${product.asin}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors"
              >
                View on Amazon <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          {product.opportunityScore !== null && product.tier !== null && (
            <ScoreBadge
              score={product.opportunityScore}
              tier={product.tier}
              size="lg"
            />
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-400" />
            <div>
              <p className="text-xs text-zinc-500">Price</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-zinc-200">
                ${product.price.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-400" />
            <div>
              <p className="text-xs text-zinc-500">Rating</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-zinc-200">
                {product.rating}/5.0
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-indigo-400" />
            <div>
              <p className="text-xs text-zinc-500">Reviews</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-zinc-200">
                {product.reviewCount.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-violet-400" />
            <div>
              <p className="text-xs text-zinc-500">BSR</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-zinc-200">
                #{product.bsr.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-cyan-400" />
            <div>
              <p className="text-xs text-zinc-500">Est. Monthly Sales</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-zinc-200">
                {product.estimatedMonthlySales.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-pink-400" />
            <div>
              <p className="text-xs text-zinc-500">Profit Margin</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-zinc-200">
                {(product.profitMarginEstimate * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Score Breakdown */}
      {product.scoreBreakdown && (
        <motion.div {...anim(0.1)} className="glass-card rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-200 mb-4">
            Score Breakdown
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ScoreBar label="Demand" value={product.scoreBreakdown.demandScore} />
            <ScoreBar label="Competition" value={product.scoreBreakdown.competitionScore} />
            <ScoreBar label="Margin" value={product.scoreBreakdown.marginScore} />
            <ScoreBar label="Sentiment" value={product.scoreBreakdown.sentimentScore} />
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-zinc-800/50 flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              Total Score: {product.scoreBreakdown.demandScore + product.scoreBreakdown.competitionScore + product.scoreBreakdown.marginScore + product.scoreBreakdown.sentimentScore}/100
            </span>
            <span className="text-xs text-zinc-500">
              Each dimension is scored 0–25
            </span>
          </div>
        </motion.div>
      )}

      {/* Analyze Button */}
      <motion.div {...anim(0.15)} className="flex items-center gap-4">
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing reviews...
            </>
          ) : showAnalysis || analysis ? (
            <>
              <RefreshCw className="h-4 w-4" />
              Re-analyze Reviews
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Analyze Reviews
            </>
          )}
        </button>

        {isAnalyzing && (
          <span className="text-sm text-slate-500 dark:text-zinc-500">
            Processing {product.reviewCount.toLocaleString()} reviews with Claude...
          </span>
        )}

        {(showAnalysis || analysis) && !isAnalyzing && (
          <button
            onClick={() => setShowAnalysis(false)}
            className="text-xs text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-300"
          >
            Hide analysis
          </button>
        )}
      </motion.div>

      {/* Analysis Results */}
      {(showAnalysis || analysis) && !isAnalyzing && analysis && (
        <motion.div {...anim(0.2)}>
          <AnalysisSummary analysis={analysis} />
        </motion.div>
      )}

      {/* No analysis available notice */}
      {!analysis && !isAnalyzing && !showAnalysis && (
        <motion.div {...anim(0.2)} className="glass-card rounded-xl p-8 text-center">
          <BarChart3 className="h-8 w-8 text-slate-300 dark:text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            No analysis available yet. Click "Analyze Reviews" to run AI-powered review analysis.
          </p>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
            This will use Claude to extract complaints, feature requests, and market opportunities.
          </p>
        </motion.div>
      )}
    </div>
  );
}
