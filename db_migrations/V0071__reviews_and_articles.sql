CREATE TABLE IF NOT EXISTS product_reviews (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    rating INTEGER NOT NULL,
    text TEXT NOT NULL DEFAULT '',
    image TEXT,
    created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_reviews_user ON product_reviews(product_id, user_id);

CREATE TABLE IF NOT EXISTS articles (
    id SERIAL PRIMARY KEY,
    owner_user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    cover_image TEXT,
    body TEXT NOT NULL DEFAULT '',
    source_url TEXT,
    status TEXT NOT NULL DEFAULT 'published',
    views INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_articles_owner ON articles(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_articles_created ON articles(created_at DESC);
