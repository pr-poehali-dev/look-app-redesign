CREATE INDEX IF NOT EXISTS idx_sa_chat_members_user ON sa_chat_members (user_id);
CREATE INDEX IF NOT EXISTS idx_sa_messages_chat_id_id ON sa_messages (chat_id, id);
CREATE INDEX IF NOT EXISTS idx_sa_users_typing_chat ON sa_users (typing_chat_id) WHERE typing_chat_id IS NOT NULL;