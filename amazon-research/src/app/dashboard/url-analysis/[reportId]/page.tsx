"use client";

import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { useURLAnalysis } from "@/hooks/useURLAnalysis";
import { AnalysisPipelineProgress } from "@/components/url-analysis/AnalysisPipelineProgress";
import { ProductGradeCard } from "@/components/url-analysis/ProductGradeCard";
import { GradeDimensionBars } from "@/components/url-analysis/GradeDimensionBars";
import { ReviewMiningView } from "@/components/url-analysis/ReviewMiningView";
import { FakeReviewPanel } from "@/components/url-analysis/FakeReviewPanel";
import { ListingRewriteView } from "@/components/url-analysis/ListingRewriteView";
import { ImageGradingGrid } from "@/components/url-analysis/ImageGradingGrid";
import { QAInsightsPanel } from "@/components/url-analysis/QAInsightsPanel";
import { PriceHistoryChart } from "@/components/url-analysis/PriceHistoryChart";
import { SupplierMatchPanel } from "@/components/url-analysis/SupplierMatchPanel";
import { RepeatPurchaseScore } from "@/components/url-analysis/RepeatPurchaseScore";
import { ActionPlanSummary } from "@/components/url-analysis/ActionPlanSummary";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

export default function URLAnalysisReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = use(params);
  const searchParams = useSearchParams();
  const { isRunning, stages, report, error, startAnalysis, fetchReport } = useURLAnalysis();
  const [started, setStarted] = useState(false);

  const url = searchParams.get("url") ?? "";

  // If "new" — start analysis pipeline
  useEffect(() => {
    if (reportId === "new" && !started && !isRunning && url) {
      setStarted(true);
      startAnalysis(url);
    }
  }, [reportId, started, isRunning, url, startAnalysis]);

  // If existing report ID — fetch it
  useEffect(() => {
    if (reportId !== "new" && !report) {
      fetchReport(reportId);
    }
  }, [reportId, report, fetchReport]);

  // Show pipeline progress while running
  if (reportId === "new" && (isRunning || (!report && !error))) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <AnalysisPipelineProgress stages={stages} currentStage={stages.findIndex((s) => s.status === "running")} url={url} />
      </div>
    );
  }

  // Show error
  if (error && !report) {
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

  // Loading state
  if (!report) {
    return (
      <div className="text-center py-20">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-zinc-500">Loading report...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back nav + Export */}
      <motion.div {...anim(0)} className="flex items-center justify-between">
        <Link
          href="/dashboard/url-analysis"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to URL Analysis
        </Link>
        <button
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors"
          onClick={() => {
            import("@/lib/pdf/urlAnalysisPDF").then((mod) => mod.generateURLAnalysisPDF(report));
          }}
        >
          <Download className="h-3.5 w-3.5" />
          Export PDF
        </button>
      </motion.div>

      {/* 1. Product Grade Card (Hero) */}
      {report.grade && (
        <ProductGradeCard grade={report.grade} product={report.normalizedProduct} />
      )}

      {/* 2. Dimension Bars */}
      {report.grade && (
        <GradeDimensionBars dimensions={report.grade.dimensions} />
      )}

      {/* 3. Review Mining + Fake Review Detection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {report.reviewMining && (
          <ReviewMiningView reviewMining={report.reviewMining} />
        )}
        {report.fakeReviewDetection && (
          <FakeReviewPanel fakeReview={report.fakeReviewDetection} />
        )}
      </div>

      {/* 4. Listing Rewrite */}
      {report.listingRewrite && (
        <ListingRewriteView rewrite={report.listingRewrite} />
      )}

      {/* 5. Image Grading */}
      {report.imageGrading && (
        <ImageGradingGrid imageGrading={report.imageGrading} />
      )}

      {/* 6. Q&A Insights */}
      {report.qaExtraction && (
        <QAInsightsPanel qaResult={report.qaExtraction} />
      )}

      {/* 7. Price History + Supplier Match */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {report.priceHistory && (
          <PriceHistoryChart priceHistory={report.priceHistory} />
        )}
        {report.supplierMatch && (
          <SupplierMatchPanel supplierMatch={report.supplierMatch} />
        )}
      </div>

      {/* 8. Repeat Purchase */}
      {report.repeatPurchase && (
        <RepeatPurchaseScore repeatPurchase={report.repeatPurchase} />
      )}

      {/* 9. Action Plan */}
      {report.actionPlan && (
        <ActionPlanSummary actionPlan={report.actionPlan} />
      )}
    </div>
  );
}
