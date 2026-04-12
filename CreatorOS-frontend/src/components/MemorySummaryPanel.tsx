type Props = {
  summary: string;
  styleInsights?: {
    tone?: string;
    hook_type?: string;
    structure?: string;
    caption_length?: string;
  };
};

const insightCards = [
  {
    key: "tone",
    label: "Tone",
    icon: "🎙️"
  },
  {
    key: "hook_type",
    label: "Hook Style",
    icon: "🪝"
  },
  {
    key: "structure",
    label: "Structure",
    icon: "🧩"
  },
  {
    key: "caption_length",
    label: "Caption Length",
    icon: "✍️"
  }
] as const;

const formatInsight = (value?: string) => {
  if (!value) {
    return "Not enough data yet";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export default function MemorySummaryPanel({ summary, styleInsights }: Props) {
  const hasSummary = Boolean(summary.trim());

  return (
    <div className="mx-auto mt-6 max-w-2xl">
      <section className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 text-white shadow-xl backdrop-blur-lg transition-all duration-300 hover:scale-[1.02] hover:border-white/20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.18),transparent_28%)] opacity-80" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-300/60 to-transparent" />

        <div className="relative space-y-4">
          <header className="space-y-1">
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-white">
              🧠 AI Memory Summary
            </h2>
            <p className="text-sm text-white/45">
              How your content performs & behaves
            </p>
          </header>

          <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
            {hasSummary ? (
              <p className="max-h-44 overflow-y-auto pr-2 text-sm leading-relaxed text-white/80">
                {summary}
              </p>
            ) : (
              <div className="space-y-3">
                <div className="h-3 w-3/4 animate-pulse rounded-full bg-white/10" />
                <div className="h-3 w-full animate-pulse rounded-full bg-white/10" />
                <div className="h-3 w-2/3 animate-pulse rounded-full bg-white/10" />
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {insightCards.map((item) => (
              <div
                key={item.key}
                className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10"
              >
                <div className="mb-2 flex items-center gap-2 text-white/45">
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                <p className="font-medium text-white/90">
                  {formatInsight(styleInsights?.[item.key])}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
