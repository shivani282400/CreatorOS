type Props = {
  styleInsights: {
    tone?: string;
    hook_type?: string;
    structure?: string;
    caption_length?: string;
  };
};

type TraitType = keyof Props["styleInsights"];

const traits: Array<{
  type: TraitType;
  label: string;
}> = [
  {
    type: "tone",
    label: "Tone"
  },
  {
    type: "hook_type",
    label: "Hooks"
  },
  {
    type: "structure",
    label: "Structure"
  },
  {
    type: "caption_length",
    label: "Caption Length"
  }
];

function getScore(type: string, value: string): number {
  const normalized = value.toLowerCase();

  const scoreMap: Record<string, Record<string, number>> = {
    tone: {
      motivational: 80,
      educational: 70,
      storytelling: 60,
      promotional: 65
    },
    hook_type: {
      bold: 80,
      "bold statement": 80,
      emotional: 75,
      curiosity: 70,
      "curiosity gap": 70,
      question: 65
    },
    structure: {
      punchline: 80,
      story: 70,
      list: 65,
      mixed: 60
    },
    caption_length: {
      short: 80,
      medium: 65,
      long: 50
    }
  };

  return scoreMap[type]?.[normalized] ?? 55;
}

const formatValue = (value?: string) => {
  if (!value) {
    return "Learning";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export default function ContentDNA({ styleInsights }: Props) {
  return (
    <section className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 text-white shadow-xl backdrop-blur-lg transition-all duration-300 hover:scale-[1.01]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(129,140,248,0.22),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(217,70,239,0.16),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-indigo-300/70 to-transparent" />

      <div className="relative space-y-5">
        <header className="space-y-1">
          <h2 className="bg-gradient-to-r from-white via-indigo-100 to-fuchsia-200 bg-clip-text text-xl font-semibold tracking-[-0.02em] text-transparent">
            🧬 AI Content DNA
          </h2>
          <p className="text-sm text-white/45">Your content personality decoded</p>
        </header>

        <div className="space-y-5">
          {traits.map((trait) => {
            const value = styleInsights[trait.type] ?? "";
            const score = getScore(trait.type, value);

            return (
              <div key={trait.type} className="space-y-2">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium text-white/75">{trait.label}</span>
                  <span className="text-xs uppercase tracking-[0.18em] text-indigo-200/80">
                    {formatValue(value)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-cyan-300 shadow-[0_0_18px_rgba(129,140,248,0.65)] transition-all duration-700 ease-out"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs font-medium text-white/55">
                    {score}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
