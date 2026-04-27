-- Tracking перенос медиа из uploads.7z в S3
CREATE TABLE IF NOT EXISTS legacy_media_files (
    id BIGSERIAL PRIMARY KEY,
    src_path TEXT NOT NULL UNIQUE,
    s3_key TEXT,
    cdn_url TEXT,
    size_bytes BIGINT,
    mime TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    error TEXT,
    migrated_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_legacy_media_status ON legacy_media_files (status);
CREATE INDEX IF NOT EXISTS idx_legacy_media_src ON legacy_media_files (src_path);
