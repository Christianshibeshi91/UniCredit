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
    <div className="flex h-screen bg-background ambient-gradient">
      {/* Sidebar */}
      <aside className="w-68 glass-strong flex flex-col shrink-0 border-r border-border/40 relative z-20">
        <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent pointer-events-none" />
        
        {/* Branding */}
        <div className="p-8 border-b border-border/40 relative group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[1.25rem] bg-gradient-to-br from-primary via-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-primary/40 glow-primary ring-1 ring-white/20 group-hover:rotate-12 transition-transform duration-500">
              <Rocket size={22} className="text-white fill-white/10" />
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tighter text-gradient leading-none">Anti-gravity</h1>
              <p className="text-[9px] text-muted-foreground font-black tracking-[0.2em] uppercase opacity-50 mt-1">Autonomous Ops</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-5 space-y-2 overflow-y-auto relative custom-scrollbar">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-4 px-4 py-3.5 rounded-[1.25rem] text-[11px] uppercase tracking-widest font-black transition-all duration-500 relative overflow-hidden",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xl shadow-primary/30 translate-x-2"
                    : "text-muted-foreground/60 hover:bg-primary/10 hover:text-primary hover:translate-x-2",
                )
              }
            >
              <Icon size={18} className={cn("transition-transform duration-500 group-hover:scale-125 relative z-10")} />
              <span className="relative z-10">{label}</span>
              {location.pathname === (to === "/" ? "/" : to) && (
                <div className="absolute inset-y-0 left-0 w-1 bg-white/40 rounded-full" />
              )}
            </NavLink>
          ))}
        </nav>

        {/* Status Footer */}
        <div className="p-6 border-t border-border/40 space-y-4 bg-muted/10 relative">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground/40">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
              Core Systems
            </div>
            <div className="w-8 h-1 rounded-full bg-border/20" />
          </div>
          
          <div className="space-y-2.5">
            <div className="flex items-center gap-4 p-3 rounded-2xl bg-background/40 border border-border/20 shadow-inner group hover:border-primary/20 transition-colors">
              <div className={cn(
                "w-2.5 h-2.5 rounded-full shadow-[0_0_12px_rgba(0,0,0,0.2)]",
                connected ? "bg-emerald-500 shadow-emerald-500/50 animate-pulse-soft" : "bg-rose-500 shadow-rose-500/50"
              )} />
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 leading-none">Uplink Status</p>
                <p className={cn(
                  "text-[10px] font-black uppercase tracking-widest mt-1",
                  connected ? "text-emerald-500" : "text-rose-500"
                )}>
                  {connected ? "Secure Connection" : "Link Severed"}
                </p>
              </div>
            </div>

            <div className={cn(
              "flex items-center gap-4 p-3 rounded-2xl border transition-all duration-500 shadow-inner group",
              automationStatus === "running" 
                ? "bg-primary/10 border-primary/20" 
                : "bg-background/40 border-border/20 hover:border-primary/10"
            )}>
              <Zap size={16} className={cn(
                "transition-all duration-700",
                automationStatus === "running" ? "text-primary fill-primary/30 scale-125 drop-shadow-[0_0_8px_rgba(139,92,246,0.3)]" : "text-muted-foreground/30 opacity-40"
              )} />
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 leading-none">Process Engine</p>
                <p className={cn(
                  "text-[10px] font-black uppercase tracking-widest mt-1 transition-colors duration-500",
                  automationStatus === "running" ? "text-primary" : "text-muted-foreground/60"
                )}>
                  {automationStatus === "running" ? "Cycles Active" : "Engine Standby"}
                </p>
              </div>
              {automationStatus === "running" && (
                <div className="ml-auto flex gap-0.5">
                  <div className="w-1 h-3 rounded-full bg-primary/20 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 h-3 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 h-3 rounded-full bg-primary/20 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-18 border-b border-border/40 glass-strong flex items-center justify-between px-8 shrink-0 relative z-10 transition-all">
          <div className="flex items-center gap-4">
            {currentPage && (
              <>
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                  <currentPage.icon size={20} className="text-primary" />
                </div>
                <div>
                  <h2 className="font-black text-xl tracking-tight leading-none uppercase">{currentPage.label}</h2>
                  <p className="text-[9px] text-muted-foreground mt-1.5 font-black uppercase tracking-[0.2em] opacity-40">
                    {location.pathname === "/" ? "Live control center" : `SYSTEM / ${currentPage.label.toUpperCase()} / ACTIVE`}
                  </p>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex p-1 bg-muted/50 rounded-2xl border border-border/40">
              <button 
                onClick={toggle} 
                className="p-2 rounded-xl hover:bg-background hover:shadow-sm transition-all duration-300 text-muted-foreground hover:text-primary cursor-pointer"
              >
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button 
                onClick={logout} 
                className="p-2 rounded-xl hover:bg-background hover:shadow-sm transition-all duration-300 text-muted-foreground hover:text-destructive cursor-pointer"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8 relative scroll-smooth custom-scrollbar">
          <div key={location.pathname} className="animate-fade-in max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
