import { FastifyInstance } from "fastify";
import { db } from "../plugins/db";
import { extractStyleFeatures, storeMemory, autoGenerateMemory } from "./memoryService";
import { generateEmbedding } from "../utils/embedding";

const toVectorLiteral = (embedding: number[]) => `[${embedding.join(",")}]`;

export const saveContent = async (data: any, userId?: number) => {
  let embedding: number[] | null = null;

  try {
    embedding = await generateEmbedding(data.script);
  } catch (error) {
    console.error("Content embedding generation failed:", error);
  }

  const result = await db.query(
    `INSERT INTO content (user_id, parent_id, topic, platform, script, hooks, captions, threads, score, analysis, embedding)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::vector)
     RETURNING *`,
    [
      userId ?? null,
      data.parent_id ?? null,
      data.topic,
      data.platform,
      data.script,
      data.hooks,
      data.captions,
      data.threads,
      data.score,
      data.analysis ? JSON.stringify(data.analysis) : null,
      embedding ? toVectorLiteral(embedding) : null
    ]
  );

  const savedContent = result.rows[0];

  if (userId) {
    try {
      const style = extractStyleFeatures(savedContent);

      await storeMemory({
        userId,
        contentId: savedContent.id,
        type: "script",
        text: savedContent.script,
        metadata: {
          topic: savedContent.topic,
          platform: savedContent.platform
        },
        score: savedContent.score,
        style
      });

      await Promise.all([
        ...(savedContent.hooks ?? []).map((hook: string, index: number) =>
          storeMemory({
            userId,
            contentId: savedContent.id,
            type: "hook",
            text: hook,
            metadata: {
              topic: savedContent.topic,
              platform: savedContent.platform,
              index
            },
            score: savedContent.score,
            style
          })
        ),
        ...(savedContent.captions ?? []).map((caption: string, index: number) =>
          storeMemory({
            userId,
            contentId: savedContent.id,
            type: "caption",
            text: caption,
            metadata: {
              topic: savedContent.topic,
              platform: savedContent.platform,
              index
            },
            score: savedContent.score,
            style
          })
        )
      ]);
    } catch (error) {
      console.error("Memory storage failed:", error);
    }
  }

  if (userId) {
    try {
      await autoGenerateMemory(userId);
    } catch (error) {
      console.error("Auto memory generation failed:", error);
    }
  }

  return savedContent;
};

export const updateContent = async (id: number, data: any, userId?: number) => {
  let embedding: number[] | null = null;

  try {
    embedding = await generateEmbedding(data.script);
  } catch (error) {
    console.error("Content embedding generation failed:", error);
  }

  const result = await db.query(
    `UPDATE content
     SET topic = $2,
         platform = $3,
         script = $4,
         hooks = $5,
         captions = $6,
         threads = $7,
         score = $8,
         analysis = $9,
         embedding = $10::vector
     WHERE id = $1
       ${userId ? "AND user_id = $11" : ""}
     RETURNING *`,
    [
      id,
      data.topic,
      data.platform,
      data.script,
      data.hooks,
      data.captions,
      data.threads,
      data.score,
      data.analysis ? JSON.stringify(data.analysis) : null,
      embedding ? toVectorLiteral(embedding) : null,
      ...(userId ? [userId] : [])
    ]
  );

  return result.rows[0];
};

export const deleteContent = async (id: number, userId: number) => {
  await db.query(
    `DELETE FROM calendar
     WHERE content_id = $1
       AND content_id IN (
         SELECT id FROM content WHERE id = $1 AND user_id = $2
       )`,
    [id, userId]
  );

  const result = await db.query(
    "DELETE FROM content WHERE id = $1 AND user_id = $2 RETURNING id",
    [id, userId]
  );

  return result.rows[0] ?? null;
};

export const getContent = async (userId: number) => {

  const result = await db.query(
    "SELECT * FROM content WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );

  return result.rows;
};

export const searchContent = async (query: string, userId: number) => {
  if (!query.trim()) {
    throw new Error("Query required");
  }

  const queryEmbedding = await generateEmbedding(query);

  const result = await db.query(
    `SELECT *,
            embedding <=> $1::vector AS distance
     FROM content
     WHERE embedding IS NOT NULL
       AND user_id = $2
     ORDER BY embedding <=> $1::vector
     LIMIT 5`,
    [toVectorLiteral(queryEmbedding), userId]
  );

  return result.rows;
};

export const getUploadedContent = async (app: FastifyInstance, userId: number) => {
  const client = (app as FastifyInstance & { pg?: typeof db }).pg ?? db;

  const result = await client.query(
    `SELECT
        c.*,
        cal.id AS calendar_id,
        cal.scheduled_date,
        cal.views,
        cal.likes,
        cal.comments,
        cal.shares
     FROM content c
     JOIN calendar cal ON c.id = cal.content_id
     WHERE c.user_id = $1
       AND cal.scheduled_date <= CURRENT_DATE
     ORDER BY cal.scheduled_date DESC`,
    [userId]
  );

  return result.rows;
};

export const getTopPerformingContent = async (userId: number) => {
  const result = await db.query(
    `SELECT c.*, cal.likes, cal.comments, cal.shares
     FROM content c
     JOIN calendar cal ON c.id = cal.content_id
     WHERE c.user_id = $1
       AND cal.status = 'analyzed'
     ORDER BY (cal.likes + cal.comments * 2 + cal.shares * 3) DESC
     LIMIT 5`,
    [userId]
  );

  return result.rows;
};

export const getContentById = async (id: number, userId: number) => {
  const result = await db.query(
    "SELECT * FROM content WHERE id = $1 AND user_id = $2 LIMIT 1",
    [id, userId]
  );

  return result.rows[0] ?? null;
};
