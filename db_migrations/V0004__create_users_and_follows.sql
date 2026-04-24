CREATE TABLE IF NOT EXISTS t_p96441965_look_app_redesign.users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  handle TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS t_p96441965_look_app_redesign.follows (
  id SERIAL PRIMARY KEY,
  follower_id INTEGER NOT NULL,
  following_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(follower_id, following_id)
);