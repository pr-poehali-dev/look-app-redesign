-- Системные seed-сообщества уже имеют creator_id='system', backend их фильтрует.
-- Здесь только помечаем их имя префиксом для ясности, если когда-нибудь будут показаны.
UPDATE communities
SET name = CASE WHEN name NOT LIKE '[SEED]%' THEN '[SEED] ' || name ELSE name END
WHERE creator_id = 'system';