import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Cpu,
  Brain,
  Briefcase,
  TrendingUp,
  DollarSign,
  Dumbbell,
  Gamepad2,
  Plane,
  Sparkles
} from "lucide-react"

const niches = [
  { name: "AI", icon: Brain },
  { name: "Technology", icon: Cpu },
  { name: "Business", icon: Briefcase },
  { name: "Marketing", icon: TrendingUp },
  { name: "Finance", icon: DollarSign },
  { name: "Fitness", icon: Dumbbell },
  { name: "Gaming", icon: Gamepad2 },
  { name: "Travel", icon: Plane },
]

const platforms = [
  "YouTube",
  "Instagram",
  "TikTok",
  "X",
  "LinkedIn",
  "Threads",
  "Newsletter"
]

const styles = [
  "Educational",
  "Storytelling",
  "Authority",
  "Entertainment"
]

const goals = [
  "Grow Audience",
  "Build Brand",
  "Sell Product",
  "Increase Engagement",
  "Educate Audience",
  "Entertain Audience"
]

const audienceLevels = [
  "Beginner",
  "Intermediate",
  "Advanced"
]

export default function Onboarding() {

  const navigate = useNavigate()

  const [step, setStep] = useState(1)

  const [niche, setNiche] = useState("")
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [style, setStyle] = useState("")
  const [goal, setGoal] = useState("")
  const [audience, setAudience] = useState("")

  const togglePlatform = (platform: string) => {

    if (selectedPlatforms.includes(platform)) {
      setSelectedPlatforms(
        selectedPlatforms.filter(p => p !== platform)
      )
    } else {
      setSelectedPlatforms([...selectedPlatforms, platform])
    }

  }

  const nextStep = () => {

    if (step < 5) {
      setStep(step + 1)
    } else {
      navigate("/dashboard")
    }

  }

  return (

    <div className="min-h-screen bg-[#0E0F13] text-white flex items-center justify-center">

      <div className="bg-[#151821] p-10 rounded-2xl w-[750px]">

        <h1 className="text-2xl font-bold mb-2">
          Setup CreatorOS
        </h1>

        <p className="text-gray-400 mb-8">
          Step {step} of 5
        </p>

        {/* STEP 1 — NICHE */}

        {step === 1 && (

          <div>

            <h2 className="mb-6 font-semibold">
              Choose your niche
            </h2>

            <div className="grid grid-cols-4 gap-4">

              {niches.map(n => {

                const Icon = n.icon

                return (

                  <button
                    key={n.name}
                    onClick={() => setNiche(n.name)}
                    className={`p-4 rounded-xl flex flex-col items-center gap-2 ${
                      niche === n.name
                        ? "bg-blue-500"
                        : "bg-[#1D212B]"
                    }`}
                  >
                    <Icon size={20}/>
                    {n.name}
                  </button>

                )

              })}

            </div>

          </div>

        )}

        {/* STEP 2 — PLATFORMS */}

        {step === 2 && (

          <div>

            <h2 className="mb-6 font-semibold">
              Select your platforms
            </h2>

            <div className="grid grid-cols-3 gap-4">

              {platforms.map(p => (

                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`p-4 rounded-xl ${
                    selectedPlatforms.includes(p)
                      ? "bg-blue-500"
                      : "bg-[#1D212B]"
                  }`}
                >
                  {p}
                </button>

              ))}

            </div>

          </div>

        )}

        {/* STEP 3 — STYLE */}

        {step === 3 && (

          <div>

            <h2 className="mb-6 font-semibold">
              Content style
            </h2>

            <div className="grid grid-cols-2 gap-4">

              {styles.map(s => (

                <button
                  key={s}
                  onClick={() => setStyle(s)}
                  className={`p-4 rounded-xl ${
                    style === s
                      ? "bg-blue-500"
                      : "bg-[#1D212B]"
                  }`}
                >
                  {s}
                </button>

              ))}

            </div>

          </div>

        )}

        {/* STEP 4 — GOAL */}

        {step === 4 && (

          <div>

            <h2 className="mb-6 font-semibold">
              Your main goal
            </h2>

            <div className="grid grid-cols-2 gap-4">

              {goals.map(g => (

                <button
                  key={g}
                  onClick={() => setGoal(g)}
                  className={`p-4 rounded-xl ${
                    goal === g
                      ? "bg-blue-500"
                      : "bg-[#1D212B]"
                  }`}
                >
                  {g}
                </button>

              ))}

            </div>

          </div>

        )}

        {/* STEP 5 — AUDIENCE */}

        {step === 5 && (

          <div>

            <h2 className="mb-6 font-semibold">
              Audience level
            </h2>

            <div className="grid grid-cols-3 gap-4">

              {audienceLevels.map(a => (

                <button
                  key={a}
                  onClick={() => setAudience(a)}
                  className={`p-4 rounded-xl ${
                    audience === a
                      ? "bg-blue-500"
                      : "bg-[#1D212B]"
                  }`}
                >
                  {a}
                </button>

              ))}

            </div>

          </div>

        )}

        {/* CONTINUE BUTTON */}

        <div className="mt-8 flex justify-end">

          <button
            onClick={nextStep}
            className="bg-blue-500 px-6 py-2 rounded-lg flex items-center gap-2"
          >
            Continue
            <Sparkles size={16}/>
          </button>

        </div>

      </div>

    </div>

  )

}