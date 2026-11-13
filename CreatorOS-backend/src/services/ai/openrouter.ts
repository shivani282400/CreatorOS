import OpenAI from "openai";

let openrouter: OpenAI | undefined;

export const OPENROUTER_MODEL = () => process.env.OPENROUTER_MODEL || "openai/gpt-oss-120b:free";

export const isOpenRouterConfigured = () => Boolean(process.env.OPENROUTER_API_KEY);

export const generateWithOpenRouter = async (prompt: string) => {
  if (!isOpenRouterConfigured()) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  if (!openrouter) {
    openrouter = new OpenAI({
      baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      timeout: Number(process.env.AI_TIMEOUT_MS || 60_000),
      maxRetries: 1
    });
  }

  const completion = await openrouter.chat.completions.create({
    model: OPENROUTER_MODEL(),
    messages: [{ role: "user", content: prompt }]
  });

  return completion.choices[0]?.message?.content;
};
