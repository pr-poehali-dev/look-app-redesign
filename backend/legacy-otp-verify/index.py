import json
import os
import secrets
import hashlib
import psycopg2


def make_handle(username: str, fullname: str, legacy_id: int) -> str:
    base = (username or fullname or f'user{legacy_id}').strip()
    # Транслит и фильтрация
    out = []
    for ch in base.lower():
        if ch.isascii() and (ch.isalnum() or ch in '_'):
            out.append(ch)
    handle = ''.join(out)[:20] or f'user{legacy_id}'
    return handle


def handler(event: dict, context) -> dict:
    """Проверяет 6-значный код: при успехе создаёт/находит app_users-аккаунт и возвращает токен."""
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
            'body': ''
        }

    try:
        body = json.loads(event.get('body') or '{}')
    except Exception:
        body = {}
    email = (body.get('email') or '').strip().lower()
    code = (body.get('code') or '').strip()
    if not email or not code:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'missing_email_or_code'})
        }

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = False
    try:
        with conn.cursor() as cur:
            # Ищем последний действующий код
            cur.execute(
                """SELECT id, code, attempts, expires_at, consumed_at, legacy_user_id
                   FROM legacy_otp_codes
                   WHERE LOWER(email) = %s
                   ORDER BY id DESC
                   LIMIT 1""",
                (email,)
            )
            row = cur.fetchone()
            if not row:
                conn.rollback()
                return {
                    'statusCode': 400,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'no_code', 'message': 'Сначала запросите код.'}, ensure_ascii=False)
                }
            otp_id, real_code, attempts, expires_at, consumed_at, legacy_user_id = row

            from datetime import datetime
            if consumed_at is not None:
                conn.rollback()
                return {
                    'statusCode': 400,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'already_used', 'message': 'Код уже использован.'}, ensure_ascii=False)
                }
            if expires_at < datetime.utcnow():
                conn.rollback()
                return {
                    'statusCode': 400,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'expired', 'message': 'Срок действия кода истёк.'}, ensure_ascii=False)
                }
            if attempts >= 5:
                conn.rollback()
                return {
                    'statusCode': 429,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'too_many_attempts', 'message': 'Слишком много попыток.'}, ensure_ascii=False)
                }
            if real_code != code:
                cur.execute("UPDATE legacy_otp_codes SET attempts = attempts + 1 WHERE id = %s", (otp_id,))
                conn.commit()
                return {
                    'statusCode': 400,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'wrong_code', 'message': 'Неверный код.'}, ensure_ascii=False)
                }

            # Помечаем код использованным
            cur.execute("UPDATE legacy_otp_codes SET consumed_at = now() WHERE id = %s", (otp_id,))

            # Берём данные старого пользователя
            cur.execute(
                """SELECT id, identity, fullname, username, profile_photo, bio, migrated_to_user_id
                   FROM legacy_users WHERE id = %s""",
                (legacy_user_id,)
            )
            lu = cur.fetchone()
            if not lu:
                conn.rollback()
                return {
                    'statusCode': 500,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'legacy_not_found'}, ensure_ascii=False)
                }
            lu_id, lu_identity, lu_fullname, lu_username, lu_avatar, lu_bio, migrated_to = lu

            # Если уже мигрировали — берём существующий аккаунт
            if migrated_to:
                cur.execute("SELECT id, name, handle, email, avatar, token FROM app_users WHERE id = %s", (migrated_to,))
                u = cur.fetchone()
                if u:
                    user_id, name, handle, e_email, avatar, token = u
                    if not token:
                        token = secrets.token_urlsafe(32)
                        cur.execute("UPDATE app_users SET token = %s WHERE id = %s", (token, user_id))
                    conn.commit()
                    return {
                        'statusCode': 200,
                        'headers': {'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({
                            'ok': True,
                            'restored': True,
                            'user': {
                                'id': user_id, 'name': name, 'handle': handle,
                                'email': e_email, 'avatar': avatar, 'token': token,
                            }
                        }, ensure_ascii=False)
                    }

            # Если есть юзер с таким email — связываем
            cur.execute("SELECT id, name, handle, email, avatar, token FROM app_users WHERE LOWER(email) = %s LIMIT 1", (email,))
            existing = cur.fetchone()
            if existing:
                user_id, name, handle, e_email, avatar, token = existing
                if not token:
                    token = secrets.token_urlsafe(32)
                    cur.execute("UPDATE app_users SET token = %s WHERE id = %s", (token, user_id))
                cur.execute("UPDATE legacy_users SET migrated_to_user_id = %s WHERE id = %s", (user_id, lu_id))
                conn.commit()
                return {
                    'statusCode': 200,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'ok': True,
                        'linked': True,
                        'user': {
                            'id': user_id, 'name': name, 'handle': handle,
                            'email': e_email, 'avatar': avatar, 'token': token,
                        }
                    }, ensure_ascii=False)
                }

            # Создаём новый аккаунт
            new_user_id = f'legacy_{lu_id}_{secrets.token_hex(4)}'
            handle = make_handle(lu_username, lu_fullname, lu_id)
            # Гарантируем уникальность handle
            attempt = 0
            while True:
                cur.execute("SELECT 1 FROM app_users WHERE handle = %s", (handle,))
                if not cur.fetchone():
                    break
                attempt += 1
                handle = make_handle(lu_username, lu_fullname, lu_id) + str(attempt)
                if attempt > 10:
                    handle = f'user_{lu_id}_{secrets.token_hex(2)}'
                    break

            name = lu_fullname or lu_username or f'user{lu_id}'
            token = secrets.token_urlsafe(32)
            avatar_url = lu_avatar or None
            password_hash = hashlib.sha256(secrets.token_bytes(32)).hexdigest()

            cur.execute(
                """INSERT INTO app_users (id, name, handle, email, password_hash, avatar, token, created_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, now())""",
                (new_user_id, name, handle, email, password_hash, avatar_url, token)
            )
            cur.execute("UPDATE legacy_users SET migrated_to_user_id = %s WHERE id = %s", (new_user_id, lu_id))
            conn.commit()

            return {
                'statusCode': 200,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'ok': True,
                    'created': True,
                    'user': {
                        'id': new_user_id, 'name': name, 'handle': handle,
                        'email': email, 'avatar': avatar_url, 'token': token,
                    }
                }, ensure_ascii=False)
            }
    finally:
        conn.close()
