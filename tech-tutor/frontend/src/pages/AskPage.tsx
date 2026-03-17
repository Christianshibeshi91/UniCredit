import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Sparkles, BookOpen, AlertCircle, History, Plus, Trash2, Download, Search, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../components/ui/Button";
import { GlassCard } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import ReactMarkdown from "react-markdown";
import { api, type Session } from "../lib/api";

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    try { return crypto.randomUUID(); } catch { /* non-secure context */ }
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  source?: string;
}

const sourceBadge = (source?: string) => {
  if (!source) return null;
  const map: Record<string, { variant: "manus" | "deep" | "gemini" | "notebooklm"; label: string }> = {
    manus: { variant: "manus", label: "Manus AI" },
    deep_research: { variant: "deep", label: "Deep Research" },
    gemini: { variant: "gemini", label: "Gemini" },
    notebooklm: { variant: "notebooklm", label: "NotebookLM" },
  };
  const info = map[source];
  if (!info) return null;
  return <Badge variant={info.variant}>{info.label}</Badge>;
};

export function AskPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [notebookId, setNotebookId] = useState("power-platform-governance");
  const [hasNotebooks, setHasNotebooks] = useState<boolean | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [deepResearch, setDeepResearch] = useState(false);
  const [manusResearch, setManusResearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamContent]);

  useEffect(() => {
    api.listSessions(30).then((r) => setSessions(r.sessions)).catch(() => {});
  }, []);

  useEffect(() => {
    api.listNotebooks().then((res) => {
      const hasContent = !!res.notebooks && !res.notebooks.includes("0 notebooks");
      setHasNotebooks(hasContent);
    }).catch(() => setHasNotebooks(false));
  }, []);

  const startNewSession = useCallback(async () => {
    setMessages([]);
    setSessionId(null);
    setStreamContent("");
  }, []);

  const loadSession = useCallback(async (id: string) => {
    try {
      const s = await api.getSession(id);
      setSessionId(s.id);
      setMessages(s.messages.map((m) => ({
        id: m.id, role: m.role, content: m.content, timestamp: new Date(m.created_at), source: m.source,
      })));
      if (s.notebook_id) setNotebookId(s.notebook_id);
      setShowHistory(false);
    } catch { console.error("Failed to load session"); }
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    try {
      await api.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (sessionId === id) startNewSession();
    } catch { console.error("Failed to delete session"); }
  }, [sessionId, startNewSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    let sid = sessionId;
    if (!sid) {
      try {
        const title = question.slice(0, 60) + (question.length > 60 ? "..." : "");
        const s = await api.createSession(title, notebookId || undefined);
        sid = s.id;
        setSessionId(sid);
        setSessions((prev) => [s, ...prev]);
      } catch { console.error("Failed to create session"); }
    }

    const userMsg: Message = { id: uid(), role: "user", content: question, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setStreamContent("");

    if (sid) api.addMessage(sid, { id: userMsg.id, role: "user", content: question }).catch(() => {});

    try {
      const res = await api.streamAsk(question, notebookId || undefined, deepResearch, manusResearch);
      if (!res.body) throw new Error("No stream body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let source = "gemini";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        for (const line of text.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "chunk") { fullContent += data.content; setStreamContent(fullContent); }
            else if (data.type === "done") source = data.source || "gemini";
            else if (data.type === "error") fullContent = `Error: ${data.content}`;
          } catch { /* skip */ }
        }
      }

      const assistantMsg: Message = { id: uid(), role: "assistant", content: fullContent, timestamp: new Date(), source };
      setMessages((prev) => [...prev, assistantMsg]);
      setStreamContent("");
      if (sid) api.addMessage(sid, { id: assistantMsg.id, role: "assistant", content: fullContent, source }).catch(() => {});
    } catch {
      try {
        const res = await api.ask(question, notebookId || undefined);
        const assistantMsg: Message = { id: uid(), role: "assistant", content: res.answer, timestamp: new Date(), source: res.source };
        setMessages((prev) => [...prev, assistantMsg]);
        if (sid) api.addMessage(sid, { id: assistantMsg.id, role: "assistant", content: res.answer, source: res.source }).catch(() => {});
      } catch (err2) {
        setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: `Error: ${err2 instanceof Error ? err2.message : "Failed"}`, timestamp: new Date() }]);
      }
    } finally {
      setLoading(false);
      setStreamContent("");
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
  };

  return (
    <div className="flex h-full">
      {/* History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 272, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="border-r border-[var(--border)] flex flex-col bg-[var(--bg-sidebar)] backdrop-blur-xl shrink-0 overflow-hidden"
          >
            <div className="p-3 border-b border-[var(--border)] flex items-center justify-between min-w-[270px]">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">History</span>
              <Button variant="ghost" size="sm" onClick={startNewSession} className="h-7 w-7 p-0">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-2 space-y-0.5 min-w-[270px]">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className={`group flex items-center gap-2 px-2.5 py-2 rounded-[var(--radius)] text-xs cursor-pointer transition-all duration-200 ${
                    sessionId === s.id
                      ? "bg-primary/8 text-primary border border-primary/15"
                      : "hover:bg-[var(--accent)] text-[var(--text-muted)] border border-transparent"
                  }`}
                >
                  <button className="flex-1 text-left truncate" onClick={() => loadSession(s.id)}>
                    {s.title}
                  </button>
                  <button
                    className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-all duration-200"
                    onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {sessions.length === 0 && (
                <p className="text-xs text-[var(--text-subtle)] text-center py-8">No sessions yet</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] backdrop-blur-xl px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className={showHistory ? "text-primary" : ""}>
                <History className="h-4 w-4" />
              </Button>
              <div className="h-8 w-8 rounded-lg gradient-bg flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-sm font-semibold">Ask</h2>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[var(--text-subtle)] hidden sm:block" />
              <Input
                value={notebookId}
                onChange={(e) => setNotebookId(e.target.value)}
                placeholder="Notebook ID"
                className="w-44 sm:w-64 h-8 text-xs"
              />
              {sessionId && (
                <Button variant="ghost" size="sm" onClick={() => window.open(api.exportSession(sessionId), "_blank")} className="h-8 w-8 p-0">
                  <Download className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {hasNotebooks === false && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mt-2 flex items-center gap-2 text-xs text-warning bg-warning/8 border border-warning/15 px-3 py-2 rounded-[var(--radius)]">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              No notebooks found. Go to <a href="/notebooks" className="underline font-medium">Notebooks</a> to add one.
            </motion.div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-5">
          {messages.length === 0 && !streamContent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center justify-center h-full text-center"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="h-20 w-20 rounded-2xl gradient-bg flex items-center justify-center mb-6 shadow-xl shadow-primary/20"
              >
                <Bot className="h-10 w-10 text-white" />
              </motion.div>
              <h3 className="text-xl font-bold mb-2 gradient-text">Welcome to Tech Tutor</h3>
              <p className="text-[var(--text-muted)] max-w-md text-sm leading-relaxed">
                Ask questions about your study materials. Answers stream in real-time with full session history.
              </p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg">
                {[
                  "Explain the key concepts from my sources",
                  "What are the main takeaways?",
                  "Create a summary of the core topics",
                  "What prerequisite knowledge is needed?",
                ].map((suggestion, i) => (
                  <motion.button
                    key={suggestion}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    onClick={() => setInput(suggestion)}
                    className="text-left text-xs px-4 py-3 rounded-[var(--radius-lg)] glass-card text-[var(--text-muted)] hover:text-[var(--text)] transition-all duration-200"
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {messages.map((msg, i) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "assistant" && (
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shrink-0 ring-1 ring-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <GlassCard className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 ${
                msg.role === "user"
                  ? "gradient-bg text-white border-none shadow-lg shadow-primary/15"
                  : ""
              }`}>
                {msg.role === "assistant" ? (
                  <div>
                    {msg.source && <div className="mb-2">{sourceBadge(msg.source)}</div>}
                    <div className="markdown-content text-sm">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
              </GlassCard>
              {msg.role === "user" && (
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-secondary/20 to-pink-500/20 flex items-center justify-center shrink-0 ring-1 ring-secondary/10">
                  <User className="h-4 w-4 text-secondary" />
                </div>
              )}
            </motion.div>
          ))}

          {/* Streaming content */}
          {streamContent && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shrink-0 ring-1 ring-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <GlassCard className="max-w-[85%] sm:max-w-[75%] px-4 py-3">
                <div className="markdown-content text-sm">
                  <ReactMarkdown>{streamContent}</ReactMarkdown>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Loading shimmer */}
          {loading && !streamContent && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shrink-0 ring-1 ring-primary/10">
                <Bot className="h-4 w-4 text-primary animate-pulse" />
              </div>
              <GlassCard className="px-5 py-4">
                <div className="flex gap-1.5">
                  {[0, 150, 300].map((delay) => (
                    <motion.span
                      key={delay}
                      className="h-2 w-2 rounded-full bg-primary/50"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1, repeat: Infinity, delay: delay / 1000 }}
                    />
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t border-[var(--border)] bg-[var(--bg-elevated)] backdrop-blur-xl p-3 sm:p-4">
          <div className="max-w-4xl mx-auto space-y-2.5">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={notebookId ? "Ask a question..." : "Enter a Notebook ID above first..."}
                rows={1}
                className="flex-1 resize-none rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-input)] backdrop-blur-sm px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus-visible:outline-none focus-visible:border-[var(--gradient-start)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-opacity-15 transition-all duration-200"
              />
              <Button
                type="submit"
                disabled={!input.trim() || loading}
                loading={loading}
                variant={input.trim() ? "gradient" : "default"}
                size="icon"
                className="h-[46px] w-[46px] rounded-[var(--radius-lg)]"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => { setDeepResearch(!deepResearch); if (!deepResearch) setManusResearch(false); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200 border ${
                  deepResearch
                    ? "bg-gradient-to-r from-purple-500 to-violet-500 text-white border-transparent shadow-md shadow-purple-500/20"
                    : "bg-[var(--accent)] text-[var(--text-muted)] hover:text-[var(--text)] border-[var(--border)] hover:border-[var(--border-hover)]"
                }`}
              >
                <Search className="h-3 w-3" />
                Deep Research
              </button>
              <button
                type="button"
                onClick={() => { setManusResearch(!manusResearch); if (!manusResearch) setDeepResearch(false); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200 border ${
                  manusResearch
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-transparent shadow-md shadow-orange-500/20"
                    : "bg-[var(--accent)] text-[var(--text-muted)] hover:text-[var(--text)] border-[var(--border)] hover:border-[var(--border-hover)]"
                }`}
              >
                <Globe className="h-3 w-3" />
                Manus AI
              </button>
              <span className="text-[10px] text-[var(--text-subtle)] ml-1">
                {manusResearch ? "Manus AI agent research (thorough)" : deepResearch ? "Web-grounded deep analysis" : "Detailed answers from Gemini"}
              </span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
