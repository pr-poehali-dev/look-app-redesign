import json
import os
import psycopg2


def handler(event: dict, context) -> dict:
    """Лента видео с гибридными рекомендациями: контентная + коллаборативная фильтрация, подписки, watch-time сигналы (скорость/глубина просмотра, повторы), популярность, свежесть, элемент случайности против пузыря фильтров, а также фильтрация скрытых авторов и видео "не интересно"."""
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
            f"lu.profile_photo, v.thumbnail, v.user_id, v.template_id, "
            f"EXISTS(SELECT 1 FROM {schema}.products p WHERE p.video_id = v.id AND p.status = 'active') AS has_products "
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
        hidden_handles = set()
        not_interested_ids = set()
        watch_stats = {}
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

            # "Показать больше такого" — явный сигнал, весит сильнее лайка
            try:
                cur.execute(
                    f"SELECT v.category, v.hashtags FROM {schema}.user_video_feedback f "
                    f"JOIN {schema}.videos v ON v.id = f.video_id "
                    f"WHERE f.user_id = %s AND f.feedback_type = 'more_like_this'",
                    (user_id,)
                )
                for cat, tags in cur.fetchall():
                    if cat:
                        liked_categories[cat] = liked_categories.get(cat, 0) + 3
                    for t in (tags or '').replace('#', ' ').split():
                        t = t.strip().lower()
                        if t:
                            liked_hashtags[t] = liked_hashtags.get(t, 0) + 3
            except Exception:
                pass

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

            # Скрытые авторы и "не интересно" — убираем из выдачи
            try:
                cur.execute(
                    f"SELECT author_handle FROM {schema}.user_hidden_authors WHERE user_id = %s",
                    (user_id,)
                )
                hidden_handles = {r[0] for r in cur.fetchall()}
            except Exception:
                hidden_handles = set()

            try:
                cur.execute(
                    f"SELECT video_id FROM {schema}.user_video_feedback WHERE user_id = %s AND feedback_type = 'not_interested'",
                    (user_id,)
                )
                not_interested_ids = {r[0] for r in cur.fetchall()}
            except Exception:
                not_interested_ids = set()

            # Watch-time сигналы: быстрые пролистывания -> штраф теме, досмотры/повторы -> бонус
            try:
                cur.execute(
                    f"SELECT v.category, vv.watch_seconds, vv.duration, vv.completed, vv.repeat_count "
                    f"FROM {schema}.video_views vv "
                    f"JOIN {schema}.videos v ON v.id = vv.video_id "
                    f"WHERE vv.user_id = %s ORDER BY vv.created_at DESC LIMIT 300",
                    (user_id,)
                )
                for cat, watch_seconds, duration, completed, repeat_count in cur.fetchall():
                    if not cat:
                        continue
                    ratio = (float(watch_seconds) / float(duration)) if duration else 0.0
                    signal = 0.0
                    if ratio < 0.15:
                        signal -= 1.0
                    elif ratio > 0.7 or completed:
                        signal += 1.5
                    if repeat_count:
                        signal += 1.0 * min(repeat_count, 3)
                    watch_stats[cat] = watch_stats.get(cat, 0.0) + signal
            except Exception:
                watch_stats = {}
    finally:
        cur.close()
        conn.close()

    import random
    import math
    import datetime

    now = datetime.datetime.utcnow()

    # Убираем скрытых авторов и видео с отметкой "не интересно"
    if hidden_handles or not_interested_ids:
        rows = [r for r in rows if (r[3] not in hidden_handles) and (r[0] not in not_interested_ids)]

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
        # Глубина взаимодействия: скорость/длительность просмотра и повторы по теме
        if cat and cat in watch_stats:
            s += watch_stats[cat]
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
            'template_id': r[15],
            'has_products': bool(r[16]),
        })

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'videos': videos})
    }