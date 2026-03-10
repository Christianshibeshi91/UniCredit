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
      toast.success("Marked as followed up")
    },
  })

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Follow-ups</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{followUps.length} follow-ups due</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Company</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Applied</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse w-48" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse w-28" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse w-24" /></td>
                    <td className="px-4 py-3"><div className="h-8 bg-muted rounded-lg animate-pulse w-32" /></td>
                  </tr>
                ))
              ) : followUps.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                      <Clock size={24} className="text-muted-foreground/40" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">No follow-ups due</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Applied jobs that need follow-up will appear here</p>
                  </td>
                </tr>
              ) : (
                followUps.map((f) => (
                  <tr key={f.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{f.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{f.company}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs tabular-nums">{f.date_logged}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="success" onClick={() => completeMutation.mutate(f.id)}>
                        <CheckCircle size={14} /> Complete
                      </Button>
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
