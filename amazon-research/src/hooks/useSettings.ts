"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/hooks/useAuth";

export interface UserSettings {
  autoAnalyzeNewProducts: boolean;
  enableResponseCaching: boolean;
  claudeModel: string;
  maxReviewsPerBatch: number;
  analysisCompletionAlerts: boolean;
  theme: "light" | "dark";
  updatedAt: string;
}

const DEFAULT_SETTINGS: UserSettings = {
  autoAnalyzeNewProducts: true,
  enableResponseCaching: true,
  claudeModel: "claude-sonnet-4-20250514",
  maxReviewsPerBatch: 50,
  analysisCompletionAlerts: true,
  theme: "dark",
  updatedAt: new Date().toISOString(),
};

interface UseSettingsReturn {
  settings: UserSettings;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  saveSuccess: boolean;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  refresh: () => void;
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/settings", { headers });

      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated — use defaults
          setSettings(DEFAULT_SETTINGS);
          return;
        }
        throw new Error(`Failed to fetch settings: ${response.status}`);
      }

      const data: UserSettings = await response.json();
      setSettings({ ...DEFAULT_SETTINGS, ...data });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(
    async (updates: Partial<UserSettings>) => {
      setIsSaving(true);
      setError(null);
      setSaveSuccess(false);

      // Optimistic update
      const previousSettings = { ...settings };
      setSettings((prev) => ({ ...prev, ...updates }));

      try {
        const headers = await getAuthHeaders();
        const response = await fetch("/api/settings", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error ?? "Failed to save settings");
        }

        const data = await response.json();
        setSettings((prev) => ({ ...prev, ...data.settings, updatedAt: data.updatedAt }));
        setSaveSuccess(true);

        // Clear success indicator after 3 seconds
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (err) {
        // Rollback optimistic update
        setSettings(previousSettings);
        setError(err instanceof Error ? err.message : "Failed to save settings");
      } finally {
        setIsSaving(false);
      }
    },
    [settings]
  );

  return {
    settings,
    isLoading,
    isSaving,
    error,
    saveSuccess,
    updateSettings,
    refresh: fetchSettings,
  };
}
