import json
import os
import psycopg2
from urllib.parse import unquote


def handler(event: dict, context) -> dict:
    """Проверка пользователя для signaling/SFU сервера: возвращает {id, name, avatar} по X-User-Id"""
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-User-Name, X-Auth-Token, Authorization',
        'Content-Type': 'application/json'
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    req_headers = event.get('headers') or {}
    headers_lc = {k.lower(): v for k, v in req_headers.items()}

    user_id = headers_lc.get('x-user-id') or ''
    user_name_hdr = headers_lc.get('x-user-name') or ''

    if not user_id and event.get('httpMethod') == 'POST':
        try:
            body = json.loads(event.get('body') or '{}')
            user_id = body.get('userId') or body.get('id') or ''
            if not user_name_hdr:
                user_name_hdr = body.get('name') or ''
        except Exception:
            pass

    if not user_id:
        return {'statusCode': 401, 'headers': headers,
                'body': json.dumps({'ok': False, 'error': 'no user id'})}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, name, avatar FROM sa_users WHERE id = %s", (user_id,))
        row = cur.fetchone()

        if row:
            uid, name, avatar = row
            return {'statusCode': 200, 'headers': headers,
                    'body': json.dumps({'ok': True, 'id': uid, 'name': name or 'User', 'avatar': avatar or ''})}

        name = unquote(user_name_hdr) if user_name_hdr else 'Гость'
        cur.execute(
            "INSERT INTO sa_users (id, name, online_at) VALUES (%s, %s, NOW()) "
            "ON CONFLICT (id) DO NOTHING",
            (user_id, name)
        )
        conn.commit()
        return {'statusCode': 200, 'headers': headers,
                'body': json.dumps({'ok': True, 'id': user_id, 'name': name, 'avatar': ''})}
    finally:
        cur.close()
        conn.close()
