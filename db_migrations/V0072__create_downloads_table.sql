CREATE TABLE IF NOT EXISTS t_p96441965_look_app_redesign.downloads (
  id SERIAL PRIMARY KEY,
  target_type VARCHAR(20) NOT NULL,
  target_id VARCHAR(100) NOT NULL,
  user_id VARCHAR(100) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_downloads_target ON t_p96441965_look_app_redesign.downloads (target_type, target_id);