import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL ?? "";

/**
 * SSL is on for hosted databases (Supabase, Neon, Render) and off for localhost.
 * Override explicitly with DATABASE_SSL=true|false.
 */
const resolveSsl = () => {
  const forced = process.env.DATABASE_SSL?.toLowerCase();
  if (forced === "true") return { rejectUnauthorized: false };
  if (forced === "false") return false;

  const isLocal = /@(localhost|127\.0\.0\.1)(:|\/|$)/.test(databaseUrl);
  if (isLocal) return false;

  const wantsSsl =
    process.env.NODE_ENV === "production" ||
    /supabase|neon\.tech|sslmode=require/i.test(databaseUrl);

  return wantsSsl ? { rejectUnauthorized: false } : false;
};

export const db = new Pool({
  connectionString: databaseUrl || undefined,
  ssl: resolveSsl(),
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  keepAlive: true
});

// Hosted Postgres (Supabase free tier especially) drops idle connections.
// The pool replaces them automatically, so log the error instead of killing the server.
db.on("error", (err) => {
  console.error("[db] idle client error (pool will reconnect):", err.message);
});

export const pingDatabase = async () => {
  await db.query("SELECT 1");
};

const schemaSql = `
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS content (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  parent_id INTEGER,
  topic TEXT,
  platform TEXT,
  script TEXT,
  hooks TEXT[],
  captions TEXT[],
  threads TEXT[],
  score INTEGER,
  analysis JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendar (
  id SERIAL PRIMARY KEY,
  content_id INTEGER,
  scheduled_date DATE,
  published_at TIMESTAMP,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  niche TEXT,
  tone TEXT,
  platform TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

CREATE TABLE IF NOT EXISTS auth_otps (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts SMALLINT NOT NULL DEFAULT 0,
  verified_at TIMESTAMPTZ,
  invalidated_at TIMESTAMPTZ,
  request_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_otps_email_created
ON auth_otps (email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_otps_ip_created
ON auth_otps (request_ip, created_at DESC);

CREATE TABLE IF NOT EXISTS auth_refresh_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_refresh_sessions_token
ON auth_refresh_sessions (token_hash);

ALTER TABLE content ADD COLUMN IF NOT EXISTS score INTEGER;
ALTER TABLE content ADD COLUMN IF NOT EXISTS analysis JSONB;
ALTER TABLE content ADD COLUMN IF NOT EXISTS embedding VECTOR(1536);
ALTER TABLE content ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE content ADD COLUMN IF NOT EXISTS parent_id INTEGER;
ALTER TABLE calendar ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;
ALTER TABLE calendar ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
ALTER TABLE calendar ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
ALTER TABLE calendar ADD COLUMN IF NOT EXISTS comments INTEGER DEFAULT 0;
ALTER TABLE calendar ADD COLUMN IF NOT EXISTS shares INTEGER DEFAULT 0;
ALTER TABLE calendar ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled';

CREATE TABLE IF NOT EXISTS memory_embeddings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  content_id INTEGER,
  type TEXT NOT NULL,
  text TEXT NOT NULL,
  embedding VECTOR(1536),
  score FLOAT,
  metadata JSONB,
  style JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE memory_embeddings ADD COLUMN IF NOT EXISTS style JSONB;

CREATE INDEX IF NOT EXISTS idx_memory_user
ON memory_embeddings(user_id);

CREATE INDEX IF NOT EXISTS idx_memory_user_type
ON memory_embeddings(user_id, type);

CREATE INDEX IF NOT EXISTS idx_content_user_created
ON content(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_calendar_content
ON calendar(content_id);

CREATE INDEX IF NOT EXISTS idx_users_email_lower
ON users (LOWER(email));

CREATE INDEX IF NOT EXISTS memory_embedding_idx
ON memory_embeddings
USING hnsw (embedding vector_cosine_ops);
`;

let initPromise: Promise<void> | null = null;

export const initDatabase = async (): Promise<void> => {
  if (!initPromise) {
    initPromise = db.query(schemaSql).then(() => {
      console.info("[db] connection initialized and schema ensured");
      return undefined;
    });
  }

  return initPromise;
};
