import { useEffect, useState } from "react"
import {
  ArrowRight,
  Calendar,
  Library,
  Sparkles,
  TrendingUp,
  Wand2
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import MainLayout from "../layouts/MainLayout"
import PageWrapper from "../components/PageWrapper"

type ContentItem = {
  id: number
  topic: string
  platform: string
  script: string
  hooks: string[]
  captions: string[]
  threads: string[]
  score?: number
  created_at: string
}

type CalendarItem = {
  id: number
  content_id: number
  scheduled_date: string
  topic: string
  platform: string
}

const quickActions = [
  {
    title: "Generate Content",
    description: "Create new scripts, hooks, captions, and threads.",
    icon: Wand2,
    accent: "from-fuchsia-500/20 to-indigo-500/20",
    iconColor: "text-fuchsia-200",
    path: "/generate"
  },
  {
    title: "Open Library",
    description: "Review saved content and refine the strongest ideas.",
    icon: Library,
    accent: "from-emerald-500/20 to-cyan-500/20",
    iconColor: "text-emerald-200",
    path: "/library"
  },
  {
    title: "Plan Calendar",
    description: "Schedule upcoming posts and organize publishing slots.",
    icon: Calendar,
    accent: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-200",
    path: "/calendar"
  }
]

const formatRelativeTime = (value?: string) => {
  if (!value) {
    return "No activity yet"
  }

  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)))

  if (diffHours < 1) {
    return "Less than 1h ago"
  }

  if (diffHours < 24) {
    return `${diffHours}h ago`
  }

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

const getContentType = (item: ContentItem) => {
  if (item.hooks?.length) return "Hook"
  if (item.captions?.length) return "Caption"
  if (item.threads?.length) return "Thread"
  return "Script"
}

const getMomentumCopy = (content: ContentItem[], calendar: CalendarItem[]) => {
  if (!content.length) {
    return "You do not have saved content yet. Generate your first draft and start building the pipeline."
  }

  const platformCounts = content.reduce<Record<string, number>>((acc, item) => {
    acc[item.platform] = (acc[item.platform] || 0) + 1
    return acc
  }, {})

  const topPlatform = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
  const nextScheduled = calendar.find((item) => new Date(item.scheduled_date).getTime() >= Date.now())

  if (nextScheduled) {
    return `${topPlatform || "Your"} content is leading right now, and your next scheduled post is "${nextScheduled.topic}" on ${new Date(nextScheduled.scheduled_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.`
  }

  return `${topPlatform || "Your"} content is leading right now. You have ${content.length} saved piece${content.length === 1 ? "" : "s"} ready to refine or schedule next.`
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [content, setContent] = useState<ContentItem[]>([])
  const [calendar, setCalendar] = useState<CalendarItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [contentRes, calendarRes] = await Promise.all([
          fetch("http://localhost:4000/content"),
          fetch("http://localhost:4000/calendar")
        ])

        const [contentResult, calendarResult] = await Promise.all([
          contentRes.json(),
          calendarRes.json()
        ])

        setContent(contentResult.data || [])
        setCalendar(calendarResult.data || [])
      } catch (error) {
        console.error("Failed to load dashboard data", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 7)

  const thisWeekCount = content.filter((item) => new Date(item.created_at) >= weekStart).length
  const topPlatform =
    Object.entries(
      content.reduce<Record<string, number>>((acc, item) => {
        acc[item.platform] = (acc[item.platform] || 0) + 1
        return acc
      }, {})
    ).sort((a, b) => b[1] - a[1])[0]?.[0] || "None yet"

  const lastCreatedAt = content[0]?.created_at
  const recentItems = content.slice(0, 2)
  const scheduledCount = calendar.length

  const statCards = [
    {
      label: "Saved Content",
      value: String(content.length),
      note: `${thisWeekCount} added this week`,
      noteColor: "text-fuchsia-300"
    },
    {
      label: "Top Platform",
      value: topPlatform,
      note: content.length ? "Most saved content" : "Start generating to see trends",
      noteColor: "text-emerald-300"
    },
    {
      label: "Scheduled Posts",
      value: String(scheduledCount),
      note: lastCreatedAt ? formatRelativeTime(lastCreatedAt) : "No recent activity",
      noteColor: "text-amber-300"
    }
  ]

  return (
    <MainLayout>
      <PageWrapper>
        <div className="mx-auto max-w-7xl space-y-10">
          <section className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-200">
                <Sparkles className="h-3.5 w-3.5" />
                Dashboard
              </div>

              <div className="space-y-3">
                <h1 className="text-5xl font-semibold tracking-[-0.04em] text-white">
                  Welcome back
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-white/50">
                  Keep momentum high with a faster view of your content pipeline,
                  strongest drafts, and next publishing actions.
                </p>
              </div>
            </div>

            <div className="glass-panel flex max-w-xl items-start gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500/25 to-indigo-500/25 text-fuchsia-200">
                <TrendingUp className="h-5 w-5" />
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium text-white">Today’s momentum</p>
                <p className="text-sm leading-6 text-white/45">
                  {loading ? "Loading your latest content activity..." : getMomentumCopy(content, calendar)}
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="premium-card rounded-[24px] border-white/10 p-7"
              >
                <p className="text-sm text-white/45">{card.label}</p>
                <p className="mt-4 text-5xl font-semibold tracking-[-0.04em] text-white">
                  {card.value}
                </p>
                <p className={`mt-3 text-sm ${card.noteColor}`}>{card.note}</p>
              </div>
            ))}
          </section>

          <section className="glass-panel overflow-hidden rounded-[28px] border-white/10 bg-[linear-gradient(145deg,rgba(84,35,181,0.18),rgba(9,14,30,0.92))] p-8 shadow-[0_24px_70px_rgba(0,0,0,0.25)]">
            <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-2xl space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500/35 to-indigo-500/35 text-fuchsia-100 shadow-[0_16px_34px_rgba(99,102,241,0.24)]">
                  <Sparkles className="h-6 w-6" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-3xl font-semibold text-white">Ready to create your next winner?</h2>
                  <p className="text-base leading-7 text-white/55">
                    {content.length
                      ? `You already have ${content.length} saved piece${content.length === 1 ? "" : "s"} in the system. Generate a fresh draft or review what is already working.`
                      : "Jump straight into generation, build a fresh draft, and start your content pipeline with something worth saving."}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => navigate("/generate")}
                  className="btn-primary flex items-center justify-center gap-2 px-6 py-3.5 text-base shadow-[0_16px_36px_rgba(99,102,241,0.22)]"
                >
                  <Wand2 className="h-4 w-4" />
                  Start Generating
                </button>

                <button
                  onClick={() => navigate(content.length ? "/library" : "/calendar")}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-base text-white transition-all duration-200 hover:bg-white/[0.08]"
                >
                  {content.length ? "Review Library" : "Open Calendar"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">Quick actions</h2>
                <p className="mt-1 text-sm text-white/40">
                  Move through your workflow without hunting through the app.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {quickActions.map((action) => {
                const Icon = action.icon

                return (
                  <button
                    key={action.title}
                    onClick={() => navigate(action.path)}
                    className="premium-card glow-border flex items-start gap-4 rounded-[24px] border-white/10 p-6 text-left transition-all duration-200 hover:scale-[1.01]"
                  >
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${action.accent} ${action.iconColor}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="space-y-2">
                      <p className="text-lg font-medium text-white">{action.title}</p>
                      <p className="text-sm leading-6 text-white/45">{action.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">Recent content</h2>
                <p className="mt-1 text-sm text-white/40">
                  Your newest saved drafts from the backend.
                </p>
              </div>

              <button
                onClick={() => navigate("/library")}
                className="text-sm text-fuchsia-300 transition-colors duration-200 hover:text-fuchsia-200"
              >
                View all
              </button>
            </div>

            {recentItems.length ? (
              <div className="grid gap-5 lg:grid-cols-2">
                {recentItems.map((item) => (
                  <div
                    key={item.id}
                    className="premium-card rounded-[24px] border-white/10 p-6"
                  >
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-fuchsia-500/15 px-3 py-1 text-xs font-medium text-fuchsia-300">
                        {getContentType(item)}
                      </span>
                      {typeof item.score === "number" ? (
                        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
                          {item.score}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-6 text-2xl font-medium leading-9 text-white">
                      {item.topic}
                    </p>

                    <p className="mt-4 line-clamp-3 text-sm leading-7 text-white/48">
                      {item.script}
                    </p>

                    <div className="mt-8 flex items-center justify-between">
                      <p className="text-sm text-white/35">
                        {formatRelativeTime(item.created_at)}
                      </p>

                      <button
                        onClick={() => navigate("/library")}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white transition-all duration-200 hover:bg-white/[0.08]"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="premium-card rounded-[24px] border-white/10 p-8 text-center text-white/40">
                No saved content yet. Generate your first draft to make this dashboard useful.
              </div>
            )}
          </section>
        </div>
      </PageWrapper>
    </MainLayout>
  )
}
