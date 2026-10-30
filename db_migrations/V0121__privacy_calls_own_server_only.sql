UPDATE t_p96441965_look_app_redesign.app_settings
SET value = replace(value,
  'серверы соединения для звонков (собственный сервер Лоок, а также сервисы Google, Cloudflare и Metered) — для установления связи между участниками звонка им становится известен IP-адрес.',
  'для звонков используется собственный сервер Лоок (turn.look.com.ru), сторонним сервисам данные звонков не передаются.')
WHERE key = 'privacy_policy';