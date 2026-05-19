CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    target_type VARCHAR(20) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    reason VARCHAR(50) NOT NULL DEFAULT 'other',
    comment TEXT DEFAULT '',
    reporter_id VARCHAR(100) NOT NULL,
    reporter_name VARCHAR(100) DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    resolved_at TIMESTAMP NULL,
    resolved_note TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);