"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Link2, Zap, ArrowRight, FileText, Plus, Trash2, GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMockReportSummaries } from "@/lib/mock-url-analysis";
import Link from "next/link";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

const SOURCE_HINTS: Record<string, { label: string; color: string }> = {
  amazon: { label: "Amazon", color: "text-orange-500" },
  alibaba: { label: "Alibaba", color: "text-red-500" },
  shopify: { label: "Shopify", color: "text-green-500" },
  generic: { label: "Generic", color: "text-slate-500" },
};

function detectSource(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("amazon")) return "amazon";
    if (host.includes("alibaba") || host.includes("1688")) return "alibaba";
    if (host.includes("shopify") || host.includes("myshopify")) return "shopify";
  } catch { /* ignore */ }
  return "generic";
}

interface URLDropZoneProps {
  onStart: (url: string) => void;
  onCompare: (urls: string[]) => void;
}

export function URLDropZone({ onStart, onCompare }: URLDropZoneProps) {
  const [url, setUrl] = useState("");
  const [compareMode, setCompareMode] = useState(false);
  const [compareUrls, setCompareUrls] = useState<string[]>(["", ""]);
  const pastReports = getMockReportSummaries();

  const detectedSource = url ? detectSource(url) : null;
  const hint = detectedSource ? SOURCE_HINTS[detectedSource] : null;

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").trim();
    if (pasted && pasted.startsWith("http")) {
      setUrl(pasted);
      e.preventDefault();
    }
  }, []);

  const handleSubmit = () => {
    if (compareMode) {
      const valid = compareUrls.filter((u) => u.trim());
      if (valid.length >= 2) onCompare(valid);
    } else if (url.trim()) {
      onStart(url.trim());
    }
  };

  const addCompareUrl = () => {
    if (compareUrls.length < 5) setCompareUrls([...compareUrls, ""]);
  };

  const removeCompareUrl = (index: number) => {
    if (compareUrls.length > 2) {
      setCompareUrls(compareUrls.filter((_, i) => i !== index));
    }
  };

  const updateCompareUrl = (index: number, value: string) => {
    setCompareUrls(compareUrls.map((u, i) => (i === index ? value : u)));
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <motion.div {...anim(0)} className="text-center max-w-2xl mx-auto pt-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 mb-6">
          <Link2 className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold gradient-text mb-3">
          URL Product Analysis
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-lg mx-auto">
          Drop any product URL and get a complete AI-powered analysis —
          grading, review mining, fake review detection, listing rewrite,
          supplier matching, and a prioritized action plan.
        </p>
      </motion.div>

      {/* Mode Toggle */}
      <motion.div {...anim(0.05)} className="flex justify-center">
        <button
          onClick={() => setCompareMode(!compareMode)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all",
            compareMode
              ? "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/30"
              : "text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/30",
          )}
        >
          <GitCompare className="h-3.5 w-3.5" />
          {compareMode ? "Comparison Mode" : "Compare Products"}
        </button>
      </motion.div>

      {/* URL Input */}
      <motion.div {...anim(0.1)} className="glass-card rounded-xl p-6 max-w-lg mx-auto">
        {!compareMode ? (
          <>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-3">
              Product URL
            </label>
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onPaste={handlePaste}
                placeholder="https://www.amazon.com/dp/..."
                className="w-full px-4 py-3 pr-20 rounded-lg bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800/50 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              {hint && (
                <span className={cn("absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wider", hint.color)}>
                  {hint.label}
                </span>
              )}
            </div>
          </>
        ) : (
          <>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-3">
              Compare Products (2–5 URLs)
            </label>
            <div className="space-y-2">
              {compareUrls.map((cu, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-400 w-4 shrink-0">{i + 1}</span>
                  <input
                    type="url"
                    value={cu}
                    onChange={(e) => updateCompareUrl(i, e.target.value)}
                    placeholder={`https://www.amazon.com/dp/... (Product ${i + 1})`}
                    className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800/50 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  {compareUrls.length > 2 && (
                    <button onClick={() => removeCompareUrl(i)} className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {compareUrls.length < 5 && (
                <button
                  onClick={addCompareUrl}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-500 hover:text-blue-600 transition-colors"
                >
                  <Plus className="h-3 w-3" /> Add URL
                </button>
              )}
            </div>
          </>
        )}

        <button
          onClick={handleSubmit}
          disabled={compareMode ? compareUrls.filter((u) => u.trim()).length < 2 : !url.trim()}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Zap className="h-4 w-4" />
          {compareMode ? "Compare Products" : "Analyze Product"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </motion.div>

      {/* How It Works */}
      <motion.div {...anim(0.2)} className="glass-card rounded-xl p-5 max-w-2xl mx-auto">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200 mb-3">How It Works</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { step: "1-3", label: "Detection & Grading", desc: "URL detection, normalization, and 5-dimension product grading" },
            { step: "4-9", label: "Deep Analysis", desc: "Review mining, fake detection, image grading, Q&A, pricing, suppliers" },
            { step: "10-15", label: "Optimization", desc: "Listing rewrite, competitor gaps, PPC keywords, pricing strategy, action plan" },
          ].map((item, i) => (
            <div key={i} className="text-center p-3 rounded-lg bg-slate-50 dark:bg-zinc-900/30">
              <div className="text-xs font-bold text-blue-500 mb-1">Stages {item.step}</div>
              <div className="text-xs font-medium text-slate-700 dark:text-zinc-300">{item.label}</div>
              <div className="text-[10px] text-zinc-500 mt-1">{item.desc}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Past Reports */}
      {pastReports.length > 0 && (
        <motion.div {...anim(0.3)} className="max-w-2xl mx-auto">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200 mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-zinc-400" />
            Past Analyses
          </h3>
          <div className="space-y-2">
            {pastReports.map((report) => (
              <Link
                key={report.id}
                href={`/dashboard/url-analysis/${report.id}`}
                className="flex items-center gap-4 px-4 py-3 rounded-lg glass-card hover:bg-slate-100 dark:hover:bg-zinc-800/30 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 dark:text-zinc-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
                    {report.productTitle}
                  </p>
                  <p className="text-xs text-zinc-500">{report.createdAt}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-slate-900 dark:text-zinc-100">
                    {report.overallGrade}
                  </span>
                  <p className="text-[10px] text-zinc-500">{report.overallScore}/100</p>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
