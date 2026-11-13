import { generateWithGroq, isGroqConfigured, streamWithGroq } from "./groq";
import { generateWithOpenRouter, isOpenRouterConfigured } from "./openrouter";
import { AIContentSchema, type AIContent } from "../../utils/aiSchema";
import { cleanAIOutput } from "../../utils/cleanAIOutput";

const MAX_PROVIDER_ATTEMPTS = 3;

type AIProvider = (prompt: string) => Promise<string | null | undefined>;

const AI_RESPONSE_SCHEMA = `{
  "script": "string",
  "hooks": ["string"],
  "captions": ["string"],
  "threads": ["string"],
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
}`;

const splitListString = (value: string): string[] => {
  return value
    .split("\n")
    .map((item) => item.replace(/^[\s\-*0-9.)]+/, "").trim())
    .filter(Boolean);
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

  const normalizeScore = (field: unknown): number => {
    if (typeof field === "number" && Number.isFinite(field)) {
      return Math.max(0, Math.min(100, Math.round(field)));
    }

    if (typeof field === "string") {
      const parsed = Number(field);

      if (Number.isFinite(parsed)) {
        return Math.max(0, Math.min(100, Math.round(parsed)));
      }
    }

    return 0;
  };

  const analysisSource = content.analysis && typeof content.analysis === "object"
    ? content.analysis as Record<string, unknown>
    : {};

  const normalizeAnalysisScore = (field: unknown, max: number): number => {
    if (typeof field === "number" && Number.isFinite(field)) {
      return Math.max(0, Math.min(max, Math.round(field)));
    }

    if (typeof field === "string") {
      const parsed = Number(field);

      if (Number.isFinite(parsed)) {
        return Math.max(0, Math.min(max, Math.round(parsed)));
      }
    }

    return 0;
  };

  return {
    script: typeof content.script === "string" ? content.script.trim() : "",
    hooks: normalizeList(content.hooks),
    captions: normalizeList(content.captions),
    threads: normalizeList(content.threads),
    score: normalizeScore(content.score),
    analysis: {
      hook_strength: normalizeAnalysisScore(analysisSource.hook_strength, 30),
      emotional_intensity: normalizeAnalysisScore(analysisSource.emotional_intensity, 20),
      engagement: normalizeAnalysisScore(analysisSource.engagement, 25),
      structure: normalizeAnalysisScore(analysisSource.structure, 15),
      platform_fit: normalizeAnalysisScore(analysisSource.platform_fit, 10),
      summary: typeof analysisSource.summary === "string" ? analysisSource.summary.trim() : "",
      improvements: normalizeList(analysisSource.improvements)
    }
  };
};

const parseAIResponse = (raw: string | null | undefined): AIContent => {
  if (!raw) {
    throw new Error("Empty AI response");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(cleanAIOutput(raw));
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
- score must be a number from 0 to 100
- analysis must include hook_strength, emotional_intensity, engagement, structure, platform_fit, summary, improvements
- improvements must be a JSON array of strings

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
  if (!isGroqConfigured() && !isOpenRouterConfigured()) {
    throw new Error("No AI provider is configured. Set GROQ_API_KEY or OPENROUTER_API_KEY.");
  }

  // Use whichever providers are configured, Groq first.
  const providers: Array<[string, AIProvider]> = [];
  if (isGroqConfigured()) providers.push(["Groq", generateWithGroq]);
  if (isOpenRouterConfigured()) providers.push(["OpenRouter", generateWithOpenRouter]);

  const failures: string[] = [];

  for (const [name, generator] of providers) {
    try {
      return await generateWithProvider(name, generator, prompt);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      failures.push(`${name}: ${reason}`);
      console.log(`${name} failed${providers.length > 1 ? " → trying next provider" : ""}:`, reason);
    }
  }

  // Keep every provider's reason so the caller can tell a retired model from a bad key or a rate limit.
  throw new Error(failures.join(" | ") || "AI generation failed");
};

/**
 * Pulls the (possibly still incomplete) value of the "script" field out of a partially
 * streamed JSON document, so the UI can show text as it is being written.
 */
export const extractPartialScript = (raw: string): string => {
  const key = /"script"\s*:\s*"/.exec(raw);
  if (!key) return "";

  const escapes: Record<string, string> = {
    n: "\n", t: "\t", r: "\r", b: "\b", f: "\f", '"': '"', "\\": "\\", "/": "/"
  };

  let index = key.index + key[0].length;
  let out = "";

  while (index < raw.length) {
    const char = raw[index];

    if (char === '"') break; // end of the script string

    if (char === "\\") {
      const next = raw[index + 1];
      if (next === undefined) break; // escape sequence not complete yet

      if (next === "u") {
        const hex = raw.slice(index + 2, index + 6);
        if (hex.length < 4) break;
        out += String.fromCharCode(parseInt(hex, 16));
        index += 6;
        continue;
      }

      out += escapes[next] ?? next;
      index += 2;
      continue;
    }

    out += char;
    index += 1;
  }

  return out;
};

/**
 * Streams generation. `onScript` receives the full script-so-far each time it grows.
 * Falls back to the regular (non-streaming, retrying) path if streaming is unavailable
 * or the streamed output does not validate.
 */
export const generateAIStream = async (
  prompt: string,
  onScript: (scriptSoFar: string) => void,
  signal?: AbortSignal
): Promise<AIContent> => {
  if (isGroqConfigured()) {
    try {
      let raw = "";
      let lastLength = 0;

      await streamWithGroq(
        prompt,
        (token) => {
          raw += token;
          const script = extractPartialScript(raw);
          if (script.length > lastLength) {
            lastLength = script.length;
            onScript(script);
          }
        },
        signal
      );

      return parseAIResponse(raw);
    } catch (error) {
      if (signal?.aborted) throw error;
      console.log("Groq stream failed → falling back to standard generation:", error instanceof Error ? error.message : error);
    }
  }

  const content = await generateAI(prompt);
  onScript(content.script);
  return content;
};
