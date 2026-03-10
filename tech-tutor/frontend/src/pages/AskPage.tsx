import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, BookOpen, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import ReactMarkdown from "react-markdown";
import { api } from "../lib/api";

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

export function AskPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [notebookId, setNotebookId] = useState("power-platform-governance");
  const [hasNotebooks, setHasNotebooks] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check if notebooks exist
  useEffect(() => {
    api.listNotebooks().then((res) => {
      const hasContent = !!res.notebooks && !res.notebooks.includes("0 notebooks");
      setHasNotebooks(hasContent);
    }).catch(() => setHasNotebooks(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    const userMsg: Message = {
      id: uid(),
      role: "user",
      content: question,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.ask(question, notebookId || undefined);
      const assistantMsg: Message = {
        id: uid(),
        role: "assistant",
        content: res.answer,
        timestamp: new Date(),
        source: res.source,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: Message = {
        id: uid(),
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : "Failed to get response"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-[var(--border)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Ask NotebookLM
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              Query your notebooks with citation-backed answers
            </p>
          </div>
          {/* Notebook ID input */}
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[var(--text-muted)]" />
            <Input
              value={notebookId}
              onChange={(e) => setNotebookId(e.target.value)}
              placeholder="Notebook ID (from Notebooks page)"
              className="w-72 h-8 text-xs"
            />
          </div>
        </div>

        {/* Warning if no notebooks */}
        {hasNotebooks === false && (
          <div className="mt-3 flex items-center gap-2 text-xs text-warning bg-warning/10 px-3 py-2 rounded-[var(--radius)]">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            No notebooks found. Go to the <a href="/notebooks" className="underline font-medium">Notebooks</a> page to authenticate and add a notebook first.
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Welcome to Tech Tutor</h3>
            <p className="text-[var(--text-muted)] max-w-md text-sm">
              Ask questions about your NotebookLM sources. Make sure you've added a notebook first on the Notebooks page, then enter its ID above.
            </p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg">
              {[
                "Explain the key concepts from my sources",
                "What are the main takeaways?",
                "Create a summary of the core topics",
                "What prerequisite knowledge is needed?",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="text-left text-xs px-3 py-2 rounded-[var(--radius)] border border-[var(--border)] hover:bg-[var(--accent)] text-[var(--text-muted)] transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 animate-slide-up ${msg.role === "user" ? "justify-end" : ""}`}
          >
            {msg.role === "assistant" && (
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <Card
              className={`max-w-[75%] px-4 py-3 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground border-primary"
                  : ""
              }`}
            >
              {msg.role === "assistant" ? (
                <div>
                  {msg.source && (
                    <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mb-2 ${
                      msg.source === "gemini" ? "bg-blue-500/10 text-blue-400" : "bg-green-500/10 text-green-400"
                    }`}>
                      {msg.source === "gemini" ? "Gemini" : "NotebookLM"}
                    </span>
                  )}
                  <div className="markdown-content text-sm">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              )}
            </Card>
            {msg.role === "user" && (
              <div className="h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-secondary" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 animate-slide-up">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <Card className="px-4 py-3">
              <div className="flex gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-[var(--border)] p-4">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={notebookId ? "Ask a question..." : "Enter a Notebook ID above first, then ask a question..."}
            rows={1}
            className="flex-1 resize-none rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-opacity-40"
          />
          <Button type="submit" disabled={!input.trim() || loading} loading={loading} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
