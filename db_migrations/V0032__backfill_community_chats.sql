-- Создаём чаты для всех существующих сообществ
INSERT INTO sa_chats (id, type, name)
SELECT c.id, 'group', c.name
FROM communities c
WHERE NOT EXISTS (SELECT 1 FROM sa_chats WHERE sa_chats.id = c.id);

-- Добавляем всех участников сообществ в чаты
INSERT INTO sa_chat_members (chat_id, user_id)
SELECT cm.community_id, cm.user_id
FROM community_members cm
WHERE cm.role <> 'left'
ON CONFLICT DO NOTHING;