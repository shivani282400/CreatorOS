import { db } from "../plugins/db";

const WEEKS = 8;

const round1 = (value: number) => Math.round(value * 10) / 10;

const weekLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** Monday (UTC) of the week containing `date`, as YYYY-MM-DD. */
const mondayOf = (date: Date) => {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() - (day - 1));
  return copy.toISOString().slice(0, 10);
};

export type InsightsOverview = Awaited<ReturnType<typeof getInsightsOverview>>;

export const getInsightsOverview = async (userId: number) => {
  const [totalsRes, weeklyRes, platformRes, platformPerfRes, perfRes, topPostsRes, topHooksRes, calendarRes] =
    await Promise.all([
      db.query(
        `SELECT
           COUNT(*)::int AS total,
           COALESCE(AVG(score), 0)::float AS avg_score,
           COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int AS this_week,
           COUNT(*) FILTER (WHERE created_at <= NOW() - INTERVAL '7 days' AND created_at > NOW() - INTERVAL '14 days')::int AS last_week,
           AVG(score) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::float AS avg_this_week,
           AVG(score) FILTER (WHERE created_at <= NOW() - INTERVAL '7 days' AND created_at > NOW() - INTERVAL '14 days')::float AS avg_last_week
         FROM content WHERE user_id = $1`,
        [userId]
      ),
      db.query(
        `SELECT date_trunc('week', created_at)::date::text AS week,
                COUNT(*)::int AS count,
                COALESCE(ROUND(AVG(score)), 0)::int AS avg_score
         FROM content
         WHERE user_id = $1 AND created_at >= date_trunc('week', NOW()) - ($2 || ' weeks')::interval
         GROUP BY 1 ORDER BY 1`,
        [userId, String(WEEKS - 1)]
      ),
      db.query(
        `SELECT COALESCE(platform, 'Unknown') AS platform,
                COUNT(*)::int AS count,
                COALESCE(ROUND(AVG(score)), 0)::int AS avg_score
         FROM content WHERE user_id = $1
         GROUP BY 1 ORDER BY count DESC`,
        [userId]
      ),
      db.query(
        `SELECT COALESCE(ct.platform, 'Unknown') AS platform,
                COALESCE(SUM(c.views), 0)::int AS views,
                COALESCE(SUM(c.likes + c.comments + c.shares), 0)::int AS interactions
         FROM calendar c JOIN content ct ON ct.id = c.content_id
         WHERE ct.user_id = $1 AND c.views > 0
         GROUP BY 1`,
        [userId]
      ),
      db.query(
        `SELECT COUNT(*)::int AS posts,
                COALESCE(SUM(c.views), 0)::int AS views,
                COALESCE(SUM(c.likes), 0)::int AS likes,
                COALESCE(SUM(c.comments), 0)::int AS comments,
                COALESCE(SUM(c.shares), 0)::int AS shares
         FROM calendar c JOIN content ct ON ct.id = c.content_id
         WHERE ct.user_id = $1 AND c.views > 0`,
        [userId]
      ),
      db.query(
        `SELECT c.id AS calendar_id, ct.id AS content_id, ct.topic, ct.platform,
                c.views, c.likes, c.comments, c.shares,
                ((c.likes + c.comments + c.shares)::float / NULLIF(c.views, 0)) AS engagement_rate
         FROM calendar c JOIN content ct ON ct.id = c.content_id
         WHERE ct.user_id = $1 AND c.views > 0
         ORDER BY engagement_rate DESC NULLS LAST, c.views DESC
         LIMIT 5`,
        [userId]
      ),
      db.query(
        `SELECT ct.hooks[1] AS hook, ct.id AS content_id, ct.topic, ct.platform, ct.score,
                perf.views, perf.engagement_rate
         FROM content ct
         LEFT JOIN LATERAL (
           SELECT MAX(c.views)::int AS views,
                  MAX((c.likes + c.comments + c.shares)::float / NULLIF(c.views, 0)) AS engagement_rate
           FROM calendar c WHERE c.content_id = ct.id AND c.views > 0
         ) perf ON true
         WHERE ct.user_id = $1 AND ct.hooks[1] IS NOT NULL AND ct.hooks[1] <> ''
         ORDER BY perf.engagement_rate DESC NULLS LAST, ct.score DESC NULLS LAST, ct.created_at DESC
         LIMIT 6`,
        [userId]
      ),
      db.query(
        `SELECT
           COUNT(*) FILTER (WHERE c.status = 'scheduled' AND c.scheduled_date >= CURRENT_DATE)::int AS upcoming,
           COUNT(*) FILTER (WHERE c.status IN ('published', 'analyzed'))::int AS published
         FROM calendar c JOIN content ct ON ct.id = c.content_id
         WHERE ct.user_id = $1`,
        [userId]
      )
    ]);

  const t = totalsRes.rows[0];
  const perf = perfRes.rows[0];
  const cal = calendarRes.rows[0];

  // Fill in weeks with no content so the chart always shows a continuous 8-week timeline.
  const byWeek = new Map<string, { count: number; avgScore: number }>(
    weeklyRes.rows.map((row) => [row.week as string, { count: row.count as number, avgScore: row.avg_score as number }])
  );
  const thisMonday = mondayOf(new Date());
  const weekly = Array.from({ length: WEEKS }, (_, index) => {
    const date = new Date(`${thisMonday}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - 7 * (WEEKS - 1 - index));
    const iso = date.toISOString().slice(0, 10);
    const found = byWeek.get(iso);
    return { week: iso, label: weekLabel(iso), count: found?.count ?? 0, avgScore: found?.avgScore ?? 0 };
  });

  const perfByPlatform = new Map<string, { views: number; interactions: number }>(
    platformPerfRes.rows.map((row) => [row.platform as string, { views: row.views as number, interactions: row.interactions as number }])
  );
  const platforms = platformRes.rows.map((row) => {
    const p = perfByPlatform.get(row.platform);
    return {
      platform: row.platform as string,
      count: row.count as number,
      avgScore: row.avg_score as number,
      views: p?.views ?? 0,
      engagementRate: p && p.views > 0 ? round1((p.interactions / p.views) * 100) : null
    };
  });

  const interactions = perf.likes + perf.comments + perf.shares;
  const performance = {
    posts: perf.posts as number,
    views: perf.views as number,
    likes: perf.likes as number,
    comments: perf.comments as number,
    shares: perf.shares as number,
    engagementRate: perf.views > 0 ? round1((interactions / perf.views) * 100) : null
  };

  const topPosts = topPostsRes.rows.map((row) => ({
    contentId: row.content_id as number,
    topic: row.topic as string,
    platform: row.platform as string,
    views: row.views as number,
    likes: row.likes as number,
    comments: row.comments as number,
    shares: row.shares as number,
    engagementRate: row.engagement_rate === null ? null : round1(row.engagement_rate * 100)
  }));

  const topHooks = topHooksRes.rows.map((row) => ({
    hook: row.hook as string,
    contentId: row.content_id as number,
    topic: row.topic as string,
    platform: row.platform as string,
    score: row.score as number | null,
    views: (row.views as number | null) ?? null,
    engagementRate: row.engagement_rate === null || row.engagement_rate === undefined ? null : round1(row.engagement_rate * 100)
  }));

  const totals = {
    content: t.total as number,
    avgScore: Math.round(t.avg_score),
    thisWeek: t.this_week as number,
    lastWeek: t.last_week as number,
    avgScoreThisWeek: t.avg_this_week === null ? null : Math.round(t.avg_this_week),
    avgScoreLastWeek: t.avg_last_week === null ? null : Math.round(t.avg_last_week),
    scheduled: cal.upcoming as number,
    published: cal.published as number
  };

  return {
    totals,
    weekly,
    platforms,
    performance,
    topPosts,
    topHooks,
    summary: buildWeeklySummary({ totals, platforms, performance, topPosts })
  };
};

type SummaryInput = {
  totals: {
    content: number;
    thisWeek: number;
    lastWeek: number;
    avgScoreThisWeek: number | null;
    avgScoreLastWeek: number | null;
    scheduled: number;
  };
  platforms: Array<{ platform: string; count: number; avgScore: number }>;
  performance: { posts: number };
  topPosts: Array<{ topic: string; views: number; engagementRate: number | null }>;
};

/** Plain-language weekly summary. Deterministic on purpose: no AI call, so it is instant and free. */
const buildWeeklySummary = ({ totals, platforms, performance, topPosts }: SummaryInput): string[] => {
  if (totals.content === 0) {
    return ["Generate and save your first piece to start seeing weekly insights here."];
  }

  const lines: string[] = [];

  const diff = totals.thisWeek - totals.lastWeek;
  const trend = diff > 0 ? `up ${diff} from last week` : diff < 0 ? `down ${Math.abs(diff)} from last week` : "the same as last week";
  lines.push(
    `You created ${totals.thisWeek} piece${totals.thisWeek === 1 ? "" : "s"} in the last 7 days, ${trend}.`
  );

  if (totals.avgScoreThisWeek !== null) {
    const scoreDiff = totals.avgScoreLastWeek !== null ? totals.avgScoreThisWeek - totals.avgScoreLastWeek : null;
    const scoreTrend =
      scoreDiff === null ? "" : scoreDiff > 0 ? ` (+${scoreDiff} vs last week)` : scoreDiff < 0 ? ` (${scoreDiff} vs last week)` : " (unchanged)";
    lines.push(`Average AI score this week: ${totals.avgScoreThisWeek}${scoreTrend}.`);
  }

  const bestPlatform = [...platforms].filter((p) => p.count >= 1).sort((a, b) => b.avgScore - a.avgScore)[0];
  if (bestPlatform && platforms.length > 1) {
    lines.push(`${bestPlatform.platform} is your highest-scoring platform (avg ${bestPlatform.avgScore}).`);
  }

  if (topPosts[0]) {
    const best = topPosts[0];
    const rate = best.engagementRate !== null ? ` and ${best.engagementRate}% engagement` : "";
    lines.push(`Best performing post: "${best.topic}" with ${best.views.toLocaleString("en-US")} views${rate}.`);
  } else if (performance.posts === 0) {
    lines.push("Log performance numbers on published posts in the Calendar to unlock engagement insights.");
  }

  if (totals.scheduled === 0) {
    lines.push("Nothing is scheduled ahead. Add upcoming posts in the Calendar to keep your streak.");
  } else {
    lines.push(`${totals.scheduled} post${totals.scheduled === 1 ? " is" : "s are"} scheduled ahead.`);
  }

  return lines;
};
