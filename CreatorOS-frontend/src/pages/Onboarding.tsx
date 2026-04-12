import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import {
  Brain,
  Briefcase,
  Check,
  Cpu,
  Dumbbell,
  Gamepad2,
  Instagram,
  Plane,
  Sparkles,
  TrendingUp,
  Wand2,
  Youtube
} from "lucide-react"
import OnboardingOptionCard from "../components/onboarding/OnboardingOptionCard"
import { authFetch } from "../utils/api"

const STORAGE_KEY = "creator_profile"

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
    description: "Long-form storytelling, search visibility, and deeper authority",
    badge: "YT",
    badgeClassName: "from-red-500/30 to-red-400/20"
  },
  {
    id: "Instagram",
    title: "Instagram",
    description: "Visual-first content, reels, aesthetics, and audience connection",
    badge: "IG",
    badgeClassName: "from-pink-500/30 to-fuchsia-400/20"
  },
  {
    id: "TikTok",
    title: "TikTok",
    description: "Fast hooks, trend-native content, and high-energy pacing",
    badge: "TT",
    badgeClassName: "from-cyan-500/30 to-slate-300/10"
  },
  {
    id: "X",
    title: "X",
    description: "Sharp ideas, concise writing, and fast-moving commentary",
    badge: "X",
    badgeClassName: "from-slate-500/30 to-slate-300/10"
  },
  {
    id: "LinkedIn",
    title: "LinkedIn",
    description: "Professional storytelling, authority, and expertise-led growth",
    badge: "in",
    badgeClassName: "from-sky-500/30 to-blue-400/20"
  },
  {
    id: "Threads",
    title: "Threads",
    description: "Conversation-driven content with a lighter, more personal feel",
    badge: "@",
    badgeClassName: "from-violet-500/30 to-fuchsia-400/20"
  }
] as const

const toneOptions = [
  {
    id: "bold",
    title: "Bold",
    description: "Confident, direct, and attention-grabbing",
    badge: "B",
    badgeClassName: "from-orange-500/30 to-rose-400/20"
  },
  {
    id: "funny",
    title: "Funny",
    description: "Humorous, light, and entertaining",
    badge: "F",
    badgeClassName: "from-amber-500/30 to-orange-400/20"
  },
  {
    id: "aesthetic",
    title: "Aesthetic",
    description: "Beautiful, curated, and visually driven",
    badge: "A",
    badgeClassName: "from-pink-500/30 to-violet-400/20"
  },
  {
    id: "educational",
    title: "Educational",
    description: "Useful, clear, and informative",
    badge: "E",
    badgeClassName: "from-sky-500/30 to-cyan-400/20"
  },
  {
    id: "luxury",
    title: "Luxury",
    description: "Premium, polished, and aspirational",
    badge: "L",
    badgeClassName: "from-violet-500/30 to-indigo-400/20"
  },
  {
    id: "relatable",
    title: "Relatable",
    description: "Down-to-earth, personal, and authentic",
    badge: "R",
    badgeClassName: "from-emerald-500/30 to-teal-400/20"
  }
] as const

const goalOptions = [
  {
    id: "grow_audience",
    title: "Grow Audience",
    description: "Reach more people and create stronger visibility",
    badge: "↗",
    badgeClassName: "from-fuchsia-500/30 to-indigo-400/20"
  },
  {
    id: "build_brand",
    title: "Build Brand",
    description: "Become more recognizable and shape a consistent identity",
    badge: "✦",
    badgeClassName: "from-violet-500/30 to-fuchsia-400/20"
  },
  {
    id: "sell_product",
    title: "Sell Product",
    description: "Support launches, offers, and conversion-focused content",
    badge: "$",
    badgeClassName: "from-emerald-500/30 to-lime-400/20"
  },
  {
    id: "increase_engagement",
    title: "Increase Engagement",
    description: "Drive more replies, saves, shares, and audience interaction",
    badge: "♡",
    badgeClassName: "from-pink-500/30 to-rose-400/20"
  }
] as const

const audienceOptions = [
  {
    id: "beginner",
    title: "Beginner",
    description: "Keep content accessible, simple, and easy to follow",
    badge: "1",
    badgeClassName: "from-white/15 to-white/5"
  },
  {
    id: "intermediate",
    title: "Intermediate",
    description: "Balance clarity with stronger detail and better examples",
    badge: "2",
    badgeClassName: "from-indigo-500/30 to-sky-400/20"
  },
  {
    id: "advanced",
    title: "Advanced",
    description: "Go deeper with sharper insights and more specific language",
    badge: "3",
    badgeClassName: "from-fuchsia-500/30 to-violet-400/20"
  }
] as const

const floatingMarks = [
  {
    icon: Sparkles,
    className: "left-[8%] top-[16%] text-fuchsia-200/70",
    delay: 0
  },
  {
    icon: Wand2,
    className: "right-[10%] top-[18%] text-indigo-200/70",
    delay: 0.15
  },
  {
    icon: Instagram,
    className: "left-[12%] bottom-[22%] text-pink-200/60",
    delay: 0.25
  },
  {
    icon: Youtube,
    className: "right-[12%] bottom-[18%] text-red-200/60",
    delay: 0.35
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

  const saveAndContinue = async () => {
    if (!currentSelection) {
      return
    }

    if (step < 5) {
      setStep((step + 1) as Step)
      return
    }

    const userProfile = {
      niche,
      tone,
      platform: selectedPlatforms[0] ?? null,
      platforms: selectedPlatforms,
      goal,
      audience
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(userProfile))
    window.localStorage.setItem("creatorosOnboarding", JSON.stringify(userProfile))

    const profilePayload = {
      niche: nicheOptions.find((option) => option.id === niche)?.title ?? niche,
      tone: toneOptions.find((option) => option.id === tone)?.title ?? tone,
      platform: selectedPlatforms[0] ?? null
    }

    try {
      await authFetch("/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(profilePayload)
      })
    } catch (error) {
      console.warn("Could not sync onboarding preferences to profile", error)
    }

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
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.18),transparent_32%),#0b1020] px-4 py-4 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ x: [0, 35, 0], y: [0, -24, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-[10%] top-[8%] h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -28, 0], y: [0, 30, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[10%] right-[10%] h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"
        />

        {floatingMarks.map((mark) => {
          const Icon = mark.icon

          return (
            <motion.div
              key={mark.className}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: [0.4, 0.75, 0.4], y: [0, -10, 0] }}
              transition={{
                duration: 5.5,
                delay: mark.delay,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className={`absolute hidden h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl lg:flex ${mark.className}`}
            >
              <Icon className="h-4 w-4" />
            </motion.div>
          )
        })}
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] max-w-5xl flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mb-5 flex items-center justify-center gap-3"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.08, duration: 0.35 }}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-indigo-400 text-sm font-semibold shadow-[0_18px_40px_rgba(99,102,241,0.3)]"
          >
            CO
          </motion.div>
          <div>
            <h1 className="text-2xl font-semibold text-white">CreatorOS</h1>
            <p className="text-xs text-white/45">Personalize your content engine</p>
          </div>
        </motion.div>

        <div className="mx-auto w-full max-w-4xl space-y-5 text-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.4 }}
            className="space-y-2"
          >
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white lg:text-4xl">
              Let&apos;s personalize your experience
            </h2>
            <p className="mx-auto max-w-2xl text-sm leading-6 text-white/50">
              Help us understand your content style so CreatorOS can guide generation
              with more relevant ideas, voice, and platform fit.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-2"
          >
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
                <div key={item.label} className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-200 ${
                        isCurrent
                          ? "border border-purple-400/40 bg-purple-500/20 text-white ring-2 ring-purple-500/30"
                          : isComplete
                            ? "bg-gradient-to-br from-fuchsia-500 to-indigo-400 text-white"
                            : "bg-white/5 text-white/30"
                      }`}
                    >
                      {isComplete ? <Check className="h-4 w-4" /> : item.stepNumber}
                    </div>
                    <span className={`text-xs ${isCurrent || isComplete ? "text-white" : "text-white/35"}`}>
                      {item.label}
                    </span>
                  </div>

                  {index < 4 ? <div className="hidden h-px w-8 bg-white/10 lg:block" /> : null}
                </div>
              )
            })}
          </motion.div>

          <motion.div
            layout
            initial={{ opacity: 0, y: 24, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.22, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="glass-panel rounded-[24px] border-white/10 bg-[#10182a]/80 p-6 text-left shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
          >
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-200">
                <Sparkles className="h-3 w-3" />
                {stepMeta[step].eyebrow}
              </div>

              <h3 className="text-2xl font-semibold tracking-[-0.03em] text-white">
                {stepMeta[step].title}
              </h3>
              <p className="max-w-2xl text-xs leading-5 text-white/50">
                {stepMeta[step].subtitle}
              </p>
            </div>

            <div className="mt-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -18 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  {step === 1 ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {nicheOptions.map((option) => (
                        <motion.div
                          key={option.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.03, duration: 0.22 }}
                        >
                          <OnboardingOptionCard
                            title={option.title}
                            description={option.description}
                            selected={niche === option.id}
                            onClick={() => setNiche(option.id)}
                            icon={"icon" in option ? option.icon : undefined}
                            emoji={"emoji" in option ? option.emoji : undefined}
                          />
                        </motion.div>
                      ))}
                    </div>
                  ) : null}

                  {step === 2 ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {platformOptions.map((option, index) => (
                        <motion.div
                          key={option.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03, duration: 0.22 }}
                        >
                          <OnboardingOptionCard
                            title={option.title}
                            description={option.description}
                            selected={selectedPlatforms.includes(option.id)}
                            onClick={() => togglePlatform(option.id)}
                            badge={option.badge}
                            badgeClassName={option.badgeClassName}
                          />
                        </motion.div>
                      ))}
                    </div>
                  ) : null}

                  {step === 3 ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {toneOptions.map((option, index) => (
                        <motion.div
                          key={option.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03, duration: 0.22 }}
                        >
                          <OnboardingOptionCard
                            title={option.title}
                            description={option.description}
                            selected={tone === option.id}
                            onClick={() => setTone(option.id)}
                            badge={option.badge}
                            badgeClassName={option.badgeClassName}
                          />
                        </motion.div>
                      ))}
                    </div>
                  ) : null}

                  {step === 4 ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {goalOptions.map((option, index) => (
                        <motion.div
                          key={option.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03, duration: 0.22 }}
                        >
                          <OnboardingOptionCard
                            title={option.title}
                            description={option.description}
                            selected={goal === option.id}
                            onClick={() => setGoal(option.id)}
                            badge={option.badge}
                            badgeClassName={option.badgeClassName}
                          />
                        </motion.div>
                      ))}
                    </div>
                  ) : null}

                  {step === 5 ? (
                    <div className="grid gap-3 md:grid-cols-3">
                      {audienceOptions.map((option, index) => (
                        <motion.div
                          key={option.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03, duration: 0.22 }}
                        >
                          <OnboardingOptionCard
                            title={option.title}
                            description={option.description}
                            selected={audience === option.id}
                            onClick={() => setAudience(option.id)}
                            badge={option.badge}
                            badgeClassName={option.badgeClassName}
                          />
                        </motion.div>
                      ))}
                    </div>
                  ) : null}
                </motion.div>
              </AnimatePresence>
            </div>

            {step === 1 && selectedNicheLabel ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-xl border border-purple-500/15 bg-purple-500/8 px-4 py-3 text-xs leading-5 text-purple-100"
              >
                You selected {selectedNicheLabel} — great for aesthetic and relatable content if you lean visual, or sharp niche expertise if you lean educational.
              </motion.div>
            ) : null}

            {step === 2 && selectedPlatforms.length ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-xl border border-purple-500/15 bg-purple-500/8 px-4 py-3 text-xs leading-5 text-purple-100"
              >
                {selectedPlatforms.length} platform{selectedPlatforms.length === 1 ? "" : "s"} selected — CreatorOS will prioritize {selectedPlatforms[0]} first in your generation flow.
              </motion.div>
            ) : null}

            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={goBack}
                className={`text-sm transition-colors duration-200 ${
                  step === 1 ? "pointer-events-none text-white/20" : "text-white/70 hover:text-white"
                }`}
              >
                Back
              </button>

              <div className="text-xs text-white/35">{stepMeta[step].eyebrow}</div>

              <motion.button
                type="button"
                onClick={saveAndContinue}
                disabled={!currentSelection}
                whileHover={currentSelection ? { scale: 1.01, y: -1 } : undefined}
                whileTap={currentSelection ? { scale: 0.985 } : undefined}
                className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-6 py-3 text-sm font-medium text-white shadow-[0_18px_36px_rgba(99,102,241,0.24)] transition-all duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:scale-100"
              >
                {stepMeta[step].cta}
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
