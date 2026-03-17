"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, Loader2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignupFormProps {
  onSubmit: (name: string, email: string, password: string) => Promise<void>;
  className?: string;
}

interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
  checks: { label: string; met: boolean }[];
}

function evaluatePassword(password: string): PasswordStrength {
  const checks = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Contains lowercase letter", met: /[a-z]/.test(password) },
    { label: "Contains a number", met: /\d/.test(password) },
    { label: "Contains special character", met: /[^A-Za-z0-9]/.test(password) },
  ];

  const score = checks.filter((c) => c.met).length;

  const labels: Record<number, { label: string; color: string }> = {
    0: { label: "Very weak", color: "bg-red-500" },
    1: { label: "Weak", color: "bg-red-400" },
    2: { label: "Fair", color: "bg-amber-500" },
    3: { label: "Good", color: "bg-emerald-400" },
    4: { label: "Strong", color: "bg-emerald-500" },
    5: { label: "Excellent", color: "bg-emerald-500" },
  };

  const config = labels[score] ?? labels[0];

  return { score, label: config.label, color: config.color, checks };
}

export function SignupForm({ onSubmit, className }: SignupFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = useMemo(() => evaluatePassword(password), [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (strength.score < 3) {
      setError("Password is too weak. Please use a stronger password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await onSubmit(name.trim(), email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed. Please try again.");
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
      className={cn("space-y-4", className)}
      noValidate
    >
      {/* Name field */}
      <div className="space-y-1.5">
        <label htmlFor="signup-name" className="block text-xs font-medium text-[var(--text-muted)]">
          Full name
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-subtle)]" />
          <input
            id="signup-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className={cn(
              "w-full pl-10 pr-4 py-2.5 rounded-xl text-sm",
              "bg-[var(--bg-input)] text-[var(--text)] placeholder:text-[var(--text-subtle)]",
              "border border-[var(--border)] focus:border-[var(--border-hover)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20",
              "transition-all duration-200"
            )}
          />
        </div>
      </div>

      {/* Email field */}
      <div className="space-y-1.5">
        <label htmlFor="signup-email" className="block text-xs font-medium text-[var(--text-muted)]">
          Email address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-subtle)]" />
          <input
            id="signup-email"
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
          />
        </div>
      </div>

      {/* Password field */}
      <div className="space-y-1.5">
        <label htmlFor="signup-password" className="block text-xs font-medium text-[var(--text-muted)]">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-subtle)]" />
          <input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a strong password"
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

        {/* Password strength indicator */}
        {password.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-2 pt-1"
          >
            <div className="flex items-center gap-2">
              <div className="flex-1 flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-all duration-300",
                      i < strength.score ? strength.color : "bg-[var(--border)]"
                    )}
                  />
                ))}
              </div>
              <span className="text-[10px] font-medium text-[var(--text-muted)]">{strength.label}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              {strength.checks.map((check) => (
                <div key={check.label} className="flex items-center gap-1.5">
                  {check.met ? (
                    <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                  ) : (
                    <X className="h-3 w-3 text-[var(--text-subtle)] shrink-0" />
                  )}
                  <span className={cn("text-[10px]", check.met ? "text-[var(--text-muted)]" : "text-[var(--text-subtle)]")}>
                    {check.label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Confirm password */}
      <div className="space-y-1.5">
        <label htmlFor="signup-confirm" className="block text-xs font-medium text-[var(--text-muted)]">
          Confirm password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-subtle)]" />
          <input
            id="signup-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            className={cn(
              "w-full pl-10 pr-4 py-2.5 rounded-xl text-sm",
              "bg-[var(--bg-input)] text-[var(--text)] placeholder:text-[var(--text-subtle)]",
              "border border-[var(--border)] focus:border-[var(--border-hover)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20",
              "transition-all duration-200",
              confirmPassword && password !== confirmPassword && "border-red-500/40"
            )}
          />
        </div>
        {confirmPassword && password !== confirmPassword && (
          <p className="text-[10px] text-red-400">Passwords do not match</p>
        )}
      </div>

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
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
            Create account
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </motion.form>
  );
}
