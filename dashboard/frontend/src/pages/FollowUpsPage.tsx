import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { toast } from "sonner"
import { CheckCircle, Clock } from "lucide-react"

interface FollowUp {
  id: number; title: string; company: string; date_logged: string
  app_status: string; follow_up_date: string
}

export default function FollowUpsPage() {
  const queryClient = useQueryClient()
  const { data: followUps = [], isLoading } = useQuery({
    queryKey: ["follow-ups"],
    queryFn: () => api.get<FollowUp[]>("/api/follow-ups"),
  })

  const completeMutation = useMutation({
    mutationFn: (id: number) => api.post(`/api/follow-ups/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-ups"] })
      toast.success("Engagement objective secured")
    },
  })

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gradient">Engagement Tracker</h2>
          <p className="text-muted-foreground mt-1.5 font-medium italic">Pending follow-up actions for active deployments.</p>
        </div>
        <div className="px-4 py-2 bg-primary/10 rounded-2xl border border-primary/20 backdrop-blur-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Pending Requests</p>
          <p className="text-xl font-black text-primary leading-none mt-1 uppercase tracking-tighter">{followUps.length} Objectives</p>
        </div>
      </div>

      <Card className="border-border/40 glass-morphism shadow-xl overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/10 bg-muted/5">
                  <th className="px-6 py-5 text-left text-[11px] font-black text-muted-foreground/60 uppercase tracking-widest bg-muted/10">Project / Role</th>
                  <th className="px-6 py-5 text-left text-[11px] font-black text-muted-foreground/60 uppercase tracking-widest bg-muted/10">Organization</th>
                  <th className="px-6 py-5 text-left text-[11px] font-black text-muted-foreground/60 uppercase tracking-widest bg-muted/10 text-center">Applied Date</th>
                  <th className="px-6 py-5 text-right text-[11px] font-black text-muted-foreground/60 uppercase tracking-widest bg-muted/10">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/5">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-6"><div className="h-4 bg-muted/40 rounded-full w-48" /></td>
                      <td className="px-6 py-6"><div className="h-4 bg-muted/40 rounded-full w-28" /></td>
                      <td className="px-6 py-6 flex justify-center"><div className="h-4 bg-muted/40 rounded-full w-24" /></td>
                      <td className="px-6 py-6 flex justify-end"><div className="h-9 bg-muted/40 rounded-xl w-32" /></td>
                    </tr>
                  ))
                ) : followUps.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-24 text-center">
                      <div className="w-20 h-20 rounded-[2.5rem] bg-muted/10 flex items-center justify-center mx-auto mb-6 border border-border/10">
                        <Clock size={32} className="text-muted-foreground/20" />
                      </div>
                      <p className="text-xl font-bold text-muted-foreground/60">No Pending Objectives</p>
                      <p className="text-xs text-muted-foreground/40 mt-2 max-w-[280px] mx-auto font-medium italic">All follow-up engagements are currently up to date. Keep deploying.</p>
                    </td>
                  </tr>
                ) : (
                  followUps.map((f) => (
                    <tr key={f.id} className="group hover:bg-muted/10 transition-all duration-300">
                      <td className="px-6 py-6">
                        <div className="font-bold text-base tracking-tight text-foreground/90 group-hover:text-primary transition-colors">{f.title}</div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-border group-hover:bg-primary/40 transition-colors" />
                          <span className="text-muted-foreground font-semibold text-sm">{f.company}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <span className="px-3 py-1 rounded-full bg-muted/30 text-[11px] font-black tabular-nums transition-colors group-hover:bg-muted/50">
                          {f.date_logged}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <Button
                          size="sm"
                          variant="success"
                          className="rounded-xl h-9 px-4 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/10 opacity-80 hover:opacity-100"
                          onClick={() => completeMutation.mutate(f.id)}
                          loading={completeMutation.isPending && completeMutation.variables === f.id}
                        >
                          <CheckCircle size={14} className="mr-1.5" /> Secure Objective
                        </Button>
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
