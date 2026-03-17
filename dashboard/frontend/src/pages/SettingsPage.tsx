import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { toast } from "sonner"
import { X, Plus, Save } from "lucide-react"
import { cn } from "@/lib/utils"

const PLATFORMS = ["linkedin", "indeed", "glassdoor", "dice", "ziprecruiter", "simplyhired", "monster", "builtin"]

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => api.get<Record<string, string>>("/api/settings") })
  const { data: blocked = [] } = useQuery({ queryKey: ["blocked"], queryFn: () => api.get<string[]>("/api/settings/blocked-companies") })

  const [scoreThreshold, setScoreThreshold] = useState("70")
  const [dailyCap, setDailyCap] = useState("15")
  const [activePlatforms, setActivePlatforms] = useState<string[]>(PLATFORMS)
  const [newBlockedCompany, setNewBlockedCompany] = useState("")

  useEffect(() => {
    if (settings) {
      setScoreThreshold(settings.min_score_threshold || "70")
      setDailyCap(settings.max_applications_per_day || "15")
      if (settings.search_platforms) setActivePlatforms(settings.search_platforms.split(",").map((s: string) => s.trim()))
    }
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: () => api.put("/api/settings", {
      min_score_threshold: scoreThreshold,
      max_applications_per_day: dailyCap,
      search_platforms: activePlatforms.join(","),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["settings"] }); toast.success("Mission parameters updated") },
  })

  const addBlockedMutation = useMutation({
    mutationFn: (company: string) => api.post("/api/settings/blocked-companies", { company }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["blocked"] }); setNewBlockedCompany(""); toast.success("Target blacklisted") },
  })

  const removeBlockedMutation = useMutation({
    mutationFn: (company: string) => api.delete(`/api/settings/blocked-companies/${encodeURIComponent(company)}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["blocked"] }),
  })

  const togglePlatform = (p: string) => {
    setActivePlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])
  }

  return (
    <div className="space-y-10 max-w-3xl pb-20">
      <div>
        <h2 className="text-3xl font-black tracking-tight text-gradient">System Configuration</h2>
        <p className="text-muted-foreground mt-1.5 font-medium italic">Define the strategic boundaries for the automation engine.</p>
      </div>

      <div className="grid gap-8">
        {/* Automation Settings */}
        <Card className="border-border/40 glass-morphism shadow-xl overflow-hidden">
          <CardHeader className="bg-muted/5 border-b border-border/10 pb-4">
            <CardTitle className="text-lg font-bold">Automation Parameters</CardTitle>
            <CardDescription className="text-[11px] font-black uppercase tracking-widest opacity-60">Engine Sensitivity & Velocity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-6">
            <div className="grid sm:grid-cols-2 gap-8">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-black uppercase tracking-tight text-foreground/80">Match Threshold</label>
                  <span className="text-xs font-bold text-primary tabular-nums">{scoreThreshold}%+</span>
                </div>
                <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">The engine will ignore any intelligence subjects below this match probability.</p>
                <div className="relative pt-2">
                  <Input 
                    type="number" 
                    value={scoreThreshold} 
                    onChange={(e) => setScoreThreshold(e.target.value)} 
                    min="0" max="100" 
                    className="h-11 bg-muted/20 border-border/40 font-bold focus:ring-primary/20 rounded-xl pl-4"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/30 font-black text-[10px] uppercase">PERCENT</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-black uppercase tracking-tight text-foreground/80">Daily Mission Cap</label>
                  <span className="text-xs font-bold text-primary tabular-nums">{dailyCap} APPS</span>
                </div>
                <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">Maximum application payload to be deployed within a 24-hour cycle.</p>
                <div className="relative pt-2">
                  <Input 
                    type="number" 
                    value={dailyCap} 
                    onChange={(e) => setDailyCap(e.target.value)} 
                    min="1" max="50" 
                    className="h-11 bg-muted/20 border-border/40 font-bold focus:ring-primary/20 rounded-xl pl-4"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/30 font-black text-[10px] uppercase">UNITS</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-black uppercase tracking-tight text-foreground/80">Search Infiltration Points</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    onClick={() => togglePlatform(p)}
                    className={cn(
                      "px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 capitalize cursor-pointer border",
                      activePlatforms.includes(p)
                        ? "bg-primary/[0.08] text-primary border-primary/30 shadow-[0_0_15px_-5px_rgba(var(--primary),0.3)] shadow-primary/20"
                        : "bg-muted/30 text-muted-foreground/40 border-transparent hover:border-border/60 hover:text-muted-foreground",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <Button 
                onClick={() => saveMutation.mutate()} 
                loading={saveMutation.isPending}
                size="lg"
                className="w-full sm:w-auto rounded-xl h-11 px-8 font-black uppercase tracking-tighter"
              >
                <Save size={16} className="mr-2" /> Commit Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Blocked Companies */}
        <Card className="border-border/40 glass-morphism shadow-xl overflow-hidden">
          <CardHeader className="bg-muted/5 border-b border-border/10 pb-4">
            <CardTitle className="text-lg font-bold">Exclusion Protocol</CardTitle>
            <CardDescription className="text-[11px] font-black uppercase tracking-widest opacity-60">Organization Blacklist</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Input
                  placeholder="Subject name to exclude..."
                  value={newBlockedCompany}
                  onChange={(e) => setNewBlockedCompany(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && newBlockedCompany) addBlockedMutation.mutate(newBlockedCompany) }}
                  className="h-11 bg-muted/20 border-border/40 font-bold focus:ring-primary/20 rounded-xl pl-4"
                />
              </div>
              <Button 
                variant="outline"
                onClick={() => newBlockedCompany && addBlockedMutation.mutate(newBlockedCompany)} 
                className="h-11 rounded-xl px-6 font-black uppercase tracking-widest text-[11px] border-border/40 hover:bg-muted/50 transition-all shrink-0"
                loading={addBlockedMutation.isPending}
              >
                <Plus size={16} className="mr-1" /> Blacklist
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2 pt-2">
              {blocked.map((c) => (
                <div 
                  key={c} 
                  className="group flex items-center gap-2 bg-card border border-border/40 pl-4 pr-2 py-1.5 rounded-xl shadow-sm hover:border-rose-500/30 transition-all animate-scale-in"
                >
                  <span className="text-xs font-bold text-foreground/80">{c}</span>
                  <button 
                    onClick={() => removeBlockedMutation.mutate(c)} 
                    className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {blocked.length === 0 && (
                <div className="w-full py-12 text-center rounded-2xl bg-muted/10 border border-dashed border-border/40">
                  <p className="text-sm font-bold text-muted-foreground/40">No organizations currently blacklisted.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
