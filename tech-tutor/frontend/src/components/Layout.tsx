import { NavLink, Outlet } from "react-router-dom";
import { BookOpen, GraduationCap, MessageCircle, Moon, Sun, Activity } from "lucide-react";
import { Button } from "./ui/Button";
import { useTheme } from "../hooks/useTheme";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

const navItems = [
  { to: "/", icon: MessageCircle, label: "Ask" },
  { to: "/lessons", icon: GraduationCap, label: "Lessons" },
  { to: "/notebooks", icon: BookOpen, label: "Notebooks" },
];

export function Layout() {
  const { theme, toggleTheme } = useTheme();
  const [mcpConnected, setMcpConnected] = useState(false);

  useEffect(() => {
    const check = () =>
      api
        .health()
        .then((h) => setMcpConnected(h.mcp_connected))
        .catch(() => setMcpConnected(false));
    check();
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-60 border-r border-[var(--border)] bg-[var(--bg-sidebar)] flex flex-col">
        <div className="p-4 border-b border-[var(--border)]">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            Tech Tutor
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">AI Study Assistant</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius)] text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--accent)]"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-[var(--border)] space-y-2">
          {/* MCP Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-muted)]">
            <Activity className="h-3 w-3" />
            <span>MCP:</span>
            <span className={`flex items-center gap-1 ${mcpConnected ? "text-success" : "text-destructive"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${mcpConnected ? "bg-success animate-pulse" : "bg-destructive"}`} />
              {mcpConnected ? "Connected" : "Disconnected"}
            </span>
          </div>

          {/* Theme Toggle */}
          <Button variant="ghost" size="sm" onClick={toggleTheme} className="w-full justify-start gap-3">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
