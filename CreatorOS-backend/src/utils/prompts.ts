export const buildContentPrompt = (
  topic: string,
  platform: string,
  niche = "general",
  tone = "educational",
  context = "",
  options: {
    goal?: string;
    audience?: string;
    contentType?: string;
  } = {}
) => {
  return `
You are an expert content creator and content evaluator.

You MUST return ONLY valid JSON.
Do NOT include explanations, markdown, or text outside JSON.

Generate ${platform} content for:

Topic: "${topic}"

Creator Profile:
- Niche: ${niche || "general"}
- Tone: ${tone || "educational"}
- Platform: ${platform}
- Content Type: ${options.contentType || "Script"}
- Goal: ${options.goal || "Grow Audience"}
- Audience Level: ${options.audience || "General"}

Personalization context:
Write content matching this brand:
${context || "No brand brief or memory available."}

Follow style and identity strictly from the context above.
Use past successful patterns from the same context.

Your responsibilities:
1. Generate high-performing social content inspired by creators like MrBeast and Alex Hormozi.
2. Evaluate your own output using the scoring rubric below.

Scoring rubric:
- Hook Strength (0-30)
  Evaluate curiosity, boldness, and relatability.
- Emotional Intensity (0-20)
  Evaluate emotional triggers, storytelling, and relatability.
- Engagement Potential (0-25)
  Evaluate the number and quality of hooks and captions.
- Content Structure (0-15)
  Evaluate script clarity, readability, and flow.
- Platform Fit (0-10)
  Evaluate optimization for the target platform.

Total score must be between 0 and 100.
Do not always give a high score. Score honestly based on quality.

Content requirements:
- Script must be engaging, clear, and storytelling-based.
- Adapt style to the niche.
- Match the requested tone strictly.
- Optimize for the stated content type, goal, and audience level.
- Make content highly engaging and platform-aware.
- Examples:
  - Fashion -> aesthetic, trendy, relatable
  - Funny -> humorous, witty, light
  - Educational -> clear, informative
- Hooks must be short, punchy, and curiosity-driven.
- Provide exactly 5 hooks.
- Provide exactly 3 captions.
- Provide exactly 2 threads.

Return ONLY this JSON shape:
{
  "script": "string",
  "hooks": ["string", "string", "string", "string", "string"],
  "captions": ["string", "string", "string"],
  "threads": ["string", "string"],
  "score": 0,
  "analysis": {
    "hook_strength": 0,
    "emotional_intensity": 0,
    "engagement": 0,
    "structure": 0,
    "platform_fit": 0,
    "summary": "string",
    "improvements": ["string"]
  }
}

Rules:
- score must reflect the rubric and stay between 0 and 100
- analysis scores must align logically with the total score
- improvements must contain at least 1 actionable improvement
- hooks, captions, threads, and improvements must be JSON arrays of strings
- no markdown
- no code fences
- no explanation
- no trailing text

If your response contains anything outside JSON, it is invalid.
`;
};

export const buildImprovePrompt = (
  content: {
    topic: string
    platform: string
    script?: string
    hooks?: string[]
    captions?: string[]
    threads?: string[]
    score?: number
    analysis?: {
      summary?: string
      improvements?: string[]
    }
  },
  context = ""
) => {
  return `
You are an expert viral content strategist AND content evaluator.

Your task is to improve an existing content draft while keeping the same topic and platform.
Return ONLY valid JSON.
Do NOT include explanations, markdown, or text outside JSON.

Original content:
- Topic: ${content.topic}
- Platform: ${content.platform}
- Script: ${content.script ?? ""}
- Hooks: ${(content.hooks ?? []).join(" | ")}
- Captions: ${(content.captions ?? []).join(" | ")}
- Threads: ${(content.threads ?? []).join(" | ")}
- Previous score: ${content.score ?? 0}
- Previous analysis summary: ${content.analysis?.summary ?? ""}
- Suggested improvements: ${(content.analysis?.improvements ?? []).join(" | ")}

Improve the content so it is stronger, clearer, and more engaging than the original.
Keep the tone optimized for ${content.platform}.
Use this retrieved memory context to stay aligned with the creator's strongest historical patterns:
${context || "No relevant memory available."}

Scoring rubric:
- Hook Strength (0-30)
- Emotional Intensity (0-20)
- Engagement Potential (0-25)
- Content Structure (0-15)
- Platform Fit (0-10)

Return ONLY this JSON shape:
{
  "script": "string",
  "hooks": ["string", "string", "string", "string", "string"],
  "captions": ["string", "string", "string"],
  "threads": ["string", "string"],
  "score": 0,
  "analysis": {
    "hook_strength": 0,
    "emotional_intensity": 0,
    "engagement": 0,
    "structure": 0,
    "platform_fit": 0,
    "summary": "string",
    "improvements": ["string"]
  }
}

Rules:
- hooks must be exactly 5 items
- captions must be exactly 3 items
- threads must be exactly 2 items
- score must be between 0 and 100
- no markdown
- no code fences
- no explanation
`;
};
