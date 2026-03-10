const BASE = "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }

  return res.json();
}

export const api = {
  health: () => request<{ status: string; mcp_connected: boolean }>("/api/health"),

  listNotebooks: () => request<{ notebooks: string }>("/api/notebooks"),

  addNotebook: (url: string, name?: string, description?: string) =>
    request<{ result: string }>("/api/notebooks/add", {
      method: "POST",
      body: JSON.stringify({ url, name, description }),
    }),

  selectNotebook: (notebook_id: string) =>
    request<{ result: string }>("/api/notebooks/select", {
      method: "POST",
      body: JSON.stringify({ notebook_id }),
    }),

  syncLibrary: () =>
    request<{ result: string }>("/api/notebooks/sync", { method: "POST" }),

  setupAuth: () =>
    request<{ result: string }>("/api/notebooks/auth", { method: "POST" }),

  ask: (question: string, notebook_id?: string, use_gemini?: boolean) =>
    request<{ answer: string; notebook_id: string | null; source: string }>("/api/ask", {
      method: "POST",
      body: JSON.stringify({ question, notebook_id, use_gemini }),
    }),

  deepResearch: (query: string) =>
    request<{ result: string }>("/api/ask/deep-research", {
      method: "POST",
      body: JSON.stringify({ query }),
    }),

  generateLesson: (params: {
    topic: string;
    lesson_type: string;
    notebook_id?: string;
    duration_minutes?: number;
  }) =>
    request<{
      lesson_type: string;
      topic: string;
      content: string;
      duration_minutes: number;
    }>("/api/lessons", {
      method: "POST",
      body: JSON.stringify(params),
    }),
};
