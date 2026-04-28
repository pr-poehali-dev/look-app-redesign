ALTER TABLE app_users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS email_verify_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_email_verify_user ON email_verify_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verify_email ON email_verify_tokens(email);