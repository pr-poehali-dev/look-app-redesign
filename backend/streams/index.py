import json
import os
import psycopg2
from urllib.parse import unquote


def handler(event: dict, context) -> dict:
    """Управление прямыми эфирами: старт, список, обновление, завершение"""
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-User-Name',
        'Content-Type': 'application/json'
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    req_headers = event.get('headers') or {}
    user_id = req_headers.get('X-User-Id', 'anon')
    user_name = unquote(req_headers.get('X-User-Name', 'Гость'))

    try:
        # Авточистка зависших стримов (нет heartbeat более 60 сек)
        cur.execute(
            "UPDATE live_streams SET status = 'ended', ended_at = NOW() "
            "WHERE status = 'active' AND heartbeat_at < NOW() - INTERVAL '60 seconds'"
        )

        if method == 'GET':
            action = params.get('action', 'list')

            if action == 'list':
                category = params.get('category', '')
                if category and category != 'Все':
                    cur.execute(
                        "SELECT id, user_id, user_name, user_avatar, title, category, thumb, tags, "
                        "viewers, likes, started_at "
                        "FROM live_streams WHERE status = 'active' AND category = %s "
                        "ORDER BY heartbeat_at DESC LIMIT 100",
                        (category,)
                    )
                else:
                    cur.execute(
                        "SELECT id, user_id, user_name, user_avatar, title, category, thumb, tags, "
                        "viewers, likes, started_at "
                        "FROM live_streams WHERE status = 'active' "
                        "ORDER BY heartbeat_at DESC LIMIT 100"
                    )
                rows = cur.fetchall()
                streams = [{
                    'id': r[0], 'user_id': r[1], 'user_name': r[2], 'user_avatar': r[3],
                    'title': r[4], 'category': r[5], 'thumb': r[6],
                    'tags': r[7].split(',') if r[7] else [],
                    'viewers': r[8], 'likes': r[9],
                    'started_at': r[10].isoformat() if r[10] else None
                } for r in rows]
                conn.commit()
                return {'statusCode': 200, 'headers': headers,
                        'body': json.dumps({'streams': streams})}

            if action == 'get':
                stream_id = params.get('id')
                if not stream_id:
                    conn.commit()
                    return {'statusCode': 400, 'headers': headers,
                            'body': json.dumps({'error': 'id required'})}
                cur.execute(
                    "SELECT id, user_id, user_name, user_avatar, title, category, thumb, tags, "
                    "viewers, likes, status, started_at FROM live_streams WHERE id = %s",
                    (int(stream_id),)
                )
                r = cur.fetchone()
                if not r:
                    conn.commit()
                    return {'statusCode': 404, 'headers': headers,
                            'body': json.dumps({'error': 'not found'})}
                stream = {
                    'id': r[0], 'user_id': r[1], 'user_name': r[2], 'user_avatar': r[3],
                    'title': r[4], 'category': r[5], 'thumb': r[6],
                    'tags': r[7].split(',') if r[7] else [],
                    'viewers': r[8], 'likes': r[9], 'status': r[10],
                    'started_at': r[11].isoformat() if r[11] else None
                }
                conn.commit()
                return {'statusCode': 200, 'headers': headers,
                        'body': json.dumps({'stream': stream})}

        if method == 'POST':
            body = json.loads(event.get('body') or '{}')
            action = body.get('action', '')

            if action == 'start':
                title = body.get('title', '')
                category = body.get('category', 'Общее')
                thumb = body.get('thumb', '')
                tags = body.get('tags', '')
                user_avatar = body.get('user_avatar', '')
                if isinstance(tags, list):
                    tags = ','.join(tags)
                # Если уже есть активный стрим у пользователя — завершаем его
                cur.execute(
                    "UPDATE live_streams SET status = 'ended', ended_at = NOW() "
                    "WHERE user_id = %s AND status = 'active'",
                    (user_id,)
                )
                cur.execute(
                    "INSERT INTO live_streams (user_id, user_name, user_avatar, title, category, thumb, tags) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
                    (user_id, user_name, user_avatar, title, category, thumb, tags)
                )
                stream_id = cur.fetchone()[0]
                conn.commit()
                return {'statusCode': 200, 'headers': headers,
                        'body': json.dumps({'ok': True, 'stream_id': stream_id})}

            if action == 'heartbeat':
                stream_id = body.get('stream_id')
                viewers = body.get('viewers')
                likes = body.get('likes')
                if not stream_id:
                    conn.commit()
                    return {'statusCode': 400, 'headers': headers,
                            'body': json.dumps({'error': 'stream_id required'})}
                if viewers is not None and likes is not None:
                    cur.execute(
                        "UPDATE live_streams SET heartbeat_at = NOW(), viewers = %s, likes = %s "
                        "WHERE id = %s AND user_id = %s AND status = 'active'",
                        (int(viewers), int(likes), int(stream_id), user_id)
                    )
                else:
                    cur.execute(
                        "UPDATE live_streams SET heartbeat_at = NOW() "
                        "WHERE id = %s AND user_id = %s AND status = 'active'",
                        (int(stream_id), user_id)
                    )
                conn.commit()
                return {'statusCode': 200, 'headers': headers,
                        'body': json.dumps({'ok': True})}

            if action == 'stop':
                stream_id = body.get('stream_id')
                if not stream_id:
                    conn.commit()
                    return {'statusCode': 400, 'headers': headers,
                            'body': json.dumps({'error': 'stream_id required'})}
                cur.execute(
                    "UPDATE live_streams SET status = 'ended', ended_at = NOW() "
                    "WHERE id = %s AND user_id = %s",
                    (int(stream_id), user_id)
                )
                conn.commit()
                return {'statusCode': 200, 'headers': headers,
                        'body': json.dumps({'ok': True})}

        return {'statusCode': 400, 'headers': headers,
                'body': json.dumps({'error': 'Unknown action'})}
    finally:
        cur.close()
        conn.close()
