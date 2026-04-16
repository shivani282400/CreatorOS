export const buildContentPrompt = (
  topic: string,
  platform: string,
  niche = "general",
  nicheTone = "educational",
  context = "",
  options: {
    goal?: string;
    audience?: string;
    contentType?: string;
  } = {}
) => {
  return `
You are an expert content creator and high-converting brand strategist.

You MUST return ONLY valid JSON.
Do NOT include explanations, markdown, or text outside JSON.

TASK:
Generate high-performing ${platform} content for the topic: "${topic}".

STRATEGIC CONTEXT (CRITICAL):
This creator has a unique "Content DNA". You MUST prioritize the brand identity, voice, and past successful patterns provided in the context below. 

PERSONALIZATION CONTEXT:
${context || "No specific brand brief or historical memory available yet. Use industry best practices for the niche."}

CREATOR PROFILE:
- Niche: ${niche || "general"}
- Default Tone: ${nicheTone || "educational"}
- Goal: ${options.goal || "Grow Audience"}
- Audience Level: ${options.audience || "General"}
- Target Format: ${options.contentType || "Script"}

INSTRUCTIONS:
1. VOICE MATCH: The generated script, hooks, and captions must feel like they were written by the creator described in the "Personalization Context".
2. PATTERN RECOGNITION: If the context includes specific hook patterns or structural preferences, replicate that level of intensity and style.
3. SCORING: Evaluate your own output honestly using the rubric below. Don't be afraid to give lower scores if the content doesn't perfectly hit the brand's potential.

Scoring rubric:
- Hook Strength (0-30): Does it grab attention within 2 seconds? Is it curious or bold?
- Emotional Intensity (0-20): Does it trigger a specific emotion or storytelling vibe?
- Engagement Potential (0-25): How likely are people to save, share, or comment?
- Content Structure (0-15): Is the flow logical? Is the script clear and readable?
- Platform Fit (0-10): Is it optimized for ${platform}'s specific format limitations?

Total score (0-100).

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
    "summary": "short explanation of how this matches the brand/niche",
    "improvements": ["one actionable fix"]
  }
}

Rules:
- score must be 0-100
- analysis scores must align
- exactly 5 hooks, 3 captions, 2 threads
- strictly no markdown, no code fences, no explanation
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
