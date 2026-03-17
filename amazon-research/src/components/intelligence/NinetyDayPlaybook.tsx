"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Calendar, CheckSquare, Lightbulb, DollarSign, Target, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NinetyDayPlaybook as PlaybookType } from "@/lib/types/intelligence";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

interface NinetyDayPlaybookProps {
  playbook: PlaybookType;
}

export function NinetyDayPlaybook({ playbook }: NinetyDayPlaybookProps) {
  const [expandedPhase, setExpandedPhase] = useState<number>(0);
  const [showMilestones, setShowMilestones] = useState(false);

  return (
    <motion.div {...anim(0)} className="glass-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-cyan-400" />
          90-Day Launch Playbook
        </h3>
        <span className="text-xs text-zinc-500">
          Go-live target: Day {playbook.goLiveTargetDay}
        </span>
      </div>

      {/* Day 1 Actions */}
      <motion.div {...anim(0.05)} className="mb-5 px-4 py-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/30">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-4 w-4 text-indigo-500" />
          <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Day 1 Actions</span>
        </div>
        <ol className="space-y-1 list-decimal list-inside">
          {playbook.day1Actions.map((action, i) => (
            <li key={i} className="text-xs text-slate-600 dark:text-zinc-400">{action}</li>
          ))}
        </ol>
      </motion.div>

      {/* Phase Timeline */}
      <div className="space-y-2">
        {playbook.phases.map((phase, pi) => {
          const isOpen = expandedPhase === pi;
          const totalCost = phase.tasks.reduce((s, t) => s + t.cost, 0);

          return (
            <motion.div
              key={pi}
              {...anim(0.1 + pi * 0.05)}
              className="rounded-lg border border-slate-200 dark:border-zinc-800/50 overflow-hidden"
            >
              <button
                onClick={() => setExpandedPhase(isOpen ? -1 : pi)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-zinc-800/20 transition-colors"
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                  pi === 0 && "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400",
                  pi === 1 && "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
                  pi === 2 && "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400",
                  pi === 3 && "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
                )}>
                  P{pi + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-zinc-200">{phase.name}</p>
                  <p className="text-[10px] text-zinc-500">
                    Days {phase.dayStart}-{phase.dayEnd} · {phase.tasks.length} tasks · ${totalCost} total
                  </p>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-zinc-400 shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
                )}
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      {phase.tasks.map((task, ti) => (
                        <div key={ti} className="rounded-lg bg-slate-50 dark:bg-zinc-900/30 p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300">{task.title}</p>
                              <p className="text-[10px] text-zinc-500">Days {task.dayStart}-{task.dayEnd}</p>
                            </div>
                            {task.cost > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/20 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                                <DollarSign className="h-2.5 w-2.5" />{task.cost}
                              </span>
                            )}
                          </div>

                          {/* Steps */}
                          <ol className="space-y-1 mb-2">
                            {task.exactSteps.map((step, si) => (
                              <li key={si} className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-zinc-400">
                                <CheckSquare className="h-3 w-3 text-slate-300 dark:text-zinc-600 shrink-0 mt-0.5" />
                                {step}
                              </li>
                            ))}
                          </ol>

                          {/* Beginner Tip */}
                          <div className="flex items-start gap-2 px-2.5 py-2 rounded-md bg-amber-50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-800/20">
                            <Lightbulb className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-amber-700 dark:text-amber-400">{task.beginnerTip}</p>
                          </div>

                          {/* Success Metric */}
                          <div className="flex items-start gap-2 mt-2">
                            <Target className="h-3 w-3 text-indigo-400 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-indigo-600 dark:text-indigo-400">{task.successMetric}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Weekly Milestones Toggle */}
      <motion.div {...anim(0.35)} className="mt-4">
        <button
          onClick={() => setShowMilestones(!showMilestones)}
          className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors"
        >
          {showMilestones ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {showMilestones ? "Hide" : "Show"} Weekly Milestones
        </button>

        <AnimatePresence>
          {showMilestones && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-1.5">
                {playbook.weeklyMilestones.map((m) => (
                  <div key={m.week} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-900/30">
                    <span className="text-[10px] font-bold text-zinc-400 w-6">W{m.week}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700 dark:text-zinc-300 truncate">{m.milestone}</p>
                      <p className="text-[10px] text-zinc-500">{m.kpi}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
