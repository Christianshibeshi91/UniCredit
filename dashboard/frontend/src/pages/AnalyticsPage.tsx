import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { Briefcase, TrendingUp, Send, Target, Clock } from "lucide-react"

const COLORS = ["#3b82f6", "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

const statMeta = [
  { key: "total_jobs", label: "Total Jobs", icon: Briefcase, accent: "bg-blue-500", accentBg: "bg-blue-500/10", accentText: "text-blue-500" },
  { key: "today_found", label: "Found Today", icon: TrendingUp, accent: "bg-emerald-500", accentBg: "bg-emerald-500/10", accentText: "text-emerald-500" },
  { key: "total_applied", label: "Applied", icon: Send, accent: "bg-indigo-500", accentBg: "bg-indigo-500/10", accentText: "text-indigo-500" },
  { key: "avg_score", label: "Avg Score", icon: Target, accent: "bg-amber-500", accentBg: "bg-amber-500/10", accentText: "text-amber-500" },
  { key: "follow_ups_due", label: "Follow-ups", icon: Clock, accent: "bg-rose-500", accentBg: "bg-rose-500/10", accentText: "text-rose-500" },
] as const

interface Summary {
  total_jobs: number; today_found: number; total_applied: number; avg_score: number; follow_ups_due: number
}

export default function AnalyticsPage() {
  const { data: summary } = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: () => api.get<Summary>("/api/analytics/summary"),
  })
  const { data: trends } = useQuery({
    queryKey: ["analytics-trends"],
    queryFn: () => api.get<{ date: string; count: number }[]>("/api/analytics/trends"),
  })
  const { data: platforms } = useQuery({
    queryKey: ["analytics-platforms"],
    queryFn: () => api.get<{ platform: string; count: number }[]>("/api/analytics/platforms"),
  })
  const { data: scores } = useQuery({
    queryKey: ["analytics-scores"],
    queryFn: () => api.get<{ range: string; count: number }[]>("/api/analytics/scores"),
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Performance metrics and pipeline insights</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statMeta.map(({ key, label, icon: Icon, accent, accentBg, accentText }) => (
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

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Trends */}
        <Card>
          <CardHeader><CardTitle>Applications Over Time</CardTitle></CardHeader>
          <CardContent>
            {trends && trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
            )}
          </CardContent>
        </Card>

        {/* Score distribution */}
        <Card>
          <CardHeader><CardTitle>Score Distribution</CardTitle></CardHeader>
          <CardContent>
            {scores && scores.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={scores}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
            )}
          </CardContent>
        </Card>

        {/* Platform breakdown */}
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Platform Breakdown</CardTitle></CardHeader>
          <CardContent>
            {platforms && platforms.length > 0 ? (
              <div className="flex items-center gap-8">
                <ResponsiveContainer width="50%" height={260}>
                  <PieChart>
                    <Pie data={platforms} dataKey="count" nameKey="platform" cx="50%" cy="50%" outerRadius={95} innerRadius={50} paddingAngle={2} label={({ name }) => name}>
                      {platforms.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {platforms.map((p, i) => (
                    <div key={p.platform} className="flex items-center gap-3 text-sm">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground">{p.platform}</span>
                      <span className="font-semibold ml-auto tabular-nums">{p.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
