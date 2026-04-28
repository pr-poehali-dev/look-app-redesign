-- Пересчёт лайков/комментов из legacy таблиц в videos
WITH likes_agg AS (
  SELECT post_id, COUNT(*) AS cnt
  FROM t_p96441965_look_app_redesign.legacy_likes
  GROUP BY post_id
),
comments_agg AS (
  SELECT post_id, COUNT(*) AS cnt
  FROM t_p96441965_look_app_redesign.legacy_comments
  GROUP BY post_id
)
UPDATE t_p96441965_look_app_redesign.videos v
SET likes = COALESCE(la.cnt, 0),
    comments = COALESCE(ca.cnt, 0)
FROM t_p96441965_look_app_redesign.legacy_posts lp
LEFT JOIN likes_agg la ON la.post_id = lp.id
LEFT JOIN comments_agg ca ON ca.post_id = lp.id
WHERE lp.migrated_to_video_id = v.id;
