CREATE TABLE IF NOT EXISTS push_log (
  id BIGSERIAL PRIMARY KEY,
  user_ids TEXT,
  title TEXT,
  status TEXT,
  response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);