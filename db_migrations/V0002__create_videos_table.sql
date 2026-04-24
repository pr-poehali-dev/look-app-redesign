CREATE TABLE IF NOT EXISTS videos (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  thumbnail TEXT,
  author TEXT NOT NULL DEFAULT 'Пользователь',
  handle TEXT NOT NULL DEFAULT 'user',
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'humor',
  type TEXT NOT NULL DEFAULT 'video',
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);