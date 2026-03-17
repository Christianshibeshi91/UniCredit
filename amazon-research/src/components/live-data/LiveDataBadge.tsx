"use client";

import { cn } from "@/lib/utils";

interface LiveDataBadgeProps {
  source: "live" | "mock" | "cached";
  ageSec?: number;
  className?: string;
}

export function LiveDataBadge({ source, ageSec, className }: LiveDataBadgeProps) {
  const isMock = source === "mock";
  const isFresh = !isMock && ageSec !== undefined && ageSec < 3600;
  const isStale = !isMock && ageSec !== undefined && ageSec >= 3600 && ageSec < 21600;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold",
        isMock && "bg-zinc-100 dark:bg-zinc-800 text-zinc-500",
        isFresh && "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400",
        isStale && "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400",
        !isMock && !isFresh && !isStale && "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400",
        className,
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          isMock && "bg-zinc-400",
          isFresh && "bg-emerald-400",
          isStale && "bg-amber-400",
          !isMock && !isFresh && !isStale && "bg-red-400",
        )}
      />
      {isMock ? "Mock" : source === "cached" ? "Cached" : "Live"}
    </span>
  );
}
