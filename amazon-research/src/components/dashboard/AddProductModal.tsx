"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Package,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AddProductModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (asin: string, autoAnalyze: boolean) => Promise<AddProductResult>;
}

interface AddProductResult {
  success: boolean;
  exists?: boolean;
  product?: {
    title: string;
    brand: string;
    category: string;
    price: number;
    rating: number;
    reviewCount: number;
    imageUrl?: string;
  };
  error?: string;
}

type ModalState = "input" | "loading" | "success" | "error";

const ASIN_REGEX = /^[A-Z0-9]{10}$/;

export function AddProductModal({ open, onClose, onSubmit }: AddProductModalProps) {
  const [asin, setAsin] = useState("");
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [state, setState] = useState<ModalState>("input");
  const [result, setResult] = useState<AddProductResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isValidAsin = ASIN_REGEX.test(asin.toUpperCase());

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setState("input");
      setAsin("");
      setResult(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const handleSubmit = useCallback(async () => {
    const normalizedAsin = asin.toUpperCase().trim();
    if (!ASIN_REGEX.test(normalizedAsin)) return;

    setState("loading");

    if (onSubmit) {
      try {
        const res = await onSubmit(normalizedAsin, autoAnalyze);
        setResult(res);
        setState(res.success ? "success" : "error");
      } catch {
        setResult({ success: false, error: "An unexpected error occurred." });
        setState("error");
      }
    } else {
      // Stub: simulate API call for UI demonstration
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setResult({
        success: true,
        exists: false,
        product: {
          title: `Product ${normalizedAsin}`,
          brand: "Example Brand",
          category: "Kitchen Gadgets",
          price: 24.99,
          rating: 4.3,
          reviewCount: 1250,
        },
      });
      setState("success");
    }
  }, [asin, autoAnalyze, onSubmit]);

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

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="glass-card rounded-2xl w-full max-w-lg p-6 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-product-title"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                    <Package className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <h2 id="add-product-title" className="text-base font-semibold text-[var(--text)]">
                      Add Product
                    </h2>
                    <p className="text-xs text-[var(--text-muted)]">Enter an Amazon ASIN to fetch product data</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-[var(--text-subtle)] hover:text-[var(--text)] hover:bg-[var(--accent)] transition-colors"
                  aria-label="Close modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <AnimatePresence mode="wait">
                {/* Input state */}
                {state === "input" && (
                  <motion.div
                    key="input"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-5"
                  >
                    <div className="space-y-1.5">
                      <label htmlFor="asin-input" className="block text-xs font-medium text-[var(--text-muted)]">
                        Amazon ASIN
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-subtle)]" />
                        <input
                          ref={inputRef}
                          id="asin-input"
                          type="text"
                          value={asin}
                          onChange={(e) => setAsin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
                          onKeyDown={(e) => e.key === "Enter" && isValidAsin && handleSubmit()}
                          placeholder="e.g., B09V3KXJPB"
                          maxLength={10}
                          className={cn(
                            "w-full pl-10 pr-4 py-3 rounded-xl text-sm font-mono tracking-wider",
                            "bg-[var(--bg-input)] text-[var(--text)] placeholder:text-[var(--text-subtle)]",
                            "border focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20",
                            "transition-all duration-200",
                            asin.length === 10 && !isValidAsin
                              ? "border-red-500/40"
                              : isValidAsin
                              ? "border-emerald-500/40"
                              : "border-[var(--border)] focus:border-[var(--border-hover)]"
                          )}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-subtle)] font-mono">
                          {asin.length}/10
                        </span>
                      </div>
                      {asin.length > 0 && asin.length < 10 && (
                        <p className="text-[10px] text-[var(--text-subtle)]">ASIN must be exactly 10 characters (letters and digits)</p>
                      )}
                    </div>

                    {/* Auto-analyze toggle */}
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <div
                        className={cn(
                          "relative w-9 h-5 rounded-full transition-colors",
                          autoAnalyze ? "bg-indigo-500" : "bg-[var(--border)]"
                        )}
                        onClick={() => setAutoAnalyze(!autoAnalyze)}
                        role="switch"
                        aria-checked={autoAnalyze}
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && setAutoAnalyze(!autoAnalyze)}
                      >
                        <div
                          className={cn(
                            "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                            autoAnalyze ? "translate-x-[18px]" : "translate-x-0.5"
                          )}
                        />
                      </div>
                      <span className="text-sm text-[var(--text-muted)]">Auto-analyze after adding</span>
                    </label>

                    {/* Submit */}
                    <button
                      onClick={handleSubmit}
                      disabled={!isValidAsin}
                      className={cn(
                        "w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                        "bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 text-white",
                        "hover:from-indigo-400 hover:via-violet-400 hover:to-indigo-400",
                        "focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/40",
                        "disabled:opacity-40 disabled:cursor-not-allowed",
                        "shadow-lg shadow-indigo-500/20"
                      )}
                    >
                      Add Product
                    </button>
                  </motion.div>
                )}

                {/* Loading state */}
                {state === "loading" && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center py-10 gap-4"
                  >
                    <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-[var(--text)]">Fetching product data...</p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">ASIN: {asin}</p>
                    </div>
                  </motion.div>
                )}

                {/* Success state */}
                {state === "success" && result?.product && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-5"
                  >
                    <div className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="text-sm font-medium">
                        {result.exists ? "Product already exists" : "Product added successfully"}
                      </span>
                    </div>

                    {/* Product preview card */}
                    <div className="rounded-xl bg-[var(--bg-input)] border border-[var(--border)] p-4 space-y-3">
                      <h3 className="text-sm font-semibold text-[var(--text)] line-clamp-2">
                        {result.product.title}
                      </h3>
                      <p className="text-xs text-[var(--text-muted)]">
                        {result.product.brand} &middot; {result.product.category}
                      </p>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-[var(--text)]">
                          <strong>${result.product.price.toFixed(2)}</strong>
                        </span>
                        <span className="text-[var(--text-muted)]">
                          {result.product.rating.toFixed(1)} stars
                        </span>
                        <span className="text-[var(--text-muted)]">
                          {result.product.reviewCount.toLocaleString()} reviews
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setState("input");
                          setAsin("");
                          setResult(null);
                        }}
                        className="flex-1 py-2 rounded-xl text-sm font-medium text-[var(--text-muted)] bg-[var(--bg-input)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors"
                      >
                        Add another
                      </button>
                      <button
                        onClick={onClose}
                        className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 transition-all shadow-lg shadow-indigo-500/20"
                      >
                        Done
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Error state */}
                {state === "error" && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-5"
                  >
                    <div className="flex items-center gap-2 text-red-400">
                      <AlertCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">Failed to add product</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                      {result?.error ?? "An unexpected error occurred. Please try again."}
                    </p>
                    <button
                      onClick={() => setState("input")}
                      className="w-full py-2 rounded-xl text-sm font-medium text-[var(--text-muted)] bg-[var(--bg-input)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors"
                    >
                      Try again
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
