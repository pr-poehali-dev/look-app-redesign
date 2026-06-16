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


def _esc(value: str) -> str:
    return str(value or '').replace("'", "''")[:100]


def handler(event: dict, context) -> dict:
    """Подписки: action=follow|unfollow|toggle|list_following|list_followers|counts|status"""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    headers = event.get('headers') or {}
    user_id = (headers.get('X-User-Id') or headers.get('x-user-id') or '').strip()[:100]
    action = (params.get('action') or '').strip()

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        action = (body.get('action') or action).strip()

    schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
    table = f'"{schema}".follows'

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    try:
        if action == 'status' and method == 'GET':
            handle = _esc(params.get('handle', ''))
            if not user_id or not handle:
                return _resp(200, {'following': False})
            safe_user = _esc(user_id)
            cur.execute(
                f"SELECT 1 FROM {table} WHERE follower_id = '{safe_user}' AND target_handle = '{handle}' LIMIT 1"
            )
            return _resp(200, {'following': cur.fetchone() is not None})

        if action == 'counts' and method == 'GET':
            handle = _esc(params.get('handle', ''))
            if not handle:
                return _resp(400, {'error': 'handle required'})
            cur.execute(
                f"SELECT COUNT(*) FROM {table} WHERE target_handle = '{handle}'"
            )
            followers = cur.fetchone()[0]
            cur.execute(
                f"SELECT COUNT(*) FROM {table} WHERE follower_id = '{handle}'"
            )
            following_by_handle = cur.fetchone()[0]
            following_by_user = 0
            if user_id:
                safe_user = _esc(user_id)
                cur.execute(
                    f"SELECT COUNT(*) FROM {table} WHERE follower_id = '{safe_user}'"
                )
                following_by_user = cur.fetchone()[0]
            return _resp(200, {
                'followers': followers,
                'following': following_by_handle,
                'my_following': following_by_user,
            })

        if action == 'my_counts' and method == 'GET':
            if not user_id:
                return _resp(200, {'followers': 0, 'following': 0})
            safe_user = _esc(user_id)
            cur.execute(
                f"SELECT COUNT(*) FROM {table} WHERE follower_id = '{safe_user}'"
            )
            following = cur.fetchone()[0]
            cur.execute(
                f"SELECT COUNT(*) FROM {table} WHERE target_handle = '{safe_user}'"
            )
            followers = cur.fetchone()[0]
            return _resp(200, {'following': following, 'followers': followers})

        if action == 'list_following' and method == 'GET':
            who = _esc(params.get('user_id', user_id))
            if not who:
                return _resp(200, {'handles': []})
            cur.execute(
                f"SELECT target_handle FROM {table} WHERE follower_id = '{who}' ORDER BY created_at DESC LIMIT 1000"
            )
            rows = cur.fetchall()
            return _resp(200, {'handles': [r[0] for r in rows]})

        if action == 'list_followers' and method == 'GET':
            target = _esc(params.get('handle', user_id))
            if not target:
                return _resp(200, {'followers': []})
            cur.execute(
                f"SELECT follower_id FROM {table} WHERE target_handle = '{target}' ORDER BY created_at DESC LIMIT 1000"
            )
            rows = cur.fetchall()
            return _resp(200, {'followers': [r[0] for r in rows]})

        if method == 'POST':
            body = json.loads(event.get('body') or '{}')
            target_handle = _esc((body.get('handle') or '').strip().lstrip('@'))
            if not user_id:
                return _resp(401, {'error': 'X-User-Id required'})
            if not target_handle:
                return _resp(400, {'error': 'handle required'})

            safe_user = _esc(user_id)
            if safe_user == target_handle:
                return _resp(400, {'error': 'cannot follow yourself'})

            if action in ('follow', 'toggle'):
                try:
                    cur.execute(
                        f"SELECT handle FROM \"{schema}\".app_users WHERE id = '{safe_user}' LIMIT 1"
                    )
                    me = cur.fetchone()
                    my_handle = (me[0] if me and me[0] else '').lstrip('@').lower()
                    if my_handle and my_handle == target_handle.lstrip('@').lower():
                        return _resp(400, {'error': 'cannot follow yourself'})
                except Exception:
                    pass

            if action == 'follow':
                cur.execute(
                    f"INSERT INTO {table} (follower_id, target_handle) VALUES ('{safe_user}', '{target_handle}') ON CONFLICT DO NOTHING"
                )
                conn.commit()
                return _resp(200, {'following': True})

            if action == 'unfollow':
                cur.execute(
                    f"DELETE FROM {table} WHERE follower_id = '{safe_user}' AND target_handle = '{target_handle}'"
                )
                conn.commit()
                return _resp(200, {'following': False})

            if action == 'toggle':
                cur.execute(
                    f"SELECT 1 FROM {table} WHERE follower_id = '{safe_user}' AND target_handle = '{target_handle}' LIMIT 1"
                )
                exists = cur.fetchone() is not None
                if exists:
                    cur.execute(
                        f"DELETE FROM {table} WHERE follower_id = '{safe_user}' AND target_handle = '{target_handle}'"
                    )
                    conn.commit()
                    return _resp(200, {'following': False})
                cur.execute(
                    f"INSERT INTO {table} (follower_id, target_handle) VALUES ('{safe_user}', '{target_handle}') ON CONFLICT DO NOTHING"
                )
                conn.commit()
                return _resp(200, {'following': True})

        return _resp(400, {'error': 'unknown action'})
    finally:
        cur.close()
        conn.close()