UPDATE "t_p96441965_look_app_redesign".sa_users s
SET name = COALESCE(NULLIF(TRIM(a.name), ''), a.handle, 'Пользователь')
FROM "t_p96441965_look_app_redesign".app_users a
WHERE s.id = a.id
  AND (s.name = 'Гость' OR s.name = '' OR s.name IS NULL);

UPDATE "t_p96441965_look_app_redesign".sa_messages m
SET user_name = COALESCE(NULLIF(TRIM(a.name), ''), a.handle, 'Пользователь')
FROM "t_p96441965_look_app_redesign".app_users a
WHERE m.user_id = a.id
  AND (m.user_name = 'Гость' OR m.user_name = '' OR m.user_name IS NULL);