type MemoryRow = {
  text: string;
  metadata?: {
    topic?: string;
    platform?: string;
    [key: string]: unknown;
  } | null;
  score?: number | null;
};

type MemoryBundle = {
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
    "Creator Profile:",
    profile,
    "",
    "Relevant Memory:",
    formatEntries("Scripts", memory.scripts),
    "",
    formatEntries("Hooks", memory.hooks),
    "",
    formatEntries("Captions", memory.captions)
  ];

  return sections.join("\n");
};
