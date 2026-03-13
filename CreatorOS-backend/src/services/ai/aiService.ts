import { generateWithGroq } from "./groq";
import { generateWithOpenRouter } from "./openrouter";
import { generateWithTogether } from "./together";
import { AIContentSchema, type AIContent } from "../../utils/aiSchema";

const MAX_PROVIDER_ATTEMPTS = 3;

type AIProvider = (prompt: string) => Promise<string | null | undefined>;

const AI_RESPONSE_SCHEMA = `{
  "script": "string",
  "hooks": ["string"],
  "captions": ["string"],
  "threads": ["string"]
}`;

const splitListString = (value: string): string[] => {
  return value
    .split("\n")
    .map((item) => item.replace(/^[\s\-*0-9.)]+/, "").trim())
    .filter(Boolean);
};

const extractJsonString = (raw: string): string => {
  const trimmed = raw.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
};

const normalizeAIResponse = (value: unknown): unknown => {
  if (!value || typeof value !== "object") {
    return value;
  }

  const source = value as Record<string, unknown>;
  const content = (source.data && typeof source.data === "object"
    ? source.data
    : source) as Record<string, unknown>;

  const normalizeList = (field: unknown): string[] => {
    if (Array.isArray(field)) {
      return field.map((item) => String(item).trim()).filter(Boolean);
    }

    if (typeof field === "string") {
      return splitListString(field);
    }

    return [];
  };

  return {
    script: typeof content.script === "string" ? content.script.trim() : "",
    hooks: normalizeList(content.hooks),
    captions: normalizeList(content.captions),
    threads: normalizeList(content.threads)
  };
};

const parseAIResponse = (raw: string | null | undefined): AIContent => {
  if (!raw) {
    throw new Error("Empty AI response");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(extractJsonString(raw));
  } catch (err) {
    console.error("AI returned invalid JSON:", raw);
    throw new Error("AI returned invalid JSON");
  }

  const validated = AIContentSchema.safeParse(normalizeAIResponse(parsed));

  if (!validated.success) {
    console.error("AI response schema invalid:", parsed);

    const details = validated.error.issues
      .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
      .join("; ");

    throw new Error(`AI response schema invalid: ${details}`);
  }

  return validated.data;
};

const buildRetryPrompt = (
  basePrompt: string,
  errorMessage: string,
  previousResponse?: string | null
): string => {
  const responseContext = previousResponse?.trim()
    ? `Previous response:
${previousResponse.trim()}
`
    : "Previous response was empty or unreadable.\n";

  return `${basePrompt}

Your previous response failed validation.
Validation error: ${errorMessage}

Return ONLY valid JSON matching exactly this schema:
${AI_RESPONSE_SCHEMA}

Rules:
- No markdown
- No code fences
- No explanation
- hooks, captions, and threads must be JSON arrays of strings
- script must be a string

${responseContext}
Fix the response and return only corrected JSON.`;
};

const generateWithProvider = async (
  providerName: string,
  generator: AIProvider,
  prompt: string
): Promise<AIContent> => {
  let attemptPrompt = prompt;
  let lastError: unknown;
  let lastRaw: string | null | undefined;

  for (let attempt = 1; attempt <= MAX_PROVIDER_ATTEMPTS; attempt += 1) {
    try {
      if (attempt === 1) {
        console.log(`Using ${providerName}`);
      } else {
        console.log(`Retrying ${providerName} (${attempt}/${MAX_PROVIDER_ATTEMPTS})`);
      }

      lastRaw = await generator(attemptPrompt);

      return parseAIResponse(lastRaw);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : "Unknown AI generation error";

      if (attempt === MAX_PROVIDER_ATTEMPTS) {
        break;
      }

      attemptPrompt = buildRetryPrompt(prompt, message, lastRaw);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`${providerName} failed`);
};

export const generateAI = async (prompt: string): Promise<AIContent> => {
  try {
    return await generateWithProvider("Groq", generateWithGroq, prompt);
  } catch (error) {
    console.log("Groq failed → switching to OpenRouter");

    try {
      return await generateWithProvider("OpenRouter", generateWithOpenRouter, prompt);
    } catch (error) {
      console.log("OpenRouter failed → switching to Together");

      return await generateWithProvider("Together", generateWithTogether, prompt);
    }
  }
};
