import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { useWsStore } from "@/hooks/useWebSocket"
import { Play, Square, Briefcase, TrendingUp, Send, Target, Clock, Activity } from "lucide-react"
import { toast } from "sonner"

interface Summary {
  total_jobs: number
  today_found: number
  total_applied: number
  avg_score: number
  follow_ups_due: number
}

const stats = [
  { key: "total_jobs", label: "Total Jobs", icon: Briefcase, accent: "bg-blue-500", accentBg: "bg-blue-500/10", accentText: "text-blue-500" },
  { key: "today_found", label: "Found Today", icon: TrendingUp, accent: "bg-emerald-500", accentBg: "bg-emerald-500/10", accentText: "text-emerald-500" },
  { key: "total_applied", label: "Applied", icon: Send, accent: "bg-indigo-500", accentBg: "bg-indigo-500/10", accentText: "text-indigo-500" },
  { key: "avg_score", label: "Avg Score", icon: Target, accent: "bg-amber-500", accentBg: "bg-amber-500/10", accentText: "text-amber-500" },
  { key: "follow_ups_due", label: "Follow-ups", icon: Clock, accent: "bg-rose-500", accentBg: "bg-rose-500/10", accentText: "text-rose-500" },
] as const

export default function DashboardPage() {
  const { data: summary } = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: () => api.get<Summary>("/api/analytics/summary"),
    refetchInterval: 30000,
  })

  const automationStatus = useWsStore((s) => s.automationStatus)
  const events = useWsStore((s) => s.events)

  const startAutomation = async () => {
    try {
      await api.post("/api/automation/start", { max_jobs: 3 })
      toast.success("Automation started")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to start")
    }
  }

  const stopAutomation = async () => {
    try {
      await api.post("/api/automation/stop")
      toast.success("Automation stopped")
    } catch {
      toast.error("Failed to stop")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Overview of your job automation pipeline</p>
        </div>
        <div>
          {automationStatus === "running" ? (
            <Button variant="destructive" onClick={stopAutomation}>
              <Square size={16} /> Stop Automation
            </Button>
          ) : (
            <Button onClick={startAutomation}>
              <Play size={16} /> Start Automation
            </Button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map(({ key, label, icon: Icon, accent, accentBg, accentText }) => (
          <Card key={key} className="relative overflow-hidden hover:shadow-md transition-all duration-300">
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${accent}`} />
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className="text-2xl font-bold mt-1 tabular-nums">{summary?.[key] ?? "—"}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${accentBg} flex items-center justify-center`}>
                  <Icon size={20} className={accentText} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-primary" />
              <CardTitle>Live Activity</CardTitle>
            </div>
            {events.length > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">{events.length} events</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Activity size={24} className="text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No recent activity</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Start automation to see live updates</p>
            </div>
          ) : (
            <div className="space-y-0.5 max-h-96 overflow-y-auto">
              {events.slice(0, 50).map((e, i) => (
                <div key={i} className="flex items-start gap-3 text-sm py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <span className="flex-1">{(e.data as Record<string, string>).message || e.type}</span>
                  <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                    {new Date(e.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
