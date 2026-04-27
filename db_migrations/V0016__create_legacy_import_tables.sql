-- Legacy import tables: data from old TikToks app dump
-- Source: alexei3y_tiktoks (MySQL on beget) → snapshot 2026-04-28

CREATE TABLE IF NOT EXISTS legacy_users (
    id INTEGER PRIMARY KEY,
    identity TEXT,
    fullname TEXT,
    username TEXT,
    user_email TEXT,
    profile_photo TEXT,
    login_method TEXT,
    bio TEXT,
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    is_verify SMALLINT DEFAULT 0,
    is_moderator SMALLINT DEFAULT 0,
    country TEXT,
    city TEXT,
    app_language TEXT,
    coin_wallet BIGINT DEFAULT 0,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    migrated_to_user_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_legacy_users_identity ON legacy_users (LOWER(identity));
CREATE INDEX IF NOT EXISTS idx_legacy_users_email ON legacy_users (LOWER(user_email));
CREATE INDEX IF NOT EXISTS idx_legacy_users_username ON legacy_users (LOWER(username));

CREATE TABLE IF NOT EXISTS legacy_posts (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    video TEXT,
    thumbnail TEXT,
    description TEXT,
    sound_id INTEGER,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    is_private SMALLINT DEFAULT 0,
    is_block SMALLINT DEFAULT 0,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    migrated_to_video_id INTEGER
);
CREATE INDEX IF NOT EXISTS idx_legacy_posts_user_id ON legacy_posts (user_id);

CREATE TABLE IF NOT EXISTS legacy_likes (
    id INTEGER PRIMARY KEY,
    post_id INTEGER,
    user_id INTEGER,
    created_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_legacy_likes_post ON legacy_likes (post_id);
CREATE INDEX IF NOT EXISTS idx_legacy_likes_user ON legacy_likes (user_id);

CREATE TABLE IF NOT EXISTS legacy_followers (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    follower_id INTEGER,
    created_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_legacy_followers_user ON legacy_followers (user_id);
CREATE INDEX IF NOT EXISTS idx_legacy_followers_follower ON legacy_followers (follower_id);

CREATE TABLE IF NOT EXISTS legacy_comments (
    id INTEGER PRIMARY KEY,
    post_id INTEGER,
    user_id INTEGER,
    comment TEXT,
    created_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_legacy_comments_post ON legacy_comments (post_id);

CREATE TABLE IF NOT EXISTS legacy_comment_likes (
    id INTEGER PRIMARY KEY,
    comment_id INTEGER,
    user_id INTEGER,
    created_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS legacy_hashtags (
    id INTEGER PRIMARY KEY,
    name TEXT,
    post_count INTEGER DEFAULT 0,
    created_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS legacy_sounds (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    name TEXT,
    artist TEXT,
    sound TEXT,
    image TEXT,
    duration INTEGER,
    created_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS legacy_user_links (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    title TEXT,
    url TEXT,
    created_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS legacy_post_saves (
    id INTEGER PRIMARY KEY,
    post_id INTEGER,
    user_id INTEGER,
    created_at TIMESTAMP
);

-- OTP codes for legacy account recovery (email-based)
CREATE TABLE IF NOT EXISTS legacy_otp_codes (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    legacy_user_id INTEGER,
    attempts SMALLINT NOT NULL DEFAULT 0,
    consumed_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    ip TEXT
);
CREATE INDEX IF NOT EXISTS idx_legacy_otp_email ON legacy_otp_codes (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_legacy_otp_expires ON legacy_otp_codes (expires_at);

-- Tracking of import runs
CREATE TABLE IF NOT EXISTS legacy_import_runs (
    id BIGSERIAL PRIMARY KEY,
    started_at TIMESTAMP NOT NULL DEFAULT now(),
    finished_at TIMESTAMP,
    table_name TEXT NOT NULL,
    rows_inserted INTEGER NOT NULL DEFAULT 0,
    rows_skipped INTEGER NOT NULL DEFAULT 0,
    error TEXT
);
