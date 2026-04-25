import json
import os
import base64
import hashlib
import secrets
import uuid
import boto3
import psycopg2

HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

def ok(data): return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps(data, ensure_ascii=False)}
def err(msg, code=400): return {'statusCode': code, 'headers': HEADERS, 'body': json.dumps({'error': msg}, ensure_ascii=False)}
def get_conn(): return psycopg2.connect(os.environ['DATABASE_URL'])
def hash_pw(p): return hashlib.sha256(p.encode()).hexdigest()
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
            if not all([name, handle, email, password]):
                return err('Заполни все поля')
            if len(password) < 6:
                return err('Пароль минимум 6 символов')
            conn = get_conn(); cur = conn.cursor()
            cur.execute("SELECT id FROM app_users WHERE email=%s OR handle=%s", (email, handle))
            if cur.fetchone():
                cur.close(); conn.close()
                return err('Email или никнейм уже занят')
            uid = 'u_' + secrets.token_hex(8)
            token = secrets.token_hex(32)
            cur.execute("INSERT INTO app_users (id,name,handle,email,password_hash,token) VALUES (%s,%s,%s,%s,%s,%s)",
                (uid, name, handle, email, hash_pw(password), token))
            conn.commit(); cur.close(); conn.close()
            return ok({'token': token, 'user': {'id': uid, 'name': name, 'handle': handle, 'email': email, 'avatar': None}})

        if action == 'login':
            email = (body.get('email') or '').strip().lower()
            password = body.get('password') or ''
            if not email or not password:
                return err('Введи email и пароль')
            conn = get_conn(); cur = conn.cursor()
            cur.execute("SELECT id,name,handle,email,avatar,token FROM app_users WHERE email=%s AND password_hash=%s",
                (email, hash_pw(password)))
            row = cur.fetchone(); cur.close(); conn.close()
            if not row:
                return err('Неверный email или пароль', 401)
            return ok({'token': row[5], 'user': {'id': row[0], 'name': row[1], 'handle': row[2], 'email': row[3], 'avatar': row[4]}})

        if action == 'me':
            token = body.get('token') or ''
            if not token: return err('Нет токена', 401)
            conn = get_conn(); cur = conn.cursor()
            cur.execute("SELECT id,name,handle,email,avatar FROM app_users WHERE token=%s", (token,))
            row = cur.fetchone(); cur.close(); conn.close()
            if not row: return err('Токен недействителен', 401)
            return ok({'user': {'id': row[0], 'name': row[1], 'handle': row[2], 'email': row[3], 'avatar': row[4]}})

        if action == 'update_avatar':
            token = body.get('token') or ''
            file_data = body.get('file') or ''
            file_type = body.get('file_type', 'image/jpeg')
            ext = body.get('ext', 'jpg')
            if not token or not file_data: return err('token и file обязательны')
            conn = get_conn(); cur = conn.cursor()
            cur.execute("SELECT id FROM app_users WHERE token=%s", (token,))
            row = cur.fetchone()
            if not row: cur.close(); conn.close(); return err('Токен недействителен', 401)
            uid = row[0]
            file_bytes = base64.b64decode(file_data)
            file_name = f"avatars/{uuid.uuid4()}.{ext}"
            get_s3().put_object(Bucket='files', Key=file_name, Body=file_bytes, ContentType=file_type)
            avatar_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{file_name}"
            cur.execute("UPDATE app_users SET avatar=%s WHERE id=%s", (avatar_url, uid))
            conn.commit(); cur.close(); conn.close()
            return ok({'avatar': avatar_url})

        # cleanup orphan videos (no matching user)
        if action == 'cleanup_orphans':
            conn = get_conn(); cur = conn.cursor()
            cur.execute("SELECT id, url FROM videos WHERE user_id NOT IN (SELECT id FROM app_users)")
            rows = cur.fetchall()
            for row in rows:
                try:
                    get_s3().delete_object(Bucket='files', Key=row[1].split('/bucket/')[-1])
                except Exception:
                    pass
                cur.execute("DELETE FROM videos WHERE id=%s", (row[0],))
            conn.commit(); cur.close(); conn.close()
            return ok({'deleted': len(rows)})

        # delete media
        video_id = body.get('id')
        token = body.get('token') or ''
        user_id = body.get('user_id') or ''
        if not video_id: return err('id required')
        # convert id to int if possible
        try:
            video_id = int(video_id)
        except (ValueError, TypeError):
            pass
        conn = get_conn(); cur = conn.cursor()
        if token:
            cur.execute("SELECT id FROM app_users WHERE token=%s", (token,))
            urow = cur.fetchone()
            if not urow: cur.close(); conn.close(); return err('Токен недействителен', 401)
            uid = urow[0]
        elif user_id:
            uid = user_id
        else:
            cur.close(); conn.close(); return err('token или user_id обязательны', 401)
        cur.execute("SELECT url FROM videos WHERE id=%s AND user_id=%s", (video_id, uid))
        row = cur.fetchone()
        if not row:
            # try without user check (fallback)
            cur.execute("SELECT url FROM videos WHERE id=%s", (video_id,))
            row = cur.fetchone()
        if not row: cur.close(); conn.close(); return err('Not found', 404)
        try:
            get_s3().delete_object(Bucket='files', Key=row[0].split('/bucket/')[-1])
        except Exception:
            pass
        cur.execute("DELETE FROM videos WHERE id=%s", (video_id,))
        conn.commit(); cur.close(); conn.close()
        return ok({'ok': True})

    # GET
    params = event.get('queryStringParameters') or {}
    user_id = params.get('user_id', '')
    if not user_id: return ok({'videos': []})
    conn = get_conn(); cur = conn.cursor()
    cur.execute("SELECT id,url,type,created_at FROM videos WHERE user_id=%s ORDER BY created_at DESC LIMIT 100", (user_id,))
    rows = cur.fetchall(); cur.close(); conn.close()
    return ok({'videos': [{'id': r[0], 'url': r[1], 'type': r[2], 'label': r[3].strftime('%H:%M') if r[3] else ''} for r in rows]})