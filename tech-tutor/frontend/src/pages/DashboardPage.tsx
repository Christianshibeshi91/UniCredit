import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Clock,
  BookOpen,
  Brain,
  TrendingUp,
  Calendar,
  Activity,
  Layers,
} from "lucide-react";
import {
  GlassCard,
  AnimatedCard,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { api, type StudyStats } from "../lib/api";

/* ── Helpers (unchanged) ─────────────────────────────────────────── */

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`;
}

/* ── Gradient configs per stat card ──────────────────────────────── */

const statGradients = [
  "bg-gradient-to-br from-indigo-500 to-violet-600",
  "bg-gradient-to-br from-violet-500 to-purple-600",
  "bg-gradient-to-br from-cyan-500 to-blue-600",
  "bg-gradient-to-br from-emerald-500 to-teal-600",
];

/* ── Stat Card ───────────────────────────────────────────────────── */

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  gradient,
  index,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  sub?: string;
  gradient: string;
  index: number;
}) {
  return (
    <AnimatedCard
      delay={index * 0.1}
      className="stat-card glass-card"
    >
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center gap-4">
          <div
            className={`h-11 w-11 rounded-xl ${gradient} flex items-center justify-center shrink-0 shadow-lg`}
          >
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            <p className="text-xs text-[var(--text-muted)] font-medium">
              {label}
            </p>
            {sub && (
              <p className="text-[10px] text-[var(--text-subtle)] mt-0.5">
                {sub}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </AnimatedCard>
  );
}

/* ── Main Page ───────────────────────────────────────────────────── */

export function DashboardPage() {
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [reviewStats, setReviewStats] = useState<{
    total_cards: number;
    due_cards: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getStudyStats(30).catch(() => null),
      api.getReviewStats().catch(() => null),
    ]).then(([s, r]) => {
      setStats(s);
      setReviewStats(r);
      setLoading(false);
    });
  }, []);

  /* ── Loading state ─────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg animate-pulse">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <p className="text-[var(--text-muted)] text-sm font-medium">
            Loading dashboard...
          </p>
        </motion.div>
      </div>
    );
  }

  /* ── Derived data (unchanged logic) ────────────────────────────── */

  const totalTime = stats?.total_time_seconds ?? 0;
  const totalSessions = stats?.total_sessions ?? 0;
  const topTopics = Object.entries(stats?.topics ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const activities = Object.entries(stats?.activities ?? {}).sort(
    (a, b) => b[1] - a[1]
  );
  const dailyData = Object.entries(stats?.daily ?? {})
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14);

  const maxDaily = Math.max(...dailyData.map(([, v]) => v), 1);

  /* ── Topic gradient helper ─────────────────────────────────────── */

  const topicMaxTime = topTopics.length > 0 ? topTopics[0][1] : 1;

  /* ── Render ────────────────────────────────────────────────────── */

  return (
    <div className="h-full overflow-auto">
      {/* ── Header Bar ───────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-[var(--bg-elevated)] backdrop-blur-xl border-b border-[var(--border)] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
            <BarChart3 className="h-[18px] w-[18px] text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight gradient-text">
              Study Dashboard
            </h2>
            <p className="text-xs text-[var(--text-subtle)]">
              Track your learning progress over the last 30 days
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* ── Stats Grid ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Clock}
            label="Total Study Time"
            value={formatTime(totalTime)}
            gradient={statGradients[0]}
            index={0}
          />
          <StatCard
            icon={BookOpen}
            label="Study Sessions"
            value={String(totalSessions)}
            gradient={statGradients[1]}
            index={1}
          />
          <StatCard
            icon={Brain}
            label="Review Cards"
            value={String(reviewStats?.total_cards ?? 0)}
            sub={`${reviewStats?.due_cards ?? 0} due`}
            gradient={statGradients[2]}
            index={2}
          />
          <StatCard
            icon={TrendingUp}
            label="Topics Studied"
            value={String(topTopics.length)}
            gradient={statGradients[3]}
            index={3}
          />
        </div>

        {/* ── Daily Activity + Top Topics ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Activity Chart */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
          >
            <GlassCard className="rounded-[var(--radius-lg)] h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="gradient-text font-semibold">
                    Daily Activity
                  </span>
                  <span className="text-[var(--text-subtle)] font-normal text-xs ml-auto">
                    Last 14 days
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dailyData.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] text-center py-8">
                    No study sessions yet. Start learning!
                  </p>
                ) : (
                  <div className="flex items-end gap-1.5 h-36">
                    {dailyData.map(([day, seconds], i) => {
                      const pct = (seconds / maxDaily) * 100;
                      return (
                        <div
                          key={day}
                          className="flex-1 flex flex-col items-center gap-1.5"
                        >
                          <motion.div
                            className="w-full rounded-t-md min-h-[3px] bg-gradient-to-t from-primary to-secondary shadow-sm"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{
                              height: `${pct}%`,
                              opacity: 1,
                            }}
                            transition={{
                              duration: 0.6,
                              delay: 0.5 + i * 0.04,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                            title={`${day}: ${formatTime(seconds)}`}
                            style={{ maxHeight: "100%" }}
                          />
                          <span className="text-[8px] text-[var(--text-subtle)] rotate-[-45deg] origin-top-left whitespace-nowrap">
                            {day.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </GlassCard>
          </motion.div>

          {/* Topics Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.55 }}
          >
            <GlassCard className="rounded-[var(--radius-lg)] h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                    <Layers className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                  <span className="gradient-text font-semibold">
                    Top Topics
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topTopics.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] text-center py-8">
                    No topics studied yet.
                  </p>
                ) : (
                  <div className="space-y-3.5">
                    {topTopics.map(([topic, seconds], i) => {
                      const pct =
                        totalTime > 0 ? (seconds / totalTime) * 100 : 0;
                      const barWidth =
                        topicMaxTime > 0
                          ? (seconds / topicMaxTime) * 100
                          : 0;
                      return (
                        <motion.div
                          key={topic}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            duration: 0.4,
                            delay: 0.6 + i * 0.08,
                          }}
                        >
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-medium truncate mr-2">
                              {topic}
                            </span>
                            <span className="text-[var(--text-subtle)] shrink-0 tabular-nums">
                              {formatTime(seconds)}{" "}
                              <span className="text-[var(--text-subtle)] opacity-60">
                                ({pct.toFixed(0)}%)
                              </span>
                            </span>
                          </div>
                          <div className="h-2 bg-[var(--accent)] rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-primary via-secondary to-cyan-400"
                              initial={{ width: 0 }}
                              animate={{ width: `${barWidth}%` }}
                              transition={{
                                duration: 0.8,
                                delay: 0.7 + i * 0.08,
                                ease: [0.16, 1, 0.3, 1],
                              }}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </GlassCard>
          </motion.div>
        </div>

        {/* ── Activity Breakdown ─────────────────────────────── */}
        {activities.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.65 }}
          >
            <GlassCard className="rounded-[var(--radius-lg)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center">
                    <Activity className="h-3.5 w-3.5 text-orange-500" />
                  </div>
                  <span className="gradient-text font-semibold">
                    Activity Breakdown
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 flex-wrap">
                  {activities.map(([type, seconds], i) => (
                    <motion.div
                      key={type}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        duration: 0.3,
                        delay: 0.7 + i * 0.06,
                      }}
                    >
                      <Badge
                        variant="default"
                        className="px-3 py-1.5 text-xs gap-2 rounded-lg"
                      >
                        <span className="capitalize font-semibold">
                          {type}
                        </span>
                        <span className="opacity-60 font-normal">
                          {formatTime(seconds)}
                        </span>
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </GlassCard>
          </motion.div>
        )}

        {/* ── Recent Sessions ────────────────────────────────── */}
        {(stats?.sessions?.length ?? 0) > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.75 }}
          >
            <GlassCard className="rounded-[var(--radius-lg)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                    <BookOpen className="h-3.5 w-3.5 text-violet-500" />
                  </div>
                  <span className="gradient-text font-semibold">
                    Recent Sessions
                  </span>
                  <span className="text-[var(--text-subtle)] font-normal text-xs ml-auto">
                    Last 10
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="text-left py-2.5 px-3 text-[var(--text-subtle)] font-semibold uppercase tracking-wider text-[10px]">
                          Activity
                        </th>
                        <th className="text-left py-2.5 px-3 text-[var(--text-subtle)] font-semibold uppercase tracking-wider text-[10px]">
                          Topic
                        </th>
                        <th className="text-right py-2.5 px-3 text-[var(--text-subtle)] font-semibold uppercase tracking-wider text-[10px]">
                          Duration
                        </th>
                        <th className="text-right py-2.5 px-3 text-[var(--text-subtle)] font-semibold uppercase tracking-wider text-[10px]">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats!.sessions.slice(0, 10).map((s, i) => (
                        <motion.tr
                          key={s.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            duration: 0.3,
                            delay: 0.8 + i * 0.04,
                          }}
                          className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--accent)] transition-colors"
                        >
                          <td className="py-2.5 px-3">
                            <Badge variant="default" className="capitalize">
                              {s.activity_type}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="truncate block max-w-[220px] font-medium">
                              {s.topic}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-[var(--text-muted)]">
                            {formatTime(s.duration_seconds)}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-[var(--text-subtle)]">
                            {new Date(s.started_at).toLocaleDateString()}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </GlassCard>
          </motion.div>
        )}
      </div>
    </div>
  );
}
