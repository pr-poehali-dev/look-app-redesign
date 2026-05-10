-- Мягкое удаление сообщества "111" и его чата (скрываем из списков, не удаляя физически)
UPDATE communities
SET creator_id = 'system',
    name = CASE WHEN name NOT LIKE '[Удалено]%' THEN '[Удалено] ' || name ELSE name END
WHERE id = 'com_c7303b9e';

UPDATE community_members
SET role = 'left'
WHERE community_id = 'com_c7303b9e';

-- Помечаем чат как удалённый, чтобы он не показывался в списках
UPDATE sa_chats
SET name = CASE WHEN name NOT LIKE '[Удалено]%' THEN '[Удалено] ' || name ELSE name END
WHERE id = 'com_c7303b9e';