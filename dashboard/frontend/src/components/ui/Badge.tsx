import { cn } from "@/lib/utils"

interface BadgeProps {
  children: React.ReactNode
  variant?: "default" | "success" | "warning" | "destructive" | "info" | "secondary" | "outline"
  className?: string
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variant === "default" && "bg-primary/10 text-primary ring-1 ring-primary/20",
        variant === "success" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20",
        variant === "warning" && "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20",
        variant === "destructive" && "bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20",
        variant === "info" && "bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/20",
        variant === "secondary" && "bg-secondary text-secondary-foreground ring-1 ring-border/50",
        variant === "outline" && "border border-border text-foreground",
        className,
      )}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const s = (status || "").toLowerCase()
  const variant: BadgeProps["variant"] = s.includes("applied") || s.includes("yes")
    ? "success"
    : s.includes("interview")
      ? "info"
      : s.includes("fail") || s.includes("reject")
        ? "destructive"
        : s.includes("pending") || s.includes("review")
          ? "warning"
          : "secondary"
  return <Badge variant={variant}>{status || "\u2014"}</Badge>
}
