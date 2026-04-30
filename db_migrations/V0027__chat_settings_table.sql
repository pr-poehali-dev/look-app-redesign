CREATE TABLE IF NOT EXISTS chat_settings (
  user_id TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  muted BOOLEAN DEFAULT FALSE,
  blocked BOOLEAN DEFAULT FALSE,
  theme TEXT DEFAULT 'default',
  disappear TEXT DEFAULT 'off',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, chat_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_settings_user ON chat_settings(user_id);