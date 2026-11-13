import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { BarChart3, Copy, Eye, Flame, Gauge, Lightbulb, PenLine, Percent } from "lucide-react";
import { authFetch, describeError, readJson } from "../utils/api";
import { copyText } from "../utils/exporters";
import { ErrorState, Skeleton } from "./ui/States";

type Insights = {
  totals: {
    content: number;
    avgScore: number;
    thisWeek: number;
    lastWeek: number;
    avgScoreThisWeek: number | null;
    avgScoreLastWeek: number | null;
    scheduled: number;
    published: number;
  };
  weekly: Array<{ week: string; label: string; count: number; avgScore: number }>;
  platforms: Array<{ platform: string; count: number; avgScore: number; views: number; engagementRate: number | null }>;
  performance: { posts: number; views: number; likes: number; comments: number; shares: number; engagementRate: number | null };
  topPosts: Array<{ contentId: number; topic: string; platform: string; views: number; likes: number; comments: number; shares: number; engagementRate: number | null }>;
  topHooks: Array<{ hook: string; contentId: number; topic: string; platform: string; score: number | null; views: number | null; engagementRate: number | null }>;
  summary: string[];
};

const number = (value: number) => value.toLocaleString("en-US");

const compact = (value: number) =>
  Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);

function Delta({ current, previous, suffix = "vs last week" }: { current: number | null; previous: number | null; suffix?: string }) {
  if (current === null || previous === null) return <span className="text-white/35">No comparison yet</span>;
  const diff = current - previous;
  if (diff === 0) return <span className="text-white/45">Same {suffix}</span>;
  return (
    <span className={diff > 0 ? "text-emerald-300" : "text-rose-300"}>
      {diff > 0 ? "+" : ""}
      {diff} {suffix}
    </span>
  );
}

function WeeklyChart({ weekly }: { weekly: Insights["weekly"] }) {
  const width = 640;
  const height = 220;
  const pad = { top: 16, right: 16, bottom: 34, left: 28 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const maxCount = Math.max(4, ...weekly.map((w) => w.count));
  const slot = innerW / weekly.length;
  const barW = Math.min(36, slot * 0.55);

  const x = (index: number) => pad.left + slot * index + slot / 2;
  const yCount = (count: number) => pad.top + innerH - (count / maxCount) * innerH;
  const yScore = (score: number) => pad.top + innerH - (score / 100) * innerH;

  const points = weekly.map((w, index) => (w.count > 0 ? { x: x(index), y: yScore(w.avgScore), w } : null));
  const segments: Array<Array<{ x: number; y: number }>> = [];
  let current: Array<{ x: number; y: number }> = [];
  points.forEach((point) => {
    if (point) current.push(point);
    else if (current.length) {
      segments.push(current);
      current = [];
    }
  });
  if (current.length) segments.push(current);

  const summary = weekly.map((w) => `${w.label}: ${w.count} pieces, average score ${w.avgScore}`).join("; ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Content created per week. ${summary}`} className="h-auto w-full">
      {[0, 0.5, 1].map((tick) => (
        <line key={tick} x1={pad.left} x2={width - pad.right} y1={pad.top + innerH * (1 - tick)} y2={pad.top + innerH * (1 - tick)} stroke="rgba(255,255,255,0.07)" />
      ))}
      <text x={pad.left - 6} y={pad.top + 4} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.35)">{maxCount}</text>
      <text x={pad.left - 6} y={pad.top + innerH + 3} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.35)">0</text>

      {weekly.map((w, index) => (
        <g key={w.week}>
          <rect
            x={x(index) - barW / 2}
            y={yCount(w.count)}
            width={barW}
            height={Math.max(w.count > 0 ? 3 : 0, pad.top + innerH - yCount(w.count))}
            rx="6"
            fill="rgba(129,140,248,0.75)"
          >
            <title>{`${w.label}: ${w.count} piece${w.count === 1 ? "" : "s"}${w.count ? `, avg score ${w.avgScore}` : ""}`}</title>
          </rect>
          <text x={x(index)} y={height - 12} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.45)">{w.label}</text>
          {w.count > 0 ? (
            <text x={x(index)} y={yCount(w.count) - 6} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.7)">{w.count}</text>
          ) : null}
        </g>
      ))}

      {segments.map((segment, index) =>
        segment.length > 1 ? (
          <polyline key={index} points={segment.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="rgba(244,114,182,0.9)" strokeWidth="2" strokeLinejoin="round" />
        ) : null
      )}
      {points.map((point) =>
        point ? (
          <circle key={point.w.week} cx={point.x} cy={point.y} r="3.5" fill="#f472b6">
            <title>{`${point.w.label}: avg score ${point.w.avgScore}`}</title>
          </circle>
        ) : null
      )}
    </svg>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`premium-card rounded-[24px] border-white/10 p-6 ${className}`}>{children}</div>;
}

export default function InsightsPanel() {
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await authFetch("/insights/overview");
      const result = await readJson<{ data?: Insights; error?: string }>(response);

      if (!response.ok || !result?.data) {
        throw new Error(result?.error || "Unable to load insights");
      }

      setData(result.data);
    } catch (loadError) {
      setError(describeError(loadError, "Unable to load insights"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const copyHook = async (hook: string) => {
    const ok = await copyText(hook);
    if (ok) toast.success("Hook copied");
    else toast.error("Couldn't copy to the clipboard");
  };

  const header = (
    <div className="flex items-center justify-between">
      <p className="text-xs uppercase tracking-[0.24em] text-white/50">📈 Performance insights</p>
    </div>
  );

  if (loading) {
    return (
      <section className="space-y-4" aria-busy="true" aria-label="Loading insights">
        {header}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <Skeleton className="h-64 xl:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="space-y-4">
        {header}
        <ErrorState compact title="Couldn't load insights" message={error || "Please try again."} onRetry={() => void load()} />
      </section>
    );
  }

  if (data.totals.content === 0) {
    return (
      <section className="space-y-4">
        {header}
        <Card className="text-center">
          <BarChart3 className="mx-auto h-7 w-7 text-white/30" />
          <p className="mt-3 font-medium text-white">Your insights will appear here</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-white/50">
            Generate and save a few pieces, then log views and likes in the Calendar. This panel turns them into trends, best hooks and a weekly summary.
          </p>
          <Link to="/generate" className="btn-primary mt-5 inline-flex items-center gap-2">
            <PenLine className="h-4 w-4" /> Generate your first piece
          </Link>
        </Card>
      </section>
    );
  }

  const { totals, performance, weekly, platforms, topHooks, topPosts, summary } = data;
  const maxPlatform = Math.max(1, ...platforms.map((p) => p.count));

  const kpis = [
    {
      icon: Gauge,
      label: "Avg AI score",
      value: String(totals.avgScore),
      note: <Delta current={totals.avgScoreThisWeek} previous={totals.avgScoreLastWeek} />
    },
    {
      icon: PenLine,
      label: "Created this week",
      value: String(totals.thisWeek),
      note: <Delta current={totals.thisWeek} previous={totals.lastWeek} />
    },
    {
      icon: Eye,
      label: "Total views",
      value: performance.posts ? compact(performance.views) : "—",
      note: <span className="text-white/45">{performance.posts ? `${performance.posts} tracked post${performance.posts === 1 ? "" : "s"}` : "Log performance in Calendar"}</span>
    },
    {
      icon: Percent,
      label: "Engagement rate",
      value: performance.engagementRate !== null ? `${performance.engagementRate}%` : "—",
      note: <span className="text-white/45">Likes, comments and shares per view</span>
    }
  ];

  return (
    <section className="space-y-4">
      {header}

      <Card className="border-indigo-400/20 bg-indigo-500/[0.06]">
        <div className="flex items-start gap-3">
          <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <div>
            <h2 className="font-medium text-white">Your week at a glance</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-white/70">
              {summary.map((line) => <li key={line}>• {line}</li>)}
            </ul>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ icon: Icon, label, value, note }) => (
          <Card key={label} className="p-5">
            <div className="flex items-center gap-2 text-sm text-white/45"><Icon className="h-4 w-4" /> {label}</div>
            <p className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-white">{value}</p>
            <p className="mt-2 text-xs">{note}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium text-white">Content over time</h2>
            <div className="flex items-center gap-4 text-xs text-white/50">
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-indigo-400/80" /> Pieces per week</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-pink-400" /> Avg AI score</span>
            </div>
          </div>
          <WeeklyChart weekly={weekly} />
        </Card>

        <Card>
          <h2 className="mb-4 font-medium text-white">By platform</h2>
          <div className="space-y-4">
            {platforms.map((p) => (
              <div key={p.platform}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-white">{p.platform}</span>
                  <span className="text-xs text-white/45">
                    {p.count} piece{p.count === 1 ? "" : "s"} · score {p.avgScore}
                    {p.engagementRate !== null ? ` · ${p.engagementRate}% eng.` : ""}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400" style={{ width: `${(p.count / maxPlatform) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="mb-1 flex items-center gap-2 font-medium text-white"><Flame className="h-4 w-4 text-orange-300" /> Best-performing hooks</h2>
          <p className="mb-4 text-xs text-white/40">Ranked by real engagement when available, otherwise AI score.</p>
          {topHooks.length === 0 ? (
            <p className="text-sm text-white/50">Hooks from your saved content will show up here.</p>
          ) : (
            <ul className="space-y-3">
              {topHooks.map((h) => (
                <li key={`${h.contentId}-${h.hook}`} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="min-w-0">
                    <p className="text-sm text-white">“{h.hook}”</p>
                    <p className="mt-1 truncate text-xs text-white/40">
                      {h.platform} · {h.topic}
                      {h.engagementRate !== null ? ` · ${h.engagementRate}% engagement` : h.score !== null ? ` · score ${h.score}` : ""}
                    </p>
                  </div>
                  <button type="button" onClick={() => void copyHook(h.hook)} aria-label="Copy hook" className="shrink-0 rounded-lg border border-white/10 p-2 text-white/60 transition hover:bg-white/10 hover:text-white">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-1 font-medium text-white">Top performing posts</h2>
          <p className="mb-4 text-xs text-white/40">Based on the numbers you logged in the Calendar.</p>
          {topPosts.length === 0 ? (
            <p className="text-sm text-white/50">
              No performance data yet. Open a published post in the <Link to="/calendar" className="text-indigo-300 hover:text-indigo-200">Calendar</Link> and add its views and likes.
            </p>
          ) : (
            <ul className="space-y-3">
              {topPosts.map((post, index) => (
                <li key={`${post.contentId}-${index}`}>
                  <Link to={`/library/${post.contentId}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:bg-white/[0.06]">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">{post.topic}</p>
                      <p className="mt-1 text-xs text-white/40">{post.platform} · {number(post.views)} views · {number(post.likes)} likes</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-300">
                      {post.engagementRate !== null ? `${post.engagementRate}%` : "—"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </section>
  );
}
