import { db } from "../plugins/db";

export const scheduleContent = async (data: any) => {

  const result = await db.query(
    `INSERT INTO calendar (content_id, scheduled_date)
     VALUES ($1,$2)
     RETURNING *`,
    [
      data.content_id,
      data.scheduled_date
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