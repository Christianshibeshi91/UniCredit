import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge, StatusBadge } from "@/components/ui/Badge"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { ArrowLeft, ExternalLink, RefreshCw, FileDown, Sparkles, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface JobDetail {
  id: number; title: string; company: string; location: string; remote_status: string
  salary: string; job_url: string; description: string; score: number; grade: string
  matched_skills: string; missing_skills: string; leadership_level: string
  enterprise_score: string; linkedin_connections: string; best_contact: string
  resume_file: string; cover_letter_file: string; app_type: string; app_status: string
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
      <div className="space-y-6 max-w-4xl">
        <div className="h-4 bg-muted rounded animate-pulse w-24" />
        <div className="h-8 bg-muted rounded animate-pulse w-64" />
        <div className="h-4 bg-muted rounded animate-pulse w-48" />
        <div className="grid md:grid-cols-2 gap-4">
          <div className="h-64 bg-muted rounded-xl animate-pulse" />
          <div className="h-64 bg-muted rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }
  if (!job) return <p className="text-muted-foreground">Job not found</p>

  const scoreData = [
    { name: "Technical", value: Math.round(Math.min(job.score * 0.4, 40)) },
    { name: "Enterprise", value: Math.round(Math.min(job.score * 0.2, 20)) },
    { name: "Compensation", value: Math.round(Math.min(job.score * 0.15, 15)) },
    { name: "Leadership", value: Math.round(Math.min(job.score * 0.15, 15)) },
    { name: "Remote", value: Math.round(Math.min(job.score * 0.1, 10)) },
  ]

  const matched = job.matched_skills ? job.matched_skills.split(",").map((s) => s.trim()).filter(Boolean) : []
  const missing = job.missing_skills ? job.missing_skills.split(",").map((s) => s.trim()).filter(Boolean) : []

  const scoreColor =
    job.score >= 80 ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/5" :
    job.score >= 60 ? "text-blue-500 border-blue-500/30 bg-blue-500/5" :
    job.score >= 40 ? "text-amber-500 border-amber-500/30 bg-amber-500/5" :
    "text-rose-500 border-rose-500/30 bg-rose-500/5"

  const regenerate = async (type: "resume" | "cover-letter" | "follow-up-email") => {
    setGenerating(true)
    setGenType(type)
    try {
      const res = await api.post<{ text: string }>(`/api/content/${type}/${job.id}`)
      setGenText(res.text)
      toast.success(`${type.replace(/-/g, " ")} generated`)
    } catch {
      toast.error("Generation failed")
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
    <div className="space-y-6 max-w-4xl">
      <Link to="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={14} /> Back to Jobs
      </Link>

      {/* Header */}
      <div className="flex items-start gap-5">
        <div className={cn("w-20 h-20 rounded-2xl border-2 flex flex-col items-center justify-center shrink-0", scoreColor)}>
          <span className="text-2xl font-bold leading-none">{job.score}</span>
          <span className="text-[10px] opacity-60 mt-0.5">/100</span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold tracking-tight">{job.title}</h2>
          <p className="text-base text-muted-foreground mt-0.5">{job.company} &middot; {job.location}</p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <StatusBadge status={job.app_status} />
            {job.remote_status && <Badge variant="outline">{job.remote_status}</Badge>}
            {job.salary && <Badge variant="outline">{job.salary}</Badge>}
            {job.app_type && <Badge variant="secondary">{job.app_type}</Badge>}
            <span className="text-xs text-muted-foreground ml-1">{job.date_logged}</span>
          </div>
          {job.job_url && (
            <a href={job.job_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary mt-2 hover:underline">
              <ExternalLink size={14} /> View Posting
            </a>
          )}
        </div>
      </div>

      {/* Score + Skills */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Score Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={scoreData} layout="vertical" margin={{ left: 0 }}>
                <XAxis type="number" domain={[0, 40]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Skills Match</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Matched ({matched.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {matched.map((s) => <Badge key={s} variant="success">{s}</Badge>)}
                {matched.length === 0 && <span className="text-sm text-muted-foreground">None detected</span>}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Missing ({missing.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {missing.map((s) => <Badge key={s} variant="destructive">{s}</Badge>)}
                {missing.length === 0 && <span className="text-sm text-muted-foreground">None detected</span>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Generation */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            <CardTitle>AI Content</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => regenerate("resume")} disabled={generating}>
              <RefreshCw size={14} /> Resume
            </Button>
            <Button size="sm" variant="outline" onClick={() => regenerate("cover-letter")} disabled={generating}>
              <RefreshCw size={14} /> Cover Letter
            </Button>
            <Button size="sm" variant="outline" onClick={() => regenerate("follow-up-email")} disabled={generating}>
              <Sparkles size={14} /> Follow-Up Email
            </Button>
            {job.resume_file && (
              <a href={`/api/content/${job.id}/pdf/resume`} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="ghost"><FileDown size={14} /> Download PDF</Button>
              </a>
            )}
          </div>
          {generating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating {genType.replace(/-/g, " ")}...
            </div>
          )}
          {genText && (
            <div className="relative">
              <button
                onClick={copyText}
                className="absolute top-3 right-3 p-1.5 rounded-md bg-background/80 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <pre className="bg-muted/50 border rounded-lg p-4 text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">{genText}</pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Description */}
      {job.description && (
        <Card>
          <CardHeader><CardTitle>Job Description</CardTitle></CardHeader>
          <CardContent>
            <div className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">{job.description}</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
