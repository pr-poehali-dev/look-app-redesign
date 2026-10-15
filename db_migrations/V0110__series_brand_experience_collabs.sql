ALTER TABLE t_p96441965_look_app_redesign.videos ADD COLUMN IF NOT EXISTS series_title VARCHAR(100);
ALTER TABLE t_p96441965_look_app_redesign.videos ADD COLUMN IF NOT EXISTS brand VARCHAR(80);
ALTER TABLE t_p96441965_look_app_redesign.videos ADD COLUMN IF NOT EXISTS personal_experience BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_videos_series ON t_p96441965_look_app_redesign.videos(user_id, series_title) WHERE series_title IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_videos_brand ON t_p96441965_look_app_redesign.videos(LOWER(brand)) WHERE brand IS NOT NULL;

CREATE TABLE IF NOT EXISTS t_p96441965_look_app_redesign.brand_collabs (
  id SERIAL PRIMARY KEY,
  brand_user_id TEXT NOT NULL,
  brand_name VARCHAR(80) NOT NULL,
  author_user_id TEXT NOT NULL,
  product_title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  product_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  video_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_collabs_author ON t_p96441965_look_app_redesign.brand_collabs(author_user_id, status);
CREATE INDEX IF NOT EXISTS idx_collabs_brand ON t_p96441965_look_app_redesign.brand_collabs(brand_user_id);