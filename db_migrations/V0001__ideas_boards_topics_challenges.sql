ALTER TABLE t_p96441965_look_app_redesign.videos ADD COLUMN IF NOT EXISTS card_title VARCHAR(30);
ALTER TABLE t_p96441965_look_app_redesign.videos ADD COLUMN IF NOT EXISTS card_points TEXT;
ALTER TABLE t_p96441965_look_app_redesign.videos ADD COLUMN IF NOT EXISTS is_commercial BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE t_p96441965_look_app_redesign.videos ADD COLUMN IF NOT EXISTS topic VARCHAR(40);

ALTER TABLE t_p96441965_look_app_redesign.boards ADD COLUMN IF NOT EXISTS topic VARCHAR(40);
ALTER TABLE t_p96441965_look_app_redesign.boards ADD COLUMN IF NOT EXISTS is_collab BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE t_p96441965_look_app_redesign.board_items ADD COLUMN IF NOT EXISTS added_by TEXT;

CREATE TABLE IF NOT EXISTS t_p96441965_look_app_redesign.board_members (
  id SERIAL PRIMARY KEY,
  board_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'member',
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (board_id, user_id)
);

CREATE TABLE IF NOT EXISTS t_p96441965_look_app_redesign.board_invites (
  id SERIAL PRIMARY KEY,
  board_id INTEGER NOT NULL,
  token VARCHAR(40) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL DEFAULT 'editor',
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p96441965_look_app_redesign.topics (
  slug VARCHAR(40) PRIMARY KEY,
  title VARCHAR(60) NOT NULL,
  icon VARCHAR(40) NOT NULL DEFAULT 'Sparkles',
  color VARCHAR(20) NOT NULL DEFAULT '#8b5cf6',
  sort_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO t_p96441965_look_app_redesign.topics (slug, title, icon, color, sort_order) VALUES
('inspiration', 'Вдохновение', 'Sparkles', '#8b5cf6', 1),
('routes', 'Маршруты', 'Map', '#0ea5e9', 2),
('diy', 'DIY', 'Hammer', '#f59e0b', 3),
('city', 'Город', 'Building2', '#64748b', 4),
('food', 'Еда', 'UtensilsCrossed', '#ef4444', 5),
('home', 'Дом и интерьер', 'Sofa', '#14b8a6', 6),
('style', 'Стиль', 'Shirt', '#ec4899', 7),
('beauty', 'Красота', 'Flower2', '#f472b6', 8),
('travel', 'Путешествия', 'Plane', '#06b6d4', 9),
('nature', 'Природа', 'Leaf', '#22c55e', 10),
('hobby', 'Хобби', 'Palette', '#a855f7', 11),
('sport', 'Спорт', 'Dumbbell', '#f97316', 12),
('kids', 'Дети и семья', 'Baby', '#eab308', 13),
('pets', 'Питомцы', 'PawPrint', '#84cc16', 14)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS t_p96441965_look_app_redesign.challenges (
  id SERIAL PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  criteria TEXT NOT NULL DEFAULT '',
  topic VARCHAR(40),
  badge_title VARCHAR(60) NOT NULL DEFAULT 'Участник челленджа',
  starts_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p96441965_look_app_redesign.challenge_entries (
  id SERIAL PRIMARY KEY,
  challenge_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  video_id INTEGER,
  board_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (challenge_id, user_id)
);

CREATE TABLE IF NOT EXISTS t_p96441965_look_app_redesign.user_badges (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  challenge_id INTEGER NOT NULL,
  title VARCHAR(60) NOT NULL,
  awarded_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, challenge_id)
);

INSERT INTO t_p96441965_look_app_redesign.challenges (title, description, criteria, topic, badge_title)
VALUES ('Маленькая радость недели', 'Покажите одну вещь, место или момент, который сделал вашу неделю лучше. Фото и три коротких пункта: что это, почему радует, как повторить.', 'Свой снимок, понятный заголовок, три пункта. Без рекламы и ссылок на покупку.', 'inspiration', 'Участник недели');

CREATE INDEX IF NOT EXISTS idx_board_members_user ON t_p96441965_look_app_redesign.board_members (user_id);
CREATE INDEX IF NOT EXISTS idx_videos_topic ON t_p96441965_look_app_redesign.videos (topic);
