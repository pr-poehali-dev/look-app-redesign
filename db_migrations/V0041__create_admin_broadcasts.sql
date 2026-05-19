CREATE TABLE IF NOT EXISTS admin_broadcasts (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    target TEXT NOT NULL DEFAULT 'all',
    created_at TIMESTAMP DEFAULT NOW()
);