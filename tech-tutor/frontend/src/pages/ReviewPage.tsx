import { useState, useEffect } from "react";
import { RotateCcw, Brain, Plus, Trash2, Eye, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../components/ui/Button";
import { GlassCard } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import ReactMarkdown from "react-markdown";
import { api, type ReviewCard, type ReviewStats } from "../lib/api";

type Phase = "overview" | "review" | "add";

export function ReviewPage() {
  const [phase, setPhase] = useState<Phase>("overview");
  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newTopic, setNewTopic] = useState("Power Platform Governance");

  const loadDueCards = async () => {
    setLoading(true);
    try { const res = await api.getDueCards(50); setCards(res.cards); setStats(res.stats); }
    catch { setCards([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadDueCards(); }, []);

  const handleRate = async (quality: number) => {
    if (!cards[currentIdx]) return;
    try {
      await api.reviewCard(cards[currentIdx].id, quality);
      setReviewed((r) => r + 1); setShowAnswer(false);
      if (currentIdx < cards.length - 1) setCurrentIdx((i) => i + 1);
      else { await loadDueCards(); setCurrentIdx(0); setPhase("overview"); }
    } catch (err) { console.error("Review failed:", err); }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    try {
      await api.createCard(newQuestion.trim(), newAnswer.trim(), newTopic.trim());
      setNewQuestion(""); setNewAnswer(""); await loadDueCards();
    } catch (err) { console.error("Failed to add card:", err); }
  };

  const handleDeleteCard = async (id: string) => {
    try { await api.deleteCard(id); setCards((prev) => prev.filter((c) => c.id !== id)); }
    catch (err) { console.error("Failed to delete:", err); }
  };

  const ratingButtons = [
    { q: 0, label: "Blackout", gradient: "from-red-600 to-red-500" },
    { q: 1, label: "Wrong", gradient: "from-red-500 to-orange-500" },
    { q: 2, label: "Hard", gradient: "from-orange-500 to-amber-500" },
    { q: 3, label: "Okay", gradient: "from-amber-500 to-yellow-500" },
    { q: 4, label: "Good", gradient: "from-emerald-500 to-green-500" },
    { q: 5, label: "Perfect", gradient: "from-green-500 to-emerald-400" },
  ];

  // ── Overview ──
  if (phase === "overview") {
    return (
      <div className="h-full overflow-auto">
        <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] backdrop-blur-xl px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Spaced Repetition</h2>
              <p className="text-xs text-[var(--text-subtle)]">SM-2 algorithm for optimal retention</p>
            </div>
          </div>
        </div>

        <div className="p-6 max-w-3xl mx-auto space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: stats?.due_cards ?? 0, label: "Due Now", gradient: "from-primary to-secondary" },
              { value: stats?.total_cards ?? 0, label: "Total Cards", gradient: "from-cyan-500 to-blue-500" },
              { value: reviewed, label: "Reviewed Today", gradient: "from-emerald-500 to-teal-500" },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <GlassCard className="p-5 text-center stat-card">
                  <p className={`text-3xl font-bold bg-gradient-to-r ${s.gradient} bg-clip-text text-transparent`}>{s.value}</p>
                  <p className="text-[11px] text-[var(--text-subtle)] mt-1">{s.label}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="gradient"
              onClick={() => { setCurrentIdx(0); setShowAnswer(false); setPhase("review"); }}
              disabled={cards.length === 0}
            >
              <RotateCcw className="h-4 w-4" />
              Review {cards.length} Due Cards
            </Button>
            <Button variant="outline" onClick={() => setPhase("add")}>
              <Plus className="h-4 w-4" /> Add Card
            </Button>
            <Button variant="outline" onClick={loadDueCards} loading={loading}>
              <RotateCcw className="h-4 w-4" /> Refresh
            </Button>
          </div>

          {/* Topics breakdown */}
          {stats && Object.keys(stats.topics).length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <GlassCard className="p-5">
                <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Cards by Topic</h3>
                <div className="space-y-2.5">
                  {Object.entries(stats.topics).map(([topic, count]) => (
                    <div key={topic} className="flex items-center justify-between">
                      <span className="text-sm truncate mr-3">{topic}</span>
                      <Badge variant="outline">{count} cards</Badge>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Due cards preview */}
          {cards.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <GlassCard className="p-5">
                <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Due Cards</h3>
                <div className="space-y-1">
                  {cards.slice(0, 10).map((card) => (
                    <div key={card.id} className="flex items-center justify-between text-xs py-2 border-b border-[var(--border)] last:border-0 group">
                      <div className="flex-1 truncate mr-2 flex items-center gap-2">
                        <Badge variant="default" className="shrink-0">{card.topic}</Badge>
                        <span className="text-[var(--text-muted)]">{card.question}</span>
                      </div>
                      <button onClick={() => handleDeleteCard(card.id)} className="opacity-0 group-hover:opacity-100 text-[var(--text-subtle)] hover:text-destructive transition-all">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // ── Review Phase ──
  if (phase === "review") {
    const card = cards[currentIdx];
    if (!card) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }}>
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-500/20">
              <Brain className="h-8 w-8 text-white" />
            </div>
          </motion.div>
          <h3 className="text-lg font-bold gradient-text">All caught up!</h3>
          <p className="text-sm text-[var(--text-muted)]">No more cards to review right now.</p>
          <Button variant="outline" onClick={() => { loadDueCards(); setPhase("overview"); }}>Back to Overview</Button>
        </div>
      );
    }

    return (
      <div className="h-full overflow-auto">
        <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] backdrop-blur-xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <RotateCcw className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-sm font-semibold">Review Session</h2>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline">{currentIdx + 1}/{cards.length}</Badge>
              <Button variant="ghost" size="sm" onClick={() => setPhase("overview")}>Done</Button>
            </div>
          </div>
          <div className="mt-3 h-1 bg-[var(--accent)] rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full gradient-bg"
              animate={{ width: `${((currentIdx + 1) / cards.length) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        <div className="p-6 max-w-2xl mx-auto space-y-5">
          <Badge variant="default">{card.topic}</Badge>

          <AnimatePresence mode="wait">
            <motion.div key={currentIdx} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.25 }}>
              <GlassCard className="p-8 text-center gradient-border">
                <p className="text-base font-medium mb-5 leading-relaxed">{card.question}</p>
                {!showAnswer ? (
                  <Button variant="outline" onClick={() => setShowAnswer(true)} className="gap-2">
                    <Eye className="h-4 w-4" /> Show Answer
                  </Button>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent my-5" />
                    <div className="markdown-content text-sm text-left">
                      <ReactMarkdown>{card.answer}</ReactMarkdown>
                    </div>
                  </motion.div>
                )}
              </GlassCard>
            </motion.div>
          </AnimatePresence>

          {/* Rating buttons */}
          <AnimatePresence>
            {showAnswer && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.1 }}>
                <p className="text-[11px] text-[var(--text-subtle)] text-center mb-3 font-medium">How well did you know this?</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {ratingButtons.map(({ q, label, gradient }) => (
                    <motion.button
                      key={q}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleRate(q)}
                      className={`bg-gradient-to-r ${gradient} text-white text-[11px] font-semibold py-2.5 px-2 rounded-[var(--radius)] shadow-sm transition-shadow hover:shadow-md`}
                    >
                      {label}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ── Add Card Phase ──
  if (phase === "add") {
    return (
      <div className="h-full overflow-auto">
        <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] backdrop-blur-xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Plus className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-sm font-semibold">Add Review Card</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setPhase("overview")}>Back</Button>
          </div>
        </div>
        <div className="p-6 max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard className="p-6">
              <form onSubmit={handleAddCard} className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Topic</label>
                  <Input value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder="Topic" className="h-9 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Question</label>
                  <textarea value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} placeholder="What is the question?"
                    rows={3} className="w-full resize-none rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-input)] backdrop-blur-sm px-4 py-2.5 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:border-[var(--gradient-start)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-opacity-15" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Answer</label>
                  <textarea value={newAnswer} onChange={(e) => setNewAnswer(e.target.value)} placeholder="What is the answer? (Markdown supported)"
                    rows={5} className="w-full resize-none rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-input)] backdrop-blur-sm px-4 py-2.5 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:border-[var(--gradient-start)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-opacity-15" />
                </div>
                <Button type="submit" variant="gradient" disabled={!newQuestion.trim() || !newAnswer.trim()}>
                  <Plus className="h-4 w-4" /> Add Card
                </Button>
              </form>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    );
  }

  return null;
}
