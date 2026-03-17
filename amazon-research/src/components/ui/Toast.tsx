"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info";

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number; // ms, default 4000
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const TOAST_ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const TOAST_STYLES: Record<ToastType, { icon: string; border: string; bg: string }> = {
  success: {
    icon: "text-emerald-400",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/5",
  },
  error: {
    icon: "text-red-400",
    border: "border-red-500/20",
    bg: "bg-red-500/5",
  },
  info: {
    icon: "text-indigo-400",
    border: "border-indigo-500/20",
    bg: "bg-indigo-500/5",
  },
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const { id, type, title, description, duration = 4000 } = toast;
  const Icon = TOAST_ICONS[type];
  const styles = TOAST_STYLES[type];

  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "glass-card rounded-xl border px-4 py-3 shadow-lg max-w-sm w-full",
        styles.border,
        styles.bg
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", styles.icon)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text)]">{title}</p>
          {description && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{description}</p>
          )}
        </div>
        <button
          onClick={() => onDismiss(id)}
          className="shrink-0 p-1 rounded-lg text-[var(--text-subtle)] hover:text-[var(--text)] hover:bg-[var(--accent)] transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
