import { db } from "../plugins/db";

export type UserProfile = {
  id: number
  email: string
  password: string
  niche: string | null
  tone: string | null
  platform: string | null
  created_at: string
}

export const createUser = async (email: string, password: string) => {
  const result = await db.query(
    `INSERT INTO users (email, password)
     VALUES ($1, $2)
     RETURNING id, email, niche, tone, platform, created_at`,
    [email, password]
  );

  return result.rows[0];
};

export const findUserByEmail = async (email: string): Promise<UserProfile | null> => {
  const result = await db.query(
    "SELECT * FROM users WHERE email = $1 LIMIT 1",
    [email]
  );

  return result.rows[0] ?? null;
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
