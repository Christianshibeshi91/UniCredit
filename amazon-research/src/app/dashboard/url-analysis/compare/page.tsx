"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useURLAnalysis } from "@/hooks/useURLAnalysis";
import { AnalysisPipelineProgress } from "@/components/url-analysis/AnalysisPipelineProgress";
import { ComparisonScorecard } from "@/components/url-analysis/ComparisonScorecard";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

function CompareContent() {
  const searchParams = useSearchParams();
  const { isRunning, stages, comparison, error, startComparison } = useURLAnalysis();
  const [started, setStarted] = useState(false);

  const urlsParam = searchParams.get("urls") ?? "";
  const urls = urlsParam.split(",").map((u) => u.trim()).filter(Boolean);

  useEffect(() => {
    if (urls.length >= 2 && !started && !isRunning) {
      setStarted(true);
      startComparison(urls);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, isRunning]);

  // Show pipeline progress
  if (isRunning || (!comparison && !error)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <AnalysisPipelineProgress
          stages={stages}
          currentStage={stages.findIndex((s) => s.status === "running")}
          url={`Comparing ${urls.length} products...`}
        />
      </div>
    );
  }

  // Show error
  if (error && !comparison) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-red-500 mb-4">{error}</p>
        <Link
          href="/dashboard/url-analysis"
          className="text-xs text-blue-500 hover:text-blue-400 transition-colors"
        >
          Back to URL Analysis
        </Link>
      </div>
    );
  }

  if (!comparison) {
    return (
      <div className="text-center py-20">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-zinc-500">Loading comparison...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div {...anim(0)}>
        <Link
          href="/dashboard/url-analysis"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to URL Analysis
        </Link>
      </motion.div>

      <ComparisonScorecard comparison={comparison} />
    </div>
  );
}

export default function URLAnalysisComparePage() {
  return (
    <Suspense fallback={
      <div className="text-center py-20">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-zinc-500">Loading...</p>
      </div>
    }>
      <CompareContent />
    </Suspense>
  );
}
