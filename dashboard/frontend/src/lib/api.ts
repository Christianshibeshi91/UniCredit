const BASE = ""  // Same origin, Vite proxy handles /api

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...opts?.headers },
    ...opts,
  })

  if (res.status === 401) {
    // Try refresh
    const refresh = await fetch(`${BASE}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
    if (refresh.ok) {
      // Retry original request
      const retry = await fetch(`${BASE}${path}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json", ...opts?.headers },
        ...opts,
      })
      if (retry.ok) return retry.json()
    }
    window.location.href = "/login"
    throw new Error("Unauthorized")
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || "Request failed")
  }

  return res.json()
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
}
