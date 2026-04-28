UPDATE t_p96441965_look_app_redesign.legacy_posts
SET video = 'https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/bucket/legacy/' || video
WHERE video IS NOT NULL
  AND video LIKE 'uploads/%';

UPDATE t_p96441965_look_app_redesign.legacy_posts
SET thumbnail = 'https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/bucket/legacy/' || thumbnail
WHERE thumbnail IS NOT NULL
  AND thumbnail LIKE 'uploads/%';
