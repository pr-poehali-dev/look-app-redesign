CREATE TABLE IF NOT EXISTS t_p96441965_look_app_redesign.app_settings (
  key VARCHAR(64) PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO t_p96441965_look_app_redesign.app_settings (key, value) VALUES
  ('privacy_policy', 'Политика конфиденциальности Look. Мы уважаем вашу конфиденциальность и обязуемся защищать вашу личную информацию.'),
  ('terms_of_use', 'Условия использования Look. Используя приложение, вы соглашаетесь с этими условиями.')
ON CONFLICT (key) DO NOTHING;
