"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, FileText, FileSpreadsheet, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExportOption {
  format: "csv" | "pdf";
  label: string;
  icon: typeof FileText;
  onClick: () => void;
}

interface ExportButtonProps {
  options: ExportOption[];
  className?: string;
  disabled?: boolean;
}

export function ExportButton({ options, className, disabled }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)}>
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium",
          "bg-[var(--bg-input)] text-[var(--text-muted)]",
          "border border-[var(--border)] hover:border-[var(--border-hover)]",
          "hover:text-[var(--text)]",
          "focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-all duration-200"
        )}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Export options"
      >
        <Download className="h-4 w-4" />
        <span>Export</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-48 glass-card rounded-xl shadow-xl overflow-hidden z-40"
            role="menu"
          >
            {options.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.format}
                  onClick={() => {
                    option.onClick();
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--accent)] transition-colors"
                  role="menuitem"
                >
                  <Icon className="h-4 w-4 text-[var(--text-subtle)]" />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Pre-configured export button with CSV and PDF options.
 * Pass onExportCSV and/or onExportPDF callbacks.
 */
export function ProductExportButton({
  onExportCSV,
  onExportPDF,
  className,
  disabled,
}: {
  onExportCSV?: () => void;
  onExportPDF?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  const options: ExportOption[] = [];

  if (onExportCSV) {
    options.push({
      format: "csv",
      label: "Export as CSV",
      icon: FileSpreadsheet,
      onClick: onExportCSV,
    });
  }

  if (onExportPDF) {
    options.push({
      format: "pdf",
      label: "Export as PDF",
      icon: FileText,
      onClick: onExportPDF,
    });
  }

  if (options.length === 0) return null;

  return <ExportButton options={options} className={className} disabled={disabled} />;
}
