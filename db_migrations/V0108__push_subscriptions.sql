CREATE TABLE IF NOT EXISTS t_p96441965_look_app_redesign.push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON t_p96441965_look_app_redesign.push_subscriptions(user_id);
CREATE TABLE IF NOT EXISTS t_p96441965_look_app_redesign.push_vapid (
  id INT PRIMARY KEY,
  private_key TEXT NOT NULL,
  public_key TEXT NOT NULL
);