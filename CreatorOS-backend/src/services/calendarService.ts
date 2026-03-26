import { db } from "../plugins/db";

export const scheduleContent = async (contentId: number, date: string) => {

  const existing = await db.query(
    "SELECT id FROM calendar WHERE content_id = $1 AND scheduled_date = $2 LIMIT 1",
    [contentId, date]
  );

  if (existing.rows[0]) {
    return existing.rows[0];
  }

  const result = await db.query(
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

export const getCalendar = async () => {

  const result = await db.query(
    `
    SELECT calendar.*, content.topic, content.platform
    FROM calendar
    JOIN content
    ON calendar.content_id = content.id
    ORDER BY scheduled_date
    `
  );

  return result.rows;
};
