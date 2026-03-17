import { NavLink, Outlet } from "react-router-dom";
import {
  BookOpen, GraduationCap, MessageCircle, Moon, Sun, Activity,
  Brain, BarChart3, Menu, X, Library, Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/Button";
import { BackgroundOrbs } from "./ui/Orbs";
import { useTheme } from "../hooks/useTheme";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

const navItems = [
  { to: "/", icon: MessageCircle, label: "Ask", gradient: "from-blue-500 to-indigo-500" },
  { to: "/textbook", icon: Library, label: "Textbook", gradient: "from-violet-500 to-purple-500" },
  { to: "/lessons", icon: GraduationCap, label: "Lessons", gradient: "from-amber-500 to-orange-500" },
  { to: "/quiz", icon: Brain, label: "Quiz", gradient: "from-pink-500 to-rose-500" },
  { to: "/review", icon: BookOpen, label: "Review", gradient: "from-emerald-500 to-teal-500" },
  { to: "/dashboard", icon: BarChart3, label: "Dashboard", gradient: "from-cyan-500 to-blue-500" },
  { to: "/notebooks", icon: BookOpen, label: "Notebooks", gradient: "from-slate-500 to-gray-500" },
];

export function Layout() {
  const { theme, toggleTheme } = useTheme();
  const [mcpConnected, setMcpConnected] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const check = () =>
      api.health().then((h) => setMcpConnected(h.mcp_connected)).catch(() => setMcpConnected(false));
    check();
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
  }, []);

  const sidebar = (
    <>
      {/* Brand */}
      <div className="p-5 border-b border-[var(--border)]">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-primary/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight gradient-text">Tech Tutor</h1>
            <p className="text-[10px] text-[var(--text-subtle)] font-medium">AI Study Assistant</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius)] text-[13px] font-medium transition-all duration-200 ${
                isActive
                  ? "nav-active"
                  : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--accent)]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? `bg-gradient-to-br ${item.gradient} text-white shadow-sm`
                    : "bg-[var(--accent)] text-[var(--text-muted)] group-hover:text-[var(--text)]"
                }`}>
                  <item.icon className="h-3.5 w-3.5" />
                </div>
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-[var(--border)] space-y-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius)] bg-[var(--accent)]">
          <Activity className="h-3 w-3 text-[var(--text-subtle)]" />
          <span className="text-[11px] text-[var(--text-muted)]">MCP</span>
          <span className={`ml-auto flex items-center gap-1.5 text-[11px] font-medium ${mcpConnected ? "text-success" : "text-destructive"}`}>
            <span className={`relative h-2 w-2 rounded-full ${mcpConnected ? "bg-success" : "bg-destructive"}`}>
              {mcpConnected && <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-40" />}
            </span>
            {mcpConnected ? "Connected" : "Offline"}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={toggleTheme} className="w-full justify-start gap-3 text-[13px]">
          {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-400" />}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-mesh">
      <BackgroundOrbs />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-56 border-r border-[var(--border)] bg-[var(--bg-sidebar)] backdrop-blur-xl flex-col shrink-0 z-10">
        {sidebar}
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative w-72 bg-[var(--bg-sidebar)] backdrop-blur-xl border-r border-[var(--border)] flex flex-col z-10"
            >
              <button
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-[var(--accent)] text-[var(--text-muted)] transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
              {sidebar}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 z-10">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-sidebar)] backdrop-blur-xl">
          <button onClick={() => setMobileOpen(true)} className="p-1 rounded-lg hover:bg-[var(--accent)] transition-colors">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg gradient-bg flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold gradient-text">Tech Tutor</span>
          </div>
          <span className={`ml-auto h-2 w-2 rounded-full ${mcpConnected ? "bg-success" : "bg-destructive"}`} />
        </div>
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
