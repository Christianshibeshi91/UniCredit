import { useEffect, useState } from "react";
import { BookOpen, RefreshCw, CheckCircle, Plus, KeyRound, FolderSync, AlertCircle, Library } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../components/ui/Button";
import { GlassCard } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import ReactMarkdown from "react-markdown";
import { api } from "../lib/api";

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export function NotebooksPage() {
  const [notebooks, setNotebooks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const [notebookUrl, setNotebookUrl] = useState("");
  const [notebookName, setNotebookName] = useState("");
  const [adding, setAdding] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [authing, setAuthing] = useState(false);

  const fetchNotebooks = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.listNotebooks();
      setNotebooks(res.notebooks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notebooks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotebooks();
  }, []);

  const handleAddNotebook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notebookUrl.trim() || adding) return;
    setAdding(true);
    setError("");
    setStatusMsg("");
    try {
      const res = await api.addNotebook(notebookUrl.trim(), notebookName.trim() || undefined);
      setStatusMsg(res.result);
      setNotebookUrl("");
      setNotebookName("");
      await fetchNotebooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add notebook");
    } finally {
      setAdding(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError("");
    setStatusMsg("");
    try {
      const res = await api.syncLibrary();
      setStatusMsg(res.result);
      await fetchNotebooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync library");
    } finally {
      setSyncing(false);
    }
  };

  const handleAuth = async () => {
    setAuthing(true);
    setError("");
    setStatusMsg("");
    try {
      const res = await api.setupAuth();
      setStatusMsg(res.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setAuthing(false);
    }
  };

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="border-b border-[var(--border)] bg-[var(--bg-elevated)] backdrop-blur-xl px-6 py-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Library className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold gradient-text">Notebooks</h2>
              <p className="text-xs text-[var(--text-subtle)]">
                Manage your NotebookLM research notebooks
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleAuth} loading={authing}>
              <KeyRound className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Authenticate</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleSync} loading={syncing}>
              <FolderSync className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sync Library</span>
            </Button>
            <Button variant="outline" size="sm" onClick={fetchNotebooks} loading={loading}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="p-6 max-w-4xl mx-auto space-y-5">
        {/* Status messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <GlassCard className="p-4 border-destructive/30">
                <div className="flex items-start gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="whitespace-pre-wrap">{error}</p>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {statusMsg && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <GlassCard className="p-4 border-emerald-500/30">
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="markdown-content text-[var(--text)]">
                    <ReactMarkdown>{statusMsg}</ReactMarkdown>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Notebook */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <Plus className="h-3.5 w-3.5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold gradient-text">Add Notebook</h3>
            </div>
            <form onSubmit={handleAddNotebook} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1.5 text-[var(--text-muted)] uppercase tracking-wide">
                  NotebookLM URL
                </label>
                <Input
                  value={notebookUrl}
                  onChange={(e) => setNotebookUrl(e.target.value)}
                  placeholder="https://notebooklm.google.com/notebook/..."
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-[var(--text-muted)] uppercase tracking-wide">
                  Name (optional)
                </label>
                <Input
                  value={notebookName}
                  onChange={(e) => setNotebookName(e.target.value)}
                  placeholder="e.g., AWS Solutions Architect Prep"
                  className="h-9 text-sm"
                />
              </div>
              <Button type="submit" variant="gradient" size="sm" loading={adding} disabled={!notebookUrl.trim()}>
                <Plus className="h-3.5 w-3.5" />
                Add Notebook
              </Button>
            </form>
          </GlassCard>
        </motion.div>

        {/* Notebook List */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                <BookOpen className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <h3 className="text-sm font-semibold gradient-text">Your Notebooks</h3>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </motion.div>
              </div>
            ) : notebooks ? (
              <div className="markdown-content text-sm">
                <ReactMarkdown>{notebooks}</ReactMarkdown>
              </div>
            ) : (
              <div className="text-center py-10">
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="h-14 w-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                    <BookOpen className="h-7 w-7 text-[var(--text-subtle)]" />
                  </div>
                </motion.div>
                <p className="text-sm text-[var(--text-muted)] font-medium">No notebooks found</p>
                <p className="text-xs text-[var(--text-subtle)] mt-1">Add a notebook URL above or click Sync Library</p>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Getting Started */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                <BookOpen className="h-3.5 w-3.5 text-violet-500" />
              </div>
              <h3 className="text-sm font-semibold gradient-text">Getting Started</h3>
            </div>
            <motion.ol
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="text-sm text-[var(--text-muted)] space-y-3"
            >
              {[
                <>Click <strong className="text-[var(--text)]">Authenticate</strong> to sign in with your Google account (opens browser)</>,
                <>Go to <strong className="text-[var(--text)]">notebooklm.google.com</strong> and create a notebook with your study materials</>,
                <>Copy the notebook URL and paste it in <strong className="text-[var(--text)]">Add Notebook</strong> above</>,
                <>Or click <strong className="text-[var(--text)]">Sync Library</strong> to auto-discover your notebooks</>,
                <>Go to <strong className="text-[var(--text)]">Ask</strong> or <strong className="text-[var(--text)]">Lessons</strong> and select your notebook to start learning</>,
              ].map((step, i) => (
                <motion.li key={i} variants={staggerItem} className="flex items-start gap-3">
                  <span className="h-5 w-5 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 text-[10px] text-white font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </motion.li>
              ))}
            </motion.ol>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
