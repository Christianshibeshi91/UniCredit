"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  ClipboardCopy,
  Check,
  Lock,
  CheckCircle,
  FileText,
  Users,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SupplierCard } from "./SupplierCard";
import { OutreachMessageDraft } from "./OutreachMessageDraft";
import type { SupplierSearch } from "@/lib/types";

interface SupplierSearchPanelProps {
  supplierSearch?: SupplierSearch;
}

function anim(delay: number) {
  return {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
  };
}

type StepNumber = 1 | 2 | 3;

interface StepConfig {
  number: StepNumber;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const steps: StepConfig[] = [
  { number: 1, label: "Search Strategy", icon: Search },
  { number: 2, label: "Score Suppliers", icon: Users },
  { number: 3, label: "Draft Message", icon: Mail },
];

export function SupplierSearchPanel({ supplierSearch }: SupplierSearchPanelProps) {
  const [activeStep, setActiveStep] = useState<StepNumber>(1);
  const [copiedKeywords, setCopiedKeywords] = useState(false);

  const hasSearchData = !!supplierSearch;
  const hasSuppliers = !!supplierSearch && supplierSearch.suppliers.length > 0;
  const hasOutreach = !!supplierSearch?.outreachMessage;

  const isStepAccessible = (step: StepNumber): boolean => {
    if (step === 1) return true;
    if (step === 2) return hasSearchData;
    if (step === 3) return hasSuppliers;
    return false;
  };

  const handleCopyKeywords = async () => {
    if (!supplierSearch) return;
    try {
      await navigator.clipboard.writeText(supplierSearch.searchKeywords.join(", "));
      setCopiedKeywords(true);
      setTimeout(() => setCopiedKeywords(false), 2000);
    } catch {
      // Clipboard API may not be available
    }
  };

  return (
    <motion.div {...anim(0)} className="space-y-6">
      {/* Step indicators */}
      <div className="flex items-center justify-center gap-0">
        {steps.map((step, i) => {
          const accessible = isStepAccessible(step.number);
          const active = activeStep === step.number;
          const StepIcon = step.icon;

          return (
            <div key={step.number} className="flex items-center">
              {/* Connecting line (before step, except first) */}
              {i > 0 && (
                <div
                  className={cn(
                    "w-12 h-0.5 sm:w-20",
                    accessible
                      ? "bg-indigo-500/50"
                      : "bg-slate-200 dark:bg-zinc-800"
                  )}
                />
              )}
              {/* Step circle */}
              <button
                onClick={() => accessible && setActiveStep(step.number)}
                disabled={!accessible}
                className={cn(
                  "flex flex-col items-center gap-1.5 group",
                  !accessible && "cursor-not-allowed"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors border-2",
                    active
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : accessible
                        ? "bg-slate-100 dark:bg-zinc-800 border-indigo-500/50 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10"
                        : "bg-slate-100 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-600"
                  )}
                >
                  {accessible ? (
                    <StepIcon className="h-4 w-4" />
                  ) : (
                    <Lock className="h-3.5 w-3.5" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium whitespace-nowrap",
                    active
                      ? "text-indigo-600 dark:text-indigo-400"
                      : accessible
                        ? "text-slate-600 dark:text-zinc-400"
                        : "text-slate-400 dark:text-zinc-600"
                  )}
                >
                  {step.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="glass-card rounded-xl p-5">
        {/* Step 1: Search Strategy */}
        {activeStep === 1 && (
          <div className="space-y-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200 flex items-center gap-2">
              <Search className="h-4 w-4 text-indigo-500" />
              Search Strategy
            </h3>

            {!supplierSearch ? (
              <p className="text-xs text-slate-500 dark:text-zinc-400 text-center py-6">
                No supplier search data available. Generate a search strategy first.
              </p>
            ) : (
              <>
                {/* Keywords */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                      Search Keywords
                    </span>
                    <button
                      onClick={handleCopyKeywords}
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors",
                        copiedKeywords
                          ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                          : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700"
                      )}
                    >
                      {copiedKeywords ? (
                        <>
                          <Check className="h-3 w-3" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <ClipboardCopy className="h-3 w-3" />
                          Copy All Keywords
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {supplierSearch.searchKeywords.map((keyword, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/20 cursor-default select-all"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Product Spec */}
                <div>
                  <span className="text-xs text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">
                    Product Specification
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <SpecItem label="Product" value={supplierSearch.productSpec.productName} />
                    <SpecItem label="Target Unit Cost" value={`$${supplierSearch.productSpec.targetUnitCost.toFixed(2)}`} />
                    <SpecItem label="Target MOQ" value={supplierSearch.productSpec.targetMOQ.toLocaleString()} />
                    <SpecItem label="Dimensions" value={supplierSearch.productSpec.targetDimensions} />
                    <SpecItem label="Weight" value={supplierSearch.productSpec.targetWeight} />
                    <SpecItem label="Packaging" value={supplierSearch.productSpec.packagingRequirements} />
                  </div>
                  {supplierSearch.productSpec.keyMaterials.length > 0 && (
                    <div className="mt-2">
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                        Materials:
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {supplierSearch.productSpec.keyMaterials.map((mat, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"
                          >
                            {mat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Filter Criteria */}
                <div>
                  <span className="text-xs text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">
                    Filter Criteria
                  </span>
                  <div className="space-y-1.5">
                    <FilterCheck label={`Min ${supplierSearch.filterCriteria.minYearsInBusiness}+ years in business`} />
                    <FilterCheck label={`Trade Assurance >= $${supplierSearch.filterCriteria.minTradeAssuranceUSD.toLocaleString()}`} />
                    <FilterCheck label={`Response Rate >= ${supplierSearch.filterCriteria.minResponseRate}%`} />
                    <FilterCheck label={`Max MOQ: ${supplierSearch.filterCriteria.maxMOQ.toLocaleString()} units`} />
                    <FilterCheck label={`Max Lead Time: ${supplierSearch.filterCriteria.maxLeadTimeDays} days`} />
                    {supplierSearch.filterCriteria.requiredVerifications.map((v, i) => (
                      <FilterCheck key={i} label={`Verification: ${v}`} />
                    ))}
                    {supplierSearch.filterCriteria.preferredRegions.map((r, i) => (
                      <FilterCheck key={`region-${i}`} label={`Region: ${r}`} />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 2: Score Suppliers */}
        {activeStep === 2 && (
          <div className="space-y-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200 flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-500" />
              Scored Suppliers
            </h3>

            {!hasSuppliers ? (
              <div className="text-center py-8">
                <FileText className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Paste supplier data from Alibaba to score them
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {supplierSearch!.suppliers.map((supplier) => (
                  <SupplierCard
                    key={supplier.id}
                    supplier={supplier}
                    isRecommended={supplier.id === supplierSearch!.recommendedSupplierId}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Draft Message */}
        {activeStep === 3 && (
          <div className="space-y-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200 flex items-center gap-2">
              <Mail className="h-4 w-4 text-indigo-500" />
              Outreach Message
            </h3>

            {!hasOutreach ? (
              <div className="text-center py-8">
                <Mail className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Select a supplier to draft outreach
                </p>
              </div>
            ) : (
              <OutreachMessageDraft message={supplierSearch!.outreachMessage!} />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function SpecItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/50 px-3 py-2">
      <p className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-xs text-slate-700 dark:text-zinc-300 mt-0.5 font-medium">
        {value}
      </p>
    </div>
  );
}

function FilterCheck({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
      <span className="text-slate-600 dark:text-zinc-300">{label}</span>
    </div>
  );
}
