CREATE TABLE IF NOT EXISTS content (
  id SERIAL PRIMARY KEY,
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
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT NOW()
);
