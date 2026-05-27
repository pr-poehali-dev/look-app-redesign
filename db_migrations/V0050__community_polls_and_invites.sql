CREATE TABLE IF NOT EXISTS community_polls (
  id BIGSERIAL PRIMARY KEY,
  community_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT,
  question TEXT NOT NULL,
  is_multi BOOLEAN DEFAULT FALSE,
  is_anonymous BOOLEAN DEFAULT FALSE,
  is_closed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_polls_community ON community_polls(community_id);

CREATE TABLE IF NOT EXISTS community_poll_options (
  id BIGSERIAL PRIMARY KEY,
  poll_id BIGINT NOT NULL,
  text TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_community_poll_options_poll ON community_poll_options(poll_id);

CREATE TABLE IF NOT EXISTS community_poll_votes (
  poll_id BIGINT NOT NULL,
  option_id BIGINT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (poll_id, option_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_poll_votes_poll ON community_poll_votes(poll_id);

CREATE TABLE IF NOT EXISTS community_invites (
  token TEXT PRIMARY KEY,
  community_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_community_invites_community ON community_invites(community_id);
