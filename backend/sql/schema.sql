CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  description TEXT,
  category TEXT,
  raw_genres TEXT,
  average_rating NUMERIC(3,2),
  ratings_count INTEGER,
  cover_url TEXT,
  small_cover_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE books ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS raw_genres TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2);
ALTER TABLE books ADD COLUMN IF NOT EXISTS ratings_count INTEGER;
ALTER TABLE books ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS small_cover_url TEXT;

CREATE TABLE IF NOT EXISTS user_events (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  rating NUMERIC(2,1) CHECK (rating >= 0 AND rating <= 5),
  event_type TEXT DEFAULT 'view',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_events ALTER COLUMN event_type SET DEFAULT 'view';

CREATE TABLE IF NOT EXISTS book_embeddings (
  book_id TEXT PRIMARY KEY REFERENCES books(id) ON DELETE CASCADE,
  embedding vector(1536) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_book_id ON user_events(book_id);
CREATE INDEX IF NOT EXISTS idx_book_embeddings_cosine ON book_embeddings USING ivfflat (embedding vector_cosine_ops);
