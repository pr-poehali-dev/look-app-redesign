import json
import os
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    'Access-Control-Max-Age': '86400',
}


def _resp(status, payload):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(payload)}


def handler(event: dict, context) -> dict:
    """Аналитика автора в профиле: суммарные просмотры своих видео, переходы по товарам в своих видео, сколько раз другие авторы использовали твои шаблоны, статистика по эфирам. Также фиксирует использование шаблона (action=track_template_use)."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    schema = os.environ['MAIN_DB_SCHEMA']
    params = event.get('queryStringParameters') or {}
    headers = event.get('headers') or {}
    user_id = (headers.get('X-User-Id') or headers.get('x-user-id') or '').strip()[:100]
    action = (params.get('action') or '').strip()

    if not user_id:
        return _resp(401, {'error': 'X-User-Id required'})

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    try:
        if method == 'POST' and action == 'track_template_use':
            body = json.loads(event.get('body') or '{}')
            template_id = (body.get('template_id') or '').strip()
            video_id = body.get('video_id')
            if not template_id:
                return _resp(400, {'error': 'template_id required'})
            cur.execute(
                f"INSERT INTO {schema}.template_usage (template_id, user_id, video_id) VALUES (%s, %s, %s)",
                (template_id, user_id, video_id)
            )
            conn.commit()
            return _resp(200, {'ok': True})

        if method == 'GET' and (action == '' or action == 'summary'):
            # Просмотры всех своих видео
            cur.execute(
                f"SELECT v.id FROM {schema}.videos v WHERE v.user_id = %s",
                (user_id,)
            )
            my_video_ids = [r[0] for r in cur.fetchall()]

            total_views = 0
            if my_video_ids:
                placeholders = ','.join(['%s'] * len(my_video_ids))
                cur.execute(
                    f"SELECT COUNT(*) FROM {schema}.video_views WHERE video_id IN ({placeholders})",
                    tuple(my_video_ids)
                )
                total_views = cur.fetchone()[0] or 0

            # Переходы по товарам в своих видео
            cur.execute(
                f"SELECT COUNT(*) FROM {schema}.product_clicks pc "
                f"JOIN {schema}.products p ON p.id = pc.product_id "
                f"WHERE p.owner_user_id = %s",
                (user_id,)
            )
            product_clicks = cur.fetchone()[0] or 0

            # Сколько товаров создано
            cur.execute(f"SELECT COUNT(*) FROM {schema}.products WHERE owner_user_id = %s", (user_id,))
            products_count = cur.fetchone()[0] or 0

            # Использование своих шаблонов другими (по video.template_id, где автор видео = я, а использовал кто-то другой)
            try:
                cur.execute(
                    f"SELECT COUNT(*) FROM {schema}.template_usage tu WHERE tu.template_id IN ("
                    f"SELECT DISTINCT template_id FROM {schema}.videos WHERE user_id = %s AND template_id IS NOT NULL"
                    f") AND tu.user_id <> %s",
                    (user_id, user_id)
                )
                template_uses_by_others = cur.fetchone()[0] or 0
            except Exception:
                template_uses_by_others = 0

            # Статистика по эфирам (просмотры/сообщения если такие поля есть)
            live_count = 0
            try:
                cur.execute(f"SELECT COUNT(*) FROM {schema}.live_streams WHERE user_id = %s", (user_id,))
                live_count = cur.fetchone()[0] or 0
            except Exception:
                live_count = 0

            # Топ-5 своих видео по просмотрам
            top_videos = []
            if my_video_ids:
                placeholders = ','.join(['%s'] * len(my_video_ids))
                cur.execute(
                    f"SELECT v.id, v.thumbnail, v.url, v.description, COUNT(vv.id) as views "
                    f"FROM {schema}.videos v LEFT JOIN {schema}.video_views vv ON vv.video_id = v.id "
                    f"WHERE v.id IN ({placeholders}) GROUP BY v.id ORDER BY views DESC LIMIT 5",
                    tuple(my_video_ids)
                )
                top_videos = [{
                    'id': r[0], 'thumbnail': r[1], 'url': r[2],
                    'description': (r[3] or '')[:80], 'views': r[4],
                } for r in cur.fetchall()]

            return _resp(200, {
                'total_views': total_views,
                'product_clicks': product_clicks,
                'products_count': products_count,
                'template_uses_by_others': template_uses_by_others,
                'live_count': live_count,
                'top_videos': top_videos,
                'videos_count': len(my_video_ids),
            })

        return _resp(405, {'error': 'Method not allowed'})
    finally:
        cur.close()
        conn.close()