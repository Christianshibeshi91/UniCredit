import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge, StatusBadge } from "@/components/ui/Badge"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { ArrowLeft, ExternalLink, FileDown, Sparkles, Copy, Check, Briefcase, Target } from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface JobDetail {
  id: number; title: string; company: string; location: string; remote_status: string
  salary: string; job_url: string; description: string; score: number; grade: string
  matched_skills: string; missing_skills: string; leadership_level: string
  enterprise_score: string; linkedin_connections: string; best_contact: string
  resume_file: string; resume_url: string; cover_letter_file: string; cover_letter_url: string
  app_type: string; app_status: string
  date_logged: string; applied: string; follow_up_date: string; follow_up_status: string
  sheet_row: number
}

export default function JobDetailPage() {
  const { id } = useParams()
  const [genText, setGenText] = useState<string | null>(null)
  const [genType, setGenType] = useState("")
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const { data: job, isLoading } = useQuery({
    queryKey: ["job", id],
    queryFn: () => api.get<JobDetail>(`/api/jobs/${id}`),
  })

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="h-4 shimmer rounded w-24" />
        <div className="flex gap-6">
          <div className="h-32 w-32 shimmer rounded-3xl shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-8 shimmer rounded w-3/4" />
            <div className="h-4 shimmer rounded w-1/2" />
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="h-64 shimmer rounded-3xl" />
          <div className="h-64 shimmer rounded-3xl" />
          <div className="h-64 shimmer rounded-3xl" />
        </div>
      </div>
    )
  }
  if (!job) return <div className="text-center py-20 px-6 border-2 border-dashed border-border/40 rounded-3xl">
    <Briefcase size={40} className="mx-auto text-muted-foreground/30 mb-4" />
    <p className="text-lg font-bold text-muted-foreground">Job Intelligence Missing</p>
    <Link to="/jobs" className="text-primary font-bold hover:underline mt-2 inline-block">Return to Job Feed</Link>
  </div>

  const scoreData = [
    { name: "Tech", value: Math.round(Math.min(job.score * 0.4, 40)), max: 40 },
    { name: "Ent", value: Math.round(Math.min(job.score * 0.2, 20)), max: 20 },
    { name: "Comp", value: Math.round(Math.min(job.score * 0.15, 15)), max: 15 },
    { name: "Lead", value: Math.round(Math.min(job.score * 0.15, 15)), max: 15 },
    { name: "Remote", value: Math.round(Math.min(job.score * 0.1, 10)), max: 10 },
  ]

  const matched = job.matched_skills ? job.matched_skills.split(",").map((s) => s.trim()).filter(Boolean) : []
  const missing = job.missing_skills ? job.missing_skills.split(",").map((s) => s.trim()).filter(Boolean) : []

  const scoreTheme =
    job.score >= 80 ? { text: "text-emerald-500", border: "border-emerald-500/30", bg: "bg-emerald-500/5", color: "#10b981" } :
    job.score >= 60 ? { text: "text-blue-500", border: "border-blue-500/30", bg: "bg-blue-500/5", color: "#3b82f6" } :
    job.score >= 40 ? { text: "text-amber-500", border: "border-amber-500/30", bg: "bg-amber-500/5", color: "#f59e0b" } :
    { text: "text-rose-500", border: "border-rose-500/30", bg: "bg-rose-500/5", color: "#ef4444" }

  const downloadDoc = (type: "resume" | "cover-letter") => {
    const url = type === "resume" ? job.resume_url : job.cover_letter_url
    if (!url) {
      toast.error(`Document not yet generated for this mission`)
      return
    }
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const generateFollowUp = async () => {
    setGenerating(true)
    setGenType("follow-up-email")
    try {
      const res = await api.post<{ text: string }>(`/api/content/follow-up-email/${job.id}`)
      setGenText(res.text)
      toast.success("Strategic outreach generated")
    } catch {
      toast.error("AI intelligence unit failed to respond")
    } finally {
      setGenerating(false)
    }
  }

  const copyText = () => {
    if (genText) {
      navigator.clipboard.writeText(genText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-10 max-w-5xl pb-20">
      <Link to="/jobs" className="group inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-all">
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" /> Back to Dashboard
      </Link>

      {/* Hero Header */}
      <div className="relative group">
        <div className="absolute -inset-4 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
        <div className="relative flex flex-col md:flex-row items-start gap-8">
          <div className={cn(
            "w-32 h-32 rounded-3xl border-2 flex flex-col items-center justify-center shrink-0 shadow-lg glow-primary relative overflow-hidden",
            scoreTheme.border, scoreTheme.bg, scoreTheme.text
          )}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            <span className="text-4xl font-black tabular-nums tracking-tighter">{job.score}</span>
            <span className="text-[11px] font-black uppercase tracking-widest opacity-60 mt-0.5">MATCH</span>
          </div>
          <div className="flex-1 min-w-0 space-y-3 pt-2">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-gradient-purple">{job.title}</h2>
              <p className="text-xl font-bold text-muted-foreground/80 mt-1">{job.company} &middot; <span className="text-foreground/60">{job.location}</span></p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusBadge status={job.app_status} />
              {job.remote_status && <Badge variant="outline" className="font-bold border-border/40 uppercase tracking-wide px-3">{job.remote_status}</Badge>}
              {job.salary && <Badge variant="outline" className="font-bold border-border/40 text-primary px-3 italic">{job.salary}</Badge>}
              {job.app_type && <Badge variant="secondary" className="font-bold uppercase tracking-widest text-[10px] bg-muted/50 border border-border/20">{job.app_type}</Badge>}
              <span className="text-xs font-bold text-muted-foreground/40 ml-1 uppercase tracking-tighter">Logged {job.date_logged}</span>
            </div>
          </div>
          <div className="md:pt-4">
             {job.job_url && (
              <Button 
                variant="outline" 
                size="lg" 
                className="rounded-2xl border border-border/40 shadow-sm font-bold group"
                onClick={() => window.open(job.job_url, "_blank", "noopener,noreferrer")}
              >
                View Posting <ExternalLink size={16} className="ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Scoring Detail */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-border/40 bg-card/40 overflow-hidden">
              <CardHeader className="pb-2 border-b border-border/20 bg-muted/5">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground/60">Algorithm Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={scoreData} layout="vertical" margin={{ left: -20, right: 20 }}>
                    <XAxis type="number" hide domain={[0, 40]} />
                    <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 10, fontWeight: 800, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted)/0.1)' }}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 16, fontSize: 12, fontWeight: 700, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }}
                    />
                    <Bar dataKey="value" fill={scoreTheme.color} radius={[0, 10, 10, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-card/40 overflow-hidden">
              <CardHeader className="pb-2 border-b border-border/20 bg-muted/5">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground/60">Competency Mapping</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest pl-1">Identified Assets ({matched.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {matched.map((s) => <Badge key={s} variant="success" className="rounded-lg px-2.5 py-1 font-bold text-[11px] shadow-sm">{s}</Badge>)}
                    {matched.length === 0 && <span className="text-sm font-medium text-muted-foreground italic pl-1">Scanning failed to detect matches</span>}
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest pl-1">Technical Gaps ({missing.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {missing.map((s) => <Badge key={s} variant="destructive" className="rounded-lg px-2.5 py-1 font-bold text-[11px] shadow-sm">{s}</Badge>)}
                    {missing.length === 0 && <span className="text-sm font-medium text-muted-foreground italic pl-1">No gaps identified</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Description */}
          <Card className="border-border/40 bg-card/40 shadow-inner">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground/60">Intelligence Report (JD)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm leading-relaxed text-muted-foreground font-medium p-4 rounded-2xl bg-muted/20 border border-border/20 selection:bg-primary/20 whitespace-pre-wrap max-h-[500px] overflow-y-auto custom-scrollbar">
                {job.description || "No description data captured for this record."}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Column */}
        <div className="space-y-8">
           {/* Document Hub */}
          <Card className="border-primary/20 bg-primary/5 glow-primary overflow-hidden">
            <CardHeader className="pb-2 border-b border-primary/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
                  <FileDown size={16} className="text-primary" />
                </div>
                <CardTitle className="text-md">Document Hub</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Button variant={job.resume_url ? "outline" : "ghost"} size="sm" className="rounded-xl font-bold h-11 border-primary/20" onClick={() => downloadDoc("resume")} disabled={!job.resume_url}>
                  <FileDown size={14} className="mr-2" /> Resume
                </Button>
                <Button variant={job.cover_letter_url ? "outline" : "ghost"} size="sm" className="rounded-xl font-bold h-11 border-primary/20" onClick={() => downloadDoc("cover-letter")} disabled={!job.cover_letter_url}>
                  <FileDown size={14} className="mr-2" /> Letter
                </Button>
              </div>
              <Button variant="default" size="lg" className="w-full rounded-2xl font-black uppercase tracking-tighter" onClick={generateFollowUp} disabled={generating}>
                <Sparkles size={18} className="mr-2 fill-current" /> 
                {generating ? "Calibrating..." : "Generate Outreach"}
              </Button>

              {genText && (
                <div className="animate-scale-in relative group mt-4">
                  <div className="absolute -inset-0.5 bg-gradient-to-br from-primary to-indigo-600 rounded-2xl opacity-20 blur group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
                  <div className="relative">
                    <button
                      onClick={copyText}
                      className="absolute top-3 right-3 z-10 p-2 rounded-xl bg-background shadow-lg hover:bg-accent text-primary transition-all cursor-pointer"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                    <pre className="relative bg-card rounded-2xl p-5 pt-12 text-xs font-bold leading-relaxed border border-border/40 whitespace-pre-wrap max-h-64 overflow-y-auto custom-scrollbar shadow-xl">{genText}</pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Networking Intelligence */}
          <Card className="border-border/40 bg-card/40 shadow-sm overflow-hidden">
            <CardHeader className="pb-2 bg-muted/5 border-b border-border/10">
               <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <Target size={16} className="text-indigo-500" />
                </div>
                <CardTitle className="text-md">Networking Hub</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Primary Connection</p>
                <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                  <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">{job.best_contact || "Scouting results pending..."}</p>
                  <p className="text-xs font-bold text-muted-foreground/60 mt-1 italic">Strategically ranked as the most effective pivot point.</p>
                </div>
              </div>
              
              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-bold text-muted-foreground">Internal Connections</span>
                  <Badge variant="secondary" className="font-bold tabular-nums italic text-primary">{job.linkedin_connections || "0"}</Badge>
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-bold text-muted-foreground">Leadership Level</span>
                  <span className="text-xs font-black text-primary uppercase tracking-wider">{job.leadership_level || "Standard"}</span>
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-bold text-muted-foreground">Enterprise Fit</span>
                   <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">{job.enterprise_score || "Tier 1"}</span>
                </div>
              </div>
              
              <Button variant="outline" className="w-full rounded-xl font-bold h-11 border-border/60 hover:border-primary/50 group">
                Search on LinkedIn <ExternalLink size={14} className="ml-2 opacity-50 group-hover:opacity-100 transition-opacity" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
