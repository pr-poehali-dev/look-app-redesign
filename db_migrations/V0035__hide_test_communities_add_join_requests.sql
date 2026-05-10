ALTER TABLE communities ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE communities
SET is_hidden = TRUE
WHERE name ILIKE '%[seed]%'
   OR name ILIKE '%[удалено]%'
   OR name ILIKE '%тест%'
   OR name ILIKE '%test%'
   OR name = '111'
   OR id IN ('com_c7303b9e', 'comm_1d320ac2');

UPDATE sa_chats
SET name = '__merged__'
WHERE id IN (SELECT id FROM communities WHERE is_hidden = TRUE);

CREATE TABLE IF NOT EXISTS community_join_requests (
  id BIGSERIAL PRIMARY KEY,
  community_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  decided_by TEXT,
  UNIQUE (community_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_join_requests_community ON community_join_requests(community_id, status);
CREATE INDEX IF NOT EXISTS idx_join_requests_user ON community_join_requests(user_id, status);