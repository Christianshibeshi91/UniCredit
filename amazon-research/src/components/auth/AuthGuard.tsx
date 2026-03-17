"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Zap } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  /**
   * Placeholder: Replace with real auth check once AuthProvider is wired.
   * Currently checks for a "session" key in localStorage as a stub.
   */
  isAuthenticated?: boolean;
  loading?: boolean;
}

export function AuthGuard({ children, isAuthenticated, loading }: AuthGuardProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // If parent provides explicit auth state, use it
    if (typeof isAuthenticated === "boolean") {
      if (!isAuthenticated && !loading) {
        router.replace("/login");
      }
      setChecking(false);
      return;
    }

    // Fallback: check localStorage stub (will be replaced by AuthProvider)
    try {
      const session = localStorage.getItem("session");
      if (!session) {
        router.replace("/login");
      }
    } catch {
      // localStorage unavailable
    }
    setChecking(false);
  }, [isAuthenticated, loading, router]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <Loader2 className="absolute -bottom-1 -right-1 h-5 w-5 text-indigo-400 animate-spin" />
          </div>
          <p className="text-sm text-[var(--text-muted)]">Loading...</p>
        </motion.div>
      </div>
    );
  }

  if (isAuthenticated === false) {
    return null; // Redirecting
  }

  return <>{children}</>;
}
