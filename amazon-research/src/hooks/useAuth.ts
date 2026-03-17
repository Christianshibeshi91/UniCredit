"use client";

import { useState, useEffect, useCallback } from "react";
import {
  signIn as firebaseSignIn,
  signUp as firebaseSignUp,
  signOut as firebaseSignOut,
  signInWithGoogle as firebaseSignInWithGoogle,
  onIdTokenChange,
  getIdToken,
  type User,
} from "@/lib/firebase/auth";

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  token: string | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Listen for auth state and token changes
  useEffect(() => {
    const unsubscribe = onIdTokenChange(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        setToken(idToken);
        // Set session cookie for middleware route protection
        document.cookie = `__session=${idToken}; path=/; max-age=3600; SameSite=Lax; Secure`;
      } else {
        setToken(null);
        // Clear session cookie on sign-out
        document.cookie = "__session=; path=/; max-age=0; SameSite=Lax; Secure";
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      await firebaseSignIn(email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign in failed";
      setError(mapFirebaseError(message));
      setLoading(false);
      throw err;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const credential = await firebaseSignUp(email, password);
      // Create user profile on first sign-up
      const idToken = await credential.user.getIdToken();
      await fetch("/api/auth/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          email: credential.user.email,
          displayName: credential.user.displayName ?? credential.user.email?.split("@")[0] ?? "User",
        }),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign up failed";
      setError(mapFirebaseError(message));
      setLoading(false);
      throw err;
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const credential = await firebaseSignInWithGoogle();
      // Ensure user profile exists
      const idToken = await credential.user.getIdToken();
      await fetch("/api/auth/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          email: credential.user.email,
          displayName: credential.user.displayName ?? "User",
        }),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Google sign in failed";
      setError(mapFirebaseError(message));
      setLoading(false);
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      // Clear session cookie before signing out
      document.cookie = "__session=; path=/; max-age=0; SameSite=Lax; Secure";
      await firebaseSignOut();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign out failed";
      setError(message);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    user,
    loading,
    token,
    error,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    clearError,
  };
}

/**
 * Map Firebase error codes to user-friendly messages.
 * Avoids leaking internal error details.
 */
function mapFirebaseError(message: string): string {
  if (message.includes("auth/user-not-found") || message.includes("auth/wrong-password")) {
    return "Invalid email or password.";
  }
  if (message.includes("auth/email-already-in-use")) {
    return "An account with this email already exists.";
  }
  if (message.includes("auth/weak-password")) {
    return "Password must be at least 6 characters.";
  }
  if (message.includes("auth/invalid-email")) {
    return "Please enter a valid email address.";
  }
  if (message.includes("auth/too-many-requests")) {
    return "Too many attempts. Please try again later.";
  }
  if (message.includes("auth/popup-closed-by-user")) {
    return "Sign in was cancelled.";
  }
  if (message.includes("auth/network-request-failed")) {
    return "Network error. Please check your connection.";
  }
  return "Authentication failed. Please try again.";
}

/**
 * Helper to get current auth headers for API calls.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getIdToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
