export const generateEmbedding = async (text: string): Promise<number[]> => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      input: text,
      model: "text-embedding-3-small"
    })
  });

  const data = await response.json();

  if (!response.ok || !data?.data?.[0]?.embedding) {
    throw new Error(data?.error?.message || "Embedding generation failed");
  }

  return data.data[0].embedding as number[];
};
