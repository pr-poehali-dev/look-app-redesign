import json
import os
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    'Access-Control-Max-Age': '86400',
}

NOTIF_FIELDS = "id, type, title, message, entity_type, entity_id, is_read, created_at"


def _resp(status, payload):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(payload)}


def _row_to_notif(r):
    return {
        'id': r[0], 'type': r[1], 'title': r[2], 'message': r[3],
        'entity_type': r[4], 'entity_id': r[5], 'is_read': bool(r[6]),
        'created_at': r[7].isoformat() if r[7] else None,
    }


def handler(event: dict, context) -> dict:
    """Уведомления пользователя: список, счётчик непрочитанных, отметка прочитанным (по одному и всех)."""
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
        if method == 'GET' and action == 'list':
            limit = 50
            try:
                limit = min(int(params.get('limit', 50)), 100)
            except Exception:
                pass
            cur.execute(
                f"SELECT {NOTIF_FIELDS} FROM {schema}.notifications "
                f"WHERE user_id = %s ORDER BY id DESC LIMIT %s",
                (user_id, limit)
            )
            notifications = [_row_to_notif(r) for r in cur.fetchall()]
            return _resp(200, {'notifications': notifications})

        if method == 'GET' and action == 'unread_count':
            cur.execute(
                f"SELECT COUNT(*) FROM {schema}.notifications WHERE user_id = %s AND is_read = FALSE",
                (user_id,)
            )
            count = cur.fetchone()[0]
            return _resp(200, {'count': count})

        if method == 'POST' and action == 'mark_read':
            body = json.loads(event.get('body') or '{}')
            notif_id = body.get('id')
            if not notif_id:
                return _resp(400, {'error': 'id required'})
            cur.execute(
                f"UPDATE {schema}.notifications SET is_read = TRUE WHERE id = %s AND user_id = %s",
                (notif_id, user_id)
            )
            conn.commit()
            return _resp(200, {'ok': True})

        if method == 'POST' and action == 'mark_all_read':
            cur.execute(
                f"UPDATE {schema}.notifications SET is_read = TRUE WHERE user_id = %s AND is_read = FALSE",
                (user_id,)
            )
            conn.commit()
            return _resp(200, {'ok': True})

        return _resp(405, {'error': 'Method not allowed'})
    finally:
        cur.close()
        conn.close()
