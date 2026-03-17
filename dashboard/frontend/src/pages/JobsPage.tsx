import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { StatusBadge, Badge } from "@/components/ui/Badge"
import { Card, CardContent } from "@/components/ui/Card"
import { RefreshCw, Search, ChevronUp, ChevronDown, Briefcase } from "lucide-react"
import { toast } from "sonner"
import { cn, formatDate, parseDate } from "@/lib/utils"

interface JobRow {
  id: number; title: string; company: string; score: number; grade: string
  app_status: string; date_logged: string; location: string; salary: string
}

const STATUS_FILTERS = ["All", "Applied", "Pending", "Failed", "Interview", "Skipped"]

function ScoreIndicator({ score }: { score: number }) {
  return (
    <div
      className={cn(
        "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold ring-1",
        score >= 80 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20" :
        score >= 60 ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20" :
        score >= 40 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20" :
        "bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-500/20",
      )}
    >
      {score}
    </div>
  )
}

function GradeBadge({ grade }: { grade: string }) {
  const v =
    grade === "A" || grade === "A+" ? "success" :
    grade === "B" || grade === "B+" ? "info" :
    grade === "C" || grade === "C+" ? "warning" : "secondary"
  return <Badge variant={v}>{grade || "\u2014"}</Badge>
}

export default function JobsPage() {
  const [status, setStatus] = useState("All")
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState("date_logged")
  const [sortDir, setSortDir] = useState("desc")
  const [page, setPage] = useState(1)
  const navigate = useNavigate()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["jobs", status, search, sortBy, sortDir, page],
    queryFn: () => {
      const params = new URLSearchParams({ sort_by: sortBy, sort_dir: sortDir, page: String(page), per_page: "50" })
      if (status !== "All") params.set("status", status)
      if (search) params.set("search", search)
      return api.get<{ jobs: JobRow[]; total: number; page: number; per_page: number }>(`/api/jobs?${params}`)
    },
    refetchInterval: 30 * 60 * 1000,
  })

  const { data: syncStatus } = useQuery({
    queryKey: ["sync-status"],
    queryFn: () => api.get<{ last_synced: string | null; job_count: number; syncing: boolean }>("/api/jobs/sync-status"),
    refetchInterval: 10000,
  })

  const handleSync = async () => {
    toast.info("Syncing tracking data...")
    await api.post("/api/jobs/sync")
    refetch()
    toast.success("Intelligence synchronized")
  }

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir(sortDir === "asc" ? "desc" : "asc")
    else { setSortBy(col); setSortDir("desc") }
    setPage(1)
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return <ChevronDown size={14} className="opacity-0 group-hover:opacity-20 transition-opacity" />
    return sortDir === "asc" ? <ChevronUp size={14} className="text-primary" /> : <ChevronDown size={14} className="text-primary" />
  }

  const totalPages = data ? Math.ceil(data.total / data.per_page) : 1

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gradient">Mission Control</h2>
          <p className="text-muted-foreground mt-1.5 font-medium">
            Managing <span className="text-primary font-bold">{data?.total ?? 0}</span> tracked opportunities {syncStatus?.last_synced && <>&middot; Last synced <span className="text-foreground/60">{new Date(syncStatus.last_synced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search missions..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-10 w-64 bg-card/40 border-border/40 focus:ring-primary/20 rounded-2xl h-11 transition-all"
            />
          </div>
          <Button variant="outline" size="lg" onClick={handleSync} loading={syncStatus?.syncing} className="rounded-2xl h-11 px-4 border-border/40 font-bold glass-morphism shadow-sm group">
            <RefreshCw size={16} className={cn("mr-2 group-hover:rotate-180 transition-transform duration-500", syncStatus?.syncing && "animate-spin")} />
            Sync Results
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-1 px-1.5 bg-muted/30 rounded-2xl w-fit flex items-center gap-1 border border-border/20">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1) }}
            className={cn(
              "px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer",
              status === s
                ? "bg-card text-primary shadow-lg shadow-black/5 border border-border/40"
                : "text-muted-foreground/60 hover:text-foreground hover:bg-white/5",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card className="border-border/40 glass-morphism overflow-hidden shadow-xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/20 bg-muted/5">
                  {[
                    { key: "title", label: "Intelligence Subject" },
                    { key: "company", label: "Organization" },
                    { key: "score", label: "Match" },
                    { key: "grade", label: "Tier" },
                    { key: "app_status", label: "Status" },
                    { key: "date_logged", label: "Acquired" },
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest cursor-pointer hover:bg-muted/10 transition-colors select-none group"
                      onClick={() => toggleSort(key)}
                    >
                      <span className="flex items-center gap-2">
                        {label}
                        <SortIcon col={key} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="bg-card/20 border-b border-border/10">
                      <td className="px-6 py-5"><div className="h-4 shimmer rounded w-48 opacity-40" /></td>
                      <td className="px-6 py-5"><div className="h-4 shimmer rounded w-28 opacity-40" /></td>
                      <td className="px-6 py-5"><div className="h-10 w-10 shimmer rounded-2xl opacity-40" /></td>
                      <td className="px-6 py-5"><div className="h-5 shimmer rounded-lg w-10 opacity-40" /></td>
                      <td className="px-6 py-5"><div className="h-6 shimmer rounded-full w-20 opacity-40" /></td>
                      <td className="px-6 py-5"><div className="h-4 shimmer rounded w-24 opacity-40" /></td>
                    </tr>
                  ))
                ) : data?.jobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-28 text-center bg-card/10">
                      <div className="w-16 h-16 rounded-3xl bg-muted/30 flex items-center justify-center mx-auto mb-5 border border-border/20 shadow-inner group transition-transform duration-500 hover:scale-110">
                        <Briefcase size={28} className="text-muted-foreground/30 group-hover:text-primary/40" />
                      </div>
                      <p className="text-lg font-bold text-muted-foreground/80">Zero Intelligence Results</p>
                      <p className="text-xs text-muted-foreground/40 mt-1 max-w-[280px] mx-auto font-medium">Try recalibrating your search parameters or synchronize your discovery feed.</p>
                      <Button variant="outline" className="mt-8 rounded-xl font-bold border-border/60" onClick={() => {setStatus("All"); setSearch("")}}>Reset Parameters</Button>
                    </td>
                  </tr>
                ) : (
                  data?.jobs.slice().sort((a, b) => {
                    if (sortBy === "date_logged") {
                      const da = parseDate(a.date_logged)?.getTime() ?? 0
                      const db = parseDate(b.date_logged)?.getTime() ?? 0
                      return sortDir === "desc" ? db - da : da - db
                    }
                    return 0
                  }).map((job, i) => (
                    <tr
                      key={job.id}
                      className="group bg-card/10 hover:bg-primary/[0.03] cursor-pointer transition-all duration-300 animate-slide-up"
                      style={{ animationDelay: `${i * 20}ms` }}
                      onClick={() => navigate(`/jobs/${job.id}`)}
                    >
                      <td className="px-6 py-5 min-w-[300px]">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-foreground/90 group-hover:text-primary transition-colors truncate block">{job.title}</span>
                          <span className="text-[10px] text-muted-foreground font-bold italic opacity-40 uppercase tracking-tighter">REF# JOB-{job.id.toString().padStart(4, "0")}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-bold text-muted-foreground/80">{job.company}</span>
                      </td>
                      <td className="px-6 py-5">
                        <ScoreIndicator score={job.score} />
                      </td>
                      <td className="px-6 py-5">
                        <GradeBadge grade={job.grade} />
                      </td>
                      <td className="px-6 py-5">
                        <StatusBadge status={job.app_status} />
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col items-start">
                          <span className="text-xs font-black tabular-nums text-muted-foreground/60">{formatDate(job.date_logged)}</span>
                          <span className="text-[10px] text-muted-foreground/30 font-bold uppercase tracking-tight">{new Date(parseDate(job.date_logged)||0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/40">{data?.total} Opportunities Tracked</span>
          <div className="flex items-center gap-1.5 p-1 bg-muted/20 rounded-2xl border border-border/20">
            <Button size="icon" variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-xl h-9 w-9 border border-transparent hover:border-border/40 hover:bg-card">
              <ChevronUp size={18} className="-rotate-90" />
            </Button>
            <div className="px-4 py-1.5 rounded-xl bg-card border border-border/40 shadow-sm">
              <span className="text-xs font-black tabular-nums">{page} <span className="text-muted-foreground/40 font-bold mx-1">/</span> {totalPages}</span>
            </div>
            <Button size="icon" variant="ghost" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-xl h-9 w-9 border border-transparent hover:border-border/40 hover:bg-card">
              <ChevronUp size={18} className="rotate-90" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
