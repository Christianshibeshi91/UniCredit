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

  // ── Sessions ─────────────────────────────────────────────────
  listSessions: (limit = 50) =>
    request<{ sessions: Session[] }>(`/api/sessions?limit=${limit}`),

  createSession: (title = "New Chat", notebook_id?: string) =>
    request<Session>("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ title, notebook_id }),
    }),

  getSession: (id: string) =>
    request<Session & { messages: ChatMessage[] }>(`/api/sessions/${id}`),

  deleteSession: (id: string) =>
    request<{ ok: boolean }>(`/api/sessions/${id}`, { method: "DELETE" }),

  addMessage: (sessionId: string, msg: { id?: string; role: string; content: string; source?: string }) =>
    request<ChatMessage>(`/api/sessions/${sessionId}/messages`, {
      method: "POST",
      body: JSON.stringify(msg),
    }),

  // ── Streaming ────────────────────────────────────────────────
  streamAsk: (question: string, notebook_id?: string, deep?: boolean, manus?: boolean) =>
    fetch("/api/stream/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, notebook_id, deep: deep ?? false, manus: manus ?? false }),
    }),

  // ── Textbook ────────────────────────────────────────────────
  generateTextbook: (topic: string, notebook_id?: string, model?: string) =>
    fetch("/api/textbook/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, notebook_id, model: model ?? "opus" }),
    }),

  // ── Quiz ─────────────────────────────────────────────────────
  generateQuiz: (topic: string, count = 10, notebook_id?: string) =>
    request<{ quiz_id: string; topic: string; questions: QuizQuestion[]; count: number }>("/api/quiz/generate", {
      method: "POST",
      body: JSON.stringify({ topic, count, notebook_id }),
    }),

  submitQuiz: (quiz_id: string, answers: number[]) =>
    request<QuizResult>("/api/quiz/submit", {
      method: "POST",
      body: JSON.stringify({ quiz_id, answers }),
    }),

  listQuizzes: () => request<{ quizzes: QuizSummary[] }>("/api/quiz"),

  getQuiz: (id: string) => request<QuizDetail>(`/api/quiz/${id}`),

  // ── Study Tracking ───────────────────────────────────────────
  startStudy: (topic: string, activity_type: string, notebook_id?: string) =>
    request<{ id: string }>("/api/study/start", {
      method: "POST",
      body: JSON.stringify({ topic, activity_type, notebook_id }),
    }),

  endStudy: (id: string) =>
    request<{ duration_seconds: number }>(`/api/study/end/${id}`, { method: "POST" }),

  getStudyStats: (days = 30) =>
    request<StudyStats>(`/api/study/stats?days=${days}`),

  // ── Spaced Repetition ────────────────────────────────────────
  getDueCards: (limit = 20) =>
    request<{ cards: ReviewCard[]; stats: ReviewStats }>(`/api/study/cards/due?limit=${limit}`),

  getAllCards: (topic?: string) =>
    request<{ cards: ReviewCard[] }>(`/api/study/cards${topic ? `?topic=${encodeURIComponent(topic)}` : ""}`),

  createCard: (question: string, answer: string, topic: string) =>
    request<ReviewCard>("/api/study/cards", {
      method: "POST",
      body: JSON.stringify({ question, answer, topic }),
    }),

  bulkCreateCards: (cards: { question: string; answer: string; topic: string }[]) =>
    request<{ cards: ReviewCard[]; count: number }>("/api/study/cards/bulk", {
      method: "POST",
      body: JSON.stringify({ cards }),
    }),

  reviewCard: (card_id: string, quality: number) =>
    request<{ interval_days: number; next_review: string }>("/api/study/cards/review", {
      method: "POST",
      body: JSON.stringify({ card_id, quality }),
    }),

  deleteCard: (id: string) =>
    request<{ ok: boolean }>(`/api/study/cards/${id}`, { method: "DELETE" }),

  getReviewStats: () => request<ReviewStats>("/api/study/cards/stats"),

  // ── Export ───────────────────────────────────────────────────
  exportSession: (id: string) => `/api/export/session/${id}`,

  exportQuiz: (id: string) => `/api/export/quiz/${id}`,

  exportLesson: async (params: { topic: string; lesson_type: string; content: string; duration_minutes?: number }) => {
    const res = await fetch("/api/export/lesson", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return res.blob();
  },

  // ── Upload ───────────────────────────────────────────────────
  uploadDocument: (file: File, notebook_id?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (notebook_id) form.append("notebook_id", notebook_id);
    return fetch("/api/upload", { method: "POST", body: form }).then(async (res) => {
      if (!res.ok) throw new Error(`Upload failed: ${await res.text()}`);
      return res.json() as Promise<{ filename: string; size: number; result: string }>;
    });
  },

  supportedFormats: () =>
    request<{ extensions: string[]; max_size_mb: number }>("/api/upload/supported"),
};

// ── Type Definitions ───────────────────────────────────────────

export interface Session {
  id: string;
  title: string;
  notebook_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  source?: string;
  created_at: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface QuizResult {
  attempt_id: string;
  score: number;
  total: number;
  percentage: number;
  results: {
    question: string;
    options: string[];
    your_answer: number;
    correct_answer: number;
    is_correct: boolean;
    explanation: string;
  }[];
}

export interface QuizSummary {
  id: string;
  topic: string;
  notebook_id: string | null;
  created_at: string;
}

export interface QuizDetail {
  id: string;
  topic: string;
  questions: QuizQuestion[];
  attempts: { id: string; score: number; total: number; completed_at: string }[];
}

export interface StudyStats {
  total_sessions: number;
  total_time_seconds: number;
  topics: Record<string, number>;
  activities: Record<string, number>;
  daily: Record<string, number>;
  sessions: { id: string; topic: string; activity_type: string; started_at: string; duration_seconds: number }[];
}

export interface ReviewCard {
  id: string;
  question: string;
  answer: string;
  topic: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review: string;
  last_reviewed: string | null;
  created_at: string;
}

export interface ReviewStats {
  total_cards: number;
  due_cards: number;
  topics: Record<string, number>;
}
