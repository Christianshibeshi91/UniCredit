"use client";

import { motion } from "framer-motion";
import { Package, FileSearch, Brain, Lightbulb, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = Package,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn("flex flex-col items-center justify-center py-16 px-6 text-center", className)}
    >
      {/* Illustrated icon with gradient ring */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/10 to-violet-500/10 blur-xl scale-150" />
        <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-[var(--bg-input)] border border-[var(--border)]">
          <Icon className="h-8 w-8 text-[var(--text-subtle)]" />
        </div>
        {/* Decorative dots */}
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-2 -right-2 w-3 h-3 rounded-full bg-indigo-500/20"
        />
        <motion.div
          animate={{ y: [0, 3, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-1 -left-3 w-2 h-2 rounded-full bg-violet-500/20"
        />
      </div>

      <h3 className="text-base font-semibold text-[var(--text)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--text-muted)] max-w-sm leading-relaxed">{description}</p>

      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            "mt-6 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold",
            "bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 text-white",
            "hover:from-indigo-400 hover:via-violet-400 hover:to-indigo-400",
            "focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/40",
            "transition-all duration-200 shadow-lg shadow-indigo-500/20"
          )}
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}

/** Pre-configured empty state for the Products page */
export function EmptyProducts({ onAdd }: { onAdd: () => void }) {
  return (
    <EmptyState
      icon={Package}
      title="No products yet"
      description="Add your first product by ASIN to start analyzing Amazon opportunities."
      action={{ label: "Add Product", onClick: onAdd }}
    />
  );
}

/** Pre-configured empty state for Intelligence reports */
export function EmptyReports({ onRun }: { onRun: () => void }) {
  return (
    <EmptyState
      icon={Brain}
      title="No intelligence reports"
      description="Run the 9-stage AI intelligence pipeline to get a comprehensive product analysis."
      action={{ label: "Run Pipeline", onClick: onRun }}
    />
  );
}

/** Pre-configured empty state for search results */
export function EmptySearchResults() {
  return (
    <EmptyState
      icon={FileSearch}
      title="No results found"
      description="Try adjusting your search terms or filters to find what you are looking for."
    />
  );
}

/** Pre-configured empty state for Suggestions */
export function EmptySuggestions({ onGenerate }: { onGenerate: () => void }) {
  return (
    <EmptyState
      icon={Lightbulb}
      title="No suggestions yet"
      description="Generate AI-powered product suggestions based on your research data."
      action={{ label: "Generate Suggestions", onClick: onGenerate }}
    />
  );
}
