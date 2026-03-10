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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-500/8 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-indigo-500/8 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/5 blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative animate-scale-in border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4">
            <Rocket size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Anti-gravity</h1>
          <p className="text-sm text-blue-200/50 mt-1">Job Automation Dashboard</p>
        </CardHeader>
        <CardContent className="pt-2">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 p-3 rounded-lg animate-slide-down">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-100/70">Username</label>
              <Input
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/25 focus:border-blue-400 focus:ring-blue-400/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-100/70">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/25 focus:border-blue-400 focus:ring-blue-400/20 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <label className="flex items-center gap-2.5 text-sm text-blue-100/50 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500/30 cursor-pointer"
              />
              Remember me
            </label>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20 h-11 text-sm font-semibold"
              loading={loading}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
