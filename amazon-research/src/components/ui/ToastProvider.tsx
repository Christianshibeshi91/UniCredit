"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { AnimatePresence } from "framer-motion";
import { Toast, type ToastData, type ToastType } from "./Toast";

interface ToastContextValue {
  toast: (type: ToastType, title: string, description?: string, duration?: number) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const MAX_TOASTS = 5;

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const addToast = useCallback(
    (type: ToastType, title: string, description?: string, duration?: number) => {
      const id = `toast-${++toastCounter}-${Date.now()}`;
      const newToast: ToastData = { id, type, title, description, duration };

      setToasts((prev) => {
        const updated = [...prev, newToast];
        // Keep only the most recent toasts
        return updated.slice(-MAX_TOASTS);
      });
    },
    []
  );

  const success = useCallback(
    (title: string, description?: string) => addToast("success", title, description),
    [addToast]
  );

  const error = useCallback(
    (title: string, description?: string) => addToast("error", title, description, 6000),
    [addToast]
  );

  const info = useCallback(
    (title: string, description?: string) => addToast("info", title, description),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info, dismiss, dismissAll }}>
      {children}

      {/* Toast container */}
      <div
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
        aria-label="Notifications"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto">
              <Toast toast={t} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
