import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Brain,
  Briefcase,
  Check,
  Cpu,
  Dumbbell,
  Gamepad2,
  Plane,
  Sparkles,
  TrendingUp
} from "lucide-react"
import OnboardingOptionCard from "../components/onboarding/OnboardingOptionCard"

const STORAGE_KEY = "creatorosOnboarding"

const nicheOptions = [
  {
    id: "ai",
    title: "AI",
    icon: Brain,
    description: "AI tools, workflows, prompts, and creator systems"
  },
  {
    id: "technology",
    title: "Technology",
    icon: Cpu,
    description: "Tech explainers, product breakdowns, and tutorials"
  },
  {
    id: "business",
    title: "Business",
    icon: Briefcase,
    description: "Business strategy, growth lessons, and creator monetization"
  },
  {
    id: "marketing",
    title: "Marketing",
    icon: TrendingUp,
    description: "Audience growth, funnels, positioning, and content strategy"
  },
  {
    id: "fitness",
    title: "Fitness",
    icon: Dumbbell,
    description: "Workouts, routines, discipline, and transformation content"
  },
  {
    id: "gaming",
    title: "Gaming",
    icon: Gamepad2,
    description: "Gameplay, reactions, commentary, and gaming culture"
  },
  {
    id: "travel",
    title: "Travel",
    icon: Plane,
    description: "Destinations, itineraries, guides, and lifestyle moments"
  },
  {
    id: "fashion_lifestyle",
    title: "Fashion & Lifestyle",
    emoji: "👗",
    description: "Outfits, trends, daily life, aesthetic content"
  }
] as const

const platformOptions = [
  {
    id: "YouTube",
    title: "YouTube",
    description: "Long-form storytelling, search visibility, and deeper authority"
  },
  {
    id: "Instagram",
    title: "Instagram",
    description: "Visual-first content, reels, aesthetics, and audience connection"
  },
  {
    id: "TikTok",
    title: "TikTok",
    description: "Fast hooks, trend-native content, and high-energy pacing"
  },
  {
    id: "X",
    title: "X",
    description: "Sharp ideas, concise writing, and fast-moving commentary"
  },
  {
    id: "LinkedIn",
    title: "LinkedIn",
    description: "Professional storytelling, authority, and expertise-led growth"
  },
  {
    id: "Threads",
    title: "Threads",
    description: "Conversation-driven content with a lighter, more personal feel"
  }
] as const

const toneOptions = [
  {
    id: "bold",
    title: "Bold",
    description: "Confident, direct, and attention-grabbing"
  },
  {
    id: "funny",
    title: "Funny",
    description: "Humorous, light, and entertaining"
  },
  {
    id: "aesthetic",
    title: "Aesthetic",
    description: "Beautiful, curated, and visually driven"
  },
  {
    id: "educational",
    title: "Educational",
    description: "Useful, clear, and informative"
  },
  {
    id: "luxury",
    title: "Luxury",
    description: "Premium, polished, and aspirational"
  },
  {
    id: "relatable",
    title: "Relatable",
    description: "Down-to-earth, personal, and authentic"
  }
] as const

const goalOptions = [
  {
    id: "grow_audience",
    title: "Grow Audience",
    description: "Reach more people and create stronger visibility"
  },
  {
    id: "build_brand",
    title: "Build Brand",
    description: "Become more recognizable and shape a consistent identity"
  },
  {
    id: "sell_product",
    title: "Sell Product",
    description: "Support launches, offers, and conversion-focused content"
  },
  {
    id: "increase_engagement",
    title: "Increase Engagement",
    description: "Drive more replies, saves, shares, and audience interaction"
  }
] as const

const audienceOptions = [
  {
    id: "beginner",
    title: "Beginner",
    description: "Keep content accessible, simple, and easy to follow"
  },
  {
    id: "intermediate",
    title: "Intermediate",
    description: "Balance clarity with stronger detail and better examples"
  },
  {
    id: "advanced",
    title: "Advanced",
    description: "Go deeper with sharper insights and more specific language"
  }
] as const

type Step = 1 | 2 | 3 | 4 | 5

export default function Onboarding() {
  const navigate = useNavigate()

  const existing = useMemo(() => {
    if (typeof window === "undefined") {
      return null
    }

    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return null
    }

    try {
      return JSON.parse(raw) as {
        niche?: string
        platforms?: string[]
        platform?: string
        tone?: string
        goal?: string
        audience?: string
      }
    } catch {
      return null
    }
  }, [])

  const [step, setStep] = useState<Step>(1)
  const [niche, setNiche] = useState<string | null>(existing?.niche ?? null)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(
    existing?.platforms ?? (existing?.platform ? [existing.platform] : [])
  )
  const [tone, setTone] = useState<string | null>(existing?.tone ?? null)
  const [goal, setGoal] = useState<string | null>(existing?.goal ?? null)
  const [audience, setAudience] = useState<string | null>(existing?.audience ?? null)

  const currentSelection =
    step === 1
      ? niche
      : step === 2
        ? selectedPlatforms.length
        : step === 3
          ? tone
          : step === 4
            ? goal
            : audience

  const stepMeta = {
    1: {
      eyebrow: "Step 1 of 5",
      title: "Choose your niche",
      subtitle: "Pick the content world you want CreatorOS to optimize for.",
      cta: "Continue"
    },
    2: {
      eyebrow: "Step 2 of 5",
      title: "Select your platforms",
      subtitle: "Choose where you publish so the system can adapt format and pacing.",
      cta: "Continue"
    },
    3: {
      eyebrow: "Step 3 of 5",
      title: "Select your tone",
      subtitle: "Tell the AI how your content should feel and sound.",
      cta: "Continue"
    },
    4: {
      eyebrow: "Step 4 of 5",
      title: "Choose your goal",
      subtitle: "Focus the content engine on what matters most right now.",
      cta: "Continue"
    },
    5: {
      eyebrow: "Step 5 of 5",
      title: "Pick your audience level",
      subtitle: "We will shape clarity and depth for the people you want to reach.",
      cta: "Start Creating"
    }
  } as const

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((current) =>
      current.includes(platformId)
        ? current.filter((item) => item !== platformId)
        : [...current, platformId]
    )
  }

  const saveAndContinue = () => {
    if (!currentSelection) {
      return
    }

    if (step < 5) {
      setStep((step + 1) as Step)
      return
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        niche,
        platforms: selectedPlatforms,
        platform: selectedPlatforms[0] ?? null,
        tone,
        goal,
        audience
      })
    )

    navigate("/dashboard")
  }

  const goBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step)
    }
  }

  const selectedNicheLabel =
    nicheOptions.find((option) => option.id === niche)?.title ?? null

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.18),transparent_32%),#0b1020] px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex items-center justify-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-fuchsia-500 to-indigo-400 text-2xl font-semibold shadow-[0_18px_40px_rgba(99,102,241,0.3)]">
            CO
          </div>
          <div>
            <h1 className="text-4xl font-semibold text-white">CreatorOS</h1>
            <p className="text-lg text-white/45">Personalize your content engine</p>
          </div>
        </div>

        <div className="mx-auto max-w-5xl space-y-10 text-center">
          <div className="space-y-4">
            <h2 className="text-6xl font-semibold tracking-[-0.05em] text-white">
              Let&apos;s personalize your experience
            </h2>
            <p className="mx-auto max-w-3xl text-xl leading-8 text-white/50">
              Help us understand your content style so CreatorOS can guide generation
              with more relevant ideas, voice, and platform fit.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {[
              { stepNumber: 1, label: "Niche" },
              { stepNumber: 2, label: "Platforms" },
              { stepNumber: 3, label: "Tone" },
              { stepNumber: 4, label: "Goal" },
              { stepNumber: 5, label: "Audience" }
            ].map((item, index) => {
              const isComplete = step > item.stepNumber
              const isCurrent = step === item.stepNumber

              return (
                <div key={item.label} className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-3xl text-xl font-semibold transition-all duration-200 ${
                        isCurrent
                          ? "border border-purple-400/40 bg-purple-500/20 text-white ring-2 ring-purple-500/30"
                          : isComplete
                            ? "bg-gradient-to-br from-fuchsia-500 to-indigo-400 text-white"
                            : "bg-white/5 text-white/30"
                      }`}
                    >
                      {isComplete ? <Check className="h-6 w-6" /> : item.stepNumber}
                    </div>
                    <span className={`text-lg ${isCurrent || isComplete ? "text-white" : "text-white/35"}`}>
                      {item.label}
                    </span>
                  </div>

                  {index < 4 ? <div className="hidden h-px w-12 bg-white/10 lg:block" /> : null}
                </div>
              )
            })}
          </div>

          <div className="glass-panel rounded-[32px] border-white/10 bg-[#10182a]/80 p-12 text-left shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-sm font-medium text-purple-200">
                <Sparkles className="h-4 w-4" />
                {stepMeta[step].eyebrow}
              </div>

              <h3 className="text-5xl font-semibold tracking-[-0.04em] text-white">
                {stepMeta[step].title}
              </h3>
              <p className="max-w-2xl text-lg leading-8 text-white/50">
                {stepMeta[step].subtitle}
              </p>
            </div>

            <div className="mt-10">
              {step === 1 ? (
                <div className="grid gap-5 md:grid-cols-2">
                  {nicheOptions.map((option) => (
                    <OnboardingOptionCard
                      key={option.id}
                      title={option.title}
                      description={option.description}
                      selected={niche === option.id}
                      onClick={() => setNiche(option.id)}
                      icon={"icon" in option ? option.icon : undefined}
                      emoji={"emoji" in option ? option.emoji : undefined}
                    />
                  ))}
                </div>
              ) : null}

              {step === 2 ? (
                <div className="grid gap-5 md:grid-cols-2">
                  {platformOptions.map((option) => (
                    <OnboardingOptionCard
                      key={option.id}
                      title={option.title}
                      description={option.description}
                      selected={selectedPlatforms.includes(option.id)}
                      onClick={() => togglePlatform(option.id)}
                    />
                  ))}
                </div>
              ) : null}

              {step === 3 ? (
                <div className="grid gap-5 md:grid-cols-2">
                  {toneOptions.map((option) => (
                    <OnboardingOptionCard
                      key={option.id}
                      title={option.title}
                      description={option.description}
                      selected={tone === option.id}
                      onClick={() => setTone(option.id)}
                    />
                  ))}
                </div>
              ) : null}

              {step === 4 ? (
                <div className="grid gap-5 md:grid-cols-2">
                  {goalOptions.map((option) => (
                    <OnboardingOptionCard
                      key={option.id}
                      title={option.title}
                      description={option.description}
                      selected={goal === option.id}
                      onClick={() => setGoal(option.id)}
                    />
                  ))}
                </div>
              ) : null}

              {step === 5 ? (
                <div className="grid gap-5 md:grid-cols-3">
                  {audienceOptions.map((option) => (
                    <OnboardingOptionCard
                      key={option.id}
                      title={option.title}
                      description={option.description}
                      selected={audience === option.id}
                      onClick={() => setAudience(option.id)}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            {step === 1 && selectedNicheLabel ? (
              <div className="mt-6 rounded-2xl border border-purple-500/15 bg-purple-500/8 px-5 py-4 text-sm text-purple-100">
                You selected {selectedNicheLabel} — great for aesthetic and relatable content if you lean visual, or sharp niche expertise if you lean educational.
              </div>
            ) : null}

            {step === 2 && selectedPlatforms.length ? (
              <div className="mt-6 rounded-2xl border border-purple-500/15 bg-purple-500/8 px-5 py-4 text-sm text-purple-100">
                {selectedPlatforms.length} platform{selectedPlatforms.length === 1 ? "" : "s"} selected — CreatorOS will prioritize {selectedPlatforms[0]} first in your generation flow.
              </div>
            ) : null}

            <div className="mt-12 flex items-center justify-between border-t border-white/10 pt-8">
              <button
                type="button"
                onClick={goBack}
                className={`text-xl transition-colors duration-200 ${
                  step === 1 ? "pointer-events-none text-white/20" : "text-white/70 hover:text-white"
                }`}
              >
                Back
              </button>

              <div className="text-lg text-white/35">{stepMeta[step].eyebrow}</div>

              <button
                type="button"
                onClick={saveAndContinue}
                disabled={!currentSelection}
                className="rounded-2xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-8 py-4 text-xl font-medium text-white shadow-[0_18px_36px_rgba(99,102,241,0.24)] transition-all duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:scale-100"
              >
                {stepMeta[step].cta}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
