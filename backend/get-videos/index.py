import json
import os
import psycopg2

def handler(event: dict, context) -> dict:
    """Получение списка видео из БД по категории. Для legacy-постов подтягивает аватар автора."""
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
            'body': ''
        }

    params = event.get('queryStringParameters') or {}
    category = params.get('category', '')
    media_type = params.get('type', 'video')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    schema = os.environ['MAIN_DB_SCHEMA']
    base_select = (
        f"SELECT v.id, v.url, v.author, v.handle, v.description, v.hashtags, "
        f"v.category, v.type, v.likes, v.comments, v.shares, v.created_at, "
        f"lu.profile_photo "
        f"FROM {schema}.videos v "
        f"LEFT JOIN {schema}.legacy_posts lp ON lp.migrated_to_video_id = v.id "
        f"LEFT JOIN {schema}.legacy_users lu ON lu.id = lp.user_id "
        f"WHERE v.type = %s AND (v.hidden IS NULL OR v.hidden = FALSE) "
    )

    if category and category != 'all':
        cur.execute(
            base_select + "AND v.category = %s ORDER BY v.created_at DESC LIMIT 50",
            (media_type, category)
        )
    else:
        cur.execute(
            base_select + "ORDER BY v.created_at DESC LIMIT 50",
            (media_type,)
        )

    rows = cur.fetchall()
    cur.close()
    conn.close()

    videos = []
    for r in rows:
        legacy_avatar = r[12]
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
        })

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'videos': videos})
    }
