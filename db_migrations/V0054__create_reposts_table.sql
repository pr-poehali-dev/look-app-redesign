CREATE TABLE IF NOT EXISTS reposts (
  id SERIAL PRIMARY KEY,
  original_video_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (original_video_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reposts_user ON reposts(user_id);
CREATE INDEX IF NOT EXISTS idx_reposts_video ON reposts(original_video_id);