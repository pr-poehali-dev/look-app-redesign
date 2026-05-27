-- Привести существующих создателей групп к роли owner с полными правами
UPDATE community_members AS cm
SET role = 'owner',
    can_invite = TRUE,
    can_pin = TRUE,
    can_remove_messages = TRUE,
    can_ban = TRUE,
    can_change_info = TRUE,
    can_add_admins = TRUE
FROM communities AS c
WHERE c.id = cm.community_id
  AND cm.user_id = c.creator_id
  AND cm.role IN ('admin', 'member');

-- На случай если создатель не попал в community_members (старые группы) — добавим
INSERT INTO community_members (community_id, user_id, user_name, role,
  can_invite, can_pin, can_remove_messages, can_ban, can_change_info, can_add_admins)
SELECT c.id, c.creator_id, COALESCE(u.name, 'Создатель'), 'owner',
  TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
FROM communities c
LEFT JOIN app_users u ON u.id = c.creator_id
WHERE c.creator_id IS NOT NULL
  AND c.creator_id != 'system'
  AND NOT EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = c.id AND cm.user_id = c.creator_id
  );

-- Создатели должны быть и в sa_chat_members
INSERT INTO sa_chat_members (chat_id, user_id)
SELECT c.id, c.creator_id
FROM communities c
WHERE c.creator_id IS NOT NULL
  AND c.creator_id != 'system'
  AND NOT EXISTS (
    SELECT 1 FROM sa_chat_members scm
    WHERE scm.chat_id = c.id AND scm.user_id = c.creator_id
  )
ON CONFLICT DO NOTHING;
