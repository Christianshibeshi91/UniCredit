import { useState, useRef, useEffect } from "react";
import { BookOpen, Play, Download, Loader2, CheckCircle2, AlertCircle, Globe, Brain, Sparkles, Cpu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../components/ui/Button";
import { GlassCard, AnimatedCard } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import ReactMarkdown from "react-markdown";
import { api } from "../lib/api";

interface SourceStatus {
  name: string;
  label: string;
  icon: "manus" | "notebooklm" | "gemini" | "claude";
  status: "idle" | "running" | "done" | "error";
  message: string;
  chars: number;
}

type Phase = "idle" | "research" | "synthesis" | "complete" | "error";

/* ── Stagger animation variants ─────────────────────────────────── */
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

const fadeSlideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.25 } },
};

/* ── Gradient map per source icon ───────────────────────────────── */
const iconGradients: Record<string, string> = {
  manus: "bg-gradient-to-br from-orange-500 to-amber-500",
  notebooklm: "bg-gradient-to-br from-emerald-500 to-green-500",
  gemini: "bg-gradient-to-br from-blue-500 to-cyan-500",
  claude: "bg-gradient-to-br from-violet-500 to-purple-500",
};

export function TextbookPage() {
  const [topic, setTopic] = useState("");
  const [notebookId, setNotebookId] = useState("power-platform-governance");
  const [model, setModel] = useState("sonnet");
  const [phase, setPhase] = useState<Phase>("idle");
  const [content, setContent] = useState("");
  const [phaseMessage, setPhaseMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [sources, setSources] = useState<SourceStatus[]>([
    { name: "manus", label: "Manus AI", icon: "manus", status: "idle", message: "Deep web research", chars: 0 },
    { name: "notebooklm", label: "NotebookLM", icon: "notebooklm", status: "idle", message: "Study materials", chars: 0 },
    { name: "gemini", label: "Gemini", icon: "gemini", status: "idle", message: "Textbook outline", chars: 0 },
    { name: "claude", label: "Claude", icon: "claude", status: "idle", message: "Textbook synthesis", chars: 0 },
  ]);
  const contentRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (phase === "synthesis" && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, phase]);

  const updateSource = (name: string, updates: Partial<SourceStatus>) => {
    setSources((prev) => prev.map((s) => (s.name === name ? { ...s, ...updates } : s)));
  };

  const resetState = () => {
    setPhase("idle");
    setContent("");
    setPhaseMessage("");
    setErrors([]);
    setSources((prev) => prev.map((s) => ({ ...s, status: "idle", message: s.name === "manus" ? "Deep web research" : s.name === "notebooklm" ? "Study materials" : s.name === "gemini" ? "Textbook outline" : "Textbook synthesis", chars: 0 })));
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    resetState();
    setPhase("research");

    abortRef.current = new AbortController();

    try {
      const res = await api.generateTextbook(topic, notebookId || undefined, model);
      if (!res.body) throw new Error("No stream body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));

            switch (data.type) {
              case "phase":
                setPhaseMessage(data.message);
                if (data.name === "synthesis") {
                  setPhase("synthesis");
                  updateSource("claude", { status: "running", message: "Writing textbook..." });
                } else if (data.name === "complete") {
                  setPhase("complete");
                  updateSource("claude", { status: "done", message: data.message, chars: data.total_chars || fullContent.length });
                }
                break;

              case "source_start":
                updateSource(data.source, { status: "running", message: data.message });
                break;

              case "source_done":
                updateSource(data.source, {
                  status: data.chars > 0 ? "done" : "error",
                  message: data.message,
                  chars: data.chars,
                });
                break;

              case "chunk":
                fullContent += data.content;
                setContent(fullContent);
                break;

              case "warning":
                setErrors((prev) => [...prev, data.message]);
                break;

              case "error":
                setPhase("error");
                setErrors((prev) => [...prev, data.content]);
                break;

              case "done":
                if (phase !== "error") setPhase("complete");
                break;
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setPhase("error");
      setErrors((prev) => [...prev, err instanceof Error ? err.message : "Generation failed"]);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${topic.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}-textbook.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sourceIcon = (icon: string) => {
    switch (icon) {
      case "manus": return <Globe className="h-4 w-4" />;
      case "notebooklm": return <BookOpen className="h-4 w-4" />;
      case "gemini": return <Sparkles className="h-4 w-4" />;
      case "claude": return <Cpu className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "running": return "text-blue-400";
      case "done": return "text-green-400";
      case "error": return "text-yellow-400";
      default: return "text-[var(--text-muted)]";
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "running": return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
      case "done": return <CheckCircle2 className="h-3.5 w-3.5" />;
      case "error": return <AlertCircle className="h-3.5 w-3.5" />;
      default: return <div className="h-3.5 w-3.5 rounded-full border border-current opacity-30" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="border-b border-[var(--border)] bg-[var(--bg-elevated)] backdrop-blur-xl px-5 sm:px-6 py-3.5"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-[var(--radius)] bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-sm">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <span className="gradient-text">Textbook Generator</span>
          </h2>
          <AnimatePresence>
            {content && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25 }}
              >
                <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  Download .md
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left panel: Controls + Status */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-[var(--border)] flex flex-col shrink-0 overflow-auto bg-[var(--bg-elevated)] backdrop-blur-xl"
        >
          <div className="p-5 space-y-4">
            {/* Topic input */}
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] block mb-1.5 tracking-wide uppercase">
                Topic
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Power Platform Governance and ALM in Enterprise Environments"
                rows={3}
                className="w-full resize-none rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-input)] backdrop-blur-sm px-3.5 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus-visible:outline-none focus-visible:border-[var(--gradient-start)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-opacity-20 transition-all duration-200"
              />
            </div>

            {/* Notebook ID */}
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] block mb-1.5 tracking-wide uppercase">
                Notebook ID
              </label>
              <Input
                value={notebookId}
                onChange={(e) => setNotebookId(e.target.value)}
                placeholder="Optional notebook ID"
                className="h-9 text-xs"
              />
            </div>

            {/* Model selector */}
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] block mb-1.5 tracking-wide uppercase">
                Claude Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full h-9 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-input)] backdrop-blur-sm px-3 text-xs text-[var(--text)] focus-visible:outline-none focus-visible:border-[var(--gradient-start)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-opacity-20 transition-all duration-200"
              >
                <option value="sonnet">Claude Sonnet (recommended)</option>
                <option value="opus">Claude Opus (slower, more detailed)</option>
              </select>
            </div>

            {/* Generate button */}
            <Button
              variant="gradient"
              onClick={handleGenerate}
              disabled={!topic.trim() || (phase !== "idle" && phase !== "complete" && phase !== "error")}
              className="w-full h-11"
              glow
            >
              {phase === "research" || phase === "synthesis" ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="h-4 w-4" />
                  </motion.div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Generate Textbook</span>
                </>
              )}
            </Button>
          </div>

          {/* Source status panel */}
          <AnimatePresence>
            {phase !== "idle" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="px-5 pb-5 overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">
                    AI Sources
                  </h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-[var(--border)] to-transparent" />
                </div>

                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                  className="space-y-2"
                >
                  {sources.map((s, i) => (
                    <motion.div
                      key={s.name}
                      variants={staggerItem}
                      className={`
                        relative flex items-start gap-3 p-3 rounded-[var(--radius-lg)] transition-all duration-300
                        ${s.status === "running"
                          ? "glass-card border-blue-500/20 shadow-[0_0_16px_rgba(99,102,241,0.08)]"
                          : s.status === "done"
                            ? "glass-card border-green-500/20"
                            : s.status === "error"
                              ? "glass-card border-yellow-500/20"
                              : "bg-[var(--accent)]/40"
                        }
                      `}
                    >
                      {/* Gradient icon background */}
                      <div className={`
                        mt-0.5 h-8 w-8 rounded-[var(--radius)] flex items-center justify-center shrink-0 text-white shadow-sm transition-all duration-300
                        ${s.status === "idle"
                          ? "bg-[var(--accent)] text-[var(--text-muted)]"
                          : iconGradients[s.icon]
                        }
                      `}>
                        {sourceIcon(s.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold">{s.label}</span>
                          <Badge variant={s.icon as "manus" | "gemini" | "notebooklm" | "claude"}>
                            {s.status === "idle" ? "waiting" : s.status}
                          </Badge>
                          <span className={`ml-auto ${statusColor(s.status)}`}>
                            {statusIcon(s.status)}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">{s.message}</p>
                        <AnimatePresence>
                          {s.chars > 0 && (
                            <motion.p
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-[10px] text-green-400 font-medium mt-0.5"
                            >
                              {s.chars.toLocaleString()} chars collected
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Phase message */}
                <AnimatePresence mode="wait">
                  {phaseMessage && (
                    <motion.div
                      key={phaseMessage}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.3 }}
                      className="mt-4 px-3.5 py-2.5 rounded-[var(--radius-lg)] glass-card"
                    >
                      <p className="text-xs font-medium gradient-text">{phaseMessage}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Errors */}
                <AnimatePresence>
                  {errors.map((err, i) => (
                    <motion.div
                      key={`err-${i}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className="flex items-start gap-2 text-xs text-yellow-400 bg-yellow-500/5 border border-yellow-500/15 px-3 py-2 rounded-[var(--radius-lg)] mt-2"
                    >
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{err}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Right panel: Textbook content */}
        <div ref={contentRef} className="flex-1 overflow-auto p-5 sm:p-8">
          {/* Idle state with animated background */}
          <AnimatePresence mode="wait">
            {phase === "idle" && !content && (
              <motion.div
                key="idle"
                {...fadeSlideUp}
                className="flex flex-col items-center justify-center h-full text-center"
              >
                {/* Floating animated icon */}
                <motion.div
                  animate={{
                    y: [0, -10, 0],
                    rotate: [0, 2, -2, 0],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="relative mb-6"
                >
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary via-secondary to-info flex items-center justify-center shadow-lg">
                    <BookOpen className="h-10 w-10 text-white" />
                  </div>
                  {/* Glow ring behind the icon */}
                  <div className="absolute inset-0 -z-10 h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-secondary opacity-20 blur-xl animate-glow-pulse" />
                </motion.div>

                <h3 className="text-xl font-bold mb-2 gradient-text">
                  AI-Powered Textbook Generator
                </h3>
                <p className="text-[var(--text-muted)] max-w-md text-sm mb-8 leading-relaxed">
                  Enter a topic and we'll orchestrate 4 AI sources to generate a comprehensive, multi-chapter textbook.
                </p>

                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl w-full"
                >
                  {[
                    { icon: <Globe className="h-5 w-5 text-white" />, label: "Manus AI", desc: "Deep web research", gradient: "from-orange-500 to-amber-500" },
                    { icon: <BookOpen className="h-5 w-5 text-white" />, label: "NotebookLM", desc: "Your study sources", gradient: "from-emerald-500 to-green-500" },
                    { icon: <Sparkles className="h-5 w-5 text-white" />, label: "Gemini", desc: "Structured outline", gradient: "from-blue-500 to-cyan-500" },
                    { icon: <Cpu className="h-5 w-5 text-white" />, label: "Claude", desc: "Textbook synthesis", gradient: "from-violet-500 to-purple-500" },
                  ].map((s, i) => (
                    <motion.div key={s.label} variants={staggerItem}>
                      <AnimatedCard delay={i * 0.08} className="p-4 text-center group cursor-default">
                        <div className={`h-10 w-10 mx-auto mb-2.5 rounded-[var(--radius)] bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-300`}>
                          {s.icon}
                        </div>
                        <p className="text-xs font-semibold mb-0.5">{s.label}</p>
                        <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">{s.desc}</p>
                      </AnimatedCard>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            )}

            {/* Content area */}
            {content && (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="max-w-4xl mx-auto"
              >
                <GlassCard className="p-6 sm:p-8">
                  <div className="markdown-content prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{content}</ReactMarkdown>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {/* Loading state */}
            {(phase === "research" || phase === "synthesis") && !content && (
              <motion.div
                key="loading"
                {...fadeSlideUp}
                className="flex flex-col items-center justify-center h-full text-center"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.15, 1],
                    opacity: [0.7, 1, 0.7],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="relative mb-6"
                >
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="h-8 w-8 text-white" />
                    </motion.div>
                  </div>
                  <div className="absolute inset-0 -z-10 h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-secondary opacity-30 blur-xl animate-glow-pulse" />
                </motion.div>
                <p className="text-sm font-medium gradient-text">
                  {phase === "research" ? "Researching across AI sources..." : "Claude is writing your textbook..."}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1.5">This may take a few minutes</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
