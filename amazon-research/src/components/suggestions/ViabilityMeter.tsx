"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ViabilityTier } from "@/lib/types";

interface ViabilityMeterProps {
  score: number;
  tier: ViabilityTier;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const tierColors: Record<ViabilityTier, string> = {
  S: "#8b5cf6",
  A: "#6366f1",
  B: "#3b82f6",
  C: "#f59e0b",
};

const sizeConfig = {
  sm: { width: 64, strokeWidth: 4, fontSize: "text-sm", tierSize: "text-[10px]" },
  md: { width: 80, strokeWidth: 5, fontSize: "text-lg", tierSize: "text-xs" },
  lg: { width: 100, strokeWidth: 6, fontSize: "text-xl", tierSize: "text-sm" },
};

function anim(delay: number) {
  return {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
  };
}

export function ViabilityMeter({
  score,
  tier,
  size = "md",
  className,
}: ViabilityMeterProps) {
  const config = sizeConfig[size];
  const color = tierColors[tier];
  const radius = (config.width - config.strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score));
  const dashLength = (progress / 100) * circumference;
  const center = config.width / 2;

  return (
    <motion.div
      {...anim(0)}
      className={cn("relative inline-flex items-center justify-center", className)}
    >
      <svg
        width={config.width}
        height={config.width}
        viewBox={`0 0 ${config.width} ${config.width}`}
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(148, 148, 168, 0.2)"
          strokeWidth={config.strokeWidth}
        />
        {/* Animated foreground arc */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={circumference}
          animate={{ strokeDashoffset: circumference - dashLength }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "font-bold font-mono tabular-nums text-slate-900 dark:text-zinc-100",
            config.fontSize
          )}
        >
          {score}
        </span>
        <span
          className={cn(
            "font-bold uppercase tracking-wider",
            config.tierSize
          )}
          style={{ color }}
        >
          {tier}
        </span>
      </div>
    </motion.div>
  );
}
