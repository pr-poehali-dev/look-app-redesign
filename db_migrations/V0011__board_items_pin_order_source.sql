ALTER TABLE t_p96441965_look_app_redesign.board_items ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE t_p96441965_look_app_redesign.board_items ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE t_p96441965_look_app_redesign.board_items ADD COLUMN IF NOT EXISTS source_handle TEXT;