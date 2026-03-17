"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Key,
  Database,
  Bell,
  Cpu,
  Palette,
  Shield,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { useSettings } from "@/hooks/useSettings";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

function SettingSection({
  icon: Icon,
  title,
  description,
  iconColor,
  children,
  delay,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  iconColor: string;
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.div {...anim(delay)} className="glass-card rounded-xl p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="p-2 rounded-lg bg-zinc-200/50 dark:bg-zinc-800/50">
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{title}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </motion.div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-200/30 dark:border-zinc-800/30 last:border-0">
      <div>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{label}</p>
        {description && (
          <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          checked ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-700"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const {
    settings,
    isLoading,
    isSaving,
    error: settingsError,
    saveSuccess,
    updateSettings,
  } = useSettings();

  // Derive local state from the hook's settings
  const autoAnalyze = settings.autoAnalyzeNewProducts;
  const notifications = settings.analysisCompletionAlerts;
  const caching = settings.enableResponseCaching;
  const [claudeModel, setClaudeModel] = useState(settings.claudeModel);
  const [maxReviews, setMaxReviews] = useState(settings.maxReviewsPerBatch);

  // Sync local controlled state when settings load from API
  const [synced, setSynced] = useState(false);
  if (!isLoading && !synced) {
    setClaudeModel(settings.claudeModel);
    setMaxReviews(settings.maxReviewsPerBatch);
    setSynced(true);
  }

  const setAutoAnalyze = (v: boolean) => updateSettings({ autoAnalyzeNewProducts: v });
  const setNotifications = (v: boolean) => updateSettings({ analysisCompletionAlerts: v });
  const setCaching = (v: boolean) => updateSettings({ enableResponseCaching: v });

  const handleSave = async () => {
    await updateSettings({
      claudeModel,
      maxReviewsPerBatch: maxReviews,
      theme,
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <motion.div {...anim(0)}>
        <h1 className="text-2xl font-bold gradient-text">Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Configure your research dashboard preferences
        </p>
      </motion.div>

      {/* API Keys */}
      <SettingSection
        icon={Key}
        title="API Configuration"
        description="Manage your API keys and service connections"
        iconColor="text-amber-400"
        delay={0.05}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1.5 block">
              Anthropic API Key
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value="sk-ant-••••••••••••••••••••••••"
                readOnly
                className="flex-1 rounded-lg bg-zinc-100/80 dark:bg-zinc-800/80 border border-zinc-300/50 dark:border-zinc-700/50 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
              />
              <button className="px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors border border-zinc-300/50 dark:border-zinc-700/50">
                Change
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1.5 block">
              Firebase Project ID
            </label>
            <input
              type="text"
              value="amazon-research-prod"
              readOnly
              className="w-full rounded-lg bg-zinc-100/80 dark:bg-zinc-800/80 border border-zinc-300/50 dark:border-zinc-700/50 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            />
          </div>
        </div>
      </SettingSection>

      {/* Analysis */}
      <SettingSection
        icon={Cpu}
        title="Analysis Settings"
        description="Configure how product reviews are analyzed"
        iconColor="text-violet-400"
        delay={0.1}
      >
        <div>
          <Toggle
            label="Auto-analyze new products"
            description="Automatically run Claude analysis when a new product is added"
            checked={autoAnalyze}
            onChange={setAutoAnalyze}
          />
          <Toggle
            label="Enable response caching"
            description="Cache analysis results for 7 days to save API costs"
            checked={caching}
            onChange={setCaching}
          />
          <div className="py-3">
            <label className="text-sm text-zinc-700 dark:text-zinc-300 mb-2 block">
              Claude Model
            </label>
            <select
              value={claudeModel}
              onChange={(e) => setClaudeModel(e.target.value)}
              className="rounded-lg bg-zinc-100/80 dark:bg-zinc-800/80 border border-zinc-300/50 dark:border-zinc-700/50 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 w-full"
            >
              <option value="claude-sonnet-4-20250514">Claude Sonnet 4 (claude-sonnet-4-20250514)</option>
              <option value="claude-opus-4-20250514">Claude Opus 4 (claude-opus-4-20250514)</option>
              <option value="claude-haiku-35-20241022">Claude Haiku 3.5 (claude-haiku-35-20241022)</option>
            </select>
          </div>
          <div className="py-3">
            <label className="text-sm text-zinc-700 dark:text-zinc-300 mb-2 block">
              Max reviews per analysis batch
            </label>
            <input
              type="number"
              value={maxReviews}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!Number.isNaN(val)) setMaxReviews(Math.max(10, Math.min(200, val)));
              }}
              min={10}
              max={200}
              className="w-24 rounded-lg bg-zinc-100/80 dark:bg-zinc-800/80 border border-zinc-300/50 dark:border-zinc-700/50 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 text-center font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            />
          </div>
        </div>
      </SettingSection>

      {/* Database */}
      <SettingSection
        icon={Database}
        title="Data Management"
        description="Manage your product database and analysis cache"
        iconColor="text-emerald-400"
        delay={0.15}
      >
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-zinc-100/50 dark:bg-zinc-900/50 p-3 text-center">
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 font-mono">16</p>
            <p className="text-[10px] text-zinc-500">Products</p>
          </div>
          <div className="rounded-lg bg-zinc-100/50 dark:bg-zinc-900/50 p-3 text-center">
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 font-mono">16</p>
            <p className="text-[10px] text-zinc-500">Analyses</p>
          </div>
          <div className="rounded-lg bg-zinc-100/50 dark:bg-zinc-900/50 p-3 text-center">
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 font-mono">172K</p>
            <p className="text-[10px] text-zinc-500">Reviews</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button className="px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors border border-zinc-300/50 dark:border-zinc-700/50">
            Export Data
          </button>
          <button className="px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors border border-zinc-300/50 dark:border-zinc-700/50">
            Clear Cache
          </button>
          <button className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/50 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors border border-red-200 dark:border-red-500/20">
            Reset Database
          </button>
        </div>
      </SettingSection>

      {/* Notifications */}
      <SettingSection
        icon={Bell}
        title="Notifications"
        description="Configure alerts and notification preferences"
        iconColor="text-cyan-400"
        delay={0.2}
      >
        <Toggle
          label="Analysis completion alerts"
          description="Get notified when a product analysis finishes"
          checked={notifications}
          onChange={setNotifications}
        />
      </SettingSection>

      {/* Appearance */}
      <SettingSection
        icon={Palette}
        title="Appearance"
        description="Customize the dashboard look and feel"
        iconColor="text-pink-400"
        delay={0.25}
      >
        <Toggle
          label="Dark mode"
          description="Use dark color scheme (recommended)"
          checked={theme === "dark"}
          onChange={(v) => setTheme(v ? "dark" : "light")}
        />
      </SettingSection>

      {/* Error display */}
      {settingsError && (
        <motion.div {...anim(0.28)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{settingsError}</span>
        </motion.div>
      )}

      {/* Save */}
      <motion.div {...anim(0.3)} className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-all",
            saveSuccess
              ? "bg-emerald-600"
              : "bg-indigo-600 hover:bg-indigo-500",
            isSaving && "opacity-60 cursor-not-allowed"
          )}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : saveSuccess ? (
            <>
              <Check className="h-4 w-4" />
              Saved!
            </>
          ) : (
            <>
              <Shield className="h-4 w-4" />
              Save Settings
            </>
          )}
        </button>
        <span className="text-xs text-zinc-500">
          {isLoading ? "Loading settings..." : "Settings are synced with your account"}
        </span>
      </motion.div>
    </div>
  );
}
