"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Target, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FinancialModel, ScenarioLabel } from "@/lib/types/intelligence";
import { AreaChart } from "./charts/AreaChart";
import { ScenarioBarChart } from "./charts/ScenarioBarChart";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

const currency = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(v);

const currencyWhole = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

interface FinancialModelViewProps {
  model: FinancialModel;
}

export function FinancialModelView({ model }: FinancialModelViewProps) {
  const [activeTab, setActiveTab] = useState<ScenarioLabel>("Base");
  const activeScenario = model.scenarios.find((s) => s.label === activeTab) ?? model.scenarios[1];

  const chartData = activeScenario.monthlyRevenue.map((rev, i) => ({
    month: i + 1,
    revenue: rev,
    costs: rev - activeScenario.monthlyNetProfit[i],
    profit: activeScenario.cumulativeProfit[i],
  }));

  const scenarioComparison = model.scenarios.map((s) => ({
    label: s.label,
    revenue: s.monthlyRevenue.reduce((a, b) => a + b, 0),
    profit: s.cumulativeProfit[s.cumulativeProfit.length - 1],
    roi: Math.round((s.cumulativeProfit[11] / model.launchBudget.total) * 100),
  }));

  const ue = model.unitEconomics;

  return (
    <motion.div {...anim(0)} className="glass-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-400" />
          Financial Model
        </h3>
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3 text-emerald-400" /> ROI: {model.roi12Month}%</span>
          <span className="flex items-center gap-1"><Target className="h-3 w-3 text-indigo-400" /> Break-even: Mo. {model.breakEvenMonths}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-violet-400" /> $100K rev: {model.monthsToSixFigureRevenue ? `Mo. ${model.monthsToSixFigureRevenue}` : "N/A"}</span>
        </div>
      </div>

      {/* Unit Economics */}
      <motion.div {...anim(0.05)} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Selling Price", value: currency(ue.sellingPrice), color: "text-indigo-500" },
          { label: "Variable Cost", value: currency(ue.totalVariableCost), color: "text-red-400" },
          { label: "Profit/Unit", value: currency(ue.profitPerUnit), color: "text-emerald-500" },
          { label: "Margin", value: `${ue.marginPercent}%`, color: "text-violet-500" },
        ].map((item) => (
          <div key={item.label} className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-900/30 text-center">
            <p className={cn("text-lg font-bold font-mono", item.color)}>{item.value}</p>
            <p className="text-[10px] text-zinc-500">{item.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Launch Budget */}
      <motion.div {...anim(0.1)} className="mb-5">
        <h4 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">
          Launch Budget
        </h4>
        <div className="space-y-1">
          {model.launchBudget.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs px-3 py-1.5">
              <span className="text-slate-600 dark:text-zinc-400">{item.label}</span>
              <span className="font-mono text-slate-700 dark:text-zinc-300">{currencyWhole(item.amount)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between text-xs px-3 py-1.5 border-t border-slate-200 dark:border-zinc-800">
            <span className="text-slate-500">Contingency (20%)</span>
            <span className="font-mono text-slate-500">{currencyWhole(model.launchBudget.contingency)}</span>
          </div>
          <div className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-slate-100 dark:bg-zinc-800/50 font-semibold">
            <span className="text-slate-900 dark:text-zinc-100">Total</span>
            <span className="font-mono text-slate-900 dark:text-zinc-100">{currencyWhole(model.launchBudget.total)}</span>
          </div>
        </div>
      </motion.div>

      {/* Scenario Tabs */}
      <motion.div {...anim(0.15)} className="mb-3">
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800/50 w-fit">
          {model.scenarios.map((s) => (
            <button
              key={s.label}
              onClick={() => setActiveTab(s.label)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                activeTab === s.label
                  ? "bg-white dark:bg-zinc-700 text-slate-900 dark:text-zinc-100 shadow-sm"
                  : "text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300",
              )}
            >
              {s.label} ({Math.round(s.probabilityWeight * 100)}%)
            </button>
          ))}
        </div>
      </motion.div>

      {/* Area Chart */}
      <motion.div {...anim(0.2)}>
        <AreaChart data={chartData} height={200} />
      </motion.div>

      {/* Scenario Comparison */}
      <motion.div {...anim(0.25)} className="mt-5">
        <h4 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">
          18-Month Scenario Comparison
        </h4>
        <ScenarioBarChart scenarios={scenarioComparison} height={160} />
      </motion.div>
    </motion.div>
  );
}
