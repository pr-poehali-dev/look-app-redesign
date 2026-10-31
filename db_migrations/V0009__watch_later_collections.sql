CREATE TABLE IF NOT EXISTS t_p96441965_look_app_redesign.collections (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  title VARCHAR(60) NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS collections_user_idx ON t_p96441965_look_app_redesign.collections (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS collections_system_uniq ON t_p96441965_look_app_redesign.collections (user_id) WHERE is_system;

CREATE TABLE IF NOT EXISTS t_p96441965_look_app_redesign.collection_items (
  id SERIAL PRIMARY KEY,
  collection_id INTEGER NOT NULL,
  item_type VARCHAR(20) NOT NULL,
  item_id VARCHAR(100) NOT NULL,
  image TEXT,
  title TEXT,
  handle TEXT,
  watched BOOLEAN NOT NULL DEFAULT FALSE,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (collection_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS collection_items_col_idx ON t_p96441965_look_app_redesign.collection_items (collection_id, added_at DESC);

CREATE TABLE IF NOT EXISTS t_p96441965_look_app_redesign.collection_opens (
  id SERIAL PRIMARY KEY,
  collection_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  opened_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS collection_opens_col_idx ON t_p96441965_look_app_redesign.collection_opens (collection_id, opened_at);