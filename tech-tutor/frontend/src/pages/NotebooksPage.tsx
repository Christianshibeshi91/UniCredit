import { useEffect, useState } from "react";
import { BookOpen, RefreshCw, CheckCircle, Plus, KeyRound, FolderSync } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import ReactMarkdown from "react-markdown";
import { api } from "../lib/api";

export function NotebooksPage() {
  const [notebooks, setNotebooks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  // Add notebook form
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
      <div className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Notebooks
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            Manage your NotebookLM research notebooks
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleAuth} loading={authing}>
            <KeyRound className="h-3.5 w-3.5" />
            Authenticate
          </Button>
          <Button variant="outline" size="sm" onClick={handleSync} loading={syncing}>
            <FolderSync className="h-3.5 w-3.5" />
            Sync Library
          </Button>
          <Button variant="outline" size="sm" onClick={fetchNotebooks} loading={loading}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto space-y-4">
        {/* Status messages */}
        {error && (
          <Card className="border-destructive animate-slide-up">
            <CardContent className="pt-5">
              <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
            </CardContent>
          </Card>
        )}
        {statusMsg && (
          <Card className="border-success animate-slide-up">
            <CardContent className="pt-5">
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <div className="markdown-content">
                  <ReactMarkdown>{statusMsg}</ReactMarkdown>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Notebook */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Plus className="h-4 w-4 text-primary" />
              Add Notebook
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddNotebook} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--text-muted)]">
                  NotebookLM URL (required)
                </label>
                <Input
                  value={notebookUrl}
                  onChange={(e) => setNotebookUrl(e.target.value)}
                  placeholder="https://notebooklm.google.com/notebook/..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--text-muted)]">
                  Name (optional)
                </label>
                <Input
                  value={notebookName}
                  onChange={(e) => setNotebookName(e.target.value)}
                  placeholder="e.g., AWS Solutions Architect Prep"
                />
              </div>
              <Button type="submit" size="sm" loading={adding} disabled={!notebookUrl.trim()}>
                <Plus className="h-3.5 w-3.5" />
                Add Notebook
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Notebook List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Your Notebooks</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <svg className="animate-spin h-6 w-6 text-primary" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : notebooks ? (
              <div className="markdown-content text-sm">
                <ReactMarkdown>{notebooks}</ReactMarkdown>
              </div>
            ) : (
              <div className="text-center py-8 text-[var(--text-muted)]">
                <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No notebooks found</p>
                <p className="text-xs mt-1">Add a notebook URL above or click Sync Library</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Getting Started</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="text-sm text-[var(--text-muted)] space-y-2 list-decimal list-inside">
              <li>Click <strong>Authenticate</strong> to sign in with your Google account (opens browser)</li>
              <li>Go to <strong>notebooklm.google.com</strong> and create a notebook with your study materials</li>
              <li>Copy the notebook URL and paste it in <strong>Add Notebook</strong> above</li>
              <li>Or click <strong>Sync Library</strong> to auto-discover your notebooks</li>
              <li>Go to <strong>Ask</strong> or <strong>Lessons</strong> and select your notebook to start learning</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
