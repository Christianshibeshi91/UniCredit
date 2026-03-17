"use client";

import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useIntelligence } from "@/hooks/useIntelligence";
import { PipelineProgress } from "@/components/intelligence/PipelineProgress";
import { VerdictCard } from "@/components/intelligence/VerdictCard";
import { BeginnerFitScore } from "@/components/intelligence/BeginnerFitScore";
import { SuccessProbabilityMeter } from "@/components/intelligence/SuccessProbabilityMeter";
import { FinancialModelView } from "@/components/intelligence/FinancialModelView";
import { NinetyDayPlaybook } from "@/components/intelligence/NinetyDayPlaybook";
import { RiskRegister } from "@/components/intelligence/RiskRegister";
import { DisqualifiedProducts } from "@/components/intelligence/DisqualifiedProducts";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

export default function IntelligenceReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = use(params);
  const searchParams = useSearchParams();
  const { isRunning, stages, report, error, startPipeline, fetchReport } = useIntelligence();
  const [started, setStarted] = useState(false);

  // If "new" — start pipeline
  useEffect(() => {
    if (reportId === "new" && !started && !isRunning) {
      setStarted(true);
      const capital = Number(searchParams.get("capital")) || 3500;
      startPipeline(capital);
    }
  }, [reportId, started, isRunning, searchParams, startPipeline]);

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
        <PipelineProgress stages={stages} currentStage={stages.findIndex((s) => s.status === "running")} />
      </div>
    );
  }

  // Show error
  if (error && !report) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-red-500 mb-4">{error}</p>
        <Link
          href="/dashboard/intelligence"
          className="text-xs text-indigo-500 hover:text-indigo-400 transition-colors"
        >
          Back to Intelligence
        </Link>
      </div>
    );
  }

  // Show report
  if (!report) {
    return (
      <div className="text-center py-20">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-zinc-500">Loading report...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <motion.div {...anim(0)}>
        <Link
          href="/dashboard/intelligence"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Intelligence
        </Link>
      </motion.div>

      {/* Verdict (Hero) */}
      {report.verdict && <VerdictCard verdict={report.verdict} />}

      {/* Beginner Fit + Success Probability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {report.beginnerFitAssessment && (
          <BeginnerFitScore assessment={report.beginnerFitAssessment} />
        )}
        {report.successProbability && (
          <SuccessProbabilityMeter probability={report.successProbability} />
        )}
      </div>

      {/* Financial Model */}
      {report.financialModel && (
        <FinancialModelView model={report.financialModel} />
      )}

      {/* 90-Day Playbook */}
      {report.ninetyDayPlaybook && (
        <NinetyDayPlaybook playbook={report.ninetyDayPlaybook} />
      )}

      {/* Risk Register */}
      {report.riskRegister && (
        <RiskRegister register={report.riskRegister} />
      )}

      {/* Disqualified Products */}
      {report.disqualifiedProducts.length > 0 && (
        <DisqualifiedProducts products={report.disqualifiedProducts} />
      )}
    </div>
  );
}
