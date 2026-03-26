import type { LucideIcon } from "lucide-react"

type OnboardingOptionCardProps = {
  title: string
  description: string
  selected: boolean
  onClick: () => void
  icon?: LucideIcon
  emoji?: string
}

export default function OnboardingOptionCard({
  title,
  description,
  selected,
  onClick,
  icon: Icon,
  emoji
}: OnboardingOptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-left backdrop-blur-lg transition-all duration-200 hover:scale-[1.02] ${
        selected ? "border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/30" : ""
      }`}
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500/25 to-indigo-500/25 text-white">
        {Icon ? <Icon className="h-6 w-6" /> : <span className="text-2xl">{emoji}</span>}
      </div>

      <div className="space-y-1">
        <p className="text-xl font-semibold text-white">{title}</p>
        <p className="text-sm leading-6 text-white/50">{description}</p>
      </div>
    </button>
  )
}
