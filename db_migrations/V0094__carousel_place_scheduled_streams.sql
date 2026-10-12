ALTER TABLE t_p96441965_look_app_redesign.videos
  ADD COLUMN IF NOT EXISTS extra_images TEXT,
  ADD COLUMN IF NOT EXISTS place VARCHAR(120);

ALTER TABLE t_p96441965_look_app_redesign.live_streams
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS notified_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS t_p96441965_look_app_redesign.stream_reminders (
  stream_id BIGINT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (stream_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_live_streams_scheduled ON t_p96441965_look_app_redesign.live_streams (scheduled_at) WHERE status = 'scheduled';