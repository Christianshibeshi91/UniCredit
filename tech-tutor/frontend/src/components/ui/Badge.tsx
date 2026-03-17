import { cn } from "../../lib/utils";
import type { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "manus" | "gemini" | "notebooklm" | "claude" | "deep" | "success" | "warning" | "outline";
}

const variantStyles: Record<string, string> = {
  default: "bg-primary/10 text-primary border-primary/20",
  manus: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  gemini: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  notebooklm: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  claude: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  deep: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  outline: "bg-transparent text-[var(--text-muted)] border-[var(--border)]",
};

export function Badge({ variant = "default", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full border uppercase tracking-wider",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
