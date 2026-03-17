"use client";

import { motion } from "framer-motion";
import { Image as ImageIcon, AlertCircle, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImageGradingResult } from "@/lib/types/urlAnalysis";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

function scoreColor(score: number) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-blue-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function gradeTextColor(grade: string) {
  if (grade.startsWith("A")) return "text-emerald-500";
  if (grade.startsWith("B")) return "text-blue-500";
  if (grade.startsWith("C")) return "text-amber-500";
  return "text-red-500";
}

interface ImageGradingGridProps {
  imageGrading: ImageGradingResult;
}

export function ImageGradingGrid({ imageGrading }: ImageGradingGridProps) {
  return (
    <motion.div {...anim(0)} className="glass-card rounded-xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Camera className="h-4 w-4 text-blue-500" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200">Image Grading</h3>
        <span className="text-xs font-mono text-zinc-500 ml-auto">
          Overall: {imageGrading.overallImageScore}/100
        </span>
      </div>

      {/* Image Cards */}
      <motion.div {...anim(0.05)} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {imageGrading.images.map((img, i) => (
          <div key={i} className="rounded-lg bg-slate-50 dark:bg-zinc-900/30 overflow-hidden border border-slate-200/50 dark:border-zinc-800/50">
            {/* Placeholder image area */}
            <div className="relative aspect-square bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
              <ImageIcon className="h-8 w-8 text-slate-300 dark:text-zinc-600" />
              <div className={cn(
                "absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold text-white",
                scoreColor(img.score),
              )}>
                {img.score}
              </div>
              <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/50 text-[9px] text-white capitalize">
                {img.type}
              </div>
            </div>
            <div className="p-2">
              <div className="flex items-center gap-1 mb-1">
                <span className={cn("text-xs font-bold font-mono", gradeTextColor(img.grade))}>
                  {img.grade}
                </span>
                <span className="text-[9px] text-zinc-500">Slot {img.imageIndex + 1}</span>
              </div>
              {img.strengths[0] && (
                <p className="text-[9px] text-emerald-600 dark:text-emerald-400 truncate">+ {img.strengths[0]}</p>
              )}
              {img.weaknesses[0] && (
                <p className="text-[9px] text-red-500 truncate">- {img.weaknesses[0]}</p>
              )}
            </div>
          </div>
        ))}
      </motion.div>

      {/* Missing Image Types */}
      {imageGrading.missingImageTypes.length > 0 && (
        <motion.div {...anim(0.1)}>
          <h4 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle className="h-3 w-3 text-amber-500" />
            Missing Image Types
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {imageGrading.missingImageTypes.map((type, i) => (
              <span key={i} className="text-[10px] px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/20">
                {type}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Priority Improvements */}
      {imageGrading.priorityImageImprovements.length > 0 && (
        <motion.div {...anim(0.15)}>
          <h4 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">
            Priority Improvements
          </h4>
          <ol className="space-y-1.5">
            {imageGrading.priorityImageImprovements.map((imp, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-zinc-400">
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold shrink-0">
                  {i + 1}
                </span>
                {imp.improvement}
              </li>
            ))}
          </ol>
        </motion.div>
      )}
    </motion.div>
  );
}
