import { useState, useRef } from "react";
import { BookOpen, Clock, Sparkles, FileText, FlaskConical, BarChart3, GraduationCap, Download, Upload, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../components/ui/Button";
import { GlassCard } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import ReactMarkdown from "react-markdown";
import { api } from "../lib/api";

const LESSON_TYPES = [
  { value: "study_plan", label: "Study Plan", icon: Clock, description: "Daily schedule with theory, practice, and labs", gradient: "from-blue-500 to-cyan-500" },
  { value: "textbook_chapter", label: "Textbook Chapter", icon: BookOpen, description: "Comprehensive chapter with examples and review", gradient: "from-violet-500 to-purple-500" },
  { value: "practice_exam", label: "Practice Exam", icon: FileText, description: "Questions with detailed answer explanations", gradient: "from-amber-500 to-orange-500" },
  { value: "lab", label: "Hands-on Lab", icon: FlaskConical, description: "Step-by-step practical exercise", gradient: "from-emerald-500 to-teal-500" },
  { value: "gap_analysis", label: "Gap Analysis", icon: BarChart3, description: "Identify knowledge gaps and study priorities", gradient: "from-rose-500 to-pink-500" },
];

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export function LessonsPage() {
  const [topic, setTopic] = useState("");
  const [lessonType, setLessonType] = useState("study_plan");
  const [duration, setDuration] = useState(60);
  const [notebookId, setNotebookId] = useState("power-platform-governance");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ content: string; lesson_type: string; topic: string } | null>(null);
  const [error, setError] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || loading) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await api.generateLesson({
        topic: topic.trim(),
        lesson_type: lessonType,
        notebook_id: notebookId || undefined,
        duration_minutes: duration,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate lesson");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!result) return;
    try {
      const blob = await api.exportLesson({
        topic: result.topic,
        lesson_type: result.lesson_type,
        content: result.content,
        duration_minutes: duration,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${result.topic.slice(0, 50)} - ${result.lesson_type}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to export lesson");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadStatus("Uploading...");
    try {
      const res = await api.uploadDocument(file, notebookId || undefined);
      setUploadStatus(`Uploaded: ${res.filename}`);
    } catch (err) {
      setUploadStatus(`Failed: ${err instanceof Error ? err.message : "Upload error"}`);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const selectedType = LESSON_TYPES.find((lt) => lt.value === lessonType)!;

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="border-b border-[var(--border)] bg-[var(--bg-elevated)] backdrop-blur-xl px-4 sm:px-6 py-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold gradient-text">Lesson Generator</h2>
              <p className="text-xs text-[var(--text-subtle)]">
                Generate structured lessons from your NotebookLM sources
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} accept=".pdf,.txt,.md,.docx,.csv,.json" />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Upload Source</span>
            </Button>
          </div>
        </div>
        <AnimatePresence>
          {uploadStatus && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                {uploadStatus}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Generator Form */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold gradient-text">Create a Lesson</h3>
            </div>

            <form onSubmit={handleGenerate} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Notebook ID</label>
                  <Input
                    value={notebookId}
                    onChange={(e) => setNotebookId(e.target.value)}
                    placeholder="Notebook ID (from Notebooks page)"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Topic</label>
                  <Input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Kubernetes networking, AWS VPC..."
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {/* Lesson Type Selector */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-2.5 uppercase tracking-wide">Lesson Type</label>
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5"
                >
                  {LESSON_TYPES.map((lt) => (
                    <motion.button
                      key={lt.value}
                      variants={staggerItem}
                      type="button"
                      onClick={() => setLessonType(lt.value)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative flex items-start gap-3 p-3.5 rounded-[var(--radius-lg)] border text-left transition-all duration-300 group ${
                        lessonType === lt.value
                          ? "border-[var(--gradient-start)] bg-[var(--gradient-start)]/5 shadow-sm shadow-primary/10"
                          : "border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--accent)]"
                      }`}
                    >
                      <div className={`h-9 w-9 rounded-[var(--radius)] bg-gradient-to-br ${lt.gradient} flex items-center justify-center shrink-0 shadow-sm transition-all duration-300 ${
                        lessonType === lt.value ? "shadow-md scale-105" : "opacity-70 group-hover:opacity-100"
                      }`}>
                        <lt.icon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{lt.label}</div>
                        <div className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">{lt.description}</div>
                      </div>
                      {lessonType === lt.value && (
                        <motion.div
                          layoutId="lesson-type-indicator"
                          className="absolute inset-0 rounded-[var(--radius-lg)] border-2 border-primary/30 pointer-events-none"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                    </motion.button>
                  ))}
                </motion.div>
              </div>

              {/* Duration slider for study plan */}
              <AnimatePresence>
                {lessonType === "study_plan" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-1">
                      <label className="block text-xs font-medium text-[var(--text-muted)] mb-2 uppercase tracking-wide">
                        Duration: <span className="text-primary font-semibold">{duration} minutes</span>
                      </label>
                      <input
                        type="range"
                        min={15}
                        max={480}
                        step={15}
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="w-full accent-primary h-1.5"
                      />
                      <div className="flex justify-between text-[10px] text-[var(--text-subtle)] mt-1">
                        <span>15 min</span>
                        <span>8 hours</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button type="submit" variant="gradient" loading={loading} disabled={!topic.trim()} glow className="h-11">
                <Sparkles className="h-4 w-4" />
                Generate {selectedType.label}
              </Button>
            </form>
          </GlassCard>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <GlassCard className="p-4 border-destructive/30">
                <p className="text-sm text-destructive">{error}</p>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <GlassCard className="gradient-border">
                <div className="p-5 border-b border-[var(--border)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-[var(--radius)] bg-gradient-to-br ${selectedType.gradient} flex items-center justify-center shadow-sm`}>
                        <selectedType.icon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">{result.topic}</h3>
                        <Badge variant="default" className="mt-1">
                          {result.lesson_type.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
                      <Download className="h-3.5 w-3.5" />
                      Export
                    </Button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="markdown-content text-sm">
                    <ReactMarkdown>{result.content}</ReactMarkdown>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
