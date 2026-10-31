UPDATE t_p96441965_look_app_redesign.app_settings
SET value = replace(value, 'Google — вход через аккаунт Google (Google получает ваш email и имя, если вы выбрали такой способ входа);' || chr(10), '')
WHERE key = 'privacy_policy';