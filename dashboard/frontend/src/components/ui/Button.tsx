import { cn } from "@/lib/utils"
import { forwardRef } from "react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "ghost" | "link" | "success"
  size?: "default" | "sm" | "lg" | "icon"
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", loading, disabled, children, ...props }, ref) => (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-200 cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
        variant === "default" && "bg-primary text-primary-foreground shadow-sm hover:opacity-90",
        variant === "destructive" && "bg-destructive text-destructive-foreground shadow-sm hover:opacity-90",
        variant === "outline" && "border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-sm",
        variant === "ghost" && "hover:bg-accent hover:text-accent-foreground",
        variant === "link" && "text-primary underline-offset-4 hover:underline",
        variant === "success" && "bg-success text-success-foreground shadow-sm hover:opacity-90",
        size === "default" && "h-10 px-4 py-2 text-sm",
        size === "sm" && "h-8 px-3 text-xs",
        size === "lg" && "h-11 px-6 text-base",
        size === "icon" && "h-9 w-9 p-0",
        className,
      )}
      ref={ref}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  ),
)
Button.displayName = "Button"
