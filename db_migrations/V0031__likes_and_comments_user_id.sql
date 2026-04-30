-- Лайки для видео и постов
CREATE TABLE IF NOT EXISTS t_p96441965_look_app_redesign.likes (
    id SERIAL PRIMARY KEY,
    target_type VARCHAR(20) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (target_type, target_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_target ON t_p96441965_look_app_redesign.likes (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON t_p96441965_look_app_redesign.likes (user_id);

-- Привязка комментариев к пользователю (опционально, не ломает старые записи)
ALTER TABLE t_p96441965_look_app_redesign.comments
ADD COLUMN IF NOT EXISTS user_id VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_comments_target ON t_p96441965_look_app_redesign.comments (target_type, target_id);
