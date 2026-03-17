import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { useWsStore } from "@/hooks/useWebSocket"
import { Play, Square, Briefcase, TrendingUp, Send, Target, Clock, Activity } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/Badge"

interface Summary {
  total_jobs: number
  today_found: number
  total_applied: number
  avg_score: number
  follow_ups_due: number
}

const stats = [
  { key: "total_jobs", label: "Total Jobs", icon: Briefcase, iconBg: "bg-violet-500/10", iconColor: "text-violet-500" },
  { key: "today_found", label: "Found Today", icon: TrendingUp, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
  { key: "total_applied", label: "Applied", icon: Send, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
  { key: "avg_score", label: "Avg Score", icon: Target, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
  { key: "follow_ups_due", label: "Follow-ups", icon: Clock, iconBg: "bg-rose-500/10", iconColor: "text-rose-500" },
] as const

export default function DashboardPage() {
  const { data: summary } = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: () => api.get<Summary>("/api/analytics/summary"),
    refetchInterval: 10000,
  })

  const automationStatus = useWsStore((s) => s.automationStatus)
  const events = useWsStore((s) => s.events)

  const startAutomation = async () => {
    try {
      await api.post("/api/automation/start", { max_jobs: 3 })
      toast.success("Job discovery engine started", {
        description: "Scouring LinkedIn for matching roles...",
      })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Initialization failed")
    }
  }

  const stopAutomation = async () => {
    try {
      await api.post("/api/automation/stop")
      toast.info("Automation gracefully stopped")
    } catch {
      toast.error("Emergency stop failed")
    }
  }

  return (
    <div className="space-y-12 pb-10">
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4 border-b border-border/10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.2em] border-primary/20 text-primary bg-primary/5 px-2.5 py-1">
              Mission Active
            </Badge>
            <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">System Time: {new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <h2 className="text-4xl font-black tracking-tighter text-gradient leading-none">Welcome, Overseer</h2>
          <p className="text-muted-foreground mt-3 font-medium text-lg opacity-80 max-w-2xl leading-relaxed">
            Autonomous systems have synchronized with current market trends. <span className="text-primary font-bold underline decoration-primary/20 underline-offset-4">{summary?.today_found || 0}</span> strategic opportunities isolated in the last 24h cycle.
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {automationStatus === "running" ? (
            <Button size="lg" variant="destructive" onClick={stopAutomation} className="h-14 px-8 rounded-2xl shadow-2xl shadow-destructive/20 ring-4 ring-destructive/10 animate-pulse-soft font-black uppercase tracking-widest text-xs">
              <Square size={18} className="fill-current mr-2.5" /> Stop Engine
            </Button>
          ) : (
            <Button size="lg" onClick={startAutomation} className="h-14 px-8 rounded-2xl shadow-2xl shadow-primary/30 glow-primary ring-4 ring-primary/10 font-black uppercase tracking-widest text-xs overflow-hidden group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <Play size={18} className="fill-current mr-2.5 group-hover:scale-110 transition-transform" /> Initialize Engine
            </Button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map(({ key, label, icon: Icon, iconBg, iconColor }) => (
          <Card key={key} className="group overflow-hidden border-border/40 glass-card transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/5">
            <CardContent className="p-7">
              <div className="flex items-center justify-between mb-6">
                <div className={cn("w-14 h-14 rounded-[1.25rem] flex items-center justify-center transition-all duration-700 group-hover:rotate-12 group-hover:scale-110 shadow-lg", iconBg)}>
                  <Icon size={26} className={iconColor} />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-baseline gap-1">
                    <p className="text-3xl font-black tabular-nums tracking-tighter leading-none">{summary?.[key] ?? "0"}</p>
                    {key === "avg_score" && <span className="text-xs font-black text-muted-foreground/30 leading-none">%</span>}
                  </div>
                  <div className="h-1 w-12 rounded-full bg-muted/20 overflow-hidden mt-2">
                    <div className={cn("h-full transition-all duration-[2s] delay-300", iconColor.replace("text", "bg"))} style={{ width: summary?.[key] ? `${Math.min(summary[key], 100)}%` : "15%" }} />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-50 group-hover:opacity-100 transition-opacity leading-none">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
        {/* Activity Feed */}
        <Card className="lg:col-span-2 border-border/40 glass-strong overflow-hidden shadow-2xl shadow-black/20">
          <CardHeader className="border-b border-border/20 bg-muted/5 p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20 shadow-inner group">
                  <Activity size={22} className="text-primary group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black tracking-tight leading-none">Telemetry Feed</CardTitle>
                  <p className="text-[11px] text-muted-foreground font-black uppercase tracking-widest mt-1.5 opacity-50">Live Neural Network Logs</p>
                </div>
              </div>
              {events.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_hsl(var(--primary))]" />
                  <span className="text-[10px] font-black tabular-nums text-primary tracking-widest">{events.length} SIGNALS</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {events.length === 0 ? (
              <div className="text-center py-32 bg-card/5">
                <div className="w-20 h-20 rounded-[2rem] bg-muted/20 flex items-center justify-center mx-auto mb-6 shadow-inner border border-border/20 relative group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Activity size={32} className="text-muted-foreground/20 group-hover:text-primary/30 transition-colors" />
                </div>
                <p className="text-lg font-black text-muted-foreground/80 tracking-tight">Awaiting Neural Uplink</p>
                <p className="text-xs text-muted-foreground/40 mt-2 max-w-[240px] mx-auto font-medium leading-relaxed italic">The system is standing by for new mission directives. Initialize the engine to begin packet capture.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/10 max-h-[520px] overflow-y-auto custom-scrollbar bg-background/20">
                {events.slice(0, 50).map((e, i) => (
                  <div key={i} className="flex items-start gap-6 p-6 hover:bg-primary/[0.02] transition-colors group animate-fade-in border-l-2 border-transparent hover:border-primary/40" style={{ animationDelay: `${i * 40}ms` }}>
                    <div className="relative pt-2 shrink-0">
                      <div className={cn(
                        "w-3 h-3 rounded-full ring-4 ring-background/50 z-10 relative transition-all duration-500 group-hover:scale-125",
                        e.type.includes("error") ? "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]" : "bg-primary shadow-[0_0_12px_rgba(139,92,246,0.5)]"
                      )} />
                      {i !== events.length - 1 && <div className="absolute top-5 bottom-[-24px] left-[5px] w-[1px] bg-gradient-to-b from-border/40 to-transparent" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md border",
                          e.type.includes("error") ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-primary/10 text-primary border-primary/20"
                        )}>{e.type.replace("_", " ")}</span>
                        <span className="text-[10px] font-black text-muted-foreground/30 tabular-nums">
                          {new Date(e.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-foreground/90 leading-relaxed tracking-tight">{(e.data as Record<string, string>).message || e.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Column */}
        <div className="space-y-8">
          <Card className="border-primary/20 bg-primary/[0.02] glass-morphism overflow-hidden relative shadow-xl">
             <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="pb-4 relative pt-8 px-8">
              <CardTitle className="text-lg font-black flex items-center gap-3 tracking-tight">
                <Target size={20} className="text-primary" />
                Strategic Objectives
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 px-8 pb-8 relative">
              <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 shadow-inner group hover:bg-primary/10 transition-colors">
                <p className="text-[9px] font-black text-primary/60 uppercase mb-2 tracking-[0.2em]">Priority Directive</p>
                <p className="text-[13px] font-bold leading-relaxed italic text-foreground/90">
                  "Neutralize search latency and maximize conversion for Power Platform Architect roles within top-tier financial sectors."
                </p>
              </div>
              <div className="space-y-3.5">
                {[
                  { label: "Target Sectors", value: "FinServ, Aero, Defense" },
                  { label: "Comp Benchmark", value: "$165,000+" },
                  { label: "Daily Threshold", value: "15 Successful Ops" }
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center bg-background/40 p-3 rounded-xl border border-border/10">
                    <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">{item.label}</span>
                    <span className="text-[11px] font-black text-primary uppercase tracking-wider">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40 glass-strong overflow-hidden shadow-xl">
            <CardHeader className="pb-4 pt-8 px-8">
              <CardTitle className="text-lg font-black flex items-center gap-3 tracking-tight">
                <Briefcase size={20} className="text-muted-foreground" />
                Operational Integrity
              </CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="space-y-5">
                {[
                  { label: "Vector Precision", score: 92, color: "bg-primary" },
                  { label: "Payload Refinement", score: 88, color: "bg-primary/80" },
                  { label: "Data Consistency", score: 100, color: "bg-emerald-500" }
                ].map((metric) => (
                  <div key={metric.label} className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-muted-foreground/50">{metric.label}</span>
                      <span className="text-foreground/80">{metric.score}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted/30 overflow-hidden shadow-inner p-[1px]">
                      <div className={cn("h-full rounded-full transition-all duration-[1.5s] ease-out", metric.color)} style={{ width: `${metric.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 pt-6 border-t border-border/10 flex items-center justify-between">
                <div className="flex -space-x-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-muted overflow-hidden flex items-center justify-center">
                      <div className="w-full h-full bg-gradient-to-br from-primary/40 to-transparent" />
                    </div>
                  ))}
                  <div className="w-8 h-8 rounded-full border-2 border-background bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                    +4
                  </div>
                </div>
                <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">Active Proxies</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
