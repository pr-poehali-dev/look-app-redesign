CREATE TABLE IF NOT EXISTS sa_message_reads (
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  last_read_id BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_msg_reads_chat ON sa_message_reads(chat_id);