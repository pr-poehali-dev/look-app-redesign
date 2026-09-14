-- Мягкое удаление сообществ "1" и "тестовый" (скрываем из списков, не удаляя физически)
UPDATE communities
SET creator_id = 'system',
    name = CASE WHEN name NOT LIKE '[Удалено]%' THEN '[Удалено] ' || name ELSE name END,
    is_hidden = TRUE
WHERE id IN ('com_9d171a4f', 'com_aaefacbe');

UPDATE community_members
SET role = 'left'
WHERE community_id IN ('com_9d171a4f', 'com_aaefacbe');

UPDATE sa_chats
SET name = CASE WHEN name NOT LIKE '[Удалено]%' THEN '[Удалено] ' || name ELSE name END
WHERE id IN ('com_9d171a4f', 'com_aaefacbe');
