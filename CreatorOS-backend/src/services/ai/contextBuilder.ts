type MemoryRow = {
  text: string;
  metadata?: {
    topic?: string;
    platform?: string;
    [key: string]: unknown;
  } | null;
  score?: number | null;
};

type StyleFeatures = {
  hook_type: string;
  caption_length: string;
  tone: string;
  structure: string;
};

type MemoryBundle = {
  brand?: MemoryRow | null;
  summary?: MemoryRow | null;
  style?: StyleFeatures | null;
  scripts: MemoryRow[];
  hooks: MemoryRow[];
  captions: MemoryRow[];
};

type UserContext = {
  niche?: string | null;
  tone?: string | null;
  platform?: string | null;
};

const formatEntries = (title: string, items: MemoryRow[]) => {
  if (!items.length) {
    return `${title}:\n- None`;
  }

  return `${title}:\n${items
    .slice(0, 3)
    .map((item) => `- ${item.text.slice(0, 200)}`)
    .join("\n")}`;
};

export const buildMemoryContext = (memory: MemoryBundle, user: UserContext) => {
  const profile = [
    `Niche: ${user.niche || "general"}`,
    `Tone: ${user.tone || "educational"}`,
    `Platform: ${user.platform || "YouTube"}`
  ].join("\n");

  const sections = [
    "Creator Identity & DNA:",
    profile,
    "",
    "Library DNA Style Insights (PRIMARY SOURCE OF TRUTH):",
    `The following patterns are extracted from this creator's most successful previous content. REPLICATE THESE EXACT PATTERNS:`,
    `- Tone: ${memory.style?.tone || "educational"}`,
    `- Hook Pattern: ${memory.style?.hook_type || "curiosity gap"}`,
    `- Structure: ${memory.style?.structure || "mixed"}`,
    `- Caption Length: ${memory.style?.caption_length || "medium"}`,
    "",
    "Brand Guidelines (Optional Context):",
    memory.brand?.text || "No manual brand brief provided. Rely entirely on Library DNA above.",
    "",
    "Creator Performance Summary:",
    memory.summary?.text || "No summarized creator memory available.",
    "",
    "Successful Historical Patterns (for Voice Matching):",
    formatEntries("Past Scripts", memory.scripts),
    "",
    formatEntries("Past Hooks", memory.hooks),
    "",
    formatEntries("Past Captions", memory.captions),
    "",
    "FINAL INSTRUCTION: Your primary goal is to sound like the creator described in the Library DNA and Past Scripts section. Match their energy, word choice, and pacing precisely."
  ];

  return sections.join("\n");
};
