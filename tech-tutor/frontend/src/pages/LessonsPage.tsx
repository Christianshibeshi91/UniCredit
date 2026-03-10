import { useState } from "react";
import { BookOpen, Clock, Sparkles, FileText, FlaskConical, BarChart3, GraduationCap } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import ReactMarkdown from "react-markdown";
import { api } from "../lib/api";

const LESSON_TYPES = [
  { value: "study_plan", label: "Study Plan", icon: Clock, description: "Daily schedule with theory, practice, and labs" },
  { value: "textbook_chapter", label: "Textbook Chapter", icon: BookOpen, description: "Comprehensive chapter with examples and review" },
  { value: "practice_exam", label: "Practice Exam", icon: FileText, description: "Questions with detailed answer explanations" },
  { value: "lab", label: "Hands-on Lab", icon: FlaskConical, description: "Step-by-step practical exercise" },
  { value: "gap_analysis", label: "Gap Analysis", icon: BarChart3, description: "Identify knowledge gaps and study priorities" },
];

export function LessonsPage() {
  const [topic, setTopic] = useState("");
  const [lessonType, setLessonType] = useState("study_plan");
  const [duration, setDuration] = useState(60);
  const [notebookId, setNotebookId] = useState("power-platform-governance");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ content: string; lesson_type: string; topic: string } | null>(null);
  const [error, setError] = useState("");

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

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="border-b border-[var(--border)] px-6 py-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          Lesson Generator
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          Generate structured lessons from your NotebookLM sources
        </p>
      </div>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Generator Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Create a Lesson
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Notebook ID</label>
                <Input
                  value={notebookId}
                  onChange={(e) => setNotebookId(e.target.value)}
                  placeholder="Notebook ID (from Notebooks page) — required"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Topic</label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Kubernetes networking, AWS VPC fundamentals, Python decorators..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Lesson Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {LESSON_TYPES.map((lt) => (
                    <button
                      key={lt.value}
                      type="button"
                      onClick={() => setLessonType(lt.value)}
                      className={`flex items-start gap-3 p-3 rounded-[var(--radius)] border text-left transition-colors ${
                        lessonType === lt.value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-[var(--border)] hover:bg-[var(--accent)]"
                      }`}
                    >
                      <lt.icon className="h-4 w-4 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-medium">{lt.label}</div>
                        <div className="text-xs text-[var(--text-muted)] mt-0.5">{lt.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {lessonType === "study_plan" && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Duration: {duration} minutes
                  </label>
                  <input
                    type="range"
                    min={15}
                    max={480}
                    step={15}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-xs text-[var(--text-muted)]">
                    <span>15 min</span>
                    <span>8 hours</span>
                  </div>
                </div>
              )}

              <Button type="submit" loading={loading} disabled={!topic.trim()}>
                <Sparkles className="h-4 w-4" />
                Generate Lesson
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-5">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {result && (
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {LESSON_TYPES.find((lt) => lt.value === result.lesson_type)?.icon &&
                  (() => {
                    const Icon = LESSON_TYPES.find((lt) => lt.value === result.lesson_type)!.icon;
                    return <Icon className="h-4 w-4 text-primary" />;
                  })()}
                {result.topic}
              </CardTitle>
              <span className="text-xs text-[var(--text-muted)] capitalize">
                {result.lesson_type.replace("_", " ")}
              </span>
            </CardHeader>
            <CardContent>
              <div className="markdown-content text-sm">
                <ReactMarkdown>{result.content}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
