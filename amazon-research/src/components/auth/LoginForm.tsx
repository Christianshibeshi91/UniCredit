"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  onForgotPassword?: (email: string) => void;
  className?: string;
}

export function LoginForm({ onSubmit, onForgotPassword, className }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    // Basic email format validation (RFC 5322 simplified)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }

    setLoading(true);
    try {
      await onSubmit(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onSubmit={handleSubmit}
      className={cn("space-y-5", className)}
      noValidate
    >
      {/* Email field */}
      <div className="space-y-1.5">
        <label htmlFor="login-email" className="block text-xs font-medium text-[var(--text-muted)]">
          Email address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-subtle)]" />
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={cn(
              "w-full pl-10 pr-4 py-2.5 rounded-xl text-sm",
              "bg-[var(--bg-input)] text-[var(--text)] placeholder:text-[var(--text-subtle)]",
              "border border-[var(--border)] focus:border-[var(--border-hover)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20",
              "transition-all duration-200"
            )}
            aria-describedby={error ? "login-error" : undefined}
          />
        </div>
      </div>

      {/* Password field */}
      <div className="space-y-1.5">
        <label htmlFor="login-password" className="block text-xs font-medium text-[var(--text-muted)]">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-subtle)]" />
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className={cn(
              "w-full pl-10 pr-10 py-2.5 rounded-xl text-sm",
              "bg-[var(--bg-input)] text-[var(--text)] placeholder:text-[var(--text-subtle)]",
              "border border-[var(--border)] focus:border-[var(--border-hover)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20",
              "transition-all duration-200"
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)] hover:text-[var(--text-muted)] transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Forgot password */}
      {onForgotPassword && (
        <div className="text-right">
          <button
            type="button"
            onClick={() => onForgotPassword(email)}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Forgot password?
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          id="login-error"
          role="alert"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs"
        >
          <span>{error}</span>
        </motion.div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={loading}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold",
          "bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 text-white",
          "hover:from-indigo-400 hover:via-violet-400 hover:to-indigo-400",
          "focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/40 focus:ring-offset-2 focus:ring-offset-[var(--bg)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-all duration-200 shadow-lg shadow-indigo-500/20"
        )}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Sign in
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </motion.form>
  );
}
