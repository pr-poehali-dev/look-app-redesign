CREATE TABLE IF NOT EXISTS qr_login_sessions (
  code VARCHAR(64) PRIMARY KEY,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  user_id VARCHAR(32),
  token VARCHAR(128),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_qr_login_sessions_created ON qr_login_sessions(created_at);
