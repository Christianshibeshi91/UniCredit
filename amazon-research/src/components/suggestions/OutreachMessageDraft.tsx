"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ClipboardCopy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OutreachMessage } from "@/lib/types";

interface OutreachMessageDraftProps {
  message: OutreachMessage;
}

function anim(delay: number) {
  return {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
  };
}

type CopyTarget = "subject" | "body" | null;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function wordCountColor(count: number): string {
  if (count > 250) return "text-red-600 dark:text-red-400";
  if (count >= 200) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

export function OutreachMessageDraft({ message }: OutreachMessageDraftProps) {
  const [activeTab, setActiveTab] = useState<number>(-1); // -1 = primary
  const [copied, setCopied] = useState<CopyTarget>(null);

  const tabs = [
    { index: -1, label: "Primary" },
    ...message.variants.map((v, i) => ({ index: i, label: v.label })),
  ];

  const activeSubject =
    activeTab === -1 ? message.subject : message.variants[activeTab].subject;
  const activeBody =
    activeTab === -1 ? message.body : message.variants[activeTab].body;
  const wc = wordCount(activeBody);

  const handleCopy = async (target: CopyTarget) => {
    if (!target) return;
    const text = target === "subject" ? activeSubject : activeBody;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(target);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard API may not be available in all contexts
    }
  };

  return (
    <motion.div {...anim(0)} className="space-y-4">
      {/* Tab bar */}
      {tabs.length > 1 && (
        <div className="flex gap-1 p-1 rounded-lg bg-slate-100 dark:bg-zinc-800/50">
          {tabs.map((tab) => (
            <button
              key={tab.index}
              onClick={() => setActiveTab(tab.index)}
              className={cn(
                "flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                activeTab === tab.index
                  ? "bg-white dark:bg-zinc-700 text-slate-900 dark:text-zinc-100 shadow-sm"
                  : "text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Subject line */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-medium">
            Subject
          </span>
          <CopyButton
            label="Copy Subject"
            isCopied={copied === "subject"}
            onClick={() => handleCopy("subject")}
          />
        </div>
        <div className="rounded-lg bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/50 px-4 py-2.5">
          <p className="text-sm font-medium text-slate-900 dark:text-zinc-100">
            {activeSubject}
          </p>
        </div>
      </div>

      {/* Message body */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-medium">
              Message
            </span>
            <span className={cn("text-[10px] font-mono tabular-nums", wordCountColor(wc))}>
              {wc} words
            </span>
          </div>
          <CopyButton
            label="Copy Message"
            isCopied={copied === "body"}
            onClick={() => handleCopy("body")}
          />
        </div>
        <div className="rounded-lg bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/50 px-4 py-3">
          <pre className="text-xs text-slate-700 dark:text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">
            {activeBody}
          </pre>
        </div>
      </div>
    </motion.div>
  );
}

// ── Sub-component ─────────────────────────────────────────────────

function CopyButton({
  label,
  isCopied,
  onClick,
}: {
  label: string;
  isCopied: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors",
        isCopied
          ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
          : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700"
      )}
    >
      {isCopied ? (
        <>
          <Check className="h-3 w-3" />
          Copied!
        </>
      ) : (
        <>
          <ClipboardCopy className="h-3 w-3" />
          {label}
        </>
      )}
    </button>
  );
}
