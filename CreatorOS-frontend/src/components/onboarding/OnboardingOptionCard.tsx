import type { LucideIcon } from "lucide-react"

type OnboardingOptionCardProps = {
  title: string
  description: string
  selected: boolean
  onClick: () => void
  icon?: LucideIcon
  emoji?: string
  badge?: string
  badgeClassName?: string
}

export default function OnboardingOptionCard({
  title,
  description,
  selected,
  onClick,
  icon: Icon,
  emoji,
  badge,
  badgeClassName
}: OnboardingOptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left backdrop-blur-lg transition-all duration-200 hover:scale-[1.01] ${
        selected ? "border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/30" : ""
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500/25 to-indigo-500/25 text-white ${badgeClassName ?? ""}`}
      >
        {Icon ? <Icon className="h-4 w-4" /> : badge ? <span className="text-sm font-semibold">{badge}</span> : <span className="text-lg">{emoji}</span>}
      </div>

      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs leading-4 text-white/50">{description}</p>
      </div>
    </button>
  )
}
