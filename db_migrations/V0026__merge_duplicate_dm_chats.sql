-- Объединяем дубликаты DM-чатов между Alex и Тест в канонический dm_u_259dd4c92c95a437_u_testuser01

-- 1. Переносим сообщения
UPDATE sa_messages
SET chat_id = 'dm_u_259dd4c92c95a437_u_testuser01'
WHERE chat_id IN (
  'chat_u_259dd4c92c95a437_dm_u_259dd4c92c95a437_u_testuser01',
  'chat_u_testuser01_dm_u_259dd4c92c95a437_u_testuser01'
);

-- 2. Объединяем read-статусы (берём максимум last_read_id)
INSERT INTO sa_message_reads (chat_id, user_id, last_read_id, updated_at)
SELECT 'dm_u_259dd4c92c95a437_u_testuser01', user_id, MAX(last_read_id), NOW()
FROM sa_message_reads
WHERE chat_id IN (
  'chat_u_259dd4c92c95a437_dm_u_259dd4c92c95a437_u_testuser01',
  'chat_u_testuser01_dm_u_259dd4c92c95a437_u_testuser01',
  'dm_u_259dd4c92c95a437_u_testuser01'
)
GROUP BY user_id
ON CONFLICT (chat_id, user_id) DO UPDATE
SET last_read_id = GREATEST(sa_message_reads.last_read_id, EXCLUDED.last_read_id),
    updated_at = NOW();

-- 3. Помечаем дубль-чаты как архивные через name (мы их потом скроем на бэке)
UPDATE sa_chats
SET name = '__merged__'
WHERE id IN (
  'chat_u_259dd4c92c95a437_dm_u_259dd4c92c95a437_u_testuser01',
  'chat_u_testuser01_dm_u_259dd4c92c95a437_u_testuser01'
);