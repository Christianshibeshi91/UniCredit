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
import { cn, formatDate } from "@/lib/utils"

interface JobRow {
  id: number; title: string; company: string; score: number; grade: string
  app_status: string; date_logged: string; location: string; salary: string
}

const STATUS_FILTERS = ["All", "Applied", "Pending", "Failed", "Interview", "Skipped"]

function ScoreIndicator({ score }: { score: number }) {
  return (
    <div
      className={cn(
        "w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold",
        score >= 80 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
        score >= 60 ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
        score >= 40 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
        "bg-rose-500/10 text-rose-600 dark:text-rose-400",
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
  return <Badge variant={v}>{grade || "—"}</Badge>
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
    toast.info("Syncing...")
    await api.post("/api/jobs/sync")
    refetch()
    toast.success("Synced")
  }

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir(sortDir === "asc" ? "desc" : "asc")
    else { setSortBy(col); setSortDir("desc") }
    setPage(1)
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return null
    return sortDir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />
  }

  const totalPages = data ? Math.ceil(data.total / data.per_page) : 1

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Jobs</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data?.total ?? 0} jobs tracked {syncStatus?.last_synced && <>&middot; Synced {new Date(syncStatus.last_synced).toLocaleTimeString()}</>}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleSync} loading={syncStatus?.syncing}>
          <RefreshCw size={14} /> Sync Now
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={status === s ? "default" : "outline"}
            onClick={() => { setStatus(s); setPage(1) }}
          >
            {s}
          </Button>
        ))}
        <div className="relative ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9 w-64"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {[
                    { key: "title", label: "Title" },
                    { key: "company", label: "Company" },
                    { key: "score", label: "Score" },
                    { key: "grade", label: "Grade" },
                    { key: "app_status", label: "Status" },
                    { key: "date_logged", label: "Date" },
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
                      onClick={() => toggleSort(key)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {label}
                        <SortIcon col={key} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse w-48" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse w-28" /></td>
                      <td className="px-4 py-3"><div className="h-9 w-9 bg-muted rounded-lg animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-5 bg-muted rounded-full animate-pulse w-10" /></td>
                      <td className="px-4 py-3"><div className="h-5 bg-muted rounded-full animate-pulse w-16" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse w-24" /></td>
                    </tr>
                  ))
                ) : data?.jobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                        <Briefcase size={24} className="text-muted-foreground/40" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">No jobs found</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting your filters or sync from Google Sheets</p>
                    </td>
                  </tr>
                ) : (
                  data?.jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/jobs/${job.id}`)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium max-w-xs truncate block">{job.title}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{job.company}</td>
                      <td className="px-4 py-3"><ScoreIndicator score={job.score} /></td>
                      <td className="px-4 py-3"><GradeBadge grade={job.grade} /></td>
                      <td className="px-4 py-3"><StatusBadge status={job.app_status} /></td>
                      <td className="px-4 py-3 text-muted-foreground text-xs tabular-nums">{formatDate(job.date_logged)}</td>
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
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{data?.total} jobs total</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="text-sm tabular-nums text-muted-foreground px-2">{page} of {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}
