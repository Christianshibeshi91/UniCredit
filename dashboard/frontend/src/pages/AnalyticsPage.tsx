import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { Briefcase, TrendingUp, Send, Target, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"

const COLORS = ["#8b5cf6", "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899"]

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
    <div className="space-y-12 pb-24 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-gradient">Strategic Intelligence</h2>
          <p className="text-muted-foreground mt-2 font-medium italic">Autonomous mission performance and algorithmic efficiency metrics.</p>
        </div>
        <div className="flex items-center gap-4 bg-muted/20 p-1.5 rounded-2xl border border-border/10 backdrop-blur-sm">
          {["24H", "7D", "30D", "ALL"].map((p) => (
            <button
              key={p}
              className={cn(
                "px-5 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all uppercase",
                p === "ALL" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground/60 hover:text-foreground hover:bg-white/5"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: "Total Assets", value: summary?.total_jobs || 0, icon: Briefcase, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Engagements", value: summary?.total_applied || 0, icon: Send, color: "text-primary", bg: "bg-primary/10" },
          { label: "Intelligence", value: "8.4%", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Match Quality", value: `${summary?.avg_score || 0}%`, icon: Target, color: "text-amber-500", bg: "bg-amber-500/10" },
        ].map((item) => (
          <Card key={item.label} className="border-border/40 glass-morphism hover:translate-y-[-4px] transition-all duration-300">
            <CardContent className="p-6">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-inner", item.bg)}>
                <item.icon size={22} className={item.color} />
              </div>
              <p className="text-2xl font-black tracking-tighter">{item.value}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mt-1">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <Card className="lg:col-span-2 border-border/40 glass-morphism shadow-2xl overflow-hidden group">
          <CardHeader className="border-b border-border/10 bg-muted/5 p-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black tracking-tight">Deployment Velocity</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-widest">Live Mission Throughput</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl border-border/40 text-[10px] uppercase font-black tracking-widest">
                Export Data
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-8 p-6">
            <div className="h-[380px] w-full group-hover:drop-shadow-[0_0_15px_rgba(139,92,246,0.1)] transition-all">
              {trends && trends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 900, fill: "hsl(var(--muted-foreground))" }} 
                      dy={15} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 900, fill: "hsl(var(--muted-foreground))" }} 
                      dx={-10}
                    />
                    <Tooltip
                      contentStyle={{ 
                        background: "rgba(255, 255, 255, 0.8)", 
                        backdropFilter: "blur(12px)",
                        border: "1px solid rgba(255, 255, 255, 0.2)", 
                        borderRadius: 20, 
                        boxShadow: "0 20px 40px -15px rgba(0,0,0,0.1)",
                        fontWeight: 900,
                        fontSize: 12,
                        padding: "12px 16px"
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      name="Activations" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={4} 
                      fillOpacity={1} 
                      fill="url(#colorApps)" 
                      animationDuration={2000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 italic">
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted/20 flex items-center justify-center mb-4">
                    <TrendingUp size={24} />
                  </div>
                  <p className="font-black text-[11px] uppercase tracking-widest">No telemetry captured</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quality Score Dist */}
        <Card className="border-border/40 glass-morphism overflow-hidden">
          <CardHeader className="border-b border-border/10 bg-muted/5 p-6">
            <CardTitle className="text-xl font-black tracking-tight">Signal Accuracy</CardTitle>
            <p className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-widest mt-1">Classification distribution</p>
          </CardHeader>
          <CardContent className="pt-8 p-6">
            <div className="h-[380px] w-full">
              {scores && scores.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scores} layout="vertical" margin={{ left: -10, right: 30 }}>
                    <XAxis type="number" hide />
                    <YAxis 
                      type="category" 
                      dataKey="range" 
                      width={90} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 900, fill: "hsl(var(--muted-foreground))" }} 
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                      contentStyle={{ 
                        background: "rgba(255, 255, 255, 0.8)", 
                        backdropFilter: "blur(12px)",
                        border: "1px solid rgba(255, 255, 255, 0.2)", 
                        borderRadius: 16, 
                        fontWeight: 900 
                      }}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="url(#barGradient)" 
                      radius={[0, 12, 12, 0]} 
                      barSize={28}
                      animationDuration={1500}
                    >
                      {scores.map((_, index) => (
                         <Cell key={`cell-${index}`} fill={index === scores.length - 1 ? "#8b5cf6" : "#c4b5fd"} fillOpacity={0.8 + (index * 0.05)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 italic">
                  <Target size={24} className="mb-4 opacity-20" />
                  <p className="font-black text-[11px] uppercase tracking-widest">Classification data offline</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-10">
        {/* Mission Protocols */}
        <Card className="border-border/40 glass-morphism overflow-hidden">
          <CardHeader className="border-b border-border/10 bg-muted/5 p-6">
            <CardTitle className="text-xl font-black tracking-tight">Deployment Protocols</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <div className="divide-y divide-border/10">
              {[
                { label: "Asset Discovery", status: "Nominal", value: summary?.total_jobs || 0, icon: Briefcase, color: "text-blue-500" },
                { label: "Target Engagement", status: "Active", value: summary?.total_applied || 0, icon: Send, color: "text-primary" },
                { label: "Signal Strength", status: "Steady", value: "88.4%", icon: TrendingUp, color: "text-emerald-500" },
                { label: "Mission Success", status: "Optimized", value: `${summary?.avg_score || 0}%`, icon: Target, color: "text-amber-500" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-6 hover:bg-muted/10 transition-all group">
                  <div className="flex items-center gap-5">
                    <div className="p-3 rounded-2xl bg-muted/30 group-hover:bg-primary/10 transition-all group-hover:rotate-12">
                      <item.icon size={20} className={item.color} />
                    </div>
                    <div>
                      <span className="font-black text-foreground/80 tracking-tight block">{item.label}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">{item.status}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black tabular-nums block tracking-tighter">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Platform Breakdown */}
        <Card className="border-border/40 glass-morphism overflow-hidden">
           <CardHeader className="border-b border-border/10 bg-muted/5 p-6">
            <CardTitle className="text-xl font-black tracking-tight">Environmental Mapping</CardTitle>
            <p className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-widest mt-1">Platform density analysis</p>
          </CardHeader>
          <CardContent className="pt-10 pb-10 p-6">
            <div className="h-[300px]">
              {platforms && platforms.length > 0 ? (
                <div className="flex items-center h-full">
                  <ResponsiveContainer width="55%" height="100%">
                    <PieChart>
                      <Pie
                        data={platforms}
                        cx="50%"
                        cy="50%"
                        innerRadius={75}
                        outerRadius={110}
                        paddingAngle={10}
                        dataKey="count"
                        nameKey="platform"
                        stroke="none"
                        animationDuration={1500}
                      >
                        {platforms.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.9} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ 
                          background: "rgba(255, 255, 255, 0.9)", 
                          backdropFilter: "blur(12px)",
                          border: "none", 
                          borderRadius: 20, 
                          fontWeight: 900,
                          padding: "10px 15px",
                          boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-5 pl-8 border-l border-border/10">
                    {platforms.map((p, i) => (
                      <div key={p.platform} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="font-black text-muted-foreground/80 tracking-tight uppercase text-[10px]">{p.platform}</span>
                        </div>
                        <span className="font-black tabular-nums text-base tracking-tighter">{p.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 italic">
                  <div className="w-16 h-16 rounded-3xl bg-muted/5 border border-border/10 flex items-center justify-center mb-4">
                    <Clock size={24} className="opacity-20" />
                  </div>
                  <p className="font-black text-[11px] uppercase tracking-widest text-center max-w-[150px]">Waiting for platform telemetry...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
