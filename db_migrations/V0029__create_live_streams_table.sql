CREATE TABLE IF NOT EXISTS live_streams (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL DEFAULT '',
  user_avatar TEXT DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  category TEXT DEFAULT 'Общее',
  thumb TEXT DEFAULT '',
  tags TEXT DEFAULT '',
  status VARCHAR(20) DEFAULT 'active',
  viewers INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  heartbeat_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_streams_status ON live_streams(status, heartbeat_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_streams_user ON live_streams(user_id);
