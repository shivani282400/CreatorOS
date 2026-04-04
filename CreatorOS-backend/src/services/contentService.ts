import { FastifyInstance } from "fastify";
import { db } from "../plugins/db";
import { storeMemory } from "./memoryService";
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
    `INSERT INTO content (user_id, topic, platform, script, hooks, captions, threads, score, analysis, embedding)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::vector)
     RETURNING *`,
    [
      userId ?? null,
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
      await storeMemory({
        userId,
        contentId: savedContent.id,
        type: "script",
        text: savedContent.script,
        metadata: {
          topic: savedContent.topic,
          platform: savedContent.platform
        },
        score: savedContent.score
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
            score: savedContent.score
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
            score: savedContent.score
          })
        )
      ]);
    } catch (error) {
      console.error("Memory storage failed:", error);
    }
  }

  return savedContent;
};

export const updateContent = async (id: number, data: any) => {
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
      embedding ? toVectorLiteral(embedding) : null
    ]
  );

  return result.rows[0];
};

export const deleteContent = async (id: number) => {

  await db.query("DELETE FROM calendar WHERE content_id = $1", [id]);
  await db.query("DELETE FROM content WHERE id = $1", [id]);
};

export const getContent = async () => {

  const result = await db.query(
    "SELECT * FROM content ORDER BY created_at DESC"
  );

  return result.rows;
};

export const searchContent = async (query: string) => {
  if (!query.trim()) {
    throw new Error("Query required");
  }

  const queryEmbedding = await generateEmbedding(query);

  const result = await db.query(
    `SELECT *,
            embedding <-> $1::vector AS distance
     FROM content
     WHERE embedding IS NOT NULL
     ORDER BY embedding <-> $1::vector
     LIMIT 5`,
    [toVectorLiteral(queryEmbedding)]
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
