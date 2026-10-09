ALTER TABLE communities ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'community';

CREATE TABLE IF NOT EXISTS channel_post_views (
  message_id BIGINT NOT NULL,
  user_id TEXT NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS channel_post_reactions (
  message_id BIGINT NOT NULL,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS channel_post_comments (
  id BIGSERIAL PRIMARY KEY,
  message_id BIGINT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_channel_comments_msg ON channel_post_comments(message_id);
CREATE INDEX IF NOT EXISTS idx_channel_reactions_msg ON channel_post_reactions(message_id);