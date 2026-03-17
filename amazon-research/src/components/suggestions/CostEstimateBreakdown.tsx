"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Package,
  Truck,
  Store,
  Rocket,
  TrendingUp,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CostEstimate } from "@/lib/types";

interface CostEstimateBreakdownProps {
  estimate: CostEstimate;
}

function anim(delay: number) {
  return {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
  };
}

const currency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const currencyWhole = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

interface CollapsibleSectionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  total: number;
  rows: { label: string; amount: number }[];
  defaultOpen?: boolean;
  delay?: number;
}

function CollapsibleSection({
  icon: Icon,
  title,
  total,
  rows,
  defaultOpen = false,
  delay = 0,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <motion.div
      {...anim(delay)}
      className="rounded-lg bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/50 overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-zinc-800/30 transition-colors"
      >
        <Icon className="h-4 w-4 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
        <span className="flex-1 text-sm font-medium text-slate-900 dark:text-zinc-200">
          {title}
        </span>
        <span className="text-sm font-semibold font-mono text-slate-700 dark:text-zinc-300 mr-2">
          {currency(total)}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-zinc-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-500" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
          >
            <div className="px-4 pb-3 border-t border-slate-200 dark:border-zinc-800/30 pt-3 space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-zinc-400">
                    {row.label}
                  </span>
                  <span className="text-slate-700 dark:text-zinc-300 font-mono">
                    {currency(row.amount)}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function CostEstimateBreakdown({ estimate }: CostEstimateBreakdownProps) {
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);

  const sourcingRows = [
    { label: "Unit Cost", amount: estimate.sourcingCosts.unitCost },
    { label: `MOQ (${estimate.sourcingCosts.moqUnits.toLocaleString()} units)`, amount: estimate.sourcingCosts.moqTotalCost },
    { label: "Sample Cost", amount: estimate.sourcingCosts.sampleCost },
  ];

  const shippingRows = [
    { label: "Sea Freight (per unit)", amount: estimate.shippingCosts.seaFreight },
    { label: "Customs Duty (per unit)", amount: estimate.shippingCosts.customsDuty },
    { label: "Import Fees (per unit)", amount: estimate.shippingCosts.importFees },
    { label: "Total per Unit", amount: estimate.shippingCosts.totalPerUnit },
  ];

  const amazonRows = [
    { label: "FBA Fulfillment Fee (per unit)", amount: estimate.amazonFees.fbaFulfillmentFee },
    { label: "Referral Fee (per unit)", amount: estimate.amazonFees.referralFee },
    { label: "Storage Fee (monthly/unit)", amount: estimate.amazonFees.storageFeeMonthly },
    { label: "Total per Unit", amount: estimate.amazonFees.totalPerUnit },
  ];

  const launchRows = [
    { label: "Product Photography", amount: estimate.launchBudget.productPhotography },
    { label: "Branding & Packaging", amount: estimate.launchBudget.brandingAndPackaging },
    { label: "Sample Ordering", amount: estimate.launchBudget.sampleOrdering },
    { label: "PPC Launch Budget (90 days)", amount: estimate.launchBudget.ppcLaunchBudget },
    { label: "Amazon Storefront", amount: estimate.launchBudget.amazonStorefront },
    { label: "Total One-Time", amount: estimate.launchBudget.totalOneTime },
  ];

  return (
    <div className="space-y-4">
      {/* Collapsible cost sections */}
      <CollapsibleSection
        icon={Package}
        title="Sourcing Costs"
        total={estimate.sourcingCosts.moqTotalCost + estimate.sourcingCosts.sampleCost}
        rows={sourcingRows}
        defaultOpen
        delay={0}
      />
      <CollapsibleSection
        icon={Truck}
        title="Shipping & Import"
        total={estimate.shippingCosts.totalPerUnit * estimate.sourcingCosts.moqUnits}
        rows={shippingRows}
        delay={0.05}
      />
      <CollapsibleSection
        icon={Store}
        title="Amazon Fees"
        total={estimate.amazonFees.totalPerUnit}
        rows={amazonRows}
        delay={0.1}
      />
      <CollapsibleSection
        icon={Rocket}
        title="Launch Budget"
        total={estimate.launchBudget.totalOneTime}
        rows={launchRows}
        delay={0.15}
      />

      {/* Contingency + Total */}
      <motion.div
        {...anim(0.2)}
        className="glass-card rounded-xl p-5"
      >
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-500 dark:text-zinc-400">
            Contingency Buffer (15%)
          </span>
          <span className="text-slate-700 dark:text-zinc-300 font-mono">
            {currency(estimate.contingencyBuffer)}
          </span>
        </div>
        <div className="flex justify-between items-baseline pt-3 border-t border-slate-200 dark:border-zinc-800">
          <span className="text-base font-semibold text-slate-900 dark:text-zinc-100">
            Total Startup Capital
          </span>
          <span className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
            {currencyWhole(estimate.totalStartupCapital)}
          </span>
        </div>
      </motion.div>

      {/* ROI Panel */}
      <motion.div {...anim(0.25)}>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200">
            Return Projections
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card rounded-lg p-4 text-center">
            <p className="text-xl font-bold font-mono text-slate-900 dark:text-zinc-100">
              {estimate.breakEvenUnits.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 uppercase tracking-wider">
              Break-even Units
            </p>
          </div>
          <div className="glass-card rounded-lg p-4 text-center">
            <p className="text-xl font-bold font-mono text-slate-900 dark:text-zinc-100">
              {estimate.breakEvenMonths}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 uppercase tracking-wider">
              Break-even Months
            </p>
          </div>
          <div className="glass-card rounded-lg p-4 text-center">
            <p
              className={cn(
                "text-xl font-bold font-mono",
                estimate.roi12Month >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {(estimate.roi12Month * 100).toFixed(0)}%
            </p>
            <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 uppercase tracking-wider">
              12-Month ROI
            </p>
          </div>
        </div>
      </motion.div>

      {/* Monthly Projections */}
      {estimate.monthlyProjections.length > 0 && (
        <motion.div
          {...anim(0.3)}
          className="glass-card rounded-xl p-5"
        >
          <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200 mb-3">
            Monthly Projections
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800">
                  <th className="text-left py-2 text-slate-500 dark:text-zinc-400 font-medium">
                    Month
                  </th>
                  <th className="text-right py-2 text-slate-500 dark:text-zinc-400 font-medium">
                    Units
                  </th>
                  <th className="text-right py-2 text-slate-500 dark:text-zinc-400 font-medium">
                    Revenue
                  </th>
                  <th className="text-right py-2 text-slate-500 dark:text-zinc-400 font-medium">
                    Costs
                  </th>
                  <th className="text-right py-2 text-slate-500 dark:text-zinc-400 font-medium">
                    Profit
                  </th>
                  <th className="text-right py-2 text-slate-500 dark:text-zinc-400 font-medium">
                    Cumulative
                  </th>
                </tr>
              </thead>
              <tbody>
                {estimate.monthlyProjections.map((mp) => (
                  <tr
                    key={mp.month}
                    className="border-b border-slate-100 dark:border-zinc-800/50"
                  >
                    <td className="py-2 text-slate-700 dark:text-zinc-300 font-mono">
                      M{mp.month}
                    </td>
                    <td className="py-2 text-right text-slate-700 dark:text-zinc-300 font-mono">
                      {mp.unitsSold.toLocaleString()}
                    </td>
                    <td className="py-2 text-right text-slate-700 dark:text-zinc-300 font-mono">
                      {currency(mp.revenue)}
                    </td>
                    <td className="py-2 text-right text-slate-700 dark:text-zinc-300 font-mono">
                      {currency(mp.totalCosts)}
                    </td>
                    <td
                      className={cn(
                        "py-2 text-right font-mono",
                        mp.profit >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      )}
                    >
                      {currency(mp.profit)}
                    </td>
                    <td
                      className={cn(
                        "py-2 text-right font-mono",
                        mp.cumulativeProfit >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      )}
                    >
                      {currency(mp.cumulativeProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Assumptions accordion */}
      {estimate.assumptions.length > 0 && (
        <motion.div
          {...anim(0.35)}
          className="rounded-lg bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/50 overflow-hidden"
        >
          <button
            onClick={() => setAssumptionsOpen(!assumptionsOpen)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-zinc-800/30 transition-colors"
          >
            <Info className="h-4 w-4 text-zinc-500 flex-shrink-0" />
            <span className="flex-1 text-sm font-medium text-slate-600 dark:text-zinc-400">
              Assumptions ({estimate.assumptions.length})
            </span>
            {assumptionsOpen ? (
              <ChevronUp className="h-4 w-4 text-zinc-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-500" />
            )}
          </button>

          <AnimatePresence>
            {assumptionsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
              >
                <div className="px-4 pb-4 border-t border-slate-200 dark:border-zinc-800/30 pt-3">
                  <ul className="space-y-2">
                    {estimate.assumptions.map((assumption, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs text-slate-500 dark:text-zinc-400"
                      >
                        <span className="text-zinc-400 dark:text-zinc-600 mt-0.5">
                          &bull;
                        </span>
                        {assumption}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
