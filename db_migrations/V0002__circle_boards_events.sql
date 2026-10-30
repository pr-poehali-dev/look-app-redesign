ALTER TABLE t_p96441965_look_app_redesign.boards ADD COLUMN IF NOT EXISTS community_id TEXT;
CREATE INDEX IF NOT EXISTS idx_boards_community ON t_p96441965_look_app_redesign.boards (community_id);

ALTER TABLE t_p96441965_look_app_redesign.challenges ADD COLUMN IF NOT EXISTS community_id TEXT;

CREATE TABLE IF NOT EXISTS t_p96441965_look_app_redesign.feature_events (
  id SERIAL PRIMARY KEY,
  event VARCHAR(40) NOT NULL,
  user_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_feature_events_event ON t_p96441965_look_app_redesign.feature_events (event, created_at);
