import { FastifyInstance } from "fastify";
import { db } from "../plugins/db";

export const scheduleContent = async (
  app: FastifyInstance,
  contentId: number,
  date: string,
  userId: number
) => {
  const client = (app as FastifyInstance & { pg?: typeof db }).pg ?? db;

  await client.query(
    `
    UPDATE content
    SET user_id = $2
    WHERE id = $1 AND user_id IS NULL
    `,
    [contentId, userId]
  );

  const existing = await client.query(
    "SELECT id FROM calendar WHERE content_id = $1 AND scheduled_date = $2 LIMIT 1",
    [contentId, date]
  );

  if (existing.rows[0]) {
    return existing.rows[0];
  }

  const result = await client.query(
    `INSERT INTO calendar (content_id, scheduled_date, status)
     VALUES ($1,$2,'scheduled')
     RETURNING *`,
    [
      contentId,
      date
    ]
  );

  return result.rows[0];
};

export const getCalendar = async (userId: number) => {

  const result = await db.query(
    `
    SELECT calendar.*, content.topic, content.platform
    FROM calendar
    JOIN content
    ON calendar.content_id = content.id
    WHERE content.user_id = $1
    ORDER BY scheduled_date
    `,
    [userId]
  );

  return result.rows;
};
