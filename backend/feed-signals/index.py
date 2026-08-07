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
    return {
        'statusCode': status,
        'headers': {**CORS, 'Content-Type': 'application/json'},
        'body': json.dumps(payload, ensure_ascii=False),
    }


def _esc(value, limit=100):
    return str(value or '').replace("'", "''")[:limit]


def handler(event: dict, context) -> dict:
    """Сигналы вовлечённости ленты: action=view (время просмотра/повтор), hide_author, unhide_author, not_interested, more_like_this, list_hidden"""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    headers = event.get('headers') or {}
    user_id = (headers.get('X-User-Id') or headers.get('x-user-id') or '').strip()[:100]
    params = event.get('queryStringParameters') or {}
    action = (params.get('action') or '').strip()

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        action = (body.get('action') or action).strip()

    if not user_id:
        return _resp(401, {'error': 'X-User-Id required'})

    schema = os.environ['MAIN_DB_SCHEMA']
    safe_user = _esc(user_id)

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    try:
        if action == 'view' and method == 'POST':
            video_id = int(body.get('video_id') or 0)
            watch_seconds = float(body.get('watch_seconds') or 0)
            duration = float(body.get('duration') or 0)
            completed = bool(body.get('completed') or False)
            repeat_count = int(body.get('repeat_count') or 0)
            if not video_id:
                return _resp(400, {'error': 'video_id required'})

            cur.execute(
                f"INSERT INTO {schema}.video_views "
                f"(video_id, user_id, watch_seconds, duration, completed, repeat_count) "
                f"VALUES ({video_id}, '{safe_user}', {watch_seconds}, {duration}, {completed}, {repeat_count})"
            )
            conn.commit()
            return _resp(200, {'ok': True})

        if action == 'not_interested' and method == 'POST':
            video_id = int(body.get('video_id') or 0)
            if not video_id:
                return _resp(400, {'error': 'video_id required'})
            cur.execute(
                f"INSERT INTO {schema}.user_video_feedback (user_id, video_id, feedback_type) "
                f"VALUES ('{safe_user}', {video_id}, 'not_interested') ON CONFLICT DO NOTHING"
            )
            conn.commit()
            return _resp(200, {'ok': True})

        if action == 'more_like_this' and method == 'POST':
            video_id = int(body.get('video_id') or 0)
            if not video_id:
                return _resp(400, {'error': 'video_id required'})
            cur.execute(
                f"INSERT INTO {schema}.user_video_feedback (user_id, video_id, feedback_type) "
                f"VALUES ('{safe_user}', {video_id}, 'more_like_this') ON CONFLICT DO NOTHING"
            )
            conn.commit()
            return _resp(200, {'ok': True})

        if action == 'hide_author' and method == 'POST':
            handle = _esc((body.get('handle') or '').strip().lstrip('@'))
            if not handle:
                return _resp(400, {'error': 'handle required'})
            cur.execute(
                f"INSERT INTO {schema}.user_hidden_authors (user_id, author_handle) "
                f"VALUES ('{safe_user}', '{handle}') ON CONFLICT DO NOTHING"
            )
            conn.commit()
            return _resp(200, {'ok': True})

        if action == 'unhide_author' and method == 'POST':
            handle = _esc((body.get('handle') or '').strip().lstrip('@'))
            if not handle:
                return _resp(400, {'error': 'handle required'})
            cur.execute(
                f"DELETE FROM {schema}.user_hidden_authors WHERE user_id = '{safe_user}' AND author_handle = '{handle}'"
            )
            conn.commit()
            return _resp(200, {'ok': True})

        if action == 'list_hidden' and method == 'GET':
            cur.execute(
                f"SELECT author_handle FROM {schema}.user_hidden_authors WHERE user_id = '{safe_user}' ORDER BY created_at DESC LIMIT 500"
            )
            rows = cur.fetchall()
            return _resp(200, {'handles': [r[0] for r in rows]})

        return _resp(400, {'error': 'unknown action'})
    finally:
        cur.close()
        conn.close()