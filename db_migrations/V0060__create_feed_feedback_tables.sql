CREATE TABLE IF NOT EXISTS user_hidden_authors (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  author_handle VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(user_id, author_handle)
);

CREATE TABLE IF NOT EXISTS user_video_feedback (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  video_id INTEGER NOT NULL,
  feedback_type VARCHAR(30) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id, feedback_type)
);

CREATE INDEX IF NOT EXISTS idx_hidden_authors_user ON user_hidden_authors(user_id);
CREATE INDEX IF NOT EXISTS idx_video_feedback_user ON user_video_feedback(user_id);
