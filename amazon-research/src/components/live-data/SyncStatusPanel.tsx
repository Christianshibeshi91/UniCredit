"use client";

import { motion } from "framer-motion";
import { RefreshCw, Check, AlertCircle, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SyncStatus } from "@/lib/types/spapi";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

interface SyncStatusPanelProps {
  syncs: SyncStatus[];
  onSyncNow?: (type: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
  catalog: "Catalog",
  pricing: "Pricing",
  reviews: "Reviews",
  bsr: "BSR / Rankings",
  inventory: "Inventory",
  fees: "Fee Estimates",
};

function formatAge(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const age = Date.now() - new Date(dateStr).getTime();
  const mins = Math.round(age / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function SyncStatusPanel({ syncs, onSyncNow }: SyncStatusPanelProps) {
  return (
    <motion.div {...anim(0)} className="glass-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200 flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-cyan-400" />
          Sync Status
        </h3>
      </div>

      <div className="space-y-2">
        {syncs.map((sync, i) => (
          <motion.div
            key={sync.type}
            {...anim(0.05 * (i + 1))}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900/30"
          >
            {/* Status icon */}
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
              sync.status === "success" && "bg-emerald-100 dark:bg-emerald-900/30",
              sync.status === "syncing" && "bg-indigo-100 dark:bg-indigo-900/30",
              sync.status === "error" && "bg-red-100 dark:bg-red-900/30",
              sync.status === "idle" && "bg-slate-100 dark:bg-zinc-800",
            )}>
              {sync.status === "success" && <Check className="h-3 w-3 text-emerald-500" />}
              {sync.status === "syncing" && <Loader2 className="h-3 w-3 text-indigo-500 animate-spin" />}
              {sync.status === "error" && <AlertCircle className="h-3 w-3 text-red-500" />}
              {sync.status === "idle" && <Clock className="h-3 w-3 text-zinc-400" />}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                {TYPE_LABELS[sync.type] ?? sync.type}
              </p>
              <p className="text-[10px] text-zinc-500">
                Last: {formatAge(sync.lastSyncAt)} · {sync.itemCount} items
                {sync.errors.length > 0 && <span className="text-red-500"> · {sync.errors.length} errors</span>}
              </p>
            </div>

            {/* Sync button */}
            {onSyncNow && (
              <button
                onClick={() => onSyncNow(sync.type)}
                className="px-2 py-1 rounded text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors"
              >
                Sync
              </button>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
