import json
import os
import base64
import hashlib
import secrets
import uuid
import urllib.request
import boto3
import psycopg2
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

def ok(data): return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps(data, ensure_ascii=False)}
def err(msg, code=400): return {'statusCode': code, 'headers': HEADERS, 'body': json.dumps({'error': msg}, ensure_ascii=False)}
def get_conn(): return psycopg2.connect(os.environ['DATABASE_URL'])
def hash_pw(p): return hashlib.sha256(p.encode()).hexdigest()

def verify_firebase_scrypt(password: str, salt_b64: str, expected_hash_b64: str) -> bool:
    """Проверка пароля Firebase SCRYPT (modified): scrypt → AES-256-CTR(signer_key)."""
    try:
        signer_key = base64.b64decode(os.environ['FIREBASE_SCRYPT_SIGNER_KEY'])
        salt_separator = base64.b64decode(os.environ['FIREBASE_SCRYPT_SALT_SEPARATOR'])
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(expected_hash_b64)
        derived = hashlib.scrypt(password.encode('utf-8'), salt=salt + salt_separator,
                                 n=1 << 14, r=8, p=1, dklen=64, maxmem=1024 * 1024 * 1024)
        key = derived[:32]
        iv = b'\x00' * 16
        cipher = Cipher(algorithms.AES(key), modes.CTR(iv), backend=default_backend())
        encryptor = cipher.encryptor()
        result = encryptor.update(signer_key) + encryptor.finalize()
        return secrets.compare_digest(result, expected)
    except Exception as e:
        print(f'firebase scrypt verify error: {e}')
        return False
def get_s3(): return boto3.client('s3', endpoint_url='https://bucket.poehali.dev',
    aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
    aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])

def handler(event: dict, context) -> dict:
    """Авторизация + медиа пользователя"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**HEADERS,
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400'}, 'body': ''}

    if event.get('httpMethod') == 'POST':
        body = json.loads(event.get('body') or '{}')
        action = body.get('action')

        if action == 'register':
            name = (body.get('name') or '').strip()
            handle = (body.get('handle') or '').strip().lstrip('@')
            email = (body.get('email') or '').strip().lower()
            password = body.get('password') or ''
            origin = (body.get('origin') or '').strip().rstrip('/')
            phone_raw = (body.get('phone') or '').strip()
            phone = ''.join(ch for ch in phone_raw if ch.isdigit() or ch == '+')
            if phone and not phone.startswith('+'):
                phone = '+' + phone.lstrip('+')
            if not all([name, handle, email, password, phone]):
                return err('Заполни все поля')
            if len(password) < 6:
                return err('Пароль минимум 6 символов')
            if '@' not in email or '.' not in email.split('@')[-1]:
                return err('Введи корректный email')
            digits_only = ''.join(ch for ch in phone if ch.isdigit())
            if len(digits_only) < 10:
                return err('Введи корректный номер телефона')
            conn = get_conn(); cur = conn.cursor()
            try:
                cur.execute("SELECT id FROM app_users WHERE email=%s OR handle=%s OR phone=%s", (email, handle, phone))
                if cur.fetchone():
                    return err('Email, никнейм или номер телефона уже заняты')
                uid = 'u_' + secrets.token_hex(8)
                token = secrets.token_hex(32)
                cur.execute("INSERT INTO app_users (id,name,handle,email,password_hash,token,phone) VALUES (%s,%s,%s,%s,%s,%s,%s)",
                    (uid, name, handle, email, hash_pw(password), token, phone))
                conn.commit()
            finally:
                cur.close(); conn.close()
            try:
                payload = json.dumps({'action': 'verify_send', 'email': email, 'origin': origin}).encode('utf-8')
                req = urllib.request.Request(
                    'https://functions.poehali.dev/050dfa15-1d92-4aaf-9b87-55d04c9affa7',
                    data=payload, method='POST',
                    headers={'Content-Type': 'application/json'},
                )
                urllib.request.urlopen(req, timeout=10)
            except Exception as e:
                print(f'verify_send error: {e}')
            return ok({'token': token, 'user': {'id': uid, 'name': name, 'handle': handle, 'email': email, 'avatar': None, 'phone': phone}, 'verify_sent': True})

        if action == 'login':
            email = (body.get('email') or '').strip().lower()
            password = body.get('password') or ''
            if not email or not password:
                return err('Введи email и пароль')
            conn = get_conn(); cur = conn.cursor()
            try:
                cur.execute("SELECT id,name,handle,email,avatar,token,password_hash,firebase_hash,firebase_salt,phone FROM app_users WHERE email=%s",
                    (email,))
                row = cur.fetchone()
                if not row:
                    return err('Неверный email или пароль', 401)
                uid, name, handle, em, avatar, token, pw_hash, fb_hash, fb_salt, phone = row
                if pw_hash == hash_pw(password):
                    pass
                elif fb_hash and fb_salt and verify_firebase_scrypt(password, fb_salt, fb_hash):
                    cur.execute("UPDATE app_users SET password_hash=%s, firebase_hash=NULL, firebase_salt=NULL WHERE id=%s",
                                (hash_pw(password), uid))
                    conn.commit()
                else:
                    return err('Неверный email или пароль', 401)
            finally:
                cur.close(); conn.close()
            return ok({'token': token, 'user': {'id': uid, 'name': name, 'handle': handle, 'email': em, 'avatar': avatar, 'phone': phone}})

        if action == 'me':
            token = body.get('token') or ''
            if not token: return err('Нет токена', 401)
            conn = get_conn(); cur = conn.cursor()
            try:
                cur.execute("SELECT id,name,handle,email,avatar,phone,gender,links FROM app_users WHERE token=%s", (token,))
                row = cur.fetchone()
            finally:
                cur.close(); conn.close()
            if not row: return err('Токен недействителен', 401)
            links_val = row[7] if row[7] is not None else []
            return ok({'user': {'id': row[0], 'name': row[1], 'handle': row[2], 'email': row[3], 'avatar': row[4], 'phone': row[5], 'gender': row[6], 'links': links_val}})

        if action == 'qr_create':
            code = secrets.token_urlsafe(16)
            conn = get_conn(); cur = conn.cursor()
            try:
                cur.execute("DELETE FROM qr_login_sessions WHERE created_at < NOW() - INTERVAL '15 minutes'")
                cur.execute("INSERT INTO qr_login_sessions (code, status) VALUES (%s, 'pending')", (code,))
                conn.commit()
            finally:
                cur.close(); conn.close()
            return ok({'code': code, 'expires_in': 600})

        if action == 'qr_status':
            code = (body.get('code') or '').strip()
            if not code: return err('code обязателен')
            conn = get_conn(); cur = conn.cursor()
            try:
                cur.execute("SELECT status, user_id, token, created_at FROM qr_login_sessions WHERE code=%s", (code,))
                row = cur.fetchone()
                if not row:
                    return ok({'status': 'not_found'})
                status, uid, tok, created_at = row
                if status == 'approved' and uid and tok:
                    cur.execute("SELECT id,name,handle,email,avatar,phone,gender,links FROM app_users WHERE id=%s", (uid,))
                    u = cur.fetchone()
                    cur.execute("UPDATE qr_login_sessions SET status='used' WHERE code=%s", (code,))
                    conn.commit()
                    if not u: return ok({'status': 'error'})
                    links_val = u[7] if u[7] is not None else []
                    return ok({
                        'status': 'approved',
                        'token': tok,
                        'user': {'id': u[0], 'name': u[1], 'handle': u[2], 'email': u[3], 'avatar': u[4], 'phone': u[5], 'gender': u[6], 'links': links_val}
                    })
                return ok({'status': status})
            finally:
                cur.close(); conn.close()

        if action == 'qr_approve':
            code = (body.get('code') or '').strip()
            user_token = (body.get('token') or '').strip()
            if not code or not user_token: return err('code и token обязательны')
            conn = get_conn(); cur = conn.cursor()
            try:
                cur.execute("SELECT id FROM app_users WHERE token=%s", (user_token,))
                u = cur.fetchone()
                if not u: return err('Токен недействителен', 401)
                cur.execute("SELECT status, created_at FROM qr_login_sessions WHERE code=%s", (code,))
                row = cur.fetchone()
                if not row: return err('Код не найден', 404)
                status, _ = row
                if status != 'pending': return err('Код уже использован', 400)
                cur.execute(
                    "UPDATE qr_login_sessions SET status='approved', user_id=%s, token=%s, approved_at=NOW() WHERE code=%s",
                    (u[0], user_token, code)
                )
                conn.commit()
            finally:
                cur.close(); conn.close()
            return ok({'status': 'approved'})

        if action == 'qr_reject':
            code = (body.get('code') or '').strip()
            if not code: return err('code обязателен')
            conn = get_conn(); cur = conn.cursor()
            try:
                cur.execute("UPDATE qr_login_sessions SET status='rejected' WHERE code=%s AND status='pending'", (code,))
                conn.commit()
            finally:
                cur.close(); conn.close()
            return ok({'status': 'rejected'})

        if action == 'get_public_profile':
            handle = (body.get('handle') or '').strip().lstrip('@')
            if not handle:
                return err('handle обязателен')
            conn = get_conn(); cur = conn.cursor()
            try:
                cur.execute("SELECT id,name,handle,avatar,gender FROM app_users WHERE handle=%s", (handle,))
                row = cur.fetchone()
            finally:
                cur.close(); conn.close()
            if not row:
                return ok({'user': None})
            return ok({'user': {'id': row[0], 'name': row[1], 'handle': row[2], 'avatar': row[3], 'gender': row[4]}})

        if action == 'find_by_phones':
            phones_in = body.get('phones') or []
            if not isinstance(phones_in, list) or not phones_in:
                return ok({'users': []})
            normalized = []
            for p in phones_in[:500]:
                if not isinstance(p, str): continue
                np = ''.join(ch for ch in p if ch.isdigit())
                if len(np) >= 10:
                    normalized.append('+' + np)
            if not normalized:
                return ok({'users': []})
            conn = get_conn(); cur = conn.cursor()
            try:
                placeholders = ','.join(['%s'] * len(normalized))
                cur.execute(
                    f"SELECT id,name,handle,avatar,phone FROM app_users WHERE phone IN ({placeholders})",
                    tuple(normalized)
                )
                rows = cur.fetchall()
            finally:
                cur.close(); conn.close()
            users = [{'id': r[0], 'name': r[1], 'handle': r[2], 'avatar': r[3], 'phone': r[4]} for r in rows]
            return ok({'users': users})

        if action == 'update_profile':
            token = body.get('token') or ''
            if not token:
                return err('Нет токена', 401)
            updates = []
            values = []
            if 'name' in body:
                name = (body.get('name') or '').strip()
                if not name:
                    return err('Имя не может быть пустым')
                if len(name) > 80:
                    return err('Имя слишком длинное')
                updates.append('name=%s'); values.append(name)
            if 'handle' in body:
                handle = (body.get('handle') or '').strip().lstrip('@')
                if not handle:
                    return err('Никнейм не может быть пустым')
                if len(handle) > 40:
                    return err('Никнейм слишком длинный')
                updates.append('handle=%s'); values.append(handle)
            if 'email' in body:
                email = (body.get('email') or '').strip().lower()
                if '@' not in email or '.' not in email.split('@')[-1]:
                    return err('Введи корректный email')
                updates.append('email=%s'); values.append(email)
            if 'gender' in body:
                gender = (body.get('gender') or '').strip().lower()
                if gender and gender not in ('male', 'female', 'other', ''):
                    return err('Некорректный пол')
                updates.append('gender=%s'); values.append(gender or None)
            phone_final = None
            if 'phone' in body:
                phone_raw = (body.get('phone') or '').strip()
                if phone_raw:
                    phone_clean = ''.join(ch for ch in phone_raw if ch.isdigit() or ch == '+')
                    if phone_clean and not phone_clean.startswith('+'):
                        phone_clean = '+' + phone_clean.lstrip('+')
                    digits_only = ''.join(ch for ch in phone_clean if ch.isdigit())
                    if len(digits_only) < 10:
                        return err('Введи корректный номер телефона')
                    phone_final = phone_clean
                updates.append('phone=%s'); values.append(phone_final)
            if 'links' in body:
                links = body.get('links') or []
                if not isinstance(links, list):
                    return err('Некорректные ссылки')
                clean_links = []
                for ln in links[:10]:
                    if isinstance(ln, str) and ln.strip():
                        clean_links.append(ln.strip()[:300])
                    elif isinstance(ln, dict):
                        url = (ln.get('url') or '').strip()[:300]
                        label = (ln.get('label') or '').strip()[:60]
                        if url:
                            clean_links.append({'url': url, 'label': label})
                updates.append('links=%s'); values.append(json.dumps(clean_links))
            if not updates:
                return err('Нет данных для обновления')
            conn = get_conn(); cur = conn.cursor()
            try:
                cur.execute("SELECT id FROM app_users WHERE token=%s", (token,))
                row = cur.fetchone()
                if not row:
                    return err('Токен недействителен', 401)
                uid = row[0]
                if 'handle' in body:
                    cur.execute("SELECT id FROM app_users WHERE handle=%s AND id<>%s", (body.get('handle','').strip().lstrip('@'), uid))
                    if cur.fetchone():
                        return err('Этот никнейм уже занят')
                if 'email' in body:
                    em = (body.get('email') or '').strip().lower()
                    cur.execute("SELECT id FROM app_users WHERE email=%s AND id<>%s", (em, uid))
                    if cur.fetchone():
                        return err('Этот email уже используется')
                if 'phone' in body and phone_final:
                    cur.execute("SELECT id FROM app_users WHERE phone=%s AND id<>%s", (phone_final, uid))
                    if cur.fetchone():
                        return err('Этот номер уже используется другим аккаунтом')
                values.append(uid)
                cur.execute(f"UPDATE app_users SET {', '.join(updates)} WHERE id=%s", tuple(values))
                cur.execute("SELECT id,name,handle,email,avatar,phone,gender,links FROM app_users WHERE id=%s", (uid,))
                r = cur.fetchone()
                conn.commit()
            finally:
                cur.close(); conn.close()
            links_val = r[7] if r[7] is not None else []
            return ok({'user': {'id': r[0], 'name': r[1], 'handle': r[2], 'email': r[3], 'avatar': r[4], 'phone': r[5], 'gender': r[6], 'links': links_val}})

        if action == 'update_avatar':
            token = body.get('token') or ''
            file_data = body.get('file') or ''
            file_type = body.get('file_type', 'image/jpeg')
            ext = body.get('ext', 'jpg')
            if not token or not file_data: return err('token и file обязательны')
            conn = get_conn(); cur = conn.cursor()
            try:
                cur.execute("SELECT id FROM app_users WHERE token=%s", (token,))
                row = cur.fetchone()
                if not row:
                    return err('Токен недействителен', 401)
                uid = row[0]
                file_bytes = base64.b64decode(file_data)
                file_name = f"avatars/{uuid.uuid4()}.{ext}"
                get_s3().put_object(Bucket='files', Key=file_name, Body=file_bytes, ContentType=file_type)
                avatar_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{file_name}"
                cur.execute("UPDATE app_users SET avatar=%s WHERE id=%s", (avatar_url, uid))
                conn.commit()
            finally:
                cur.close(); conn.close()
            return ok({'avatar': avatar_url})

        # cleanup orphan videos (no matching user)
        if action == 'cleanup_orphans':
            conn = get_conn(); cur = conn.cursor()
            try:
                cur.execute("SELECT id, url FROM videos WHERE user_id NOT IN (SELECT id FROM app_users)")
                rows = cur.fetchall()
                for row in rows:
                    try:
                        get_s3().delete_object(Bucket='files', Key=row[1].split('/bucket/')[-1])
                    except Exception:
                        pass
                    cur.execute("DELETE FROM videos WHERE id=%s", (row[0],))
                conn.commit()
            finally:
                cur.close(); conn.close()
            return ok({'deleted': len(rows)})

        # смена категории видео
        if action == 'update_category':
            video_id = body.get('id')
            new_category = (body.get('category') or '').strip()
            token = body.get('token') or ''
            user_id = body.get('user_id') or ''
            if not video_id or not new_category:
                return err('id и category обязательны')
            try:
                video_id = int(video_id)
            except (ValueError, TypeError):
                return err('Некорректный id')
            conn = get_conn(); cur = conn.cursor()
            try:
                if token:
                    cur.execute("SELECT id FROM app_users WHERE token=%s", (token,))
                    urow = cur.fetchone()
                    if not urow:
                        return err('Токен недействителен', 401)
                    uid = urow[0]
                elif user_id:
                    uid = user_id
                else:
                    return err('token или user_id обязательны', 401)
                cur.execute("UPDATE videos SET category=%s WHERE id=%s AND user_id=%s", (new_category, video_id, uid))
                if cur.rowcount == 0:
                    return err('Видео не найдено', 404)
                conn.commit()
            finally:
                cur.close(); conn.close()
            return ok({'ok': True, 'category': new_category})

        # delete media
        video_id = body.get('id')
        token = body.get('token') or ''
        user_id = body.get('user_id') or ''
        if not video_id: return err('id required')
        try:
            video_id = int(video_id)
        except (ValueError, TypeError):
            pass
        conn = get_conn(); cur = conn.cursor()
        try:
            if token:
                cur.execute("SELECT id FROM app_users WHERE token=%s", (token,))
                urow = cur.fetchone()
                if not urow:
                    return err('Токен недействителен', 401)
                uid = urow[0]
            elif user_id:
                uid = user_id
            else:
                return err('token или user_id обязательны', 401)
            cur.execute("SELECT url FROM videos WHERE id=%s AND user_id=%s", (video_id, uid))
            row = cur.fetchone()
            if not row:
                cur.execute("SELECT url FROM videos WHERE id=%s", (video_id,))
                row = cur.fetchone()
            if not row:
                return err('Not found', 404)
            try:
                get_s3().delete_object(Bucket='files', Key=row[0].split('/bucket/')[-1])
            except Exception:
                pass
            cur.execute("DELETE FROM videos WHERE id=%s", (video_id,))
            conn.commit()
        finally:
            cur.close(); conn.close()
        return ok({'ok': True})

    # GET
    params = event.get('queryStringParameters') or {}
    user_id = params.get('user_id', '')
    if not user_id: return ok({'videos': []})
    conn = get_conn(); cur = conn.cursor()
    try:
        cur.execute(
            "SELECT id,url,type,created_at,description,hashtags,author,handle,likes,comments,shares,thumbnail,category "
            "FROM videos WHERE user_id=%s ORDER BY created_at DESC LIMIT 100",
            (user_id,)
        )
        rows = cur.fetchall()
    finally:
        cur.close(); conn.close()
    return ok({'videos': [{
        'id': r[0],
        'url': r[1],
        'type': r[2],
        'label': r[3].strftime('%H:%M') if r[3] else '',
        'description': r[4] or '',
        'hashtags': r[5] or '',
        'author': r[6] or '',
        'handle': r[7] or '',
        'likes': str(r[8]) if r[8] is not None else '0',
        'comments': str(r[9]) if r[9] is not None else '0',
        'shares': str(r[10]) if r[10] is not None else '0',
        'thumbnail': r[11],
        'category': r[12] or '',
    } for r in rows]})