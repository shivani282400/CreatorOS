import { db } from "../plugins/db";
import { storeBrandMemory } from "./memoryService";

export type UserProfile = {
  id: number
  email: string
  password: string | null
  niche: string | null
  tone: string | null
  platform: string | null
  created_at: string
}

export const createUser = async (email: string, password: string | null = null) => {
  const result = await db.query(
    `INSERT INTO users (email, password)
     VALUES ($1, $2)
     RETURNING id, email, niche, tone, platform, created_at`,
    [email.trim().toLowerCase(), password]
  );

  const user = result.rows[0];

  try {
    await storeBrandMemory(user);
  } catch (error) {
    console.error("Brand memory storage failed:", error);
  }

  return user;
};

/**
 * Case-insensitive lookup so accounts created before emails were normalised
 * (e.g. "Shivani@Gmail.com") are still found instead of being duplicated.
 */
export const findUserByEmail = async (email: string): Promise<UserProfile | null> => {
  const result = await db.query(
    "SELECT * FROM users WHERE LOWER(email) = LOWER($1) ORDER BY id ASC LIMIT 1",
    [email.trim()]
  );

  const user = result.rows[0] ?? null;

  if (user) {
    // Refresh the brand embedding in the background so login is never blocked
    // (or broken) by a slow or unavailable embedding provider.
    void storeBrandMemory(user).catch((error) => {
      console.error("Brand memory storage failed:", error instanceof Error ? error.message : error);
    });
  }

  return user;
};

export const setUserPassword = async (id: number, passwordHash: string) => {
  await db.query("UPDATE users SET password = $2 WHERE id = $1", [id, passwordHash]);
};

export const getUserById = async (id: number): Promise<UserProfile | null> => {
  const result = await db.query(
    "SELECT * FROM users WHERE id = $1 LIMIT 1",
    [id]
  );

  return result.rows[0] ?? null;
};

export const updateUserProfile = async (
  id: number,
  data: {
    niche?: string
    tone?: string
    platform?: string
  }
) => {
  const result = await db.query(
    `UPDATE users
     SET niche = $2,
         tone = $3,
         platform = $4
     WHERE id = $1
     RETURNING id, email, niche, tone, platform, created_at`,
    [
      id,
      data.niche ?? null,
      data.tone ?? null,
      data.platform ?? null
    ]
  );

  return result.rows[0] ?? null;
};
