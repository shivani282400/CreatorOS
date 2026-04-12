import { db } from "../plugins/db";
import { autoGenerateMemory } from "./memoryService"; // ✅ NEW IMPORT

type PerformanceInput = {
  views: number;
  likes: number;
  comments: number;
  shares: number;
};

export const markAsPublished = async (calendarId: number, userId: number) => {
  const result = await db.query(
    `UPDATE calendar
     SET status = 'published',
         published_at = NOW()
     WHERE id = $1
       AND content_id IN (
         SELECT id FROM content WHERE user_id = $2
       )
     RETURNING *`,
    [calendarId, userId]
  );

  return result.rows[0] ?? null;
};

export const addPerformance = async (
  calendarId: number,
  userId: number,
  data: PerformanceInput
) => {
  const result = await db.query(
    `UPDATE calendar
     SET views = $3,
         likes = $4,
         comments = $5,
         shares = $6,
         status = 'analyzed'
     WHERE id = $1
       AND content_id IN (
         SELECT id FROM content WHERE user_id = $2
       )
     RETURNING *`,
    [
      calendarId,
      userId,
      data.views,
      data.likes,
      data.comments,
      data.shares
    ]
  );

  const updated = result.rows[0] ?? null;

  if (!updated) {
    return null;
  }

  const engagementScore =
    (data.likes * 2 + data.comments * 3 + data.shares * 4) / Math.max(data.views, 1);

  await db.query(
    `UPDATE memory_embeddings
     SET score = $1
     WHERE user_id = $2
       AND content_id = (
         SELECT content_id FROM calendar WHERE id = $3
       )`,
    [engagementScore, userId, calendarId]
  );

  // 🔥 STEP 4 — AUTO MEMORY TRIGGER (ADDED SAFELY)
  try {
    await autoGenerateMemory(userId);
  } catch (error) {
    console.error("Auto memory generation after performance failed:", error);
  }

  return {
    ...updated,
    engagementScore
  };
};