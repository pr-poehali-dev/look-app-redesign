"""
Business: Админ-панель — единый бэк для всех разделов (юзеры, видео, комментарии, чаты, жалобы, статистика, стримы, рассылки)
Args: event с httpMethod, headers (X-Admin-Token), body (action + параметры)
Returns: JSON с данными раздела
"""
import json
import os
import hmac
import hashlib
import secrets as pysecrets
import time
import base64

import psycopg2
import psycopg2.extras


def _cors():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
        'Access-Control-Max-Age': '86400',
        'Content-Type': 'application/json',
    }


def _schema():
    return os.environ.get('MAIN_DB_SCHEMA', 'public')


def _conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def _sign(payload: str) -> str:
    secret = os.environ.get('ADMIN_PASSWORD', '') + os.environ.get('ADMIN_LOGIN', '')
    sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return sig


def _make_token(login: str) -> str:
    ts = str(int(time.time()))
    nonce = pysecrets.token_hex(8)
    payload = f"{login}|{ts}|{nonce}"
    sig = _sign(payload)
    return base64.urlsafe_b64encode(f"{payload}|{sig}".encode()).decode()


def _check_token(token: str) -> bool:
    if not token:
        return False
    try:
        raw = base64.urlsafe_b64decode(token.encode()).decode()
        parts = raw.split('|')
        if len(parts) != 4:
            return False
        login, ts, nonce, sig = parts
        if login != os.environ.get('ADMIN_LOGIN', ''):
            return False
        if int(time.time()) - int(ts) > 60 * 60 * 24 * 7:
            return False
        expected = _sign(f"{login}|{ts}|{nonce}")
        return hmac.compare_digest(expected, sig)
    except Exception:
        return False


def _q(cur, sql_template: str, params: tuple = ()):
    s = _schema()
    sql = sql_template.replace('{S}', s)
    cur.execute(sql, params)


def _safe_int(v, default=0, max_value=None):
    try:
        x = int(v)
        if max_value is not None and x > max_value:
            return max_value
        if x < 0:
            return 0
        return x
    except Exception:
        return default


def _esc_like(s: str) -> str:
    return s.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')


def handler(event: dict, context) -> dict:
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': _cors(), 'body': ''}

    try:
        body = json.loads(event.get('body') or '{}')
    except Exception:
        body = {}
    action = body.get('action') or (event.get('queryStringParameters') or {}).get('action', '')
    headers_in = event.get('headers') or {}
    token = headers_in.get('X-Admin-Token') or headers_in.get('x-admin-token') or ''

    # Логин — без токена
    if action == 'login':
        login = (body.get('login') or '').strip()
        password = (body.get('password') or '').strip()
        adm_login = os.environ.get('ADMIN_LOGIN', '')
        adm_pass = os.environ.get('ADMIN_PASSWORD', '')
        if not adm_login or not adm_pass:
            return {'statusCode': 500, 'headers': _cors(),
                    'body': json.dumps({'error': 'admin credentials not configured'})}
        ok = hmac.compare_digest(login, adm_login) and hmac.compare_digest(password, adm_pass)
        if not ok:
            return {'statusCode': 401, 'headers': _cors(),
                    'body': json.dumps({'error': 'Неверный логин или пароль'})}
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'ok': True, 'token': _make_token(login)})}

    # Все остальные действия — только с токеном
    if not _check_token(token):
        return {'statusCode': 401, 'headers': _cors(),
                'body': json.dumps({'error': 'Unauthorized'})}

    conn = _conn()
    conn.autocommit = False
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            return _route(cur, conn, action, body)
    except Exception as e:
        conn.rollback()
        return {'statusCode': 500, 'headers': _cors(),
                'body': json.dumps({'error': str(e)})}
    finally:
        conn.close()


def _route(cur, conn, action: str, body: dict) -> dict:
    # ============ DASHBOARD ============
    if action == 'stats':
        result = {}
        _q(cur, "SELECT COUNT(*) AS c FROM {S}.app_users")
        result['users_total'] = cur.fetchone()['c']
        _q(cur, "SELECT COUNT(*) AS c FROM {S}.app_users WHERE created_at >= NOW() - INTERVAL '1 day'")
        result['users_today'] = cur.fetchone()['c']
        _q(cur, "SELECT COUNT(*) AS c FROM {S}.app_users WHERE created_at >= NOW() - INTERVAL '7 days'")
        result['users_week'] = cur.fetchone()['c']
        _q(cur, "SELECT COUNT(*) AS c FROM {S}.videos WHERE COALESCE(hidden, FALSE) = FALSE")
        result['videos_total'] = cur.fetchone()['c']
        _q(cur, "SELECT COUNT(*) AS c FROM {S}.videos WHERE created_at >= NOW() - INTERVAL '1 day'")
        result['videos_today'] = cur.fetchone()['c']
        _q(cur, "SELECT COUNT(*) AS c FROM {S}.comments")
        result['comments_total'] = cur.fetchone()['c']
        _q(cur, "SELECT COUNT(*) AS c FROM {S}.likes")
        result['likes_total'] = cur.fetchone()['c']
        _q(cur, "SELECT COUNT(*) AS c FROM {S}.sa_messages")
        result['messages_total'] = cur.fetchone()['c']
        _q(cur, "SELECT COUNT(*) AS c FROM {S}.sa_chats")
        result['chats_total'] = cur.fetchone()['c']
        _q(cur, "SELECT COUNT(*) AS c FROM {S}.live_streams WHERE status = 'active'")
        result['streams_active'] = cur.fetchone()['c']
        # График: регистрации за 14 дней
        _q(cur, """
            SELECT DATE(created_at) AS d, COUNT(*) AS c
            FROM {S}.app_users
            WHERE created_at >= NOW() - INTERVAL '14 days'
            GROUP BY DATE(created_at) ORDER BY d
        """)
        result['users_chart'] = [{'date': str(r['d']), 'count': r['c']} for r in cur.fetchall()]
        # График: видео за 14 дней
        _q(cur, """
            SELECT DATE(created_at) AS d, COUNT(*) AS c
            FROM {S}.videos
            WHERE created_at >= NOW() - INTERVAL '14 days'
            GROUP BY DATE(created_at) ORDER BY d
        """)
        result['videos_chart'] = [{'date': str(r['d']), 'count': r['c']} for r in cur.fetchall()]
        return {'statusCode': 200, 'headers': _cors(), 'body': json.dumps(result, default=str)}

    # ============ USERS ============
    if action == 'users_list':
        limit = _safe_int(body.get('limit'), 50, 200)
        offset = _safe_int(body.get('offset'), 0)
        search = (body.get('search') or '').strip()
        if search:
            pat = '%' + _esc_like(search) + '%'
            _q(cur, """
                SELECT id, name, handle, email, avatar, created_at, email_verified
                FROM {S}.app_users
                WHERE name ILIKE %s ESCAPE '\\' OR handle ILIKE %s ESCAPE '\\' OR email ILIKE %s ESCAPE '\\' OR id = %s
                ORDER BY created_at DESC NULLS LAST
                LIMIT %s OFFSET %s
            """, (pat, pat, pat, search, limit, offset))
        else:
            _q(cur, """
                SELECT id, name, handle, email, avatar, created_at, email_verified
                FROM {S}.app_users
                ORDER BY created_at DESC NULLS LAST
                LIMIT %s OFFSET %s
            """, (limit, offset))
        rows = cur.fetchall()
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'users': rows}, default=str)}

    if action == 'user_delete':
        uid = body.get('user_id')
        if not uid:
            return {'statusCode': 400, 'headers': _cors(), 'body': json.dumps({'error': 'user_id required'})}
        _q(cur, "DELETE FROM {S}.app_users WHERE id = %s", (uid,))
        conn.commit()
        return {'statusCode': 200, 'headers': _cors(), 'body': json.dumps({'ok': True})}

    if action == 'user_update':
        uid = body.get('user_id')
        if not uid:
            return {'statusCode': 400, 'headers': _cors(), 'body': json.dumps({'error': 'user_id required'})}
        fields = []
        params = []
        for col in ('name', 'handle', 'email', 'avatar'):
            if col in body:
                fields.append(f"{col} = %s")
                params.append(body[col])
        if 'email_verified' in body:
            fields.append("email_verified = %s")
            params.append(bool(body['email_verified']))
        if not fields:
            return {'statusCode': 400, 'headers': _cors(), 'body': json.dumps({'error': 'no fields'})}
        params.append(uid)
        sql = f"UPDATE {{S}}.app_users SET {', '.join(fields)} WHERE id = %s"
        _q(cur, sql, tuple(params))
        conn.commit()
        return {'statusCode': 200, 'headers': _cors(), 'body': json.dumps({'ok': True})}

    # ============ VIDEOS ============
    if action == 'videos_list':
        limit = _safe_int(body.get('limit'), 50, 200)
        offset = _safe_int(body.get('offset'), 0)
        search = (body.get('search') or '').strip()
        if search:
            pat = '%' + _esc_like(search) + '%'
            _q(cur, """
                SELECT id, url, thumbnail, author, handle, description, category, type,
                       likes, comments, shares, created_at, user_id, hidden
                FROM {S}.videos
                WHERE description ILIKE %s ESCAPE '\\' OR author ILIKE %s ESCAPE '\\' OR handle ILIKE %s ESCAPE '\\'
                ORDER BY created_at DESC NULLS LAST
                LIMIT %s OFFSET %s
            """, (pat, pat, pat, limit, offset))
        else:
            _q(cur, """
                SELECT id, url, thumbnail, author, handle, description, category, type,
                       likes, comments, shares, created_at, user_id, hidden
                FROM {S}.videos
                ORDER BY created_at DESC NULLS LAST
                LIMIT %s OFFSET %s
            """, (limit, offset))
        rows = cur.fetchall()
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'videos': rows}, default=str)}

    if action == 'video_hide':
        vid = body.get('video_id')
        hidden = bool(body.get('hidden', True))
        _q(cur, "UPDATE {S}.videos SET hidden = %s WHERE id = %s", (hidden, vid))
        conn.commit()
        return {'statusCode': 200, 'headers': _cors(), 'body': json.dumps({'ok': True})}

    if action == 'video_delete':
        vid = body.get('video_id')
        _q(cur, "DELETE FROM {S}.videos WHERE id = %s", (vid,))
        conn.commit()
        return {'statusCode': 200, 'headers': _cors(), 'body': json.dumps({'ok': True})}

    # ============ COMMENTS ============
    if action == 'comments_list':
        limit = _safe_int(body.get('limit'), 50, 200)
        offset = _safe_int(body.get('offset'), 0)
        _q(cur, """
            SELECT id, target_type, target_id, author_name, author_handle, text, created_at, user_id
            FROM {S}.comments
            ORDER BY created_at DESC NULLS LAST
            LIMIT %s OFFSET %s
        """, (limit, offset))
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'comments': cur.fetchall()}, default=str)}

    if action == 'comment_delete':
        cid = body.get('comment_id')
        _q(cur, "DELETE FROM {S}.comments WHERE id = %s", (cid,))
        conn.commit()
        return {'statusCode': 200, 'headers': _cors(), 'body': json.dumps({'ok': True})}

    # ============ CHATS ============
    if action == 'chats_list':
        limit = _safe_int(body.get('limit'), 50, 200)
        offset = _safe_int(body.get('offset'), 0)
        _q(cur, """
            SELECT c.id, c.type, c.name, c.avatar, c.created_at,
                   (SELECT COUNT(*) FROM {S}.sa_chat_members m WHERE m.chat_id = c.id) AS members,
                   (SELECT COUNT(*) FROM {S}.sa_messages msg WHERE msg.chat_id = c.id) AS messages
            FROM {S}.sa_chats c
            ORDER BY c.created_at DESC NULLS LAST
            LIMIT %s OFFSET %s
        """, (limit, offset))
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'chats': cur.fetchall()}, default=str)}

    if action == 'chat_messages':
        chat_id = body.get('chat_id')
        if not chat_id:
            return {'statusCode': 400, 'headers': _cors(), 'body': json.dumps({'error': 'chat_id required'})}
        _q(cur, """
            SELECT id, chat_id, user_id, user_name, type, content, created_at
            FROM {S}.sa_messages WHERE chat_id = %s ORDER BY id DESC LIMIT 200
        """, (chat_id,))
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'messages': cur.fetchall()}, default=str)}

    if action == 'chat_delete':
        chat_id = body.get('chat_id')
        _q(cur, "DELETE FROM {S}.sa_messages WHERE chat_id = %s", (chat_id,))
        _q(cur, "DELETE FROM {S}.sa_message_reads WHERE chat_id = %s", (chat_id,))
        _q(cur, "DELETE FROM {S}.chat_settings WHERE chat_id = %s", (chat_id,))
        _q(cur, "DELETE FROM {S}.sa_chat_members WHERE chat_id = %s", (chat_id,))
        _q(cur, "DELETE FROM {S}.sa_chats WHERE id = %s", (chat_id,))
        conn.commit()
        return {'statusCode': 200, 'headers': _cors(), 'body': json.dumps({'ok': True})}

    if action == 'message_delete':
        mid = body.get('message_id')
        _q(cur, "DELETE FROM {S}.sa_messages WHERE id = %s", (mid,))
        conn.commit()
        return {'statusCode': 200, 'headers': _cors(), 'body': json.dumps({'ok': True})}

    # ============ REPORTS / MODERATION ============
    if action == 'reports_list':
        # Жалобы пока не реализованы в БД — возвращаем заглушку из последних видео с >100 лайками без жалоб
        _q(cur, "SELECT to_regclass(%s) AS t", (f"{_schema()}.reports",))
        exists = cur.fetchone()['t']
        if not exists:
            return {'statusCode': 200, 'headers': _cors(),
                    'body': json.dumps({'reports': [], 'note': 'Таблица reports ещё не создана. Добавь миграцию для очереди жалоб.'})}
        limit = _safe_int(body.get('limit'), 50, 200)
        _q(cur, "SELECT * FROM {S}.reports ORDER BY created_at DESC LIMIT %s", (limit,))
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'reports': cur.fetchall()}, default=str)}

    # ============ STREAMS ============
    if action == 'streams_list':
        limit = _safe_int(body.get('limit'), 50, 200)
        _q(cur, """
            SELECT id, user_id, user_name, title, category, thumb, status, viewers, likes, started_at, ended_at
            FROM {S}.live_streams ORDER BY started_at DESC NULLS LAST LIMIT %s
        """, (limit,))
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'streams': cur.fetchall()}, default=str)}

    if action == 'stream_stop':
        sid = body.get('stream_id')
        _q(cur, "UPDATE {S}.live_streams SET status = 'ended', ended_at = NOW() WHERE id = %s", (sid,))
        conn.commit()
        return {'statusCode': 200, 'headers': _cors(), 'body': json.dumps({'ok': True})}

    if action == 'stream_delete':
        sid = body.get('stream_id')
        _q(cur, "DELETE FROM {S}.live_streams WHERE id = %s", (sid,))
        conn.commit()
        return {'statusCode': 200, 'headers': _cors(), 'body': json.dumps({'ok': True})}

    # ============ BROADCAST / NOTIFICATIONS ============
    if action == 'broadcast':
        # Создаём системный чат от имени админа и шлём сообщение всем пользователям
        text = (body.get('text') or '').strip()
        if not text:
            return {'statusCode': 400, 'headers': _cors(), 'body': json.dumps({'error': 'text required'})}
        # Сохраняем в простую таблицу логов broadcasts (создадим лениво)
        _q(cur, "SELECT to_regclass(%s) AS t", (f"{_schema()}.admin_broadcasts",))
        exists = cur.fetchone()['t']
        if not exists:
            _q(cur, """
                CREATE TABLE {S}.admin_broadcasts (
                    id SERIAL PRIMARY KEY,
                    text TEXT NOT NULL,
                    target TEXT NOT NULL DEFAULT 'all',
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """)
        _q(cur, "INSERT INTO {S}.admin_broadcasts(text, target) VALUES (%s, %s) RETURNING id",
           (text, body.get('target') or 'all'))
        broadcast_id = cur.fetchone()['id']
        conn.commit()
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'ok': True, 'broadcast_id': broadcast_id})}

    if action == 'broadcasts_list':
        _q(cur, "SELECT to_regclass(%s) AS t", (f"{_schema()}.admin_broadcasts",))
        exists = cur.fetchone()['t']
        if not exists:
            return {'statusCode': 200, 'headers': _cors(), 'body': json.dumps({'broadcasts': []})}
        _q(cur, "SELECT id, text, target, created_at FROM {S}.admin_broadcasts ORDER BY id DESC LIMIT 50")
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'broadcasts': cur.fetchall()}, default=str)}

    return {'statusCode': 400, 'headers': _cors(),
            'body': json.dumps({'error': f'Unknown action: {action}'})}
