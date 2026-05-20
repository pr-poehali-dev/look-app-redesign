ALTER TABLE t_p96441965_look_app_redesign.app_users
  ADD COLUMN IF NOT EXISTS phone VARCHAR(32);

CREATE INDEX IF NOT EXISTS idx_app_users_phone ON t_p96441965_look_app_redesign.app_users (phone);
