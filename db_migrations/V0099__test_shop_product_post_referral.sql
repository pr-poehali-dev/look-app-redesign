WITH u AS (
  INSERT INTO t_p96441965_look_app_redesign.app_users (id, name, handle, email, password_hash, bio, is_verified, email_verified)
  VALUES ('u_test_shop_0001', 'Тестовый магазин «Уют»', 'test_shop_uyut', 'test_shop@example.com', 'disabled', 'Тестовый магазин: посуда и товары для дома', true, true)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
  RETURNING id
), v AS (
  INSERT INTO t_p96441965_look_app_redesign.videos (url, thumbnail, author, handle, description, category, type, user_id, hashtags)
  VALUES ('https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/7ed53013-4fda-4073-9d04-bf99ca2a9365.jpg', NULL, 'Тестовый магазин «Уют»', 'test_shop_uyut', 'Керамическая кружка ручной работы. Идеальна для утреннего кофе. Товар в профиле магазина.', 'feed', 'image', 'u_test_shop_0001', '#кружка #уют #дом')
  RETURNING id
), p AS (
  INSERT INTO t_p96441965_look_app_redesign.products (video_id, owner_user_id, title, description, price, old_price, image, product_url, category, in_stock, status, is_partner)
  SELECT v.id, 'u_test_shop_0001', 'Керамическая кружка «Терракота»', 'Матовая керамика, объём 350 мл, подходит для посудомоечной машины.', 990, 1290, 'https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/7ed53013-4fda-4073-9d04-bf99ca2a9365.jpg', 'https://example.com/mug', 'home', true, 'active', false FROM v
  RETURNING id
)
INSERT INTO t_p96441965_look_app_redesign.referral_clicks (product_id, referral_code, referrer_user_id)
SELECT p.id, p.id || '-testref01', 'u_test_shop_0001' FROM p;