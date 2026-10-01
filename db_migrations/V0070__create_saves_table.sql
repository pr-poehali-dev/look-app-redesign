CREATE TABLE IF NOT EXISTS t_p96441965_look_app_redesign.saves (
    id SERIAL PRIMARY KEY,
    target_type VARCHAR(20) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (target_type, target_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_saves_target ON t_p96441965_look_app_redesign.saves (target_type, target_id);