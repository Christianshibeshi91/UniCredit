import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { toast } from "sonner"
import { Save, AlertCircle, FileText, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"

export default function IntakePage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<"intake" | "learned">("intake")

  const { data: intake = {} } = useQuery({ queryKey: ["intake"], queryFn: () => api.get<Record<string, string>>("/api/intake") })
  const { data: learned = {} } = useQuery({ queryKey: ["learned"], queryFn: () => api.get<Record<string, string>>("/api/intake/learned") })
  const { data: unanswered = {} } = useQuery({ queryKey: ["unanswered"], queryFn: () => api.get<Record<string, string>>("/api/intake/unanswered") })

  const [editData, setEditData] = useState<Record<string, string>>({})

  const activeData = tab === "intake" ? intake : learned
  useEffect(() => { setEditData({ ...activeData }) }, [tab, intake, learned])

  const saveMutation = useMutation({
    mutationFn: () => api.put(tab === "intake" ? "/api/intake" : "/api/intake/learned", editData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tab] })
      queryClient.invalidateQueries({ queryKey: ["unanswered"] })
      toast.success("Saved")
    },
  })

  const unansweredKeys = Object.keys(unanswered)

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Intake Form</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your application answers and learned responses</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setTab("intake")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer",
            tab === "intake" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <FileText size={16} /> Intake Answers
        </button>
        <button
          onClick={() => setTab("learned")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer",
            tab === "learned" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <BookOpen size={16} /> Learned Answers
        </button>
      </div>

      {/* Unanswered Alert */}
      {unansweredKeys.length > 0 && tab === "intake" && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="text-amber-500" />
              <CardTitle className="text-amber-600 dark:text-amber-400">Unanswered Questions ({unansweredKeys.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {unansweredKeys.map((q) => (
              <div key={q} className="space-y-1.5">
                <label className="text-sm font-medium">{q}</label>
                <Input
                  value={editData[q] || ""}
                  onChange={(e) => setEditData({ ...editData, [q]: e.target.value })}
                  placeholder="Enter your answer..."
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* All Answers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{tab === "intake" ? "All Answers" : "Learned Answers"}</CardTitle>
            <Button size="sm" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
              <Save size={14} /> Save Changes
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.keys(editData).length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <FileText size={24} className="text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground">No entries yet</p>
            </div>
          ) : (
            Object.entries(editData).map(([q, a]) => (
              <div key={q} className="space-y-1.5">
                <label className="text-sm font-medium">{q}</label>
                <Input
                  value={a}
                  onChange={(e) => setEditData({ ...editData, [q]: e.target.value })}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
