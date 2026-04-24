
CREATE TABLE IF NOT EXISTS sa_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  online_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sa_chats (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'personal',
  name TEXT,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sa_chat_members (
  chat_id TEXT REFERENCES sa_chats(id),
  user_id TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS sa_messages (
  id BIGSERIAL PRIMARY KEY,
  chat_id TEXT REFERENCES sa_chats(id),
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sa_signaling (
  id BIGSERIAL PRIMARY KEY,
  room_id TEXT NOT NULL,
  from_user TEXT NOT NULL,
  to_user TEXT NOT NULL,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sa_messages_chat ON sa_messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sa_signaling_room ON sa_signaling(room_id, created_at);
