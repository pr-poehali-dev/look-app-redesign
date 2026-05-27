ALTER TABLE community_members
  ADD COLUMN IF NOT EXISTS can_invite BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS can_pin BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_remove_messages BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_ban BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_change_info BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_add_admins BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS custom_title TEXT,
  ADD COLUMN IF NOT EXISTS promoted_by TEXT,
  ADD COLUMN IF NOT EXISTS promoted_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS community_members_unique_idx ON community_members(community_id, user_id);

CREATE TABLE IF NOT EXISTS community_pinned_messages (
  id BIGSERIAL PRIMARY KEY,
  community_id TEXT NOT NULL,
  message_id BIGINT NOT NULL,
  pinned_by TEXT NOT NULL,
  pinned_by_name TEXT,
  pinned_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_community_pinned_community ON community_pinned_messages(community_id, active);

CREATE TABLE IF NOT EXISTS community_bans (
  community_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT,
  banned_by TEXT NOT NULL,
  banned_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,
  PRIMARY KEY (community_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_community_bans_community ON community_bans(community_id);

CREATE TABLE IF NOT EXISTS community_admin_log (
  id BIGSERIAL PRIMARY KEY,
  community_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_name TEXT,
  action TEXT NOT NULL,
  target_id TEXT,
  target_name TEXT,
  payload TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_community_admin_log_community ON community_admin_log(community_id, created_at DESC);

UPDATE community_members AS cm
SET role = 'owner',
    can_invite = TRUE,
    can_pin = TRUE,
    can_remove_messages = TRUE,
    can_ban = TRUE,
    can_change_info = TRUE,
    can_add_admins = TRUE
FROM communities AS c
WHERE c.id = cm.community_id
  AND cm.user_id = c.creator_id
  AND cm.role IN ('admin', 'member');
