"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Package,
  Lightbulb,
  Brain,
  ArrowRight,
  CornerDownLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: "product" | "suggestion" | "report";
  href: string;
}

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
  /**
   * Optional callback to provide search results.
   * If not provided, the dialog shows a placeholder state.
   */
  onSearch?: (query: string) => SearchResult[];
}

const TYPE_ICONS: Record<SearchResult["type"], typeof Package> = {
  product: Package,
  suggestion: Lightbulb,
  report: Brain,
};

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  product: "Product",
  suggestion: "Suggestion",
  report: "Intelligence Report",
};

export function SearchDialog({ open, onClose, onSearch }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const results: SearchResult[] = onSearch && query.trim().length >= 2
    ? onSearch(query.trim())
    : [];

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (results[selectedIndex]) {
            router.push(results[selectedIndex].href);
            onClose();
          }
          break;
        case "Escape":
          onClose();
          break;
      }
    },
    [results, selectedIndex, router, onClose]
  );

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Group results by type
  const groupedResults = results.reduce<Record<string, SearchResult[]>>((acc, result) => {
    const key = result.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(result);
    return acc;
  }, {});

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="glass-card rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Search products, suggestions, and reports"
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
                <Search className="h-5 w-5 text-[var(--text-subtle)] shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search products, suggestions, reports..."
                  className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none"
                  aria-label="Search query"
                  autoComplete="off"
                />
                <button
                  onClick={onClose}
                  className="shrink-0 text-[var(--text-subtle)] hover:text-[var(--text)] transition-colors"
                  aria-label="Close search"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto">
                {query.trim().length < 2 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-[var(--text-subtle)]">
                      Type at least 2 characters to search
                    </p>
                    <div className="flex items-center justify-center gap-4 mt-4 text-xs text-[var(--text-subtle)]">
                      <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border)] text-[10px]">
                          <CornerDownLeft className="h-3 w-3 inline" />
                        </kbd>
                        to select
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border)] text-[10px]">esc</kbd>
                        to close
                      </span>
                    </div>
                  </div>
                ) : results.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-[var(--text-muted)]">No results found</p>
                    <p className="text-xs text-[var(--text-subtle)] mt-1">
                      Try a different search term
                    </p>
                  </div>
                ) : (
                  <div className="py-2">
                    {Object.entries(groupedResults).map(([type, items]) => (
                      <div key={type}>
                        <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
                          {TYPE_LABELS[type as SearchResult["type"]]}
                        </p>
                        {items.map((result) => {
                          const globalIndex = results.indexOf(result);
                          const isSelected = globalIndex === selectedIndex;
                          const Icon = TYPE_ICONS[result.type];

                          return (
                            <button
                              key={result.id}
                              onClick={() => {
                                router.push(result.href);
                                onClose();
                              }}
                              onMouseEnter={() => setSelectedIndex(globalIndex)}
                              className={cn(
                                "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                                isSelected
                                  ? "bg-indigo-500/10 dark:bg-indigo-500/10"
                                  : "hover:bg-[var(--accent)]"
                              )}
                              role="option"
                              aria-selected={isSelected}
                            >
                              <Icon className={cn("h-4 w-4 shrink-0", isSelected ? "text-indigo-400" : "text-[var(--text-subtle)]")} />
                              <div className="flex-1 min-w-0">
                                <p className={cn("text-sm truncate", isSelected ? "text-[var(--text)]" : "text-[var(--text-muted)]")}>
                                  {result.title}
                                </p>
                                {result.subtitle && (
                                  <p className="text-xs text-[var(--text-subtle)] truncate">{result.subtitle}</p>
                                )}
                              </div>
                              {isSelected && <ArrowRight className="h-3.5 w-3.5 text-indigo-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-input)]/30">
                <p className="text-[10px] text-[var(--text-subtle)]">
                  {results.length > 0 ? `${results.length} result${results.length !== 1 ? "s" : ""}` : "Search"}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-[var(--text-subtle)]">
                  <kbd className="px-1 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border)]">Cmd+K</kbd>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to manage Cmd+K search dialog state.
 * Returns [isOpen, open, close] and auto-registers the keyboard shortcut.
 */
export function useSearchDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return {
    open,
    onOpen: () => setOpen(true),
    onClose: () => setOpen(false),
  };
}
