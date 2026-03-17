"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to server-side error tracking
    console.error("[ErrorBoundary]", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  onRetry: () => void;
  className?: string;
}

export function ErrorFallback({ error, onRetry, className }: ErrorFallbackProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className
      )}
      role="alert"
    >
      {/* Error icon */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-red-500/10 blur-xl scale-150" />
        <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="h-7 w-7 text-red-400" />
        </div>
      </div>

      <h3 className="text-base font-semibold text-[var(--text)] mb-2">Something went wrong</h3>
      <p className="text-sm text-[var(--text-muted)] max-w-sm mb-1">
        An unexpected error occurred. Please try again.
      </p>

      {/* Show error name (not stack trace) in development */}
      {error && process.env.NODE_ENV === "development" && (
        <p className="text-xs text-red-400/80 font-mono mt-2 max-w-md break-words">
          {error.name}: {error.message}
        </p>
      )}

      <button
        onClick={onRetry}
        className={cn(
          "mt-6 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold",
          "bg-[var(--bg-input)] text-[var(--text-muted)] border border-[var(--border)]",
          "hover:border-[var(--border-hover)] hover:text-[var(--text)]",
          "focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20",
          "transition-all duration-200"
        )}
      >
        <RefreshCw className="h-4 w-4" />
        Try again
      </button>
    </div>
  );
}
