"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  Trophy,
  Lightbulb,
  Brain,
  Radio,
  Settings,
  Search,
  Zap,
  Sun,
  Moon,
  Menu,
  X,
  LogOut,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { SearchDialog, useSearchDialog } from "@/components/ui/SearchDialog";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/products", label: "Products", icon: Package },
  { href: "/dashboard/opportunities", label: "Opportunities", icon: Trophy },
  { href: "/dashboard/suggestions", label: "Suggestions", icon: Lightbulb },
  { href: "/dashboard/intelligence", label: "Intelligence", icon: Brain },
  { href: "/dashboard/live-data", label: "Live Data", icon: Radio },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function SidebarContent({
  pathname,
  onNavClick,
}: {
  pathname: string;
  onNavClick?: () => void;
}) {
  const { theme, toggleTheme } = useTheme();
  const search = useSearchDialog();

  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-200/50 dark:border-zinc-800/50 shrink-0">
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
      <div className="px-4 py-4 shrink-0">
        <button
          onClick={() => {
            search.onOpen();
            onNavClick?.();
          }}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800/50 text-slate-400 dark:text-zinc-500 hover:border-indigo-500/30 transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="text-xs">Search products...</span>
          <kbd className="ml-auto text-[10px] bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500">
            /
          </kbd>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
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

      {/* Bottom section */}
      <div className="px-4 py-4 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-3 shrink-0">
        {/* User avatar and sign out */}
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20">
            <User className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">User</p>
            <p className="text-[10px] text-zinc-500 truncate">user@example.com</p>
          </div>
          <button
            onClick={() => {
              // TODO: Wire to Firebase signOut when AuthProvider is built
              console.log("Sign out");
            }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Theme toggle */}
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

        {/* Status card */}
        <div className="glass-card rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 status-pulse" />
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">API Active</span>
          </div>
          <p className="text-[10px] text-zinc-500">
            Claude Sonnet 4 &middot; Firebase connected
          </p>
        </div>
      </div>

      {/* Search dialog */}
      <SearchDialog open={search.open} onClose={search.onClose} />
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Close mobile menu on resize past breakpoint
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-mesh">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col bg-[#f8f8fb] dark:bg-zinc-950/80 backdrop-blur-xl border-r border-zinc-200/50 dark:border-zinc-800/50">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center gap-3 px-4 bg-[#f8f8fb]/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/30 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Amazon Research</span>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.35 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-[#f8f8fb] dark:bg-zinc-950 border-r border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl"
            >
              {/* Close button */}
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-lg text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/30 transition-colors z-10"
                aria-label="Close navigation menu"
              >
                <X className="h-4 w-4" />
              </button>

              <SidebarContent pathname={pathname} onNavClick={() => setMobileMenuOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="lg:pl-64 pt-14 lg:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
