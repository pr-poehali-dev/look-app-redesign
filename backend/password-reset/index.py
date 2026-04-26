import json
import os
import hashlib
import secrets
import urllib.request
from datetime import datetime, timedelta
import psycopg2

HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

def ok(data):
    return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps(data, ensure_ascii=False)}

def err(msg, code=400):
    return {'statusCode': code, 'headers': HEADERS, 'body': json.dumps({'error': msg}, ensure_ascii=False)}

def hash_pw(p):
    return hashlib.sha256(p.encode()).hexdigest()

def send_email(to_email: str, reset_link: str) -> bool:
    api_key = os.environ.get('RESEND_API_KEY', '').strip()
    if not api_key:
        return False
    from_email = os.environ.get('RESEND_FROM_EMAIL', '').strip() or 'Look <onboarding@resend.dev>'
    payload = {
        'from': from_email,
        'to': [to_email],
        'subject': 'Восстановление пароля',
        'html': f'''
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px;color:#111">
              <h2 style="color:#fe2c55">Восстановление пароля</h2>
              <p>Ты запросил восстановление пароля в приложении Look.</p>
              <p>Нажми на кнопку ниже, чтобы задать новый пароль:</p>
              <p style="margin:24px 0">
                <a href="{reset_link}" style="display:inline-block;padding:14px 28px;background:linear-gradient(90deg,#fe2c55,#8b5cf6);color:#fff;text-decoration:none;border-radius:12px;font-weight:bold">Сбросить пароль</a>
              </p>
              <p style="color:#666;font-size:13px">Если кнопка не работает, открой ссылку: <br><a href="{reset_link}">{reset_link}</a></p>
              <p style="color:#999;font-size:12px;margin-top:32px">Ссылка действует 1 час. Если ты не запрашивал восстановление — просто проигнорируй это письмо.</p>
            </div>
        '''
    }
    req = urllib.request.Request(
        'https://api.resend.com/emails',
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        },
        method='POST'
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status in (200, 201, 202)
    except Exception:
        return False

def handler(event: dict, context) -> dict:
    """Восстановление пароля: запрос ссылки и установка нового пароля"""
    method = event.get('httpMethod', 'POST')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**HEADERS, 'Access-Control-Max-Age': '86400'}, 'body': ''}

    if method != 'POST':
        return err('Method not allowed', 405)

    body = json.loads(event.get('body') or '{}')
    action = body.get('action')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    if action == 'request':
        email = (body.get('email') or '').strip().lower()
        origin = (body.get('origin') or '').strip().rstrip('/')
        if not email:
            cur.close(); conn.close()
            return err('Введи email')

        cur.execute("SELECT id FROM app_users WHERE email=%s", (email,))
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return ok({'sent': True})

        user_id = row[0]
        token = secrets.token_urlsafe(32)
        expires = datetime.utcnow() + timedelta(hours=1)
        cur.execute(
            "INSERT INTO password_reset_tokens (token, user_id, email, expires_at) VALUES (%s, %s, %s, %s)",
            (token, user_id, email, expires)
        )
        conn.commit()
        cur.close(); conn.close()

        base = origin or 'https://visov.ru'
        reset_link = f"{base}/?reset_token={token}"
        send_email(email, reset_link)
        return ok({'sent': True})

    if action == 'confirm':
        token = (body.get('token') or '').strip()
        new_password = body.get('password') or ''
        if not token or not new_password:
            cur.close(); conn.close()
            return err('token и password обязательны')
        if len(new_password) < 6:
            cur.close(); conn.close()
            return err('Пароль минимум 6 символов')

        cur.execute(
            "SELECT user_id, expires_at, used FROM password_reset_tokens WHERE token=%s",
            (token,)
        )
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return err('Ссылка недействительна', 400)
        user_id, expires_at, used = row
        if used:
            cur.close(); conn.close()
            return err('Ссылка уже использована', 400)
        if expires_at < datetime.utcnow():
            cur.close(); conn.close()
            return err('Срок действия ссылки истёк', 400)

        new_token = secrets.token_hex(32)
        cur.execute(
            "UPDATE app_users SET password_hash=%s, token=%s WHERE id=%s",
            (hash_pw(new_password), new_token, user_id)
        )
        cur.execute("UPDATE password_reset_tokens SET used=TRUE WHERE token=%s", (token,))
        conn.commit()
        cur.close(); conn.close()
        return ok({'reset': True})

    if action == 'verify':
        token = (body.get('token') or '').strip()
        if not token:
            cur.close(); conn.close()
            return err('token required')
        cur.execute(
            "SELECT email, expires_at, used FROM password_reset_tokens WHERE token=%s",
            (token,)
        )
        row = cur.fetchone()
        cur.close(); conn.close()
        if not row:
            return err('Ссылка недействительна', 400)
        email, expires_at, used = row
        if used:
            return err('Ссылка уже использована', 400)
        if expires_at < datetime.utcnow():
            return err('Срок действия ссылки истёк', 400)
        return ok({'valid': True, 'email': email})

    cur.close(); conn.close()
    return err('Unknown action')