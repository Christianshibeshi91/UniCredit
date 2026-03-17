import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
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
      toast.success("Intelligence base updated")
    },
  })

  const unansweredKeys = Object.keys(unanswered)

  return (
    <div className="space-y-10 max-w-4xl pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gradient">Intelligence Base</h2>
          <p className="text-muted-foreground mt-1.5 font-medium italic">Managing responses for automated application deployment.</p>
        </div>
        <Button size="lg" className="rounded-xl h-11 px-8 font-black uppercase tracking-tighter shadow-xl shadow-primary/20" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
          <Save size={16} className="mr-2" /> Commit Knowledge
        </Button>
      </div>

      {/* Tabs */}
      <div className="p-1 px-1.5 bg-muted/30 rounded-2xl w-fit flex items-center gap-1 border border-border/20">
        {[
          { id: "intake", label: "Core Profile", icon: FileText },
          { id: "learned", label: "Learned Logic", icon: BookOpen }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={cn(
              "flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer",
              tab === t.id
                ? "bg-card text-primary shadow-lg shadow-black/5 border border-border/40"
                : "text-muted-foreground/60 hover:text-foreground hover:bg-white/5",
            )}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-8">
        {/* Unanswered Alert */}
        {unansweredKeys.length > 0 && tab === "intake" && (
          <Card className="border-amber-500/40 bg-amber-500/[0.03] shadow-lg shadow-amber-500/5 animate-slide-up">
            <CardHeader className="pb-4 border-b border-amber-500/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <AlertCircle size={20} className="text-amber-500" />
                </div>
                <div>
                  <CardTitle className="text-amber-600 dark:text-amber-400 text-base font-black">Attention Required</CardTitle>
                  <CardDescription className="text-amber-600/60 text-[10px] font-bold uppercase tracking-widest">{unansweredKeys.length} Missing Intelligence Nodes</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {unansweredKeys.map((q) => (
                <div key={q} className="space-y-2 group">
                  <label className="text-xs font-black uppercase tracking-tight text-amber-700/80 dark:text-amber-400/80">{q}</label>
                  <Input
                    value={editData[q] || ""}
                    onChange={(e) => setEditData({ ...editData, [q]: e.target.value })}
                    placeholder="Provide a strategic response..."
                    className="h-11 bg-white/40 dark:bg-black/20 border-amber-500/20 focus:ring-amber-500/20 rounded-xl px-4 font-bold placeholder:text-amber-900/20 dark:placeholder:text-amber-100/10"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* All Answers */}
        <Card className="border-border/40 glass-morphism shadow-xl overflow-hidden">
          <CardHeader className="bg-muted/5 border-b border-border/10">
            <CardTitle className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/40">{tab === "intake" ? "Primary Intelligence" : "Heuristic Learnings"}</CardTitle>
          </CardHeader>
          <CardContent className="pt-8 space-y-8">
            {Object.keys(editData).length === 0 ? (
              <div className="text-center py-20 bg-muted/5 rounded-3xl border border-dashed border-border/40">
                <div className="w-16 h-16 rounded-3xl bg-muted/30 flex items-center justify-center mx-auto mb-5">
                  <FileText size={28} className="text-muted-foreground/30" />
                </div>
                <p className="text-lg font-bold text-muted-foreground/60">No Intelligence Logged</p>
                <p className="text-xs text-muted-foreground/40 mt-1 max-w-[240px] mx-auto font-medium italic">Deploy the engine to start harvesting automated responses.</p>
              </div>
            ) : (
              <div className="grid gap-x-12 gap-y-8">
                {Object.entries(editData).map(([q, a]) => (
                  <div key={q} className="space-y-3 group max-w-2xl">
                    <div className="flex items-start gap-4">
                      <div className="w-1.5 h-6 rounded-full bg-primary/20 group-focus-within:bg-primary transition-colors mt-0.5" />
                      <div className="flex-1 space-y-2">
                        <label className="text-xs font-black uppercase tracking-tight text-foreground/80 group-hover:text-primary transition-colors">{q}</label>
                        <Input
                          value={a}
                          onChange={(e) => setEditData({ ...editData, [q]: e.target.value })}
                          className="h-11 bg-muted/20 border-border/40 font-bold focus:ring-primary/20 rounded-xl px-4 group-hover:border-primary/20 transition-all shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
