import json
import os
import re
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
CONSENT_VERSION = '2026-10'

def parse_birth(raw):
    import datetime
    try:
        d = datetime.date.fromisoformat((raw or '').strip())
    except Exception:
        return None
    if d > datetime.date.today() or d.year < 1900:
        return None
    return d

def calc_age(d):
    import datetime
    t = datetime.date.today()
    return t.year - d.year - ((t.month, t.day) < (d.month, d.day))

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
            email = ''.join((body.get('email') or '').split()).lower()
            password = body.get('password') or ''
            origin = (body.get('origin') or '').strip().rstrip('/')
            phone_raw = (body.get('phone') or '').strip()
            phone = ''.join(ch for ch in phone_raw if ch.isdigit() or ch == '+')
            if phone and not phone.startswith('+'):
                phone = '+' + phone.lstrip('+')
            if not all([email, password]):
                return err('Заполни все поля')
            if not handle:
                handle = 'user_' + secrets.token_hex(4)
            if not name:
                name = email.split('@')[0][:40] or handle
            if not body.get('consent'):
                return err('Нужно принять условия и дать согласие на обработку персональных данных')
            if not body.get('age12'):
                return err('Подтверди, что тебе есть 12 лет')
            age_confirmed = 18 if body.get('age18') else 12
            if len(password) < 6:
                return err('Пароль минимум 6 символов')
            if not re.match(r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$', email):
                return err('Введи корректный email')
            if phone:
                digits_only = ''.join(ch for ch in phone if ch.isdigit())
                if len(digits_only) < 10:
                    return err('Введи корректный номер телефона')
            else:
                phone = None
            conn = get_conn(); cur = conn.cursor()
            try:
                cur.execute("SELECT id FROM app_users WHERE email=%s", (email,))
                if cur.fetchone():
                    return err('Такой email уже занят')
                cur.execute("SELECT id FROM app_users WHERE lower(handle)=lower(%s) LIMIT 1", (handle,))
                if cur.fetchone():
                    return err('Такой никнейм уже занят')
                if phone:
                    cur.execute("SELECT id FROM app_users WHERE phone=%s", (phone,))
                    if cur.fetchone():
                        return err('Такой номер телефона уже занят')
                uid = 'u_' + secrets.token_hex(8)
                token = secrets.token_hex(32)
                cur.execute("INSERT INTO app_users (id,name,handle,email,password_hash,token,phone,age_confirmed,consent_at,consent_version) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,NOW(),%s)",
                    (uid, name, handle, email, hash_pw(password), token, phone, age_confirmed, CONSENT_VERSION))
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
            return ok({'token': token, 'user': {'id': uid, 'name': name, 'handle': handle, 'email': email, 'avatar': None, 'phone': phone, 'is_adult': age_confirmed >= 18, 'birth_set': True}, 'verify_sent': True})

        if action == 'login':
            email = ''.join((body.get('email') or '').split()).lower()
            password = body.get('password') or ''
            if not email or not password:
                return err('Введи email и пароль')
            conn = get_conn(); cur = conn.cursor()
            try:
                cur.execute("SELECT id,name,handle,email,avatar,token,password_hash,firebase_hash,firebase_salt,phone,COALESCE(banned,FALSE),birth_date,age_confirmed FROM app_users WHERE email=%s",
                    (email,))
                row = cur.fetchone()
                if not row:
                    return err('Неверный email или пароль', 401)
                uid, name, handle, em, avatar, token, pw_hash, fb_hash, fb_salt, phone, banned, birth_db, age_conf_db = row
                if pw_hash == hash_pw(password):
                    pass
                elif fb_hash and fb_salt and verify_firebase_scrypt(password, fb_salt, fb_hash):
                    cur.execute("UPDATE app_users SET password_hash=%s, firebase_hash=NULL, firebase_salt=NULL WHERE id=%s",
                                (hash_pw(password), uid))
                    conn.commit()
                else:
                    return err('Неверный email или пароль', 401)
                if banned:
                    return err('Аккаунт заблокирован. Обратитесь в поддержку: support@look.com.ru', 403)
                if not token:
                    token = secrets.token_hex(32)
                    cur.execute("UPDATE app_users SET token=%s WHERE id=%s", (token, uid))
                    conn.commit()
            finally:
                cur.close(); conn.close()
            return ok({'token': token, 'user': {'id': uid, 'name': name, 'handle': handle, 'email': em, 'avatar': avatar, 'phone': phone, 'is_adult': ((calc_age(birth_db) >= 18) if birth_db else (age_conf_db >= 18 if age_conf_db else None)), 'birth_set': bool(birth_db or age_conf_db)}})

        if action == 'me':
            token = body.get('token') or ''
            if not token: return err('Нет токена', 401)
            conn = get_conn(); cur = conn.cursor()
            try:
                cur.execute("SELECT id,name,handle,email,avatar,phone,gender,links,COALESCE(banned,FALSE),city,birth_date,age_confirmed FROM app_users WHERE token=%s", (token,))
                row = cur.fetchone()
            finally:
                cur.close(); conn.close()
            if not row: return err('Токен недействителен', 401)
            if row[8]: return err('Аккаунт заблокирован. Обратитесь в поддержку: support@look.com.ru', 403)
            links_val = row[7] if row[7] is not None else []
            return ok({'user': {'id': row[0], 'name': row[1], 'handle': row[2], 'email': row[3], 'avatar': row[4], 'phone': row[5], 'gender': row[6], 'links': links_val, 'city': row[9], 'is_adult': ((calc_age(row[10]) >= 18) if row[10] else (row[11] >= 18 if row[11] else None)), 'birth_set': bool(row[10] or row[11]), 'birth_date': row[10].isoformat() if row[10] else None, 'age_confirmed': row[11]}})

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
                    cur.execute("SELECT id,name,handle,email,avatar,phone,gender,links,city FROM app_users WHERE id=%s", (uid,))
                    u = cur.fetchone()
                    cur.execute("UPDATE qr_login_sessions SET status='used' WHERE code=%s", (code,))
                    conn.commit()
                    if not u: return ok({'status': 'error'})
                    links_val = u[7] if u[7] is not None else []
                    return ok({
                        'status': 'approved',
                        'token': tok,
                        'user': {'id': u[0], 'name': u[1], 'handle': u[2], 'email': u[3], 'avatar': u[4], 'phone': u[5], 'gender': u[6], 'links': links_val, 'city': u[8]}
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
                cur.execute("SELECT id,name,handle,avatar,gender FROM app_users WHERE lower(handle)=lower(%s) LIMIT 1", (handle,))
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
            if 'city' in body:
                city = (body.get('city') or '').strip()[:80]
                updates.append('city=%s'); values.append(city or None)
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
                cur.execute("SELECT id,name,handle,email,avatar,phone,gender,links,city FROM app_users WHERE id=%s", (uid,))
                r = cur.fetchone()
                conn.commit()
            finally:
                cur.close(); conn.close()
            links_val = r[7] if r[7] is not None else []
            return ok({'user': {'id': r[0], 'name': r[1], 'handle': r[2], 'email': r[3], 'avatar': r[4], 'phone': r[5], 'gender': r[6], 'links': links_val, 'city': r[8]}})

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

        # репост чужого видео — появляется в профиле пользователя
        if action == 'repost':
            video_id = body.get('id') or body.get('video_id')
            token = body.get('token') or ''
            user_id = body.get('user_id') or ''
            if not video_id:
                return err('id обязателен')
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
                cur.execute("SELECT id FROM videos WHERE id=%s", (video_id,))
                if not cur.fetchone():
                    return err('Видео не найдено', 404)
                cur.execute("SELECT id FROM reposts WHERE original_video_id=%s AND user_id=%s", (video_id, uid))
                if cur.fetchone():
                    cur.execute("DELETE FROM reposts WHERE original_video_id=%s AND user_id=%s", (video_id, uid))
                    cur.execute("UPDATE videos SET shares=GREATEST(COALESCE(shares,0)-1,0) WHERE id=%s", (video_id,))
                    conn.commit()
                    return ok({'ok': True, 'reposted': False})
                cur.execute("INSERT INTO reposts (original_video_id, user_id) VALUES (%s,%s)", (video_id, uid))
                cur.execute("UPDATE videos SET shares=COALESCE(shares,0)+1 WHERE id=%s", (video_id,))
                conn.commit()
            finally:
                cur.close(); conn.close()
            return ok({'ok': True, 'reposted': True})

        # смена категории видео
        if action == 'set_age':
            token = body.get('token') or ''
            if not token:
                return err('Нет токена', 401)
            if not body.get('age12'):
                return err('Сервис доступен с 12 лет')
            level = 18 if body.get('age18') else 12
            conn = get_conn(); cur = conn.cursor()
            try:
                cur.execute("SELECT id, birth_date, age_confirmed FROM app_users WHERE token=%s", (token,))
                row = cur.fetchone()
                if not row:
                    return err('Токен недействителен', 401)
                if row[1] is not None or row[2] is not None:
                    return err('Возраст уже подтверждён. Для изменения обратитесь в поддержку', 403)
                cur.execute("UPDATE app_users SET age_confirmed=%s, consent_at=COALESCE(consent_at, NOW()), consent_version=COALESCE(consent_version, %s) WHERE id=%s",
                            (level, CONSENT_VERSION, row[0]))
                conn.commit()
            finally:
                cur.close(); conn.close()
            return ok({'ok': True, 'is_adult': level >= 18})

        if action == 'set_birth_date':
            token = body.get('token') or ''
            birth = parse_birth(body.get('birth_date'))
            if not token:
                return err('Нет токена', 401)
            if not birth:
                return err('Укажи корректную дату рождения')
            if calc_age(birth) < 12:
                return err('Сервис доступен с 12 лет')
            conn = get_conn(); cur = conn.cursor()
            try:
                cur.execute("SELECT id, birth_date FROM app_users WHERE token=%s", (token,))
                row = cur.fetchone()
                if not row:
                    return err('Токен недействителен', 401)
                if row[1] is not None:
                    return err('Дата рождения уже указана. Для изменения обратитесь в поддержку', 403)
                cur.execute("UPDATE app_users SET birth_date=%s, consent_at=COALESCE(consent_at, NOW()), consent_version=COALESCE(consent_version, %s) WHERE id=%s",
                            (birth, CONSENT_VERSION, row[0]))
                conn.commit()
            finally:
                cur.close(); conn.close()
            return ok({'ok': True, 'is_adult': calc_age(birth) >= 18})

        if action == 'delete_account':
            token = body.get('token') or ''
            password = body.get('password') or ''
            if not token or not password:
                return err('Введи пароль для подтверждения')
            conn = get_conn(); cur = conn.cursor()
            try:
                cur.execute("SELECT id, password_hash FROM app_users WHERE token=%s", (token,))
                row = cur.fetchone()
                if not row:
                    return err('Токен недействителен', 401)
                uid, pw_hash = row
                if pw_hash != hash_pw(password):
                    return err('Неверный пароль', 403)

                cur.execute("SELECT id, url, thumbnail FROM videos WHERE user_id=%s", (uid,))
                vids = cur.fetchall()
                vid_ids = [v[0] for v in vids]
                s3 = get_s3()
                for v in vids:
                    for u in (v[1], v[2]):
                        if u and '/bucket/' in u:
                            try:
                                s3.delete_object(Bucket='files', Key=u.split('/bucket/')[-1])
                            except Exception:
                                pass

                def run(sql, args):
                    cur.execute("SAVEPOINT sp")
                    try:
                        cur.execute(sql, args)
                        cur.execute("RELEASE SAVEPOINT sp")
                    except Exception as e:
                        cur.execute("ROLLBACK TO SAVEPOINT sp")
                        print(f'delete_account skip: {e}')

                if vid_ids:
                    ids_txt = [str(i) for i in vid_ids]
                    run("DELETE FROM reposts WHERE original_video_id = ANY(%s)", (vid_ids,))
                    run("DELETE FROM products WHERE video_id = ANY(%s)", (vid_ids,))
                    run("DELETE FROM comments WHERE target_type IN ('video','post') AND target_id = ANY(%s)", (ids_txt,))
                    run("DELETE FROM likes WHERE target_type IN ('video','post') AND target_id = ANY(%s)", (ids_txt,))
                    run("DELETE FROM saves WHERE target_type IN ('video','post') AND target_id = ANY(%s)", (ids_txt,))
                    run("DELETE FROM video_views WHERE video_id = ANY(%s)", (vid_ids,))
                    run("DELETE FROM videos WHERE id = ANY(%s)", (vid_ids,))

                for tbl, col in [
                    ('ad_impressions_log', 'user_id'), ('articles', 'owner_user_id'), ('boards', 'owner_user_id'),
                    ('cart_items', 'user_id'), ('channel_post_comments', 'user_id'), ('channel_post_reactions', 'user_id'),
                    ('channel_post_views', 'user_id'), ('chat_settings', 'user_id'), ('comments', 'user_id'),
                    ('community_bans', 'user_id'), ('community_join_requests', 'user_id'), ('community_members', 'user_id'),
                    ('community_poll_votes', 'user_id'), ('community_polls', 'author_id'), ('downloads', 'user_id'),
                    ('email_verify_tokens', 'user_id'), ('follows', 'follower_id'), ('likes', 'user_id'),
                    ('live_streams', 'user_id'), ('notifications', 'user_id'), ('orders', 'user_id'),
                    ('password_reset_tokens', 'user_id'), ('product_clicks', 'user_id'), ('product_reviews', 'user_id'),
                    ('products', 'owner_user_id'), ('qr_login_sessions', 'user_id'), ('reposts', 'user_id'),
                    ('sa_chat_members', 'user_id'), ('sa_message_reads', 'user_id'), ('sa_messages', 'user_id'),
                    ('saves', 'user_id'), ('support_tickets', 'user_id'), ('template_usage', 'user_id'),
                    ('user_hidden_authors', 'user_id'), ('user_video_feedback', 'user_id'), ('video_views', 'user_id'),
                ]:
                    run(f"DELETE FROM {tbl} WHERE {col} = %s", (uid,))
                run("DELETE FROM follows WHERE target_handle = (SELECT handle FROM app_users WHERE id = %s)", (uid,))
                run("DELETE FROM app_users WHERE id = %s", (uid,))
                run("INSERT INTO account_removal_log (user_id, source) VALUES (%s, 'self')", (uid,))
                conn.commit()
            finally:
                cur.close(); conn.close()
            return ok({'ok': True})

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

        # delete media — удаляет либо своё видео, либо (если это репост) убирает репост из своего профиля,
        # не трогая оригинальное видео автора
        video_id = body.get('id')
        token = body.get('token') or ''
        user_id = body.get('user_id') or ''
        if not video_id: return err('id required')
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

            # Сначала проверяем, не репост ли это (тот же id прилетает с фронта для репоста)
            cur.execute("SELECT id FROM reposts WHERE original_video_id=%s AND user_id=%s", (video_id, uid))
            repost_row = cur.fetchone()
            if repost_row:
                cur.execute("DELETE FROM reposts WHERE id=%s", (repost_row[0],))
                cur.execute("UPDATE videos SET shares=GREATEST(COALESCE(shares,0)-1,0) WHERE id=%s", (video_id,))
                conn.commit()
                return ok({'ok': True})

            # Иначе — удаление своего видео. Владельца проверяем строго, без чужого fallback.
            cur.execute("SELECT url FROM videos WHERE id=%s AND user_id=%s", (video_id, uid))
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
            "SELECT id,url,type,created_at,description,hashtags,author,handle,likes,comments,shares,thumbnail,category, FALSE AS is_repost "
            "FROM videos WHERE user_id=%s "
            "UNION ALL "
            "SELECT v.id,v.url,v.type,r.created_at,v.description,v.hashtags,v.author,v.handle,v.likes,v.comments,v.shares,v.thumbnail,v.category, TRUE AS is_repost "
            "FROM reposts r JOIN videos v ON v.id=r.original_video_id "
            "WHERE r.user_id=%s AND (v.hidden IS NULL OR v.hidden=FALSE) "
            "ORDER BY created_at DESC LIMIT 100",
            (user_id, user_id)
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
        'is_repost': bool(r[13]),
    } for r in rows]})