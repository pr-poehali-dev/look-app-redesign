ALTER TABLE t_p96441965_look_app_redesign.videos
  ADD COLUMN IF NOT EXISTS user_id text NOT NULL DEFAULT 'anonymous';