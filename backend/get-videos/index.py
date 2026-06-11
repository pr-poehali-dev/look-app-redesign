import json
import os
import psycopg2


def handler(event: dict, context) -> dict:
    """Лента видео с гибридными рекомендациями: контентная + коллаборативная фильтрация, подписки, популярность, свежесть и элемент случайности против пузыря фильтров."""
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400',
            },
            'body': ''
        }

    params = event.get('queryStringParameters') or {}
    category = params.get('category', '')
    media_type = params.get('type', 'video')
    user_id = (params.get('user_id') or '').strip()

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    try:
        schema = os.environ['MAIN_DB_SCHEMA']
        base_select = (
            f"SELECT v.id, v.url, v.author, v.handle, v.description, v.hashtags, "
            f"v.category, v.type, v.likes, v.comments, v.shares, v.created_at, "
            f"lu.profile_photo, v.thumbnail, v.user_id "
            f"FROM {schema}.videos v "
            f"LEFT JOIN {schema}.legacy_posts lp ON lp.migrated_to_video_id = v.id "
            f"LEFT JOIN {schema}.legacy_users lu ON lu.id = lp.user_id "
            f"WHERE v.type = %s AND (v.hidden IS NULL OR v.hidden = FALSE) "
        )

        # Категория задана и это не персонализированная лента -> простая выдача по дате
        if category and category != 'all':
            cur.execute(
                base_select + "AND v.category = %s ORDER BY v.created_at DESC LIMIT 80",
                (media_type, category)
            )
            rows = cur.fetchall()
        else:
            cur.execute(
                base_select + "ORDER BY v.created_at DESC LIMIT 200",
                (media_type,)
            )
            rows = cur.fetchall()

        # Профиль интересов пользователя для гибридных рекомендаций
        liked_categories = {}
        liked_hashtags = {}
        followed_user_ids = set()
        similar_user_ids = set()
        if user_id:
            # Что пользователь лайкал -> любимые категории и хэштеги (контентная фильтрация)
            cur.execute(
                f"SELECT v.category, v.hashtags FROM {schema}.likes l "
                f"JOIN {schema}.videos v ON v.id::text = l.target_id "
                f"WHERE l.target_type = 'video' AND l.user_id = %s",
                (user_id,)
            )
            for cat, tags in cur.fetchall():
                if cat:
                    liked_categories[cat] = liked_categories.get(cat, 0) + 1
                for t in (tags or '').replace('#', ' ').split():
                    t = t.strip().lower()
                    if t:
                        liked_hashtags[t] = liked_hashtags.get(t, 0) + 1

            # На кого подписан (по following_id из таблицы follows)
            try:
                cur.execute(
                    f"SELECT following_id FROM {schema}.follows WHERE follower_id::text = %s",
                    (user_id,)
                )
                followed_user_ids = {str(r[0]) for r in cur.fetchall()}
            except Exception:
                followed_user_ids = set()

            # Коллаборативная фильтрация: пользователи, лайкавшие те же видео, что и я
            cur.execute(
                f"SELECT DISTINCT l2.user_id FROM {schema}.likes l1 "
                f"JOIN {schema}.likes l2 ON l1.target_id = l2.target_id "
                f"AND l1.target_type = 'video' AND l2.target_type = 'video' "
                f"WHERE l1.user_id = %s AND l2.user_id <> %s LIMIT 50",
                (user_id, user_id)
            )
            similar_user_ids = {str(r[0]) for r in cur.fetchall()}

            # Видео, которые лайкнули похожие пользователи
            collab_video_ids = set()
            if similar_user_ids:
                placeholders = ','.join(['%s'] * len(similar_user_ids))
                cur.execute(
                    f"SELECT DISTINCT target_id FROM {schema}.likes "
                    f"WHERE target_type = 'video' AND user_id IN ({placeholders})",
                    tuple(similar_user_ids)
                )
                collab_video_ids = {str(r[0]) for r in cur.fetchall()}
            else:
                collab_video_ids = set()
    finally:
        cur.close()
        conn.close()

    import random
    import math
    import datetime

    now = datetime.datetime.utcnow()

    def score(r):
        vid = str(r[0])
        cat = r[6]
        tags = (r[5] or '').replace('#', ' ').split()
        likes = r[8] or 0
        created = r[11]
        owner = str(r[14]) if r[14] is not None else ''

        s = 0.0
        # Контентная фильтрация: совпадение категории/хэштегов с интересами
        if cat and cat in liked_categories:
            s += 3.0 * min(liked_categories[cat], 3)
        for t in tags:
            t = t.strip().lower()
            if t in liked_hashtags:
                s += 1.5 * min(liked_hashtags[t], 3)
        # Подписки
        if owner and owner in followed_user_ids:
            s += 5.0
        # Коллаборативная фильтрация
        if user_id and vid in collab_video_ids:
            s += 4.0
        # Популярность (сглаженно)
        s += math.log1p(max(0, likes)) * 1.2
        # Свежесть: бонус за новизну, плавно убывает за неделю
        if created:
            age_h = max(0.0, (now - created).total_seconds() / 3600.0)
            s += max(0.0, 3.0 - age_h / 56.0)
        # Случайность против "пузыря фильтров": случайный буст,
        # иногда продвигает контент вне привычных интересов
        s += random.uniform(0, 3.0)
        return s

    if user_id and not (category and category != 'all'):
        rows = sorted(rows, key=score, reverse=True)[:60]
    else:
        # Без персонализации — лёгкое перемешивание верхушки, чтобы лента не застывала
        head = rows[:30]
        random.shuffle(head)
        rows = head + rows[30:]
        rows = rows[:60]

    videos = []
    for r in rows:
        legacy_avatar = r[12]
        thumbnail = r[13]
        if r[7] == 'image':
            avatar = r[1]
        elif legacy_avatar:
            avatar = legacy_avatar
        else:
            avatar = None
        videos.append({
            'id': r[0],
            'url': r[1],
            'author': r[2],
            'handle': r[3],
            'description': r[4],
            'hashtags': r[5] or '',
            'category': r[6],
            'type': r[7],
            'likes': str(r[8]),
            'comments': str(r[9]),
            'shares': str(r[10]),
            'avatar': avatar,
            'created_at': r[11].isoformat() if r[11] else None,
            'thumbnail': thumbnail,
        })

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'videos': videos})
    }
