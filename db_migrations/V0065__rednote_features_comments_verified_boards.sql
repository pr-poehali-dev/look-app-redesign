-- RedNote-style features: comment threads/likes/mentions, verified badge, boards (collections)

-- 1. Ответы на комментарии (треды)
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id INTEGER NULL;
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_target ON comments(target_type, target_id);

-- 2. Верификация профиля
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Публичные доски/коллекции (как в Pinterest)
CREATE TABLE IF NOT EXISTS boards (
    id SERIAL PRIMARY KEY,
    owner_user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    cover_image TEXT,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_boards_owner ON boards(owner_user_id);

CREATE TABLE IF NOT EXISTS board_items (
    id SERIAL PRIMARY KEY,
    board_id INTEGER NOT NULL,
    item_type TEXT NOT NULL,
    item_id TEXT NOT NULL,
    image TEXT,
    title TEXT,
    added_at TIMESTAMP DEFAULT now(),
    UNIQUE (board_id, item_type, item_id)
);
CREATE INDEX IF NOT EXISTS idx_board_items_board ON board_items(board_id);
