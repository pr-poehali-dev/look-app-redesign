ALTER TABLE "t_p96441965_look_app_redesign".follows RENAME COLUMN following_id TO following_id_old_int;
ALTER TABLE "t_p96441965_look_app_redesign".follows ALTER COLUMN following_id_old_int SET DEFAULT 0;

ALTER TABLE "t_p96441965_look_app_redesign".follows ALTER COLUMN follower_id TYPE TEXT USING follower_id::text;

ALTER TABLE "t_p96441965_look_app_redesign".follows ADD COLUMN IF NOT EXISTS target_handle TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_follows_follower_target
  ON "t_p96441965_look_app_redesign".follows (follower_id, target_handle);
CREATE INDEX IF NOT EXISTS idx_follows_follower
  ON "t_p96441965_look_app_redesign".follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_target
  ON "t_p96441965_look_app_redesign".follows (target_handle);