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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["errors"] }); toast.success("Deployment retry initiated") },
  })

  return (
    <div className="space-y-8 max-w-6xl pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gradient">Incident Reports</h2>
          <p className="text-muted-foreground mt-1.5 font-medium italic">Monitoring and resolving deployment anomalies.</p>
        </div>
        <div className="px-5 py-2.5 bg-rose-500/10 rounded-2xl border border-rose-500/20 backdrop-blur-sm flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-500/60 leading-none">Anomalies Detected</p>
            <p className="text-xl font-black text-rose-500 leading-none mt-1 uppercase tracking-tighter">{errors.length} Critical</p>
          </div>
        </div>
      </div>

      <Card className="border-border/40 glass-morphism shadow-xl overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/10 bg-muted/5">
                  <th className="px-6 py-5 text-left text-[11px] font-black text-muted-foreground/60 uppercase tracking-widest bg-muted/10">Target Asset</th>
                  <th className="px-6 py-5 text-left text-[11px] font-black text-muted-foreground/60 uppercase tracking-widest bg-muted/10">Incident Details</th>
                  <th className="px-6 py-5 text-left text-[11px] font-black text-muted-foreground/60 uppercase tracking-widest bg-muted/10 text-center">Timestamp</th>
                  <th className="px-6 py-5 text-right text-[11px] font-black text-muted-foreground/60 uppercase tracking-widest bg-muted/10">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/5">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-6"><div className="h-4 bg-muted/40 rounded-full w-40" /><div className="h-3 bg-muted/30 rounded-full w-24 mt-2" /></td>
                      <td className="px-6 py-6"><div className="h-3 bg-muted/40 rounded-full w-56" /><div className="h-5 bg-muted/30 rounded-full w-16 mt-2" /></td>
                      <td className="px-6 py-6 flex justify-center"><div className="h-4 bg-muted/40 rounded-full w-20" /></td>
                      <td className="px-6 py-6 flex justify-end"><div className="h-9 bg-muted/40 rounded-xl w-20" /></td>
                    </tr>
                  ))
                ) : errors.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-32 text-center">
                      <div className="w-24 h-24 rounded-[2.5rem] bg-emerald-500/10 flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-xl shadow-emerald-500/10">
                        <CheckCircle2 size={36} className="text-emerald-500" />
                      </div>
                      <p className="text-2xl font-black text-foreground/80 tracking-tight">System Integrity Normal</p>
                      <p className="text-sm text-muted-foreground/60 mt-2 max-w-[320px] mx-auto font-medium italic">No anomalies detected in recent deployment cycles. Operation is optimal.</p>
                    </td>
                  </tr>
                ) : (
                  errors.map((e) => (
                    <tr key={e.id} className="group hover:bg-muted/10 transition-all duration-300">
                      <td className="px-6 py-6">
                        <div className="font-bold text-base tracking-tight text-foreground/90 group-hover:text-primary transition-colors">{e.job_title || "Unknown Target"}</div>
                        <div className="text-[11px] text-muted-foreground/60 font-black uppercase tracking-widest mt-1 opacity-70">{e.company}</div>
                      </td>
                      <td className="px-6 py-6 max-w-md">
                        <div className="text-xs text-muted-foreground/80 font-medium italic line-clamp-1 mb-2">"{e.error_message}"</div>
                        <Badge variant="destructive" className="rounded-lg text-[9px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-500 border-rose-500/20 px-2.5 py-0.5">
                          {e.error_type || "Unknown Anomaly"}
                        </Badge>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <span className="px-3 py-1 rounded-full bg-muted/30 text-[11px] font-black tabular-nums transition-colors group-hover:bg-muted/50">
                          {e.timestamp}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-right">
                        {e.retried ? (
                          <Badge variant="secondary" className="rounded-xl px-4 py-1 text-[10px] font-black uppercase tracking-widest bg-muted/50 text-muted-foreground/60 border-border/40">Retried</Badge>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="rounded-xl h-9 px-4 font-black text-[10px] uppercase tracking-widest border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all"
                            onClick={() => retryMutation.mutate(e.id)}
                            loading={retryMutation.isPending && retryMutation.variables === e.id}
                          >
                            <RotateCw size={14} className="mr-1.5" /> Retry Sync
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
