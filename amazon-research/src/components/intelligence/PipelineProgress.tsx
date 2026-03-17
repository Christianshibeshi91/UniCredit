"use client";

import { motion } from "framer-motion";
import { Check, Loader2, AlertCircle, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PipelineStage } from "@/lib/types/intelligence";

interface StageState {
  stage: PipelineStage;
  index: number;
  status: "pending" | "running" | "complete" | "error";
  message: string;
}

interface PipelineProgressProps {
  stages: StageState[];
  currentStage: number;
}

const STAGE_ICONS: Record<string, string> = {
  context_aggregation: "1",
  beginner_filter: "2",
  market_synthesis: "3",
  product_definition: "4",
  financial_viability_check: "5",
  ninety_day_feasibility_check: "6",
  risk_analysis: "7",
  confidence_scoring: "8",
  final_synthesis: "9",
};

export function PipelineProgress({ stages, currentStage }: PipelineProgressProps) {
  return (
    <div className="max-w-lg mx-auto py-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 mb-4">
          <Brain className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100">
          Analyzing Your Market
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Running 9-stage intelligence pipeline...
        </p>
      </div>

      <div className="space-y-1">
        {stages.map((stage) => (
          <motion.div
            key={stage.stage}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: stage.index * 0.05, duration: 0.3 }}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors",
              stage.status === "running" && "bg-indigo-50 dark:bg-indigo-950/20",
              stage.status === "complete" && "opacity-70",
              stage.status === "error" && "bg-red-50 dark:bg-red-950/20",
            )}
          >
            {/* Status icon */}
            <div
              className={cn(
                "flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 transition-all",
                stage.status === "pending" && "bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500",
                stage.status === "running" && "bg-indigo-500 text-white",
                stage.status === "complete" && "bg-emerald-500 text-white",
                stage.status === "error" && "bg-red-500 text-white",
              )}
            >
              {stage.status === "complete" ? (
                <Check className="h-3.5 w-3.5" />
              ) : stage.status === "running" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : stage.status === "error" ? (
                <AlertCircle className="h-3.5 w-3.5" />
              ) : (
                STAGE_ICONS[stage.stage]
              )}
            </div>

            {/* Label */}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-sm truncate",
                  stage.status === "running" && "text-indigo-700 dark:text-indigo-300 font-medium",
                  stage.status === "complete" && "text-slate-500 dark:text-zinc-500",
                  stage.status === "pending" && "text-slate-400 dark:text-zinc-600",
                  stage.status === "error" && "text-red-700 dark:text-red-300",
                )}
              >
                {stage.message}
              </p>
            </div>

            {/* Pulse for running stage */}
            {stage.status === "running" && (
              <motion.div
                className="w-2 h-2 rounded-full bg-indigo-500"
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </motion.div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mt-6 px-4">
        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
            initial={{ width: "0%" }}
            animate={{
              width: `${((stages.filter((s) => s.status === "complete").length) / stages.length) * 100}%`,
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <p className="text-[10px] text-zinc-500 text-center mt-2">
          {stages.filter((s) => s.status === "complete").length} of {stages.length} stages complete
        </p>
      </div>
    </div>
  );
}
