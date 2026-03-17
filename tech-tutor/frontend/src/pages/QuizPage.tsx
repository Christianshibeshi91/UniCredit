import { useState } from "react";
import { Brain, CheckCircle2, XCircle, Trophy, RotateCcw, Sparkles, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../components/ui/Button";
import { GlassCard } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { api, type QuizQuestion, type QuizResult } from "../lib/api";

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    try { return crypto.randomUUID(); } catch { /* */ }
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

type Phase = "setup" | "taking" | "results";

export function QuizPage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(10);
  const [notebookId, setNotebookId] = useState("power-platform-governance");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [quizId, setQuizId] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || loading) return;
    setLoading(true); setError("");
    try {
      const res = await api.generateQuiz(topic.trim(), count, notebookId || undefined);
      setQuizId(res.quiz_id); setQuestions(res.questions);
      setAnswers(new Array(res.questions.length).fill(null));
      setCurrentQ(0); setPhase("taking");
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to generate quiz"); }
    finally { setLoading(false); }
  };

  const selectAnswer = (idx: number) => {
    const newAnswers = [...answers]; newAnswers[currentQ] = idx; setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await api.submitQuiz(quizId, answers.map((a) => a ?? 0));
      setResult(res); setPhase("results");
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to submit quiz"); }
    finally { setLoading(false); }
  };

  const handleReset = () => {
    setPhase("setup"); setQuestions([]); setAnswers([]);
    setResult(null); setQuizId(""); setCurrentQ(0); setError("");
  };

  const handleAddToReview = async () => {
    if (!result) return;
    const wrong = result.results.filter((r) => !r.is_correct);
    if (wrong.length === 0) return;
    try {
      await api.bulkCreateCards(wrong.map((r) => ({
        question: r.question,
        answer: `${r.options[r.correct_answer]}\n\n${r.explanation}`,
        topic,
      })));
      alert(`Added ${wrong.length} cards to spaced repetition!`);
    } catch { alert("Failed to add cards"); }
  };

  // ── Setup Phase ──
  if (phase === "setup") {
    return (
      <div className="h-full overflow-auto">
        <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] backdrop-blur-xl px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/20">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Practice Quiz</h2>
              <p className="text-xs text-[var(--text-subtle)]">Generate interactive quizzes from your study materials</p>
            </div>
          </div>
        </div>
        <div className="p-6 max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold gradient-text">Create a Quiz</h3>
              </div>
              <form onSubmit={handleGenerate} className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Notebook ID</label>
                  <Input value={notebookId} onChange={(e) => setNotebookId(e.target.value)} placeholder="Notebook ID" className="h-9 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Topic</label>
                  <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., Power Platform DLP policies..." className="h-9 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                    Questions: <span className="text-primary font-bold">{count}</span>
                  </label>
                  <input type="range" min={3} max={30} value={count} onChange={(e) => setCount(Number(e.target.value))}
                    className="w-full accent-primary h-1.5 rounded-full" />
                  <div className="flex justify-between text-[10px] text-[var(--text-subtle)]"><span>3</span><span>30</span></div>
                </div>
                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-destructive bg-destructive/8 border border-destructive/15 rounded-[var(--radius)] px-3 py-2">
                    {error}
                  </motion.p>
                )}
                <Button type="submit" loading={loading} disabled={!topic.trim()} variant="gradient" className="w-full">
                  <Sparkles className="h-4 w-4" />
                  Generate Quiz
                </Button>
              </form>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Taking Phase ──
  if (phase === "taking") {
    const q = questions[currentQ];
    const answered = answers.filter((a) => a !== null).length;
    return (
      <div className="h-full overflow-auto">
        <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] backdrop-blur-xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-sm font-semibold">{topic}</h2>
            </div>
            <Badge variant="default">{answered}/{questions.length} answered</Badge>
          </div>
          {/* Gradient progress bar */}
          <div className="mt-3 h-1 bg-[var(--accent)] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full gradient-bg"
              initial={{ width: 0 }}
              animate={{ width: `${(answered / questions.length) * 100}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>

        <div className="p-6 max-w-3xl mx-auto space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQ}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <GlassCard className="p-6">
                <p className="text-[10px] font-semibold text-[var(--text-subtle)] uppercase tracking-wider mb-3">
                  Question {currentQ + 1} of {questions.length}
                </p>
                <p className="text-sm font-medium mb-5 leading-relaxed">{q.question}</p>
                <div className="space-y-2">
                  {q.options.map((opt, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => selectAnswer(i)}
                      className={`w-full text-left px-4 py-3 rounded-[var(--radius)] border transition-all duration-200 text-sm ${
                        answers[currentQ] === i
                          ? "border-primary bg-primary/8 text-primary font-medium shadow-sm shadow-primary/10"
                          : "border-[var(--border)] hover:bg-[var(--accent)] hover:border-[var(--border-hover)]"
                      }`}
                    >
                      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold mr-2.5 ${
                        answers[currentQ] === i
                          ? "bg-primary text-white"
                          : "bg-[var(--accent)] text-[var(--text-muted)]"
                      }`}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      {opt}
                    </motion.button>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0}>
              Previous
            </Button>
            <div className="flex gap-1.5">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentQ(i)}
                  className={`h-2 w-2 rounded-full transition-all duration-200 ${
                    i === currentQ ? "bg-primary scale-125" : answers[i] !== null ? "bg-primary/40" : "bg-[var(--border)]"
                  }`}
                />
              ))}
            </div>
            {currentQ < questions.length - 1 ? (
              <Button variant="outline" size="sm" onClick={() => setCurrentQ(currentQ + 1)}>Next</Button>
            ) : (
              <Button size="sm" variant="gradient" onClick={handleSubmit} loading={loading} disabled={answered < questions.length}>
                Submit Quiz
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Results Phase ──
  if (phase === "results" && result) {
    const pct = result.percentage;
    const grade = pct >= 90 ? "A" : pct >= 80 ? "B" : pct >= 70 ? "C" : pct >= 60 ? "D" : "F";
    const gradeColor = pct >= 70 ? "text-success" : pct >= 50 ? "text-warning" : "text-destructive";
    const wrongCount = result.results.filter((r) => !r.is_correct).length;

    return (
      <div className="h-full overflow-auto">
        <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] backdrop-blur-xl px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-base font-semibold">Quiz Results</h2>
          </div>
        </div>

        <div className="p-6 max-w-3xl mx-auto space-y-6">
          {/* Score Card */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
            <GlassCard className="text-center p-8 gradient-border">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2, stiffness: 200 }}
                className={`text-7xl font-black ${gradeColor}`}
              >
                {grade}
              </motion.div>
              <div className="text-3xl font-bold mt-2 gradient-text">{result.score}/{result.total}</div>
              <p className="text-sm text-[var(--text-muted)] mt-1">{pct}% correct</p>
              <div className="flex gap-2 justify-center mt-6 flex-wrap">
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="h-3.5 w-3.5" /> New Quiz
                </Button>
                {wrongCount > 0 && (
                  <Button variant="outline" size="sm" onClick={handleAddToReview}>
                    <Brain className="h-3.5 w-3.5" /> Add {wrongCount} to Review
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => window.open(api.exportQuiz(quizId), "_blank")}>
                  <Download className="h-3.5 w-3.5" /> Export
                </Button>
              </div>
            </GlassCard>
          </motion.div>

          {/* Detailed Results */}
          {result.results.map((r, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
              <GlassCard className={`p-4 border-l-[3px] ${r.is_correct ? "border-l-success" : "border-l-destructive"}`}>
                <div className="flex items-start gap-2.5 mb-3">
                  {r.is_correct ? (
                    <div className="h-6 w-6 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    </div>
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                      <XCircle className="h-3.5 w-3.5 text-destructive" />
                    </div>
                  )}
                  <p className="text-sm font-medium leading-relaxed">Q{i + 1}: {r.question}</p>
                </div>
                <div className="ml-8 space-y-1">
                  {r.options.map((opt, j) => (
                    <div key={j} className={`text-xs px-3 py-1.5 rounded-[var(--radius)] ${
                      j === r.correct_answer
                        ? "bg-success/8 text-success font-medium border border-success/15"
                        : j === r.your_answer && !r.is_correct
                        ? "bg-destructive/8 text-destructive line-through border border-destructive/15"
                        : "text-[var(--text-subtle)]"
                    }`}>
                      <span className="font-mono mr-1.5">{String.fromCharCode(65 + j)}.</span>
                      {opt}
                      {j === r.correct_answer && <span className="ml-1.5 text-success">Correct</span>}
                    </div>
                  ))}
                  {r.explanation && (
                    <div className="mt-2.5 text-xs text-[var(--text-muted)] bg-[var(--accent)] rounded-[var(--radius)] p-2.5 border-l-2 border-primary/30">
                      {r.explanation}
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
