import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom"
import {
  LayoutDashboard, Briefcase, BarChart3, Clock, Settings,
  FileText, AlertTriangle, Sun, Moon, LogOut, Wifi, WifiOff, Rocket, Zap,
} from "lucide-react"
import { useWsStore } from "@/hooks/useWebSocket"
import { useTheme } from "@/hooks/useTheme"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/jobs", icon: Briefcase, label: "Jobs" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/follow-ups", icon: Clock, label: "Follow-ups" },
  { to: "/settings", icon: Settings, label: "Settings" },
  { to: "/intake", icon: FileText, label: "Intake" },
  { to: "/errors", icon: AlertTriangle, label: "Errors" },
]

export default function Layout() {
  const connected = useWsStore((s) => s.connected)
  const automationStatus = useWsStore((s) => s.automationStatus)
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const currentPage = navItems.find((n) =>
    n.to === "/" ? location.pathname === "/" : location.pathname.startsWith(n.to),
  )

  const logout = async () => {
    await api.post("/api/auth/logout")
    navigate("/login")
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
        {/* Branding */}
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Rocket size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-sidebar-foreground">Anti-gravity</h1>
              <p className="text-[11px] text-muted-foreground font-medium">Job Automation</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Status Footer */}
        <div className="p-4 border-t border-sidebar-border space-y-2.5">
          <div className="flex items-center gap-2.5 text-xs">
            {connected ? (
              <>
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Wifi size={12} className="text-emerald-500" />
                </div>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Connected</span>
              </>
            ) : (
              <>
                <div className="w-5 h-5 rounded-full bg-rose-500/10 flex items-center justify-center">
                  <WifiOff size={12} className="text-rose-500" />
                </div>
                <span className="text-rose-600 dark:text-rose-400 font-medium">Disconnected</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2.5 text-xs">
            <div
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center",
                automationStatus === "running" ? "bg-emerald-500/10" : "bg-muted",
              )}
            >
              <Zap size={12} className={automationStatus === "running" ? "text-emerald-500" : "text-muted-foreground"} />
            </div>
            <span className={cn("font-medium", automationStatus === "running" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
              {automationStatus === "running" ? "Running" : "Idle"}
            </span>
            {automationStatus === "running" && (
              <span className="relative flex h-2 w-2 ml-auto">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2.5">
            {currentPage && (
              <>
                <currentPage.icon size={20} className="text-primary" />
                <h2 className="font-semibold text-lg">{currentPage.label}</h2>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggle} className="p-2.5 rounded-lg hover:bg-accent transition-all duration-200 text-muted-foreground hover:text-foreground cursor-pointer">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={logout} className="p-2.5 rounded-lg hover:bg-accent transition-all duration-200 text-muted-foreground hover:text-foreground cursor-pointer">
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <div key={location.pathname} className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
