CREATE TABLE IF NOT EXISTS communities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT NOT NULL DEFAULT 'open',
  category TEXT DEFAULT 'Другое',
  img TEXT,
  creator_id TEXT,
  members_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_members (
  community_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (community_id, user_id)
);

INSERT INTO communities (id, name, description, type, category, img, creator_id, members_count) VALUES
('comm_1', 'Фотографы России', 'Делимся снимками, лайфхаками и вдохновением', 'open', 'Фото', 'https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/dbf882bc-5b07-4604-a1fa-628313ce915f.jpg', 'system', 14820),
('comm_2', 'Клуб путешественников', 'Только для тех, кто уже побывал в 10+ странах', 'closed', 'Путешествия', 'https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/a3325030-6571-46e9-845b-2a54062f9059.jpg', 'system', 3241),
('comm_3', 'Фитнес & ЗОЖ', 'Тренировки, питание, мотивация каждый день', 'open', 'Спорт', 'https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/5b90e1a9-665b-4e6c-9184-2edf68db2e91.jpg', 'system', 28903),
('comm_4', 'Геймеры Look', 'Закрытое сообщество для хардкорных геймеров', 'closed', 'Игры', 'https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/45213a06-ddb6-4425-9410-cb3777726c55.jpg', 'system', 891),
('comm_5', 'Кофейная культура', 'Всё о кофе: варка, обжарка, кофейни мира', 'open', 'Еда', 'https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/0730a864-0860-4c86-8845-835a8c4a720e.jpg', 'system', 7120),
('comm_6', 'Ночная музыка', 'Закрытый клуб любителей электронной музыки', 'closed', 'Музыка', 'https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/c96bc59d-e416-4e11-adf2-a308d67a562d.jpg', 'system', 2204)
ON CONFLICT (id) DO NOTHING;
