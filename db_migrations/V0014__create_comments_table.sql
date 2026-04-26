CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  target_type VARCHAR(20) NOT NULL,
  target_id VARCHAR(100) NOT NULL,
  author_name VARCHAR(100) NOT NULL DEFAULT 'Я',
  author_handle VARCHAR(100),
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_target ON comments(target_type, target_id, created_at DESC);
