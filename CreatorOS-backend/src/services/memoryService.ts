import { db } from "../plugins/db";
import { generateEmbedding } from "../utils/embedding";

type MemoryType = "script" | "hook" | "caption";

type StoreMemoryInput = {
  userId: number;
  contentId?: number | null;
  type: MemoryType;
  text: string;
  metadata?: Record<string, unknown> | null;
  score?: number | null;
};

type RetrieveMemoryInput = {
  userId: number;
  query: string;
  type?: MemoryType;
  limit?: number;
};

const toVectorLiteral = (embedding: number[]) => `[${embedding.join(",")}]`;

export const storeMemory = async ({
  userId,
  contentId = null,
  type,
  text,
  metadata = null,
  score = null
}: StoreMemoryInput) => {
  const embedding = await generateEmbedding(text);

  const result = await db.query(
    `INSERT INTO memory_embeddings (user_id, content_id, type, text, embedding, score, metadata)
     VALUES ($1, $2, $3, $4, $5::vector, $6, $7)
     RETURNING *`,
    [
      userId,
      contentId,
      type,
      text,
      toVectorLiteral(embedding),
      score,
      metadata ? JSON.stringify(metadata) : null
    ]
  );

  return result.rows[0];
};

export const retrieveMemory = async ({
  userId,
  query,
  type,
  limit = 5
}: RetrieveMemoryInput) => {
  const queryEmbedding = await generateEmbedding(query);

  const vectorLiteral = toVectorLiteral(queryEmbedding);

  const result = await db.query(
    `
    SELECT id, text, type, metadata, score
    FROM memory_embeddings
    WHERE user_id = $1
      AND embedding IS NOT NULL
      ${type ? "AND type = $2" : ""}
    ORDER BY (embedding <-> $${type ? 3 : 2}::vector) - (COALESCE(score, 0) * 0.01)
    LIMIT ${limit}
    `,
    type
      ? [userId, type, vectorLiteral]
      : [userId, vectorLiteral]
  );

  return result.rows;
};

export const retrieveContextBundle = async (_app: unknown, userId: number, query: string) => {
  const [scripts, hooks, captions] = await Promise.all([
    retrieveMemory({ userId, query, type: "script", limit: 3 }),
    retrieveMemory({ userId, query, type: "hook", limit: 3 }),
    retrieveMemory({ userId, query, type: "caption", limit: 3 })
  ]);

  return {
    scripts,
    hooks,
    captions
  };
};
