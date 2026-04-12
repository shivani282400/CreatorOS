import { useState } from "react"
import {
  ChevronDown,
  Sparkles,
  Wand2,
  Youtube,
  Instagram,
  Goal,
  PenSquare,
  MessageSquareText,
  CheckCircle2,
  Save
} from "lucide-react"
import { toast } from "sonner"
import MainLayout from "../layouts/MainLayout"
import PageWrapper from "../components/PageWrapper"
import { authFetch } from "../utils/api"

const PROFILE_STORAGE_KEY = "creator_profile"

const nicheLabels: Record<string, string> = {
  ai: "AI",
  technology: "Technology",
  business: "Business",
  marketing: "Marketing",
  fitness: "Fitness",
  gaming: "Gaming",
  travel: "Travel",
  fashion_lifestyle: "Fashion & Lifestyle"
}

const toneLabels: Record<string, string> = {
  bold: "Bold",
  funny: "Funny",
  aesthetic: "Aesthetic",
  educational: "Educational",
  luxury: "Luxury",
  relatable: "Relatable"
}

const goalLabels: Record<string, string> = {
  grow_audience: "Grow Audience",
  build_brand: "Build Brand",
  sell_product: "Sell Product",
  increase_engagement: "Increase Engagement"
}

const audienceLabels: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced"
}

const normalizePreference = (
  value: string | null | undefined,
  labels: Record<string, string>,
  fallback = ""
) => {
  if (!value) {
    return fallback
  }

  return labels[value] ?? value
}

const getOnboardingPreferences = () => {
  if (typeof window === "undefined") {
    return null
  }

  const raw =
    window.localStorage.getItem(PROFILE_STORAGE_KEY) ??
    window.localStorage.getItem("creatorosOnboarding")

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as {
      niche?: string
      tone?: string
      platform?: string
      platforms?: string[]
      goal?: string
      audience?: string
    }
  } catch {
    return null
  }
}

type GeneratedContent = {
  script: string
  hooks: string[]
  captions: string[]
  threads: string[]
  score: number
  analysis: {
    summary: string
    improvements: string[]
  }
}

const platformOptions = ["YouTube", "Instagram", "TikTok", "X", "LinkedIn", "Threads"]
const toneOptions = [
  "Educational",
  "Storytelling",
  "Authority",
  "Entertaining",
  "Bold",
  "Funny",
  "Aesthetic",
  "Luxury",
  "Relatable",
  "Informative"
]
const goalOptions = ["Grow Audience", "Build Brand", "Sell Product", "Increase Engagement"]
const contentTypes = ["Script", "Hook", "Caption", "Thread", "Carousel"]

type SelectFieldProps = {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  icon: React.ReactNode
}

function SelectField({ label, value, options, onChange, icon }: SelectFieldProps) {
  return (
    <label className="block space-y-3">
      <span className="text-sm font-medium text-white/85">{label}</span>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-white/45">
          {icon}
        </div>

        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-2xl border border-white/10 bg-[#0a1020] px-12 py-4 text-base text-white outline-none transition-all duration-200 focus:border-indigo-400/50 focus:bg-[#0d1427]"
        >
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>

        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
      </div>
    </label>
  )
}

function ResultBlock({
  title,
  items,
  emptyText
}: {
  title: string
  items: string[]
  emptyText: string
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-xs text-white/45">
          {items.length}
        </span>
      </div>

      {items.length ? (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={`${title}-${index}`}
              className="rounded-xl border border-white/8 bg-[#0d1322] px-4 py-3 text-sm leading-6 text-white/78"
            >
              {item}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-white/40">{emptyText}</p>
      )}
    </section>
  )
}

export default function Generate() {
  const onboardingPreferences = getOnboardingPreferences()
  const initialPlatform =
    onboardingPreferences?.platform ?? onboardingPreferences?.platforms?.[0] ?? "YouTube"
  const initialTone = normalizePreference(onboardingPreferences?.tone, toneLabels, "Educational")
  const initialGoal = normalizePreference(onboardingPreferences?.goal, goalLabels, "Grow Audience")
  const initialNiche = normalizePreference(onboardingPreferences?.niche, nicheLabels)
  const initialAudience = normalizePreference(onboardingPreferences?.audience, audienceLabels)

  const [platform, setPlatform] = useState(initialPlatform)
  const [tone, setTone] = useState(initialTone)
  const [goal, setGoal] = useState(initialGoal)
  const [type, setType] = useState("Script")
  const [useBrandVoice, setUseBrandVoice] = useState(true)
  const [niche] = useState(initialNiche)
  const [audience] = useState(initialAudience)

  const [topic, setTopic] = useState("")
  const [script, setScript] = useState("")
  const [hooks, setHooks] = useState<string[]>([])
  const [captions, setCaptions] = useState<string[]>([])
  const [threads, setThreads] = useState<string[]>([])
  const [score, setScore] = useState<number | null>(null)
  const [analysisSummary, setAnalysisSummary] = useState("")
  const [analysisImprovements, setAnalysisImprovements] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  const hasOutput = Boolean(script || hooks.length || captions.length || threads.length)

  const generateContent = async () => {
    if (!topic.trim()) {
      toast.error("Enter a topic first")
      return
    }

    setLoading(true)

    try {
      const res = await authFetch("/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          topic,
          platform: platform || onboardingPreferences?.platform || "YouTube",
          niche: niche || onboardingPreferences?.niche || "general",
          tone: tone || onboardingPreferences?.tone || "educational",
          goal,
          audience,
          contentType: type,
          save: false
        })
      })

      const result = await res.json()

      if (!res.ok || !result.success || !result.data) {
        throw new Error(result.error || "Generation failed")
      }

      const data = result.data as GeneratedContent

      setScript(data.script)
      setHooks(data.hooks)
      setCaptions(data.captions)
      setThreads(data.threads)
      setScore(data.score)
      setAnalysisSummary(data.analysis.summary)
      setAnalysisImprovements(data.analysis.improvements)
      setIsSaved(false)

      toast.success("Draft generated")
    } catch (err) {
      console.error("Generation failed", err)
      toast.error(err instanceof Error ? err.message : "Generation failed")
    } finally {
      setLoading(false)
    }
  }

  const saveContent = async () => {
    if (!hasOutput || !topic.trim()) {
      toast.error("Generate content first")
      return
    }

    setSaving(true)

    try {
      const res = await authFetch("/content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          topic,
          platform,
          script,
          hooks,
          captions,
          threads,
          score,
          analysis: analysisSummary
            ? {
                summary: analysisSummary,
                improvements: analysisImprovements
              }
            : null
        })
      })

      const result = await res.json()

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Save failed")
      }

      setIsSaved(true)
      toast.success("Saved to Library")
    } catch (error) {
      console.error("Save failed", error)
      toast.error("Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <MainLayout>
      <PageWrapper>
        <div className="mx-auto max-w-7xl space-y-8">
          <section className="space-y-3 pt-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-200">
              <Sparkles className="h-3.5 w-3.5" />
              CreatorOS Studio
            </div>

            <div className="space-y-2">
              <h1 className="text-5xl font-semibold tracking-[-0.04em] text-white">
                AI Content Generator
              </h1>
              <p className="max-w-2xl text-lg text-white/52">
                Create viral content with AI-powered generation tuned for platform fit,
                sharper hooks, and faster publishing.
              </p>
            </div>
          </section>

          <section className="glass-panel overflow-hidden rounded-[28px] border-white/10 bg-[#0a0f1d]/90 shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
            <div className="border-b border-white/8 px-10 py-8">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-white">Build your next content asset</h2>
                  <p className="max-w-xl text-sm leading-6 text-white/45">
                    Choose the format, define the angle, and let the generator produce a
                    structured script, hooks, captions, and threads.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/55">
                    Generate first, then save
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/55">
                    Structured AI Output
                  </span>
                  {niche ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/55">
                      Niche: {niche}
                    </span>
                  ) : null}
                  {tone ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/55">
                      Tone: {tone}
                    </span>
                  ) : null}
                  {audience ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/55">
                      Audience: {audience}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-8 px-10 py-8">
                <div className="grid gap-5 md:grid-cols-2">
                  <SelectField
                    label="Content Type"
                    value={type}
                    options={contentTypes}
                    onChange={setType}
                    icon={<PenSquare className="h-4 w-4" />}
                  />

                  <SelectField
                    label="Platform"
                    value={platform}
                    options={platformOptions}
                    onChange={setPlatform}
                    icon={
                      platform === "Instagram" ? (
                        <Instagram className="h-4 w-4" />
                      ) : (
                        <Youtube className="h-4 w-4" />
                      )
                    }
                  />

                  <SelectField
                    label="Tone"
                    value={tone}
                    options={toneOptions}
                    onChange={setTone}
                    icon={<MessageSquareText className="h-4 w-4" />}
                  />

                  <SelectField
                    label="Goal"
                    value={goal}
                    options={goalOptions}
                    onChange={setGoal}
                    icon={<Goal className="h-4 w-4" />}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label htmlFor="topic" className="text-sm font-medium text-white/85">
                      Describe your content idea
                    </label>
                    <span className="text-xs text-white/35">{topic.length} / 500</span>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-[#0a1020] p-2 transition-all duration-200 focus-within:border-indigo-400/45">
                    <textarea
                      id="topic"
                      placeholder={`E.g., "Tips for beginner content creators starting on ${platform}. Focus on consistency, confidence, and getting first views."`}
                      value={topic}
                      maxLength={500}
                      onChange={(e) => setTopic(e.target.value)}
                      className="min-h-[220px] w-full resize-none rounded-[20px] bg-transparent px-4 py-4 text-base leading-7 text-white outline-none placeholder:text-white/28"
                    />

                    <div className="flex items-center justify-between px-4 pb-3 pt-1 text-xs text-white/30">
                      <span>Be specific for better results</span>
                      <span>
                        {loading
                          ? "Generating draft..."
                          : isSaved
                            ? "Saved to Library"
                            : hasOutput
                              ? "Draft ready to save"
                              : "AI will return structured content"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-[#0c1220] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500/30 to-indigo-500/30 text-fuchsia-200 shadow-[0_12px_28px_rgba(99,102,241,0.18)]">
                        <Wand2 className="h-6 w-6" />
                      </div>

                      <div>
                        <h3 className="text-lg font-medium text-white">Use Brand Voice</h3>
                        <p className="text-sm text-white/45">
                          Apply your trained voice model for more consistent output
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setUseBrandVoice((current) => !current)}
                      className={`relative h-8 w-14 rounded-full transition-all duration-300 ${
                        useBrandVoice ? "bg-gradient-to-r from-fuchsia-500 to-indigo-500" : "bg-white/10"
                      }`}
                      aria-pressed={useBrandVoice}
                    >
                      <span
                        className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-all duration-300 ${
                          useBrandVoice ? "left-7" : "left-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={generateContent}
                    disabled={loading || saving || !topic.trim()}
                    className="flex h-16 flex-1 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-fuchsia-500 via-indigo-500 to-blue-500 text-lg font-semibold text-white shadow-[0_18px_50px_rgba(99,102,241,0.28)] transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_22px_55px_rgba(99,102,241,0.36)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
                  >
                    <Sparkles className="h-5 w-5" />
                    {loading ? "Generating Draft..." : "Generate Draft"}
                  </button>

                  <button
                    onClick={saveContent}
                    disabled={loading || saving || !hasOutput || isSaved}
                    className="flex h-16 min-w-[220px] items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-6 text-base font-semibold text-white transition-all duration-200 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isSaved ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : <Save className="h-5 w-5" />}
                    {saving ? "Saving..." : isSaved ? "Saved to Library" : "Save to Library"}
                  </button>
                </div>
              </div>

              <div className="border-t border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-8 py-8 xl:border-l xl:border-t-0">
                <div className="flex h-full flex-col rounded-[28px] border border-white/8 bg-[#070b15] p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white">Output Preview</h2>
                      <p className="mt-1 text-sm text-white/40">
                        Script, hooks, captions, and threads appear here
                      </p>
                    </div>

                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/45">
                      {isSaved ? "Saved" : hasOutput ? "Draft" : "Waiting"}
                    </span>
                  </div>

                  {loading ? (
                    <div className="flex flex-1 items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02]">
                      <div className="space-y-3 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-200">
                          <Sparkles className="h-6 w-6 animate-pulse" />
                        </div>
                        <p className="text-base font-medium text-white/70">Generating your draft</p>
                        <p className="text-sm text-white/35">
                          The AI is building script, hooks, captions, and threads for review.
                        </p>
                      </div>
                    </div>
                  ) : hasOutput ? (
                    <div className="space-y-5">
                      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-white">
                              {isSaved ? "Saved version" : "Unsaved draft"}
                            </p>
                            <p className="text-sm text-white/45">
                              {isSaved
                                ? "This version is already in your Library."
                                : "Review the output, then save it when you’re happy."}
                            </p>
                          </div>

                          {score !== null ? (
                            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                              AI Score {score}
                            </span>
                          ) : null}
                        </div>

                        {analysisSummary ? (
                          <p className="mt-4 text-sm leading-6 text-white/58">{analysisSummary}</p>
                        ) : null}
                      </section>

                      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="text-base font-semibold text-white">Script</h3>
                          <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-xs text-white/45">
                            {script.length} chars
                          </span>
                        </div>

                        <textarea
                          value={script}
                          readOnly
                          className="min-h-[240px] w-full resize-none rounded-2xl border border-white/8 bg-[#0d1322] px-4 py-4 text-sm leading-7 text-white/78 outline-none"
                        />
                      </section>

                      <ResultBlock
                        title="Hooks"
                        items={hooks}
                        emptyText="No hooks generated yet."
                      />

                      <ResultBlock
                        title="Captions"
                        items={captions}
                        emptyText="No captions generated yet."
                      />

                      <ResultBlock
                        title="Threads"
                        items={threads}
                        emptyText="No threads generated yet."
                      />
                    </div>
                  ) : (
                    <div className="flex flex-1 items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-8">
                      <div className="max-w-sm space-y-3 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] text-white/45">
                          <Sparkles className="h-6 w-6" />
                        </div>
                        <p className="text-base font-medium text-white/70">
                          Generated content will appear here
                        </p>
                        <p className="text-sm leading-6 text-white/35">
                          Start with a strong topic, generate a draft, then save only the
                          versions you actually want in your library.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </PageWrapper>
    </MainLayout>
  )
}
