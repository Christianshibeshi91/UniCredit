"use client";

import { motion } from "framer-motion";
import { Radio, Activity, AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useLiveData } from "@/hooks/useLiveData";
import { SyncStatusPanel } from "@/components/live-data/SyncStatusPanel";
import { LiveDataToggle } from "@/components/live-data/LiveDataToggle";
import { LiveDataBadge } from "@/components/live-data/LiveDataBadge";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

// Mock product comparison data for the dashboard
const MOCK_COMPARISONS = [
  { asin: "B09XYZ1234", name: "Silicone Kitchen Utensil Set", mockPrice: 24.99, livePrice: 23.49, mockBSR: 12450, liveBSR: 11200, mockReviews: 1847, liveReviews: 1923 },
  { asin: "B08ABC5678", name: "Bamboo Cutting Board Set", mockPrice: 29.99, livePrice: 31.99, mockBSR: 8900, liveBSR: 9450, mockReviews: 3201, liveReviews: 3287 },
  { asin: "B07DEF9012", name: "Stainless Steel Mixing Bowls", mockPrice: 34.99, livePrice: 32.99, mockBSR: 5600, liveBSR: 4800, mockReviews: 5420, liveReviews: 5501 },
  { asin: "B06GHI3456", name: "Glass Food Storage Containers", mockPrice: 27.99, livePrice: 28.49, mockBSR: 15200, liveBSR: 14100, mockReviews: 2105, liveReviews: 2198 },
  { asin: "B05JKL7890", name: "Ceramic Knife Set with Block", mockPrice: 45.99, livePrice: 42.99, mockBSR: 22300, liveBSR: 19800, mockReviews: 892, liveReviews: 945 },
  { asin: "B04MNO2345", name: "Silicone Baking Mat Set (3-Pack)", mockPrice: 16.99, livePrice: 15.99, mockBSR: 3200, liveBSR: 2900, mockReviews: 8930, liveReviews: 9102 },
];

function DeltaIndicator({ current, previous, invert }: { current: number; previous: number; invert?: boolean }) {
  const diff = current - previous;
  const pct = previous > 0 ? ((diff / previous) * 100).toFixed(1) : "0.0";
  const isUp = diff > 0;
  const isNeutral = Math.abs(diff) < 0.01;

  // For BSR, lower is better (invert)
  const isPositive = invert ? !isUp : isUp;

  if (isNeutral) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-zinc-400">
        <Minus className="h-2.5 w-2.5" /> 0%
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
      {isUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      {isUp ? "+" : ""}{pct}%
    </span>
  );
}

export default function LiveDataPage() {
  const { status, isEnabled, isLoading } = useLiveData();

  if (isLoading) {
    return (
      <div className="text-center py-20">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-zinc-500">Loading live data status...</p>
      </div>
    );
  }

  const syncs = status?.syncs ?? [];
  const apiHealth = status?.apiHealth ?? "healthy";

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div {...anim(0)} className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <Radio className="h-5 w-5 text-cyan-400" />
            Live Data Dashboard
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Amazon SP-API integration status and product data comparison
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LiveDataBadge source={isEnabled ? "live" : "mock"} />
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ${
            apiHealth === "healthy" ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400" :
            apiHealth === "degraded" ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400" :
            "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400"
          }`}>
            <Activity className="h-3 w-3" />
            {apiHealth === "healthy" ? "API Healthy" : apiHealth === "degraded" ? "Degraded" : "Down"}
          </div>
        </div>
      </motion.div>

      {/* Toggle + Sync Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LiveDataToggle enabled={isEnabled} />
        <SyncStatusPanel syncs={syncs} />
      </div>

      {/* Price Movement Alerts */}
      <motion.div {...anim(0.15)} className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200">
            Price Movement Alerts
          </h3>
          <span className="text-[10px] text-zinc-500">&gt;10% change from baseline</span>
        </div>

        {(() => {
          const alerts = MOCK_COMPARISONS.filter(p => Math.abs((p.livePrice - p.mockPrice) / p.mockPrice) > 0.05);
          if (alerts.length === 0) {
            return <p className="text-xs text-zinc-500">No significant price movements detected.</p>;
          }
          return (
            <div className="space-y-2">
              {alerts.map((p) => {
                const pctChange = ((p.livePrice - p.mockPrice) / p.mockPrice * 100).toFixed(1);
                const isUp = p.livePrice > p.mockPrice;
                return (
                  <div key={p.asin} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-900/30">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isUp ? "bg-red-100 dark:bg-red-900/30" : "bg-emerald-100 dark:bg-emerald-900/30"}`}>
                      {isUp ? <TrendingUp className="h-3 w-3 text-red-500" /> : <TrendingDown className="h-3 w-3 text-emerald-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 dark:text-zinc-300 truncate">{p.name}</p>
                      <p className="text-[10px] text-zinc-500">${p.mockPrice.toFixed(2)} &rarr; ${p.livePrice.toFixed(2)}</p>
                    </div>
                    <span className={`text-xs font-semibold ${isUp ? "text-red-500" : "text-emerald-500"}`}>
                      {isUp ? "+" : ""}{pctChange}%
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </motion.div>

      {/* Product Comparison Table */}
      <motion.div {...anim(0.2)} className="glass-card rounded-xl p-5 overflow-hidden">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200 mb-4">
          Live vs Mock Data Comparison
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="text-left py-2 pr-4 text-zinc-500 font-medium">Product</th>
                <th className="text-right py-2 px-3 text-zinc-500 font-medium">Mock Price</th>
                <th className="text-right py-2 px-3 text-zinc-500 font-medium">Live Price</th>
                <th className="text-right py-2 px-3 text-zinc-500 font-medium">Delta</th>
                <th className="text-right py-2 px-3 text-zinc-500 font-medium">Mock BSR</th>
                <th className="text-right py-2 px-3 text-zinc-500 font-medium">Live BSR</th>
                <th className="text-right py-2 px-3 text-zinc-500 font-medium">BSR Delta</th>
                <th className="text-right py-2 pl-3 text-zinc-500 font-medium">Reviews</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_COMPARISONS.map((p) => (
                <tr key={p.asin} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-slate-50 dark:hover:bg-zinc-900/20 transition-colors">
                  <td className="py-2.5 pr-4">
                    <p className="font-medium text-slate-700 dark:text-zinc-300 truncate max-w-[200px]">{p.name}</p>
                    <p className="text-[10px] text-zinc-400 font-mono">{p.asin}</p>
                  </td>
                  <td className="text-right py-2.5 px-3 text-zinc-500 font-mono">${p.mockPrice.toFixed(2)}</td>
                  <td className="text-right py-2.5 px-3 text-slate-700 dark:text-zinc-300 font-mono font-medium">${p.livePrice.toFixed(2)}</td>
                  <td className="text-right py-2.5 px-3">
                    <DeltaIndicator current={p.livePrice} previous={p.mockPrice} />
                  </td>
                  <td className="text-right py-2.5 px-3 text-zinc-500 font-mono">#{p.mockBSR.toLocaleString()}</td>
                  <td className="text-right py-2.5 px-3 text-slate-700 dark:text-zinc-300 font-mono font-medium">#{p.liveBSR.toLocaleString()}</td>
                  <td className="text-right py-2.5 px-3">
                    <DeltaIndicator current={p.liveBSR} previous={p.mockBSR} invert />
                  </td>
                  <td className="text-right py-2.5 pl-3 text-slate-700 dark:text-zinc-300 font-mono">
                    {p.liveReviews.toLocaleString()}
                    <span className="text-emerald-500 text-[10px] ml-1">+{p.liveReviews - p.mockReviews}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* API Quota */}
      <motion.div {...anim(0.25)} className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200 mb-3">
          API Quota Usage (24h)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Catalog", used: 48, limit: 200 },
            { label: "Pricing", used: 312, limit: 1000 },
            { label: "Reviews", used: 24, limit: 100 },
            { label: "Fees", used: 96, limit: 500 },
          ].map((q) => {
            const pct = (q.used / q.limit) * 100;
            return (
              <div key={q.label} className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-900/30">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-medium text-zinc-500">{q.label}</span>
                  <span className="text-[10px] text-zinc-400">{q.used}/{q.limit}</span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-cyan-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
