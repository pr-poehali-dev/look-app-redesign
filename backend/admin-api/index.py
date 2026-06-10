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

try:
    import pymysql
except ImportError:
    pymysql = None


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
    # Подпись стабильна даже если секреты ещё не заданы — используем фиксированный fallback
    secret = (os.environ.get('ADMIN_PASSWORD', '') + os.environ.get('ADMIN_LOGIN', '')) or 'admin-fallback-secret-v1'
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
        adm_login = os.environ.get('ADMIN_LOGIN', '')
        if login != adm_login and login != 'test@test':
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


def _send_admin_reset_request(to_email: str, requested_by: str) -> bool:
    """Отправляет уведомление о запросе сброса пароля админки на почту поддержки."""
    import smtplib
    import ssl
    from email.mime.text import MIMEText
    from email.utils import formataddr

    host = os.environ.get('SMTP_HOST', '').strip()
    user = os.environ.get('SMTP_USER', '').strip()
    password = os.environ.get('SMTP_PASSWORD', '')
    if not host or not user or not password:
        return False
    try:
        port = int(os.environ.get('SMTP_PORT', '465') or '465')
    except ValueError:
        port = 465
    from_name = os.environ.get('SMTP_FROM_NAME', '').strip() or 'Look Admin'

    subject = 'Запрос на сброс пароля админ-панели'
    html_body = (
        '<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111">'
        '<h2 style="margin:0 0 12px">Запрос на сброс пароля админ-панели</h2>'
        f'<p style="margin:0 0 8px">Указанная почта: <b>{requested_by or "—"}</b></p>'
        f'<p style="margin:0 0 8px;color:#666">Время: {int(time.time())}</p>'
        '<p style="margin:16px 0 0;color:#999;font-size:13px">Если это были не вы — проигнорируйте письмо.</p>'
        '</div>'
    )

    msg = MIMEText(html_body, 'html', 'utf-8')
    msg['Subject'] = subject
    msg['From'] = formataddr((from_name, user))
    msg['To'] = to_email
    msg.set_type('text/html')

    try:
        ctx = ssl.create_default_context()
        if port == 465:
            with smtplib.SMTP_SSL(host, port, context=ctx, timeout=20) as srv:
                srv.login(user, password)
                srv.sendmail(user, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(host, port, timeout=20) as srv:
                srv.ehlo(); srv.starttls(context=ctx); srv.ehlo()
                srv.login(user, password)
                srv.sendmail(user, [to_email], msg.as_string())
        return True
    except Exception:
        return False


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

    # Создание жалобы — публичный endpoint, без токена
    if action == 'report_create':
        target_type = (body.get('target_type') or '').strip()
        target_id = str(body.get('target_id') or '').strip()
        reason = (body.get('reason') or 'other').strip()[:50]
        comment_txt = (body.get('comment') or '').strip()[:2000]
        reporter_id = (body.get('reporter_id') or 'anon').strip()
        reporter_name = (body.get('reporter_name') or '').strip()[:100]
        allowed_types = {'video', 'comment', 'user', 'chat', 'message', 'stream', 'post'}
        if target_type not in allowed_types or not target_id:
            return {'statusCode': 400, 'headers': _cors(),
                    'body': json.dumps({'error': 'target_type/target_id required'})}
        conn = _conn()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                _q(cur, """
                    INSERT INTO {S}.reports(target_type, target_id, reason, comment, reporter_id, reporter_name, status)
                    VALUES (%s, %s, %s, %s, %s, %s, 'open') RETURNING id
                """, (target_type, target_id, reason, comment_txt, reporter_id, reporter_name))
                rid = cur.fetchone()['id']
                conn.commit()
            return {'statusCode': 200, 'headers': _cors(),
                    'body': json.dumps({'ok': True, 'report_id': rid})}
        finally:
            conn.close()

    # Логин — без токена
    if action == 'login':
        login = (body.get('login') or '').strip()
        password = (body.get('password') or '').strip()
        adm_login = os.environ.get('ADMIN_LOGIN', '')
        adm_pass = os.environ.get('ADMIN_PASSWORD', '')
        # Тестовый доступ: test@test / test@test всегда работает
        test_ok = hmac.compare_digest(login, 'test@test') and hmac.compare_digest(password, 'test@test')
        prod_ok = bool(adm_login) and bool(adm_pass) and \
                  hmac.compare_digest(login, adm_login) and hmac.compare_digest(password, adm_pass)
        if not (test_ok or prod_ok):
            return {'statusCode': 401, 'headers': _cors(),
                    'body': json.dumps({'error': 'Неверный логин или пароль'})}
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'ok': True, 'token': _make_token(login)})}

    # Восстановление пароля админа — без токена. Уведомление уходит на почту поддержки.
    if action == 'forgot_password':
        req_email = (body.get('email') or '').strip()[:200]
        support_email = os.environ.get('SUPPORT_EMAIL', 'support@visov.ru')
        _send_admin_reset_request(support_email, req_email)
        # Всегда отвечаем ok, чтобы не раскрывать существование почты
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'ok': True})}

    # Публичные настройки (политика, условия) — без токена
    if action == 'settings_public_get':
        conn = _conn()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                _q(cur, "SELECT key, value FROM {S}.app_settings WHERE key IN ('privacy_policy', 'terms_of_use')")
                rows = cur.fetchall()
                settings = {r['key']: r['value'] for r in rows}
            return {'statusCode': 200, 'headers': _cors(),
                    'body': json.dumps({'settings': settings}, ensure_ascii=False)}
        finally:
            conn.close()

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
    # ============ SETTINGS ============
    if action == 'settings_get':
        _q(cur, "SELECT key, value FROM {S}.app_settings")
        rows = cur.fetchall()
        settings = {r['key']: r['value'] for r in rows}
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'settings': settings}, ensure_ascii=False)}

    if action == 'settings_save':
        key = (body.get('key') or '').strip()
        value = body.get('value') or ''
        allowed_keys = {'privacy_policy', 'terms_of_use'}
        if key not in allowed_keys:
            return {'statusCode': 400, 'headers': _cors(),
                    'body': json.dumps({'error': 'invalid key'})}
        _q(cur, """
            INSERT INTO {S}.app_settings (key, value, updated_at) VALUES (%s, %s, NOW())
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        """, (key, value))
        conn.commit()
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'ok': True})}

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
        _q(cur, "SELECT COUNT(*) AS c FROM {S}.reports WHERE status = 'open'")
        result['reports_open'] = cur.fetchone()['c']
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

    if action == 'video_save_thumbnail':
        vid = body.get('video_id')
        thumb_data_b64 = body.get('thumb_data')
        if not vid or not thumb_data_b64:
            return {'statusCode': 400, 'headers': _cors(), 'body': json.dumps({'error': 'bad params'})}
        # Проверяем что thumbnail ещё не сохранён
        _q(cur, "SELECT thumbnail FROM {S}.videos WHERE id = %s", (vid,))
        row = cur.fetchone()
        if not row:
            return {'statusCode': 404, 'headers': _cors(), 'body': json.dumps({'error': 'not found'})}
        if row[0]:
            return {'statusCode': 200, 'headers': _cors(), 'body': json.dumps({'ok': True, 'skipped': True})}
        import boto3, uuid as _uuid, base64 as _b64
        thumb_bytes = _b64.b64decode(thumb_data_b64)
        thumb_key = f"thumbs/{_uuid.uuid4().hex}.jpg"
        s3c = boto3.client('s3', endpoint_url='https://bucket.poehali.dev',
            aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
            aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])
        s3c.put_object(Bucket='files', Key=thumb_key, Body=thumb_bytes, ContentType='image/jpeg')
        thumb_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{thumb_key}"
        _q(cur, "UPDATE {S}.videos SET thumbnail = %s WHERE id = %s", (thumb_url, vid))
        conn.commit()
        return {'statusCode': 200, 'headers': _cors(), 'body': json.dumps({'ok': True, 'thumb': thumb_url})}

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

    if action == 'videos_broken_list':
        # Видео, ссылающиеся на внешний домен short-video.ru — почти все из них недоступны
        _q(cur, """
            SELECT id, author, handle, url, created_at
            FROM {S}.videos
            WHERE url LIKE 'https://short-video.ru/%' OR url LIKE 'http://short-video.ru/%'
            ORDER BY id DESC
        """)
        rows = cur.fetchall()
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'videos': rows, 'total': len(rows)}, default=str)}

    if action == 'videos_broken_delete':
        _q(cur, """
            DELETE FROM {S}.videos
            WHERE url LIKE 'https://short-video.ru/%' OR url LIKE 'http://short-video.ru/%'
        """)
        affected = cur.rowcount
        conn.commit()
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'ok': True, 'affected': affected})}

    if action == 'videos_match_authors_preview' or action == 'videos_match_authors_run':
        # Сопоставляем "архивные" видео с реальными авторами из MySQL short-video.ru
        # Связь: description ('1757844620 Look finalvideo') ↔ post_file ('1757844620_Look_finalvideo.mp4')
        if pymysql is None:
            return {'statusCode': 500, 'headers': _cors(),
                    'body': json.dumps({'error': 'pymysql not installed'})}
        mysql_pwd = os.environ.get('SHORT_VIDEO_DB_PASSWORD', '')
        if not mysql_pwd:
            return {'statusCode': 500, 'headers': _cors(),
                    'body': json.dumps({'error': 'SHORT_VIDEO_DB_PASSWORD not set'})}

        # 1. Берём наши архивные видео
        _q(cur, """
            SELECT id, description, author, handle
            FROM {S}.videos
            WHERE (author = 'Архив' OR handle = 'archive' OR user_id = 'legacy-import')
        """)
        legacy_rows = cur.fetchall()
        if not legacy_rows:
            return {'statusCode': 200, 'headers': _cors(),
                    'body': json.dumps({'ok': True, 'total': 0, 'matched': 0, 'updated': 0, 'samples': []})}

        # Строим ключи поиска: 'finalvideo', 'кака...', и т.п. — берём всё описание
        # Также из описания вытаскиваем "тело" имени файла (всё после 'Look ')
        def desc_to_key(s: str) -> str:
            if not s:
                return ''
            # Нормализация: убрать множественные пробелы
            return ' '.join(s.split()).strip()

        keys = {desc_to_key(r['description']): r['id'] for r in legacy_rows if r['description']}

        # 2. Тянем посты + авторов из MySQL
        mysql = pymysql.connect(
            host='alexei3y.beget.tech',
            port=3306,
            user='alexei3y_tiktoks',
            password=mysql_pwd,
            database='alexei3y_tiktoks',
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor,
            connect_timeout=10,
        )
        try:
            with mysql.cursor() as mc:
                mc.execute("""
                    SELECT p.post_file, p.post_description, u.username, u.name, u.profile_image
                    FROM tbl_posts p
                    LEFT JOIN tbl_users u ON p.user_id = u.id
                    WHERE p.post_type = 'video' AND p.post_file IS NOT NULL AND p.post_file <> ''
                """)
                mysql_posts = mc.fetchall()
        finally:
            mysql.close()

        # 3. Матчинг
        # post_file = '1757844620_Look_finalvideo.mp4' → ключ '1757844620 Look finalvideo'
        def file_to_key(fname: str) -> str:
            if not fname:
                return ''
            # обрезаем расширение
            name = fname.rsplit('/', 1)[-1]
            if '.' in name:
                name = name.rsplit('.', 1)[0]
            return name.replace('_', ' ').strip()

        matches = []  # list of dicts {video_id, author_name, handle, avatar, description}
        for p in mysql_posts:
            key = file_to_key(p.get('post_file') or '')
            if not key:
                continue
            vid_id = keys.get(key)
            if not vid_id:
                continue
            author_name = (p.get('name') or p.get('username') or '').strip()
            handle = (p.get('username') or '').strip()
            avatar = p.get('profile_image') or ''
            if avatar and not avatar.startswith('http'):
                avatar = 'https://short-video.ru/uploads/' + avatar
            real_desc = (p.get('post_description') or '').strip()
            matches.append({
                'video_id': vid_id,
                'author': author_name or 'Пользователь',
                'handle': handle or 'user',
                'thumbnail_new': avatar,
                'description': real_desc,
            })

        if action == 'videos_match_authors_preview':
            samples = matches[:10]
            return {'statusCode': 200, 'headers': _cors(),
                    'body': json.dumps({
                        'total_legacy': len(legacy_rows),
                        'matched': len(matches),
                        'samples': samples,
                    }, ensure_ascii=False, default=str)}

        # action == 'videos_match_authors_run'
        updated = 0
        for m in matches:
            # Не перетираем thumbnail если новый пустой
            if m['thumbnail_new']:
                _q(cur, """
                    UPDATE {S}.videos
                    SET author = %s, handle = %s, description = %s, thumbnail = %s
                    WHERE id = %s
                """, (m['author'], m['handle'], m['description'], m['thumbnail_new'], m['video_id']))
            else:
                _q(cur, """
                    UPDATE {S}.videos
                    SET author = %s, handle = %s, description = %s
                    WHERE id = %s
                """, (m['author'], m['handle'], m['description'], m['video_id']))
            updated += 1
        conn.commit()
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'ok': True, 'updated': updated, 'total_legacy': len(legacy_rows)}, default=str)}

    if action == 'videos_delete_broken_cdn':
        # Удалить видео с битыми URL вида /bucket/legacy/uploads/ (файлы не существуют на CDN)
        schema = _schema()
        cur.execute(f"SELECT id FROM {schema}.videos WHERE url LIKE %s", ('%/bucket/legacy/uploads/%',))
        ids = [r['id'] for r in cur.fetchall()]
        if not ids:
            return {'statusCode': 200, 'headers': _cors(),
                    'body': json.dumps({'ok': True, 'deleted': 0})}
        ids_str_list = [str(x) for x in ids]
        cur.execute(
            f"DELETE FROM {schema}.likes WHERE target_type = 'video' AND target_id = ANY(%s::text[])",
            (ids_str_list,)
        )
        cur.execute(
            f"DELETE FROM {schema}.comments WHERE target_type = 'video' AND target_id = ANY(%s::text[])",
            (ids_str_list,)
        )
        cur.execute(
            f"DELETE FROM {schema}.videos WHERE id = ANY(%s::int[])",
            (ids,)
        )
        affected = cur.rowcount
        conn.commit()
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'ok': True, 'deleted': affected})}

    if action == 'videos_delete_archive':
        # Удалить все видео где автор "Архив" и handle "archive"
        _q(cur, """
            SELECT id FROM {S}.videos
            WHERE author = 'Архив' AND handle = 'archive'
        """)
        ids = [r['id'] for r in cur.fetchall()]
        if not ids:
            return {'statusCode': 200, 'headers': _cors(),
                    'body': json.dumps({'ok': True, 'deleted': 0})}
        ids_str = [str(x) for x in ids]
        _q(cur, "DELETE FROM {S}.likes WHERE target_type = 'video' AND target_id = ANY(%s)", (ids_str,))
        _q(cur, "DELETE FROM {S}.comments WHERE target_type = 'video' AND target_id = ANY(%s)", (ids_str,))
        _q(cur, "DELETE FROM {S}.videos WHERE id = ANY(%s)", (ids,))
        affected = cur.rowcount
        conn.commit()
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'ok': True, 'deleted': affected})}

    if action == 'videos_cleanup_preview':
        # Предпросмотр очистки: сколько скрытых и сколько дублей удалится
        _q(cur, "SELECT COUNT(*) AS c FROM {S}.videos WHERE COALESCE(hidden, FALSE) = TRUE")
        hidden_cnt = cur.fetchone()['c']
        _q(cur, """
            SELECT COUNT(*) AS c FROM (
                SELECT id, ROW_NUMBER() OVER (
                    PARTITION BY author, description
                    ORDER BY (CASE WHEN COALESCE(hidden, FALSE) THEN 1 ELSE 0 END) ASC,
                             created_at ASC, id ASC
                ) AS rn
                FROM {S}.videos
                WHERE COALESCE(description, '') <> ''
            ) t WHERE rn > 1
        """)
        dup_cnt = cur.fetchone()['c']
        _q(cur, """
            SELECT COUNT(DISTINCT v.id) AS c
            FROM {S}.videos v
            WHERE COALESCE(v.hidden, FALSE) = TRUE
               OR v.id IN (
                 SELECT id FROM (
                   SELECT id, ROW_NUMBER() OVER (
                       PARTITION BY author, description
                       ORDER BY (CASE WHEN COALESCE(hidden, FALSE) THEN 1 ELSE 0 END) ASC,
                                created_at ASC, id ASC
                   ) AS rn
                   FROM {S}.videos
                   WHERE COALESCE(description, '') <> ''
                 ) t WHERE rn > 1
               )
        """)
        total_del = cur.fetchone()['c']
        _q(cur, "SELECT COUNT(*) AS c FROM {S}.videos")
        total = cur.fetchone()['c']
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({
                    'total': total,
                    'hidden': hidden_cnt,
                    'duplicates': dup_cnt,
                    'to_delete': total_del,
                    'will_remain': total - total_del,
                }, default=str)}

    if action == 'videos_cleanup_run':
        # Удалить все скрытые видео + дубли по (author, description) (оставляя самое старое не-скрытое)
        # Сначала собираем ID в Python-список, потом удаляем через ANY(%s)
        _q(cur, """
            SELECT DISTINCT v.id
            FROM {S}.videos v
            WHERE COALESCE(v.hidden, FALSE) = TRUE
               OR v.id IN (
                 SELECT id FROM (
                   SELECT id, ROW_NUMBER() OVER (
                       PARTITION BY author, description
                       ORDER BY (CASE WHEN COALESCE(hidden, FALSE) THEN 1 ELSE 0 END) ASC,
                                created_at ASC, id ASC
                   ) AS rn
                   FROM {S}.videos
                   WHERE COALESCE(description, '') <> ''
                 ) t WHERE rn > 1
               )
        """)
        ids_to_del = [r['id'] for r in cur.fetchall()]
        if not ids_to_del:
            return {'statusCode': 200, 'headers': _cors(),
                    'body': json.dumps({'ok': True, 'deleted': 0})}
        ids_str = [str(x) for x in ids_to_del]
        _q(cur, "DELETE FROM {S}.likes WHERE target_type = 'video' AND target_id = ANY(%s)", (ids_str,))
        _q(cur, "DELETE FROM {S}.comments WHERE target_type = 'video' AND target_id = ANY(%s)", (ids_str,))
        _q(cur, "DELETE FROM {S}.videos WHERE id = ANY(%s)", (ids_to_del,))
        affected = cur.rowcount
        conn.commit()
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'ok': True, 'deleted': affected})}

    if action == 'videos_bulk':
        ids_raw = body.get('ids') or []
        op = body.get('op')  # 'hide' | 'show' | 'delete'
        ids = [int(x) for x in ids_raw if str(x).strip().lstrip('-').isdigit()]
        if not ids or op not in ('hide', 'show', 'delete'):
            return {'statusCode': 400, 'headers': _cors(),
                    'body': json.dumps({'error': 'ids and valid op required'})}
        if op == 'delete':
            _q(cur, "DELETE FROM {S}.videos WHERE id = ANY(%s)", (ids,))
        elif op == 'hide':
            _q(cur, "UPDATE {S}.videos SET hidden = TRUE WHERE id = ANY(%s)", (ids,))
        else:
            _q(cur, "UPDATE {S}.videos SET hidden = FALSE WHERE id = ANY(%s)", (ids,))
        affected = cur.rowcount
        conn.commit()
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'ok': True, 'affected': affected})}

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
        limit = _safe_int(body.get('limit'), 100, 500)
        status_filter = body.get('status') or 'open'  # open | resolved | all
        if status_filter == 'all':
            _q(cur, """
                SELECT id, target_type, target_id, reason, comment, reporter_id, reporter_name,
                       status, resolved_at, resolved_note, created_at
                FROM {S}.reports ORDER BY created_at DESC LIMIT %s
            """, (limit,))
        else:
            _q(cur, """
                SELECT id, target_type, target_id, reason, comment, reporter_id, reporter_name,
                       status, resolved_at, resolved_note, created_at
                FROM {S}.reports WHERE status = %s ORDER BY created_at DESC LIMIT %s
            """, (status_filter, limit))
        reports = cur.fetchall()
        # Группируем по типу для batch-обогащения
        by_type = {}
        for r in reports:
            by_type.setdefault(r['target_type'], set()).add(str(r['target_id']))
        previews = {}
        # video preview
        if 'video' in by_type and by_type['video']:
            ids = [int(x) for x in by_type['video'] if str(x).isdigit()]
            if ids:
                _q(cur, "SELECT id, author, description, thumbnail, hidden FROM {S}.videos WHERE id = ANY(%s)", (ids,))
                for row in cur.fetchall():
                    previews[f"video:{row['id']}"] = {
                        'title': (row['description'] or '')[:80] or '(без описания)',
                        'subtitle': row['author'],
                        'thumb': row['thumbnail'],
                        'hidden': row['hidden'],
                    }
        # comment preview
        if 'comment' in by_type and by_type['comment']:
            ids = [int(x) for x in by_type['comment'] if str(x).isdigit()]
            if ids:
                _q(cur, "SELECT id, author_name, text FROM {S}.comments WHERE id = ANY(%s)", (ids,))
                for row in cur.fetchall():
                    previews[f"comment:{row['id']}"] = {
                        'title': (row['text'] or '')[:120],
                        'subtitle': row['author_name'],
                    }
        # user preview
        if 'user' in by_type and by_type['user']:
            uids = list(by_type['user'])
            _q(cur, "SELECT id, name, handle, avatar FROM {S}.app_users WHERE id = ANY(%s)", (uids,))
            for row in cur.fetchall():
                previews[f"user:{row['id']}"] = {
                    'title': row['name'], 'subtitle': '@' + row['handle'], 'thumb': row['avatar'],
                }
        # message preview
        if 'message' in by_type and by_type['message']:
            ids = [int(x) for x in by_type['message'] if str(x).isdigit()]
            if ids:
                _q(cur, "SELECT id, user_name, content, chat_id FROM {S}.sa_messages WHERE id = ANY(%s)", (ids,))
                for row in cur.fetchall():
                    previews[f"message:{row['id']}"] = {
                        'title': (row['content'] or '')[:120],
                        'subtitle': f"{row['user_name']} · чат {row['chat_id']}",
                    }
        # Считаем open
        _q(cur, "SELECT COUNT(*) AS c FROM {S}.reports WHERE status = 'open'")
        open_count = cur.fetchone()['c']
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'reports': reports, 'previews': previews, 'open_count': open_count}, default=str)}

    if action == 'report_resolve':
        rid = body.get('report_id')
        note = (body.get('note') or '').strip()
        if not rid:
            return {'statusCode': 400, 'headers': _cors(), 'body': json.dumps({'error': 'report_id required'})}
        _q(cur, """
            UPDATE {S}.reports SET status = 'resolved', resolved_at = NOW(), resolved_note = %s WHERE id = %s
        """, (note, rid))
        conn.commit()
        return {'statusCode': 200, 'headers': _cors(), 'body': json.dumps({'ok': True})}

    if action == 'report_delete':
        rid = body.get('report_id')
        _q(cur, "DELETE FROM {S}.reports WHERE id = %s", (rid,))
        conn.commit()
        return {'statusCode': 200, 'headers': _cors(), 'body': json.dumps({'ok': True})}

    # Удобный action: применить действие к цели жалобы (скрыть видео / удалить коммент) + закрыть жалобу
    if action == 'report_action':
        rid = body.get('report_id')
        act = body.get('do')  # 'hide_video' | 'delete_video' | 'delete_comment' | 'delete_user' | 'delete_message'
        _q(cur, "SELECT target_type, target_id FROM {S}.reports WHERE id = %s", (rid,))
        row = cur.fetchone()
        if not row:
            return {'statusCode': 404, 'headers': _cors(), 'body': json.dumps({'error': 'report not found'})}
        t, tid = row['target_type'], row['target_id']
        if act == 'hide_video' and t == 'video':
            _q(cur, "UPDATE {S}.videos SET hidden = TRUE WHERE id = %s", (int(tid),))
        elif act == 'delete_video' and t == 'video':
            _q(cur, "DELETE FROM {S}.videos WHERE id = %s", (int(tid),))
        elif act == 'delete_comment' and t == 'comment':
            _q(cur, "DELETE FROM {S}.comments WHERE id = %s", (int(tid),))
        elif act == 'delete_user' and t == 'user':
            _q(cur, "DELETE FROM {S}.app_users WHERE id = %s", (tid,))
        elif act == 'delete_message' and t == 'message':
            _q(cur, "DELETE FROM {S}.sa_messages WHERE id = %s", (int(tid),))
        else:
            return {'statusCode': 400, 'headers': _cors(), 'body': json.dumps({'error': 'unsupported action for this target'})}
        _q(cur, "UPDATE {S}.reports SET status = 'resolved', resolved_at = NOW(), resolved_note = %s WHERE id = %s",
           (act, rid))
        conn.commit()
        return {'statusCode': 200, 'headers': _cors(), 'body': json.dumps({'ok': True})}

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
        text = (body.get('text') or '').strip()
        if not text:
            return {'statusCode': 400, 'headers': _cors(), 'body': json.dumps({'error': 'text required'})}
        _q(cur, "INSERT INTO {S}.admin_broadcasts(text, target) VALUES (%s, %s) RETURNING id",
           (text, body.get('target') or 'all'))
        broadcast_id = cur.fetchone()['id']
        conn.commit()
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'ok': True, 'broadcast_id': broadcast_id})}

    if action == 'broadcasts_list':
        _q(cur, "SELECT id, text, target, created_at FROM {S}.admin_broadcasts ORDER BY id DESC LIMIT 50")
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'broadcasts': cur.fetchall()}, default=str)}

    return {'statusCode': 400, 'headers': _cors(),
            'body': json.dumps({'error': f'Unknown action: {action}'})}