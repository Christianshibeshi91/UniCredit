import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { toast } from "sonner"
import { RotateCw, AlertTriangle, CheckCircle2 } from "lucide-react"

interface ErrorEntry {
  id: number; job_url: string; job_title: string; company: string
  error_message: string; error_type: string; timestamp: string; retried: boolean
}

export default function ErrorsPage() {
  const queryClient = useQueryClient()
  const { data: errors = [], isLoading } = useQuery({
    queryKey: ["errors"],
    queryFn: () => api.get<ErrorEntry[]>("/api/errors"),
  })

  const retryMutation = useMutation({
    mutationFn: (id: number) => api.post(`/api/errors/${id}/retry`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["errors"] }); toast.success("Retry triggered") },
  })

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Errors</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{errors.length} errors logged</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Job</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Error</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse w-40" /><div className="h-3 bg-muted rounded animate-pulse w-24 mt-1.5" /></td>
                    <td className="px-4 py-3"><div className="h-3 bg-muted rounded animate-pulse w-56" /><div className="h-5 bg-muted rounded-full animate-pulse w-16 mt-1.5" /></td>
                    <td className="px-4 py-3"><div className="h-3 bg-muted rounded animate-pulse w-20" /></td>
                    <td className="px-4 py-3"><div className="h-8 bg-muted rounded-lg animate-pulse w-20" /></td>
                  </tr>
                ))
              ) : errors.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 size={24} className="text-emerald-500" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">No errors</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">All systems running smoothly</p>
                  </td>
                </tr>
              ) : (
                errors.map((e) => (
                  <tr key={e.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium">{e.job_title || "Unknown"}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{e.company}</div>
                    </td>
                    <td className="px-4 py-3 max-w-md">
                      <div className="text-xs text-muted-foreground truncate mb-1">{e.error_message}</div>
                      <Badge variant="destructive">{e.error_type || "Error"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs tabular-nums">{e.timestamp}</td>
                    <td className="px-4 py-3">
                      {e.retried ? (
                        <Badge variant="secondary">Retried</Badge>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => retryMutation.mutate(e.id)}>
                          <RotateCw size={14} /> Retry
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
