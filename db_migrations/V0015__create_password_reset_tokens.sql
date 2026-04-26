CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pwd_reset_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_pwd_reset_email ON password_reset_tokens(email);
