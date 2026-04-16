export const generateEmbedding = async (text: string): Promise<number[]> => {
  const providers = [
    {
      name: "OpenAI",
      url: "https://api.openai.com/v1/embeddings",
      key: process.env.OPENAI_API_KEY,
      model: "text-embedding-3-small"
    },
    {
      name: "OpenRouter",
      url: "https://openrouter.ai/api/v1/embeddings",
      key: process.env.OPENROUTER_API_KEY,
      model: "openai/text-embedding-3-small"
    }
  ];

  let lastError: any = null;

  for (const provider of providers) {
    if (!provider.key) {
      console.warn(`[embedding] ${provider.name} key missing, skipping...`);
      continue;
    }

    try {
      const response = await fetch(provider.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${provider.key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://creatoros.ai", // Required for OpenRouter
          "X-Title": "CreatorOS"
        },
        body: JSON.stringify({
          input: text,
          model: provider.model
        })
      });

      const data = await response.json();

      if (!response.ok || !data?.data?.[0]?.embedding) {
        const apiError = data?.error?.message || "extraction failed";
        throw new Error(`${provider.name} error: ${apiError}`);
      }

      console.info(`[embedding] successfully generated using ${provider.name}`);
      return data.data[0].embedding as number[];
    } catch (error: any) {
      console.error(`[embedding] ${provider.name} failed:`, error);
      lastError = error;
    }
  }

  throw new Error(
    lastError?.message || "No embedding providers configured. Please check OPENAI_API_KEY or OPENROUTER_API_KEY in your environment variables."
  );
};


