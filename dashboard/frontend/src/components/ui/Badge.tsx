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
        variant === "default" && "bg-primary/10 text-primary",
        variant === "success" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        variant === "warning" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        variant === "destructive" && "bg-rose-500/10 text-rose-600 dark:text-rose-400",
        variant === "info" && "bg-sky-500/10 text-sky-600 dark:text-sky-400",
        variant === "secondary" && "bg-secondary text-secondary-foreground",
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
  return <Badge variant={variant}>{status || "—"}</Badge>
}
