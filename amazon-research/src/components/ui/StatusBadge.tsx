"use client";

import { cn } from "@/lib/utils";

type Status = "pending" | "processing" | "complete" | "failed";

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<Status, { label: string; color: string; pulse: boolean }> = {
  pending: {
    label: "Pending",
    color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    pulse: false,
  },
  processing: {
    label: "Analyzing",
    color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    pulse: true,
  },
  complete: {
    label: "Complete",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    pulse: false,
  },
  failed: {
    label: "Failed",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    pulse: false,
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.color,
        className
      )}
    >
      {config.pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
        </span>
      )}
      {config.label}
    </span>
  );
}
