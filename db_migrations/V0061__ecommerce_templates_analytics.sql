-- Товары, привязанные к видео (E-commerce модуль)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    video_id INTEGER NOT NULL,
    owner_user_id TEXT NOT NULL DEFAULT 'anonymous',
    title TEXT NOT NULL,
    price NUMERIC(12,2) NOT NULL DEFAULT 0,
    old_price NUMERIC(12,2),
    image TEXT,
    promo_code TEXT,
    product_url TEXT,
    created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_video_id ON products(video_id);

-- Клики по товарам (для аналитики "переходы по товарам")
CREATE TABLE IF NOT EXISTS product_clicks (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    video_id INTEGER,
    user_id TEXT,
    created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_clicks_product_id ON product_clicks(product_id);

-- Корзина пользователя
CREATE TABLE IF NOT EXISTS cart_items (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);

-- Заказы (оформленная корзина)
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    items JSONB NOT NULL,
    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TIMESTAMP DEFAULT now()
);

-- Использование шаблонов: связь видео с шаблоном + счётчик использований
ALTER TABLE videos ADD COLUMN IF NOT EXISTS template_id TEXT;

CREATE TABLE IF NOT EXISTS template_usage (
    id SERIAL PRIMARY KEY,
    template_id TEXT NOT NULL,
    user_id TEXT,
    video_id INTEGER,
    created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_template_usage_template_id ON template_usage(template_id);
