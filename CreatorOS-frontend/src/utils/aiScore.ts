type ScoreContent = {
  script?: string
  hooks?: string[]
  captions?: string[]
  platform?: string
}

type ScoreBreakdown = {
  sentiment: number
  hooks: number
  engagement: number
  structure: number
}

type ScoreResult = {
  score: number
  breakdown: ScoreBreakdown
}

const EMOTIONAL_KEYWORDS = [
  "secret",
  "shocking",
  "never",
  "truth",
  "crazy",
  "insane",
  "unexpected",
  "powerful",
  "mistake",
  "warning",
  "exposed",
  "hidden",
  "stunning",
  "controversial"
];

const CURIOSITY_PATTERNS = [
  "you won't believe",
  "what happens next",
  "what happened next",
  "nobody tells you",
  "the reason why",
  "here's why",
  "this is why"
];

const RELATABILITY_PATTERNS = [
  "we all",
  "things girls do",
  "things guys do",
  "everyone does this",
  "you do this",
  "we've all",
  "most people"
];

const BOLD_PATTERNS = [
  "the truth",
  "never do this",
  "stop doing this",
  "this changes everything",
  "the biggest mistake",
  "wrong",
  "best",
  "worst"
];

const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, value));
};

const countMatches = (text: string, patterns: string[]) => {
  const lowerText = text.toLowerCase();

  return patterns.reduce((count, pattern) => {
    return lowerText.includes(pattern) ? count + 1 : count;
  }, 0);
};

export const analyzeSentiment = (text: string) => {
  if (!text.trim()) {
    return 0;
  }

  const keywordHits = countMatches(text, EMOTIONAL_KEYWORDS);
  const punctuationBoost = (text.match(/[!?]/g) ?? []).length * 1.5;

  return clamp(keywordHits * 6 + punctuationBoost, 0, 25);
};

export const analyzeHookQuality = (hooks: string[]) => {
  if (!hooks.length) {
    return 0;
  }

  const total = hooks.reduce((score, hook) => {
    const curiosity = countMatches(hook, CURIOSITY_PATTERNS) * 4;
    const relatability = countMatches(hook, RELATABILITY_PATTERNS) * 3;
    const boldness = countMatches(hook, BOLD_PATTERNS) * 3;
    const questionBoost = hook.includes("?") ? 2 : 0;

    return score + curiosity + relatability + boldness + questionBoost;
  }, 0);

  return clamp(total + hooks.length * 2, 0, 35);
};

export const calculateEngagement = (content: ScoreContent) => {
  const hookCount = content.hooks?.length ?? 0;
  const captionCount = content.captions?.length ?? 0;
  const platformBoost = content.platform === "Instagram"
    ? 8
    : content.platform === "YouTube"
      ? 5
      : 0;

  return clamp(hookCount * 3 + captionCount * 2 + platformBoost, 0, 20);
};

const analyzeStructure = (script: string) => {
  const length = script.trim().length;

  if (length >= 200 && length <= 800) {
    return 20;
  }

  if ((length >= 150 && length < 200) || (length > 800 && length <= 950)) {
    return 14;
  }

  if ((length >= 100 && length < 150) || (length > 950 && length <= 1100)) {
    return 8;
  }

  return 3;
};

export const getAIScore = (content: ScoreContent): ScoreResult => {
  const script = content.script ?? "";
  const hooks = content.hooks ?? [];

  const breakdown = {
    sentiment: analyzeSentiment(`${script} ${hooks.join(" ")}`),
    hooks: analyzeHookQuality(hooks),
    engagement: calculateEngagement(content),
    structure: analyzeStructure(script)
  };

  const score = clamp(
    Math.round(
      breakdown.sentiment +
      breakdown.hooks +
      breakdown.engagement +
      breakdown.structure
    ),
    0,
    100
  );

  return {
    score,
    breakdown
  };
};
