-- Реклама/спонсорские публикации
ALTER TABLE videos ADD COLUMN IF NOT EXISTS is_ad BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS ad_label TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS ad_impressions INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_videos_is_ad ON videos(is_ad) WHERE is_ad = TRUE;

CREATE TABLE IF NOT EXISTS ad_impressions_log (
  id SERIAL PRIMARY KEY,
  video_id INTEGER NOT NULL,
  user_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_video ON ad_impressions_log(video_id);

-- Партнёрские ссылки на товары (реферальная программа)
ALTER TABLE products ADD COLUMN IF NOT EXISTS referral_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_referral_code ON products(referral_code) WHERE referral_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS referral_clicks (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL,
  referral_code TEXT NOT NULL,
  referrer_user_id TEXT NOT NULL,
  visitor_user_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_code ON referral_clicks(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_referrer ON referral_clicks(referrer_user_id);

CREATE TABLE IF NOT EXISTS referral_orders (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  referral_code TEXT NOT NULL,
  referrer_user_id TEXT NOT NULL,
  buyer_user_id TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referral_orders_referrer ON referral_orders(referrer_user_id);
