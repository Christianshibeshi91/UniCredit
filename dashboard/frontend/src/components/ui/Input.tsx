import { cn } from "@/lib/utils"
import { forwardRef } from "react"

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      className={cn(
        "flex h-10 w-full rounded-xl border border-border/50 bg-background/50 px-3 py-2 text-sm",
        "shadow-sm backdrop-blur-sm transition-all duration-200",
        "placeholder:text-muted-foreground/50",
        "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Input.displayName = "Input"
