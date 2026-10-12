CREATE TABLE IF NOT EXISTS t_p96441965_look_app_redesign.moderation_words (
  id SERIAL PRIMARY KEY,
  word VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
INSERT INTO t_p96441965_look_app_redesign.moderation_words (word) VALUES
  ('купить наркотики'), ('закладки мефедрон'), ('казино онлайн'), ('быстрый заработок без вложений'), ('взлом аккаунтов')
ON CONFLICT DO NOTHING;
ALTER TABLE t_p96441965_look_app_redesign.videos ADD COLUMN IF NOT EXISTS hidden_reason VARCHAR(50);