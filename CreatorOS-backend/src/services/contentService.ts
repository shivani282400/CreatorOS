import { db } from "../plugins/db";
import { generateEmbedding } from "../utils/embedding";

const toVectorLiteral = (embedding: number[]) => `[${embedding.join(",")}]`;

export const saveContent = async (data: any) => {
  const embedding = await generateEmbedding(data.script);

  const result = await db.query(
    `INSERT INTO content (topic, platform, script, hooks, captions, threads, score, analysis, embedding)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::vector)
     RETURNING *`,
    [
      data.topic,
      data.platform,
      data.script,
      data.hooks,
      data.captions,
      data.threads,
      data.score,
      data.analysis ? JSON.stringify(data.analysis) : null,
      toVectorLiteral(embedding)
    ]
  );

  return result.rows[0];
};

export const updateContent = async (id: number, data: any) => {
  const embedding = await generateEmbedding(data.script);

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
      toVectorLiteral(embedding)
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
