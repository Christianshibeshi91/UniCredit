"use client";

import { motion } from "framer-motion";
import { Check, Loader2, AlertCircle, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { URLAnalysisStage } from "@/lib/types/urlAnalysis";

interface StageState {
  stage: URLAnalysisStage;
  index: number;
  status: "pending" | "running" | "complete" | "error";
  message: string;
}

interface AnalysisPipelineProgressProps {
  stages: StageState[];
  currentStage: number;
  url: string;
}

export function AnalysisPipelineProgress({ stages, currentStage, url }: AnalysisPipelineProgressProps) {
  const completedCount = stages.filter((s) => s.status === "complete").length;

  return (
    <div className="max-w-lg mx-auto py-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 mb-4">
          <Link2 className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100">
          Analyzing Product
        </h2>
        <p className="text-xs text-zinc-500 mt-1 truncate max-w-sm mx-auto">
          {url}
        </p>
        <p className="text-xs text-zinc-400 mt-0.5">
          Running 15-stage analysis pipeline...
        </p>
      </div>

      <div className="space-y-1">
        {stages.map((stage) => (
          <motion.div
            key={stage.stage}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: stage.index * 0.03, duration: 0.3 }}
            className={cn(
              "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors",
              stage.status === "running" && "bg-blue-50 dark:bg-blue-950/20",
              stage.status === "complete" && "opacity-70",
              stage.status === "error" && "bg-red-50 dark:bg-red-950/20",
            )}
          >
            {/* Status icon */}
            <div
              className={cn(
                "flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold shrink-0 transition-all",
                stage.status === "pending" && "bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500",
                stage.status === "running" && "bg-blue-500 text-white",
                stage.status === "complete" && "bg-emerald-500 text-white",
                stage.status === "error" && "bg-red-500 text-white",
              )}
            >
              {stage.status === "complete" ? (
                <Check className="h-3 w-3" />
              ) : stage.status === "running" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : stage.status === "error" ? (
                <AlertCircle className="h-3 w-3" />
              ) : (
                stage.index + 1
              )}
            </div>

            {/* Label */}
            <p
              className={cn(
                "text-xs truncate flex-1",
                stage.status === "running" && "text-blue-700 dark:text-blue-300 font-medium",
                stage.status === "complete" && "text-slate-500 dark:text-zinc-500",
                stage.status === "pending" && "text-slate-400 dark:text-zinc-600",
                stage.status === "error" && "text-red-700 dark:text-red-300",
              )}
            >
              {stage.message}
            </p>

            {/* Pulse */}
            {stage.status === "running" && (
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-blue-500"
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
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
            initial={{ width: "0%" }}
            animate={{ width: `${(completedCount / stages.length) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <p className="text-[10px] text-zinc-500 text-center mt-2">
          {completedCount} of {stages.length} stages complete
        </p>
      </div>
    </div>
  );
}
