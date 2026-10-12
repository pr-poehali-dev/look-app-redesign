ALTER TABLE t_p96441965_look_app_redesign.videos
  ADD COLUMN IF NOT EXISTS age_rating VARCHAR(3) NOT NULL DEFAULT '12+',
  ADD COLUMN IF NOT EXISTS ad_erid VARCHAR(100),
  ADD COLUMN IF NOT EXISTS ad_advertiser VARCHAR(200);

ALTER TABLE t_p96441965_look_app_redesign.app_users
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS consent_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS consent_version VARCHAR(20);

CREATE TABLE IF NOT EXISTS t_p96441965_look_app_redesign.account_removal_log (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  removed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  source VARCHAR(20) NOT NULL DEFAULT 'self'
);

INSERT INTO t_p96441965_look_app_redesign.moderation_words (word) VALUES
  ('купить мефедрон'), ('купить героин'), ('купить кокаин'), ('купить амфетамин'), ('купить гашиш'), ('купить марихуану'),
  ('закладки наркотиков'), ('наркотики с доставкой'), ('продажа наркотиков'), ('продам наркотики'),
  ('вступай в игил'), ('вербовка в игил'), ('призываю к терроризму'), ('как сделать бомбу'), ('как сделать взрывчатку'),
  ('способы суицида'), ('как покончить с собой'), ('как совершить суицид'), ('как легко умереть')
ON CONFLICT DO NOTHING;