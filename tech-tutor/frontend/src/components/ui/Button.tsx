import { cn } from "../../lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { motion } from "framer-motion";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "ghost" | "outline" | "destructive" | "gradient";
  size?: "sm" | "default" | "lg" | "icon";
  loading?: boolean;
  glow?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", loading, glow, children, disabled, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center rounded-[var(--radius)] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";

    const variants: Record<string, string> = {
      default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sm hover:shadow-md",
      ghost: "hover:bg-[var(--accent)] text-[var(--text)] hover:text-[var(--text)]",
      outline: "border border-[var(--border)] bg-transparent hover:bg-[var(--accent)] hover:border-[var(--border-hover)] text-[var(--text)]",
      destructive: "bg-destructive text-white hover:bg-destructive/90 shadow-sm",
      gradient: "gradient-bg-animated text-white shadow-lg hover:shadow-xl hover:scale-[1.02]",
    };

    const sizes: Record<string, string> = {
      sm: "h-8 px-3 text-xs gap-1.5",
      default: "h-10 px-4 text-sm gap-2",
      lg: "h-12 px-6 text-base gap-2.5",
      icon: "h-10 w-10",
    };

    return (
      <button
        ref={ref}
        className={cn(
          base,
          variants[variant],
          sizes[size],
          glow && "glow-hover",
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

/* Animated button wrapper for special interactions */
function AnimatedButton({ children, className, ...props }: ButtonProps & { children: React.ReactNode }) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <Button className={className} {...props}>
        {children}
      </Button>
    </motion.div>
  );
}

export { Button, AnimatedButton };
