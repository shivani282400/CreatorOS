import Groq from "groq-sdk";

console.log("GROQ KEY:", process.env.GROQ_API_KEY);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export const generateWithGroq = async (prompt: string) => {

  const completion = await groq.chat.completions.create({
    model: "llama3-70b-8192",
    messages: [
      { role: "user", content: prompt }
    ]
  });

  return completion.choices[0].message.content;
};
