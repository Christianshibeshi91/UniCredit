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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["settings"] }); toast.success("Settings saved") },
  })

  const addBlockedMutation = useMutation({
    mutationFn: (company: string) => api.post("/api/settings/blocked-companies", { company }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["blocked"] }); setNewBlockedCompany("") },
  })

  const removeBlockedMutation = useMutation({
    mutationFn: (company: string) => api.delete(`/api/settings/blocked-companies/${encodeURIComponent(company)}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["blocked"] }),
  })

  const togglePlatform = (p: string) => {
    setActivePlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Configure automation behavior and preferences</p>
      </div>

      {/* Automation Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Automation Settings</CardTitle>
          <CardDescription>Control how the automation pipeline behaves</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Minimum Score Threshold</label>
              <p className="text-xs text-muted-foreground">Only apply to jobs above this score</p>
              <Input type="number" value={scoreThreshold} onChange={(e) => setScoreThreshold(e.target.value)} min="0" max="100" className="w-32" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Applications Per Day</label>
              <p className="text-xs text-muted-foreground">Daily application limit</p>
              <Input type="number" value={dailyCap} onChange={(e) => setDailyCap(e.target.value)} min="1" max="50" className="w-32" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Search Platforms</label>
            <p className="text-xs text-muted-foreground">Select which platforms to search for jobs</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 capitalize cursor-pointer",
                    activePlatforms.includes(p)
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-muted text-muted-foreground border border-transparent hover:bg-accent",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
            <Save size={16} /> Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* Blocked Companies */}
      <Card>
        <CardHeader>
          <CardTitle>Blocked Companies</CardTitle>
          <CardDescription>Jobs from these companies will be automatically skipped</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Company name..."
              value={newBlockedCompany}
              onChange={(e) => setNewBlockedCompany(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newBlockedCompany) addBlockedMutation.mutate(newBlockedCompany) }}
            />
            <Button size="sm" onClick={() => newBlockedCompany && addBlockedMutation.mutate(newBlockedCompany)} className="shrink-0">
              <Plus size={14} /> Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {blocked.map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full text-sm font-medium">
                {c}
                <button onClick={() => removeBlockedMutation.mutate(c)} className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer">
                  <X size={14} />
                </button>
              </span>
            ))}
            {blocked.length === 0 && <p className="text-sm text-muted-foreground">No blocked companies</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
