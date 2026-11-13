import Groq from "groq-sdk";

let groq: Groq | undefined;

// llama-3.3-70b-versatile was shut down by Groq on 16 Aug 2026; openai/gpt-oss-120b is Groq's recommended replacement.
export const GROQ_MODEL = () => process.env.GROQ_MODEL || "openai/gpt-oss-120b";

export const isGroqConfigured = () => Boolean(process.env.GROQ_API_KEY);

const client = () => {
  if (!groq) {
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
      // GROQ_BASE_URL is also read by the SDK itself; kept explicit for local mocks/tests.
      baseURL: process.env.GROQ_BASE_URL || undefined,
      timeout: Number(process.env.AI_TIMEOUT_MS || 60_000),
      maxRetries: 1
    });
  }
  return groq;
};

// JSON mode makes the model return syntactically valid JSON far more reliably.
const jsonMode = () => process.env.GROQ_JSON_MODE !== "false";

// gpt-oss models "think" before answering. Low effort keeps drafts fast; override with GROQ_REASONING_EFFORT.
const reasoningParams = () => {
  if (!GROQ_MODEL().startsWith("openai/gpt-oss")) return {};
  return { reasoning_effort: (process.env.GROQ_REASONING_EFFORT || "low") as "low" | "medium" | "high" };
};

const rejectsJsonMode = (error: unknown) =>
  /response_format|json_object|json mode/i.test(error instanceof Error ? error.message : "");

export const generateWithGroq = async (prompt: string) => {
  if (!isGroqConfigured()) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const request = (withJsonMode: boolean) =>
    client().chat.completions.create({
      model: GROQ_MODEL(),
      messages: [{ role: "user", content: prompt }],
      ...reasoningParams(),
      ...(withJsonMode ? { response_format: { type: "json_object" as const } } : {})
    });

  try {
    const completion = await request(jsonMode());
    return completion.choices[0]?.message?.content;
  } catch (error) {
    // Some models do not support JSON mode: retry once without it instead of failing.
    if (!jsonMode() || !rejectsJsonMode(error)) throw error;
    const completion = await request(false);
    return completion.choices[0]?.message?.content;
  }
};

/** Streams raw model tokens; resolves with the full text once the stream ends. */
export const streamWithGroq = async (
  prompt: string,
  onToken: (token: string) => void,
  signal?: AbortSignal
): Promise<string> => {
  if (!isGroqConfigured()) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const open = (withJsonMode: boolean) =>
    client().chat.completions.create(
      {
        model: GROQ_MODEL(),
        messages: [{ role: "user", content: prompt }],
        stream: true,
        ...reasoningParams(),
        ...(withJsonMode ? { response_format: { type: "json_object" as const } } : {})
      },
      { signal }
    );

  let stream;
  try {
    stream = await open(jsonMode());
  } catch (error) {
    if (!jsonMode() || !rejectsJsonMode(error)) throw error;
    stream = await open(false);
  }

  let full = "";

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content ?? "";
    if (token) {
      full += token;
      onToken(token);
    }
  }

  return full;
};
