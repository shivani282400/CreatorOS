export { buildContentPrompt } from "../../utils/prompts";

export const buildGenerateLikePrompt = (
  content: {
    topic: string;
    platform: string;
    script?: string;
    hooks?: string[];
  },
  context: string
) => {
  return `
You are an expert content strategist and content evaluator.

You MUST return ONLY valid JSON.
Do NOT include explanations, markdown, or text outside JSON.

TASK:
Generate NEW content inspired by the following high-performing content.

DO NOT copy.
DO NOT paraphrase.
Create a fresh variation with similar emotional structure and style.

REFERENCE CONTENT:
- Topic: ${content.topic}
- Platform: ${content.platform}
- Script: ${content.script ?? ""}
- Hooks: ${(content.hooks ?? []).join(" | ")}

CREATOR MEMORY:
${context || "No relevant memory available."}

INSTRUCTIONS:
- Keep the same emotional tone and storytelling pattern.
- Make it feel like the same creator.
- Improve weak areas when helpful.
- Avoid repetition.
- Add freshness and novelty.
- Provide exactly 5 hooks.
- Provide exactly 3 captions.
- Provide exactly 2 threads.

Return ONLY this JSON:
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
- No markdown
- No explanation
- Strict JSON only
`;
};
