import { db } from "../plugins/db";
import { generateEmbedding } from "../utils/embedding";
import { generateAI } from "./ai/aiService";

type MemoryType = "script" | "hook" | "caption" | "brand" | "summary";

type BrandMemoryUser = {
  id: number;
  niche?: string | null;
  tone?: string | null;
  platform?: string | null;
  audience?: string | null;
  style?: string | null;
};

export type StyleFeatures = {
  hook_type: "question" | "bold statement" | "emotional" | "curiosity gap";
  caption_length: "short" | "medium" | "long";
  tone: "motivational" | "educational" | "storytelling" | "promotional";
  structure: "list" | "story" | "punchline" | "mixed";
};

type StyleContent = {
  script?: string | null;
  hooks?: string[] | null;
  captions?: string[] | null;
};

type StoreMemoryInput = {
  userId: number;
  contentId?: number | null;
  type: MemoryType;
  text: string;
  metadata?: Record<string, unknown> | null;
  score?: number | null;
  style?: StyleFeatures | null;
};

type RetrieveMemoryInput = {
  userId: number;
  query: string;
  type?: MemoryType;
  limit?: number;
};

const toVectorLiteral = (embedding: number[]) => `[${embedding.join(",")}]`;

const includesAny = (value: string, keywords: string[]) => {
  const normalized = value.toLowerCase();

  return keywords.some((keyword) => normalized.includes(keyword));
};

export const shouldGenerateSummary = async (userId: number): Promise<boolean> => {
  // 1. Count total content
  const countResult = await db.query(
    `SELECT COUNT(*) FROM content WHERE user_id = $1`,
    [userId]
  );

  const count = Number(countResult.rows[0]?.count ?? 0);

  // Not enough data → skip
  if (count < 5) {
    return false;
  }

  // 2. Get last summary timestamp
  const summaryResult = await db.query(
    `
    SELECT created_at
    FROM memory_embeddings
    WHERE user_id = $1 AND type = 'summary'
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [userId]
  );

  // No summary exists → generate
  if (!summaryResult.rows.length) {
    return true;
  }

  const lastCreatedAt = summaryResult.rows[0].created_at;

  // 3. Check if older than 24 hours
  const hours =
    (Date.now() - new Date(lastCreatedAt).getTime()) / (1000 * 60 * 60);

  if (hours > 24) {
    return true;
  }

  return false;
};

export const autoGenerateMemory = async (userId: number) => {
  if (await shouldGenerateSummary(userId)) {
    await generateMemorySummary(userId);
  }
};


export const extractStyleFeatures = (content: StyleContent): StyleFeatures => {
  const script = content.script ?? "";
  const hooks = content.hooks ?? [];
  const captions = content.captions ?? [];
  const primaryHook = hooks[0] ?? "";
  const captionText = captions.join(" ");
  const combinedText = `${primaryHook} ${script} ${captionText}`;

  const hook_type: StyleFeatures["hook_type"] = primaryHook.includes("?")
    ? "question"
    : includesAny(primaryHook, ["you need to", "stop", "never", "must", "truth"])
      ? "bold statement"
      : includesAny(primaryHook, ["feel", "love", "hate", "fear", "dream", "pain", "secret"])
        ? "emotional"
        : "curiosity gap";

  const captionLength = captionText.length;
  const caption_length: StyleFeatures["caption_length"] =
    captionLength < 100 ? "short" : captionLength <= 300 ? "medium" : "long";

  const tone: StyleFeatures["tone"] = includesAny(combinedText, [
    "buy",
    "offer",
    "sale",
    "launch",
    "product",
    "sign up"
  ])
    ? "promotional"
    : includesAny(combinedText, ["how to", "tips", "learn", "guide", "mistake", "step"])
      ? "educational"
      : includesAny(combinedText, ["i ", "my ", "when i", "story", "remember", "once"])
        ? "storytelling"
        : "motivational";

  const structure: StyleFeatures["structure"] = /\b(1\.|2\.|3\.|first|second|third|steps?|tips?)\b/i.test(script)
    ? "list"
    : includesAny(script, ["then", "one day", "when i", "after that", "before i"])
      ? "story"
      : script.length < 220 || includesAny(script, ["punchline", "plot twist", "turns out"])
        ? "punchline"
        : "mixed";

  return {
    hook_type,
    caption_length,
    tone,
    structure
  };
};

export const storeMemory = async ({
  userId,
  contentId = null,
  type,
  text,
  metadata = null,
  score = null,
  style = null
}: StoreMemoryInput) => {
  const embedding = await generateEmbedding(text);

  const result = await db.query(
    `INSERT INTO memory_embeddings (user_id, content_id, type, text, embedding, score, metadata, style)
     VALUES ($1, $2, $3, $4, $5::vector, $6, $7, $8)
     RETURNING *`,
    [
      userId,
      contentId,
      type,
      text,
      toVectorLiteral(embedding),
      score,
      metadata ? JSON.stringify(metadata) : null,
      style ? JSON.stringify(style) : null
    ]
  );

  return result.rows[0];
};

export const storeBrandMemory = async (user: BrandMemoryUser) => {
  const brandText = `
Creator Profile:
Niche: ${user.niche || "general"}
Tone: ${user.tone || "educational"}
Platform: ${user.platform || "YouTube"}
Audience: ${user.audience || "general audience"}
Style: ${user.style || "engaging and clear"}
`.trim();

  const embedding = await generateEmbedding(brandText);

  await db.query(
    "DELETE FROM memory_embeddings WHERE user_id = $1 AND type = 'brand'",
    [user.id]
  );

  const result = await db.query(
    `INSERT INTO memory_embeddings (user_id, content_id, type, text, embedding, score, metadata, style)
     VALUES ($1, NULL, 'brand', $2, $3::vector, 1, $4, NULL)
     RETURNING *`,
    [
      user.id,
      brandText,
      toVectorLiteral(embedding),
      JSON.stringify({
        niche: user.niche ?? null,
        tone: user.tone ?? null,
        platform: user.platform ?? null,
        audience: user.audience ?? "general audience",
        style: user.style ?? "engaging and clear"
      })
    ]
  );

  return result.rows[0];
};

export const retrieveBrandMemory = async (userId: number) => {
  const result = await db.query(
    `
    SELECT id, text, type, metadata, score, style
    FROM memory_embeddings
    WHERE user_id = $1 AND type = 'brand'
    LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] ?? null;
};

export const generateMemorySummary = async (userId: number) => {
  const contentResult = await db.query(
    `
    SELECT script, hooks, captions, score
    FROM content
    WHERE user_id = $1
    ORDER BY score DESC
    LIMIT 20
    `,
    [userId]
  );

  if (!contentResult.rows.length) {
    return null;
  }

  console.info("[memory] generating summary", {
    userId,
    sourceCount: contentResult.rows.length
  });

  const contentList = contentResult.rows
    .map((item, index) => {
      return `
Content ${index + 1}
Score: ${item.score ?? 0}
Script: ${item.script ?? ""}
Hooks: ${(item.hooks ?? []).join(" | ")}
Captions: ${(item.captions ?? []).join(" | ")}
`.trim();
    })
    .join("\n\n");

  const prompt = `
Analyze the following content and summarize:

1. Writing style
2. Hook patterns
3. Tone
4. Content structure
5. What performs well

Content:
${contentList}

Return ONLY valid JSON matching this schema:
{
  "script": "structured text summary of the creator memory insights",
  "hooks": [],
  "captions": [],
  "threads": [],
  "score": 0,
  "analysis": {
    "hook_strength": 0,
    "emotional_intensity": 0,
    "engagement": 0,
    "structure": 0,
    "platform_fit": 0,
    "summary": "short summary",
    "improvements": ["one useful improvement"]
  }
}

Rules:
- Put the full memory summary in script.
- No markdown.
- No text outside JSON.
`;

  const aiResponse = await generateAI(prompt);
  const summary = aiResponse.script;

  const embedding = await generateEmbedding(summary);

  const averageScore =
    contentResult.rows.reduce((total, item) => total + Number(item.score ?? 0), 0) /
    contentResult.rows.length;

  // ✅ STEP 5 — GET STYLE INSIGHTS
  const style = await getDominantStyle(userId);

  await db.query(
    "DELETE FROM memory_embeddings WHERE user_id = $1 AND type = 'summary'",
    [userId]
  );

  const result = await db.query(
    `INSERT INTO memory_embeddings (user_id, content_id, type, text, embedding, score, metadata, style)
     VALUES ($1, NULL, 'summary', $2, $3::vector, $4, $5, $6)
     RETURNING *`,
    [
      userId,
      summary,
      toVectorLiteral(embedding),
      averageScore,
      JSON.stringify({
        source_count: contentResult.rows.length,
        generated_at: new Date().toISOString()
      }),
      JSON.stringify(style) // ✅ STEP 6 — STORE STYLE
    ]
  );

  // ✅ STEP 5 — RETURN BOTH
  console.info("[memory] summary generated", {
    userId,
    averageScore
  });

  return {
    ...result.rows[0],
    style
  };
};

export const retrieveMemorySummary = async (userId: number) => {
  const result = await db.query(
    `
    SELECT id, text, type, metadata, score, style
    FROM memory_embeddings
    WHERE user_id = $1 AND type = 'summary'
    LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] ?? null;
};

export const retrieveMemory = async ({
  userId,
  query,
  type,
  limit = 5
}: RetrieveMemoryInput) => {
  const safeLimit = Math.min(Math.max(limit, 5), 10);
  const queryEmbedding = await generateEmbedding(query);

  const vectorLiteral = toVectorLiteral(queryEmbedding);

  const result = await db.query(
    `
    SELECT id, text, type, metadata, score, style
    FROM memory_embeddings
    WHERE user_id = $1
      AND embedding IS NOT NULL
      ${type ? "AND type = $2" : ""}
    ORDER BY (embedding <=> $${type ? 3 : 2}::vector) - (COALESCE(score, 0) * 0.01)
    LIMIT ${safeLimit}
    `,
    type
      ? [userId, type, vectorLiteral]
      : [userId, vectorLiteral]
  );

  console.info("[memory] retrieved", {
    userId,
    type: type ?? "all",
    queryLength: query.length,
    count: result.rows.length
  });

  return result.rows;
};

const getMostCommon = <T extends string>(values: T[], fallback: T): T => {
  if (!values.length) {
    return fallback;
  }

  const counts = values.reduce<Record<string, number>>((accumulator, value) => {
    accumulator[value] = (accumulator[value] ?? 0) + 1;
    return accumulator;
  }, {});

  return values.reduce((best, value) => (counts[value] > counts[best] ? value : best), values[0]);
};

export const getDominantStyle = async (userId: number): Promise<StyleFeatures> => {
  const result = await db.query(
    `
    SELECT style
    FROM memory_embeddings
    WHERE user_id = $1
      AND type = 'script'
      AND style IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 20
    `,
    [userId]
  );

  const styles = result.rows
    .map((row) => row.style as Partial<StyleFeatures> | null)
    .filter((style): style is Partial<StyleFeatures> => Boolean(style));

  return {
    hook_type: getMostCommon(
      styles.map((style) => style.hook_type).filter(Boolean) as StyleFeatures["hook_type"][],
      "curiosity gap"
    ),
    caption_length: getMostCommon(
      styles.map((style) => style.caption_length).filter(Boolean) as StyleFeatures["caption_length"][],
      "medium"
    ),
    tone: getMostCommon(
      styles.map((style) => style.tone).filter(Boolean) as StyleFeatures["tone"][],
      "educational"
    ),
    structure: getMostCommon(
      styles.map((style) => style.structure).filter(Boolean) as StyleFeatures["structure"][],
      "mixed"
    )
  };
};

export const retrieveContextBundle = async (_app: unknown, userId: number, query: string) => {
  const [scripts, hooks, captions, brand, style, summary] = await Promise.all([
    retrieveMemory({ userId, query, type: "script", limit: 3 }),
    retrieveMemory({ userId, query, type: "hook", limit: 3 }),
    retrieveMemory({ userId, query, type: "caption", limit: 3 }),
    retrieveBrandMemory(userId),
    getDominantStyle(userId),
    retrieveMemorySummary(userId)
  ]);

  return {
    brand,
    style,
    summary,
    scripts,
    hooks,
    captions
  };
};
