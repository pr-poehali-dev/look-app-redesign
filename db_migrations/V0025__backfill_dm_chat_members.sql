-- Добавить недостающих участников в DM/personal чаты, если их id встречается в строке chat_id
INSERT INTO sa_chat_members (chat_id, user_id)
SELECT c.id, au.id
FROM sa_chats c
CROSS JOIN app_users au
WHERE c.type = 'personal'
  AND c.id LIKE '%' || au.id || '%'
  AND NOT EXISTS (
    SELECT 1 FROM sa_chat_members cm
    WHERE cm.chat_id = c.id AND cm.user_id = au.id
  )
ON CONFLICT DO NOTHING;