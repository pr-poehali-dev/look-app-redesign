ALTER TABLE sa_messages ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NULL;
CREATE INDEX IF NOT EXISTS idx_sa_messages_expires_at ON sa_messages (expires_at) WHERE expires_at IS NOT NULL;