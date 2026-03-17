"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  Trophy,
  Lightbulb,
  Brain,
  Link2,
  Radio,
  Settings,
  Search,
  Zap,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/products", label: "Products", icon: Package },
  { href: "/dashboard/opportunities", label: "Opportunities", icon: Trophy },
  { href: "/dashboard/suggestions", label: "Suggestions", icon: Lightbulb },
  { href: "/dashboard/intelligence", label: "Intelligence", icon: Brain },
  { href: "/dashboard/url-analysis", label: "URL Analysis", icon: Link2 },
  { href: "/dashboard/live-data", label: "Live Data", icon: Radio },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-64 flex flex-col bg-[#f8f8fb] dark:bg-zinc-950/80 backdrop-blur-xl border-r border-zinc-200/50 dark:border-zinc-800/50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-200/50 dark:border-zinc-800/50">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Amazon Research</h1>
          <p className="text-[10px] text-slate-500 dark:text-zinc-500 tracking-wider uppercase">
            AI-Powered Analysis
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800/50 text-slate-400 dark:text-zinc-500">
          <Search className="h-3.5 w-3.5" />
          <span className="text-xs">Search products...</span>
          <kbd className="ml-auto text-[10px] bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500">
            /
          </kbd>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "text-zinc-900 dark:text-zinc-100"
                  : "text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/30"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-indigo-500/10 dark:bg-zinc-800/50 border border-indigo-500/20 dark:border-zinc-700/30"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                />
              )}
              <item.icon className={cn("h-4 w-4 relative z-10", isActive && "text-indigo-400")} />
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-4 py-4 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-3">
        {/* Theme toggle button */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/30 transition-colors"
        >
          {theme === "dark" ? (
            <Sun className="h-3.5 w-3.5" />
          ) : (
            <Moon className="h-3.5 w-3.5" />
          )}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>

        <div className="glass-card rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 status-pulse" />
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">API Active</span>
          </div>
          <p className="text-[10px] text-zinc-500">
            Claude Sonnet 4 · Firebase connected
          </p>
        </div>
      </div>
    </aside>
  );
}
