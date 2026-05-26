ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS category VARCHAR(32) DEFAULT 'other';
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets(category);