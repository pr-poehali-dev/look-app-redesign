CREATE TABLE IF NOT EXISTS video_views (
  id SERIAL PRIMARY KEY,
  video_id INTEGER NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  watch_seconds NUMERIC NOT NULL DEFAULT 0,
  duration NUMERIC NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  repeat_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_views_user ON video_views(user_id);
CREATE INDEX IF NOT EXISTS idx_video_views_video ON video_views(video_id);
CREATE INDEX IF NOT EXISTS idx_video_views_user_video ON video_views(user_id, video_id);
