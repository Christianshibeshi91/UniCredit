import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardContent, CardHeader } from "@/components/ui/Card"
import { Rocket, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password, remember_me: remember }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || "Login failed")
      }
      navigate("/")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#0a0a0c]">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -right-[10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[150px] animate-pulse-soft" />
        <div className="absolute -bottom-[10%] -left-[10%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[150px] animate-pulse-soft" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      <div className="w-full max-w-[440px] relative animate-fade-in group">
        {/* Aesthetic Glow behind card */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-indigo-500/20 to-violet-600/20 rounded-[2.5rem] blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000" />
        
        <Card className="relative border-white/[0.05] bg-white/[0.02] backdrop-blur-[40px] shadow-[0_0_80px_rgba(0,0,0,0.5)] rounded-[2rem] overflow-hidden">
          <CardHeader className="text-center pt-12 pb-8">
            <div className="mx-auto w-20 h-20 rounded-[2rem] bg-gradient-to-br from-primary via-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-primary/40 ring-1 ring-white/20 mb-8 animate-float">
              <Rocket size={36} className="text-white fill-white/10" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-gradient leading-none">Anti-gravity</h1>
            <p className="text-[10px] text-muted-foreground font-black tracking-[0.3em] uppercase opacity-40 mt-3">Autonomous Command Center</p>
          </CardHeader>
          
          <CardContent className="px-10 pb-12">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-4 py-3 rounded-2xl animate-shake flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1 opacity-50">Operational Identity</label>
                <Input
                  placeholder="USERNAME"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  className="h-14 bg-white/[0.03] border-white/[0.08] text-sm font-bold tracking-widest px-5 focus:border-primary/50 focus:ring-primary/10 rounded-2xl transition-all placeholder:text-muted-foreground/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1 opacity-50">Access Cipher</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 bg-white/[0.03] border-white/[0.08] text-sm font-bold tracking-[0.2em] px-5 focus:border-primary/50 focus:ring-primary/10 pr-14 rounded-2xl transition-all placeholder:text-muted-foreground/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-muted-foreground/40 hover:text-primary transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between px-1">
                <label className="flex items-center gap-3 text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest cursor-pointer select-none group/check">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="peer appearance-none w-5 h-5 rounded-lg border border-white/10 bg-white/5 checked:bg-primary checked:border-primary transition-all cursor-pointer"
                    />
                    <div className="absolute opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  Persistent Session
                </label>
              </div>

              <Button
                type="submit"
                className="w-full h-14 text-xs font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-primary/20 bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] mt-4 overflow-hidden relative group/btn"
                loading={loading}
                disabled={loading}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                {loading ? "Decrypting..." : "Authorize Access"}
              </Button>
            </form>
          </CardContent>

          {/* Card Footer Info */}
          <div className="bg-white/[0.01] border-t border-white/[0.05] p-6 text-center">
            <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.3em]">Neural Interface v4.2.0 • Secured Uplink Active</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
