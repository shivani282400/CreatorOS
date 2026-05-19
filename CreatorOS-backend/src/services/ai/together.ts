import OpenAI from "openai";

let together: OpenAI;

export const generateWithTogether = async (prompt: string) => {
  if (!together) {
    together = new OpenAI({
      baseURL: "https://api.together.xyz/v1",
      apiKey: process.env.TOGETHER_API_KEY
    });
  }

  const completion = await together.chat.completions.create({
    model: "meta-llama/Llama-3-70b-chat-hf",
    messages: [
      { role: "user", content: prompt }
    ]
  });

  return completion.choices[0].message.content;
};