"use client";

import { motion } from "framer-motion";
import { Radio, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveDataToggleProps {
  enabled: boolean;
  className?: string;
}

export function LiveDataToggle({ enabled, className }: LiveDataToggleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("glass-card rounded-xl p-5", className)}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200 flex items-center gap-2">
          <Radio className="h-4 w-4 text-cyan-400" />
          Live Data Integration
        </h3>
        <div
          className={cn(
            "w-10 h-5 rounded-full relative transition-colors cursor-not-allowed",
            enabled ? "bg-emerald-500" : "bg-slate-200 dark:bg-zinc-700",
          )}
        >
          <div
            className={cn(
              "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all",
              enabled ? "left-5" : "left-0.5",
            )}
          />
        </div>
      </div>

      <p className="text-xs text-zinc-500 mb-3">
        {enabled
          ? "Live Amazon SP-API data is enriching product views in real-time."
          : "Live data is disabled. All product data comes from mock/Firebase sources."}
      </p>

      {!enabled && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-800/20">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-700 dark:text-amber-400">
            To enable live data, set <code className="font-mono bg-amber-100 dark:bg-amber-900/30 px-1 rounded">AMAZON_SP_API_ENABLED=true</code> and
            configure SP-API credentials in your environment variables.
          </p>
        </div>
      )}

      {enabled && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-800/20">
          <AlertTriangle className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
            SP-API quota usage is tracked. Sync schedules are configured to stay within rate limits.
          </p>
        </div>
      )}
    </motion.div>
  );
}
