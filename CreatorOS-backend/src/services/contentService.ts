import { db } from "../plugins/db";

export const saveContent = async (data: any) => {

  const result = await db.query(
    `INSERT INTO content (topic, platform, script, hooks, captions, threads, score, analysis)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      data.topic,
      data.platform,
      data.script,
      data.hooks,
      data.captions,
      data.threads,
      data.score,
      data.analysis ? JSON.stringify(data.analysis) : null
    ]
  );

  return result.rows[0];
};

export const updateContent = async (id: number, data: any) => {

  const result = await db.query(
    `UPDATE content
     SET topic = $2,
         platform = $3,
         script = $4,
         hooks = $5,
         captions = $6,
         threads = $7,
         score = $8,
         analysis = $9
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
      data.analysis ? JSON.stringify(data.analysis) : null
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
