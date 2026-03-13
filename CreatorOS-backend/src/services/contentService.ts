import { db } from "../plugins/db";

export const saveContent = async (data: any) => {

  const result = await db.query(
    `INSERT INTO content (topic, platform, script, hooks, captions, threads)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [
      data.topic,
      data.platform,
      data.script,
      data.hooks,
      data.captions,
      data.threads
    ]
  );

  return result.rows[0];
};

export const getContent = async () => {

  const result = await db.query(
    "SELECT * FROM content ORDER BY created_at DESC"
  );

  return result.rows;
};
