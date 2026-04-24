import json
import os
import hashlib
import secrets
import boto3
import psycopg2

HEADERS = {'Access-Control-Allow-Origin': '*'}

def ok(data): return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps(data, ensure_ascii=False)}
def err(msg, code=400): return {'statusCode': code, 'headers': HEADERS, 'body': json.dumps({'error': msg}, ensure_ascii=False)}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def hash_password(password): 
    return hashlib.sha256(password.encode()).hexdigest()

def handler(event: dict, context) -> dict:
    """Медиа пользователя + авторизация (register/login/me/delete_media)"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**HEADERS,
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400'}, 'body': ''}

    method = event.get('httpMethod', 'GET')

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        action = body.get('action')

        # --- REGISTER ---
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
            user_id = 'u_' + secrets.token_hex(8)
            token = secrets.token_hex(32)
            cur.execute(
                "INSERT INTO app_users (id, name, handle, email, password_hash, token) VALUES (%s,%s,%s,%s,%s,%s)",
                (user_id, name, handle, email, hash_password(password), token)
            )
            conn.commit(); cur.close(); conn.close()
            return ok({'token': token, 'user': {'id': user_id, 'name': name, 'handle': handle, 'email': email, 'avatar': None}})

        # --- LOGIN ---
        if action == 'login':
            email = (body.get('email') or '').strip().lower()
            password = body.get('password') or ''
            if not email or not password:
                return err('Введи email и пароль')
            conn = get_conn(); cur = conn.cursor()
            cur.execute("SELECT id, name, handle, email, avatar, token FROM app_users WHERE email=%s AND password_hash=%s",
                        (email, hash_password(password)))
            row = cur.fetchone()
            cur.close(); conn.close()
            if not row:
                return err('Неверный email или пароль', 401)
            return ok({'token': row[5], 'user': {'id': row[0], 'name': row[1], 'handle': row[2], 'email': row[3], 'avatar': row[4]}})

        # --- ME (by token) ---
        if action == 'me':
            token = body.get('token') or ''
            if not token:
                return err('Нет токена', 401)
            conn = get_conn(); cur = conn.cursor()
            cur.execute("SELECT id, name, handle, email, avatar FROM app_users WHERE token=%s", (token,))
            row = cur.fetchone()
            cur.close(); conn.close()
            if not row:
                return err('Токен недействителен', 401)
            return ok({'user': {'id': row[0], 'name': row[1], 'handle': row[2], 'email': row[3], 'avatar': row[4]}})

        # --- DELETE MEDIA ---
        video_id = body.get('id')
        user_id = body.get('user_id')
        if not video_id or not user_id:
            return err('id and user_id required')
        conn = get_conn(); cur = conn.cursor()
        cur.execute("SELECT url FROM videos WHERE id=%s AND user_id=%s", (video_id, user_id))
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return err('Not found', 404)
        try:
            s3_key = row[0].split('/bucket/')[-1]
            s3 = boto3.client('s3', endpoint_url='https://bucket.poehali.dev',
                aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])
            s3.delete_object(Bucket='files', Key=s3_key)
        except Exception:
            pass
        cur.execute("DELETE FROM videos WHERE id=%s AND user_id=%s", (video_id, user_id))
        conn.commit(); cur.close(); conn.close()
        return ok({'ok': True})

    # GET — список медиа пользователя
    params = event.get('queryStringParameters') or {}
    user_id = params.get('user_id', '')
    if not user_id:
        return ok({'videos': []})
    conn = get_conn(); cur = conn.cursor()
    cur.execute("SELECT id, url, type, created_at FROM videos WHERE user_id=%s ORDER BY created_at DESC LIMIT 100", (user_id,))
    rows = cur.fetchall()
    cur.close(); conn.close()
    return ok({'videos': [{'id': r[0], 'url': r[1], 'type': r[2], 'label': r[3].strftime('%H:%M') if r[3] else ''} for r in rows]})