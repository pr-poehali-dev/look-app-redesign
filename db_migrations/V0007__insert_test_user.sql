INSERT INTO t_p96441965_look_app_redesign.app_users (id, name, handle, email, password_hash, token)
VALUES (
  'u_testuser01',
  'Тест',
  'test',
  'test@test',
  encode(sha256('test@test'::bytea), 'hex'),
  'token_testuser01'
)
ON CONFLICT (email) DO NOTHING;