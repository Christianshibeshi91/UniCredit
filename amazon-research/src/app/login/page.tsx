"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

type Tab = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("login");

  // Placeholder handlers — wire to Firebase Auth when AuthProvider is built
  const handleLogin = async (email: string, _password: string) => {
    // TODO: Replace with Firebase signInWithEmailAndPassword
    console.log("Login:", email);
    router.push("/dashboard");
  };

  const handleSignup = async (name: string, email: string, _password: string) => {
    // TODO: Replace with Firebase createUserWithEmailAndPassword
    console.log("Signup:", name, email);
    router.push("/dashboard");
  };

  const handleGoogleSignIn = async () => {
    // TODO: Replace with Firebase signInWithPopup(GoogleAuthProvider)
    console.log("Google sign-in");
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 py-12">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-[var(--bg)]" />

      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <motion.div
          animate={{
            x: [0, 40, -20, 0],
            y: [0, -30, 20, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -30, 20, 0],
            y: [0, 40, -20, 0],
            scale: [1, 0.95, 1.1, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, 20, -30, 0],
            y: [0, -20, 30, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-cyan-500/8 blur-3xl"
        />
      </div>

      {/* Glassmorphism login card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass-card rounded-2xl p-8">
          {/* Logo and header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 mx-auto mb-4 shadow-lg shadow-indigo-500/20">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-[var(--text)]">Amazon Research</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              AI-powered product opportunity analysis
            </p>
          </div>

          {/* Tab switcher */}
          <div className="relative flex items-center rounded-xl bg-[var(--bg-input)] p-1 mb-6">
            {(["login", "signup"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "relative flex-1 py-2 text-sm font-medium text-center rounded-lg transition-colors z-10",
                  tab === t ? "text-[var(--text)]" : "text-[var(--text-subtle)] hover:text-[var(--text-muted)]"
                )}
              >
                {tab === t && (
                  <motion.div
                    layoutId="auth-tab"
                    className="absolute inset-0 rounded-lg bg-[var(--bg-elevated)] shadow-sm"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">{t === "login" ? "Sign in" : "Create account"}</span>
              </button>
            ))}
          </div>

          {/* Form content */}
          <AnimatePresence mode="wait">
            {tab === "login" ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                <LoginForm onSubmit={handleLogin} />
              </motion.div>
            ) : (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <SignupForm onSubmit={handleSignup} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-xs text-[var(--text-subtle)]">or</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          {/* Google sign-in */}
          <GoogleSignInButton onSignIn={handleGoogleSignIn} />
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--text-subtle)] mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}
