ALTER TABLE t_p96441965_look_app_redesign.product_clicks ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'view';
ALTER TABLE t_p96441965_look_app_redesign.product_clicks ADD COLUMN IF NOT EXISTS source TEXT NULL;
ALTER TABLE t_p96441965_look_app_redesign.product_clicks ADD COLUMN IF NOT EXISTS ref_code TEXT NULL;
CREATE INDEX IF NOT EXISTS idx_product_clicks_kind_source ON t_p96441965_look_app_redesign.product_clicks (product_id, kind, source);