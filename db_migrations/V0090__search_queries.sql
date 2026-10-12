CREATE TABLE IF NOT EXISTS t_p96441965_look_app_redesign.search_queries (
  id BIGSERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_search_queries_created ON t_p96441965_look_app_redesign.search_queries (created_at DESC);