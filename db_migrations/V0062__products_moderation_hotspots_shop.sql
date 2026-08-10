-- Расширение товаров: модерация, описание/категория, партнёрские товары, наличие
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other';
ALTER TABLE products ADD COLUMN IF NOT EXISTS in_stock BOOLEAN DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_partner BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS moderation_note TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now();
ALTER TABLE products ALTER COLUMN video_id SET DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_products_owner ON products(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_is_partner ON products(is_partner);

-- Хотспоты: привязка товара к конкретному видео с координатами метки на кадре и временем появления
CREATE TABLE IF NOT EXISTS product_hotspots (
    id SERIAL PRIMARY KEY,
    video_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    x NUMERIC(6,2) NOT NULL DEFAULT 50,
    y NUMERIC(6,2) NOT NULL DEFAULT 50,
    time_start NUMERIC(8,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hotspots_video_id ON product_hotspots(video_id);
CREATE INDEX IF NOT EXISTS idx_hotspots_product_id ON product_hotspots(product_id);
