import OpenAI from "openai";

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY
});

export const generateWithOpenRouter = async (prompt: string) => {

  const completion = await openrouter.chat.completions.create({
    model: "meta-llama/llama-3-8b-instruct",
    messages: [
      { role: "user", content: prompt }
    ]
  });

  return completion.choices[0].message.content;
};