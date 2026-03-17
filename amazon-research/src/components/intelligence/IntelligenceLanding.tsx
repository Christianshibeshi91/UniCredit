"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Brain, Zap, ArrowRight, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMockReportSummaries } from "@/lib/mock-intelligence";
import Link from "next/link";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

interface IntelligenceLandingProps {
  onStart: (capital: number) => void;
}

export function IntelligenceLanding({ onStart }: IntelligenceLandingProps) {
  const [capital, setCapital] = useState(3500);
  const pastReports = getMockReportSummaries();

  return (
    <div className="space-y-8">
      {/* Hero */}
      <motion.div {...anim(0)} className="text-center max-w-2xl mx-auto pt-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 mb-6">
          <Brain className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold gradient-text mb-3">
          Find My Product
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-lg mx-auto">
          Our 9-stage AI pipeline analyzes your entire product database to answer one question
          with surgical precision: <strong className="text-slate-700 dark:text-zinc-200">&quot;What is the single exact product I should launch?&quot;</strong>
        </p>
      </motion.div>

      {/* Capital Input + CTA */}
      <motion.div {...anim(0.1)} className="glass-card rounded-xl p-6 max-w-md mx-auto">
        <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-3">
          Available Starting Capital
        </label>
        <div className="space-y-3">
          <input
            type="range"
            min={2000}
            max={5000}
            step={100}
            value={capital}
            onChange={(e) => setCapital(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none bg-slate-200 dark:bg-zinc-800 accent-indigo-500"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500">$2,000</span>
            <span className="text-lg font-bold font-mono text-slate-900 dark:text-zinc-100">
              ${capital.toLocaleString()}
            </span>
            <span className="text-[10px] text-zinc-500">$5,000</span>
          </div>
        </div>
        <button
          onClick={() => onStart(capital)}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-sm font-semibold hover:from-violet-600 hover:to-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
        >
          <Zap className="h-4 w-4" />
          Find My Product
          <ArrowRight className="h-4 w-4" />
        </button>
      </motion.div>

      {/* Pipeline Explanation */}
      <motion.div {...anim(0.2)} className="glass-card rounded-xl p-5 max-w-2xl mx-auto">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200 mb-3">
          How It Works
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { step: "1-2", label: "Data Aggregation", desc: "Collects & filters all product data through beginner constraints" },
            { step: "3-5", label: "AI Analysis", desc: "Market synthesis, product definition, and financial modeling" },
            { step: "6-9", label: "Validation", desc: "Playbook, risk analysis, probability scoring, and consistency check" },
          ].map((item, i) => (
            <div key={i} className="text-center p-3 rounded-lg bg-slate-50 dark:bg-zinc-900/30">
              <div className="text-xs font-bold text-indigo-500 mb-1">Stages {item.step}</div>
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
            Past Reports
          </h3>
          <div className="space-y-2">
            {pastReports.map((report) => (
              <Link
                key={report.id}
                href={`/dashboard/intelligence/${report.id}`}
                className="flex items-center gap-4 px-4 py-3 rounded-lg glass-card hover:bg-slate-100 dark:hover:bg-zinc-800/30 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 dark:text-zinc-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                    {report.productName}
                  </p>
                  <p className="text-xs text-zinc-500">{report.date}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-slate-900 dark:text-zinc-100">
                    {report.probability}%
                  </span>
                  <p className="text-[10px] text-zinc-500">probability</p>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
