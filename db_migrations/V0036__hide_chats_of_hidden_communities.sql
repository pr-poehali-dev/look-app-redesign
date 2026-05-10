UPDATE sa_chats
SET name = '__merged__'
WHERE id IN (SELECT id FROM communities WHERE is_hidden = TRUE)
  AND name <> '__merged__';