"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XCircle, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import type { DisqualifiedProduct } from "@/lib/types/intelligence";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

interface DisqualifiedProductsProps {
  products: DisqualifiedProduct[];
}

export function DisqualifiedProducts({ products }: DisqualifiedProductsProps) {
  const [expanded, setExpanded] = useState(false);

  if (products.length === 0) return null;

  return (
    <motion.div {...anim(0)} className="glass-card rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-zinc-800/20 transition-colors"
      >
        <XCircle className="h-4 w-4 text-red-400 shrink-0" />
        <div className="flex-1">
          <span className="text-sm font-medium text-slate-900 dark:text-zinc-200">
            {products.length} Products Eliminated
          </span>
          <p className="text-[10px] text-zinc-500">
            These products failed beginner seller qualification filters
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-zinc-400 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 space-y-2">
              {products.map((product, i) => (
                <motion.div
                  key={i}
                  {...anim(0.03 * i)}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900/30"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 dark:text-zinc-300">{product.productName}</p>
                    <p className="text-[10px] text-red-500 mt-0.5">{product.rejectionReason}</p>
                    <div className="flex items-center gap-1 mt-1.5 text-[10px] text-zinc-500">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800/50 font-mono text-[9px]">
                        {product.failedFilter}
                      </span>
                    </div>
                    <div className="flex items-start gap-1 mt-1.5">
                      <Lightbulb className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-600 dark:text-amber-400">{product.wouldWorkIf}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
