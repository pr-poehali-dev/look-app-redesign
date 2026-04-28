-- 1. Профильные фото legacy-юзеров → CDN
UPDATE t_p96441965_look_app_redesign.legacy_users
SET profile_photo = 'https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/bucket/legacy/' || profile_photo
WHERE profile_photo IS NOT NULL
  AND profile_photo LIKE 'uploads/%';

-- 2. Перенос постов в videos с возвратом id для обновления migrated_to_video_id
WITH inserted AS (
  INSERT INTO t_p96441965_look_app_redesign.videos
    (url, thumbnail, author, handle, description, category, type,
     likes, comments, shares, created_at, user_id, hidden, hashtags)
  SELECT
    lp.video,
    lp.thumbnail,
    COALESCE(NULLIF(lu.fullname, ''), NULLIF(lu.username, ''), 'Пользователь'),
    COALESCE(NULLIF(lu.username, ''), 'user'),
    COALESCE(lp.description, ''),
    'humor',
    'video',
    COALESCE(lp.like_count, 0),
    COALESCE(lp.comment_count, 0),
    COALESCE(lp.share_count, 0),
    COALESCE(lp.created_at, now()),
    'legacy_' || lp.user_id::text,
    (lp.is_block = 1 OR lp.is_private = 1),
    ''
  FROM t_p96441965_look_app_redesign.legacy_posts lp
  LEFT JOIN t_p96441965_look_app_redesign.legacy_users lu ON lu.id = lp.user_id
  WHERE lp.video IS NOT NULL
    AND lp.migrated_to_video_id IS NULL
  RETURNING id, description, created_at
)
-- 3. Обратная связь legacy_posts.migrated_to_video_id ← videos.id
UPDATE t_p96441965_look_app_redesign.legacy_posts lp
SET migrated_to_video_id = i.id
FROM inserted i
WHERE COALESCE(lp.description, '') = COALESCE(i.description, '')
  AND COALESCE(lp.created_at, now()) = i.created_at
  AND lp.migrated_to_video_id IS NULL;
