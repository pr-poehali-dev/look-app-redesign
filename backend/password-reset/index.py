import json
import os
import hashlib
import secrets
from datetime import datetime, timedelta
import psycopg2
import requests

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

LAST_SMTP_ERROR = {'msg': ''}

def _send_via_resend(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
    api_key = os.environ.get('RESEND_API_KEY', '').strip()
    if not api_key:
        LAST_SMTP_ERROR['msg'] = 'no RESEND_API_KEY'
        return False

    from_email = os.environ.get('RESEND_FROM_EMAIL', '').strip() or 'Look <onboarding@resend.dev>'
    reply_to = os.environ.get('RESEND_REPLY_TO', '').strip() or 'support@visov.ru'

    payload = {
        'from': from_email,
        'to': [to_email],
        'subject': subject,
        'html': html_body,
        'text': text_body,
        'reply_to': reply_to,
        'headers': {
            'List-Unsubscribe': f'<mailto:{reply_to}?subject=unsubscribe>',
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            'X-Entity-Ref-ID': secrets.token_hex(8),
        },
    }
    try:
        resp = requests.post(
            'https://api.resend.com/emails',
            headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
            json=payload,
            timeout=15,
        )
        if resp.status_code >= 400:
            LAST_SMTP_ERROR['msg'] = f'Resend {resp.status_code}: {resp.text}'
            print(f'Resend error: {resp.status_code} {resp.text}')
            return False
        return True
    except Exception as e:
        LAST_SMTP_ERROR['msg'] = f'{type(e).__name__}: {e}'
        print(f'Resend error: {type(e).__name__}: {e}')
        return False


def send_email(to_email: str, reset_link: str) -> bool:
    subject = 'Сброс пароля в Look'
    html_body = f'''<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>Сброс пароля</title></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:24px 0">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;padding:32px;max-width:520px">
        <tr><td>
          <h1 style="margin:0 0 16px;font-size:22px;color:#111">Сброс пароля</h1>
          <p style="margin:0 0 16px;font-size:15px;color:#333;line-height:1.5">Здравствуйте! Вы запросили сброс пароля в приложении Look.</p>
          <p style="margin:0 0 24px;font-size:15px;color:#333;line-height:1.5">Нажмите кнопку ниже, чтобы задать новый пароль:</p>
          <p style="margin:0 0 24px"><a href="{reset_link}" style="display:inline-block;padding:14px 28px;background:#fe2c55;color:#fff;text-decoration:none;border-radius:12px;font-weight:600;font-size:15px">Задать новый пароль</a></p>
          <p style="margin:0 0 8px;font-size:13px;color:#666">Если кнопка не работает, скопируйте ссылку в браузер:</p>
          <p style="margin:0 0 24px;font-size:12px;color:#888;word-break:break-all"><a href="{reset_link}" style="color:#888">{reset_link}</a></p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
          <p style="margin:0;font-size:12px;color:#999;line-height:1.5">Ссылка действует 1 час. Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо — ваш пароль останется прежним.</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:#aaa">© Look · visov.ru</p>
    </td></tr>
  </table>
</body></html>'''
    text_body = (
        'Сброс пароля в Look\n\n'
        'Здравствуйте! Вы запросили сброс пароля.\n\n'
        f'Откройте ссылку, чтобы задать новый пароль:\n{reset_link}\n\n'
        'Ссылка действует 1 час.\n\n'
        'Если вы не запрашивали сброс пароля — просто проигнорируйте это письмо.\n\n'
        '— Look'
    )
    return _send_via_resend(to_email, subject, html_body, text_body)


def send_verify_email(to_email: str, name: str, verify_link: str) -> bool:
    subject = 'Подтверждение email в Look'
    safe_name = (name or '').strip() or 'друг'
    html_body = f'''<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>Подтверждение email</title></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:24px 0">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;padding:32px;max-width:520px">
        <tr><td>
          <h1 style="margin:0 0 16px;font-size:22px;color:#111">Привет, {safe_name}!</h1>
          <p style="margin:0 0 16px;font-size:15px;color:#333;line-height:1.5">Спасибо, что зарегистрировались в Look. Подтвердите свой email, чтобы продолжить:</p>
          <p style="margin:0 0 24px"><a href="{verify_link}" style="display:inline-block;padding:14px 28px;background:#fe2c55;color:#fff;text-decoration:none;border-radius:12px;font-weight:600;font-size:15px">Подтвердить email</a></p>
          <p style="margin:0 0 8px;font-size:13px;color:#666">Если кнопка не работает, скопируйте ссылку в браузер:</p>
          <p style="margin:0 0 24px;font-size:12px;color:#888;word-break:break-all"><a href="{verify_link}" style="color:#888">{verify_link}</a></p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
          <p style="margin:0;font-size:12px;color:#999;line-height:1.5">Ссылка действует 24 часа. Если вы не регистрировались в Look — просто проигнорируйте это письмо.</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:#aaa">© Look · visov.ru</p>
    </td></tr>
  </table>
</body></html>'''
    text_body = (
        f'Привет, {safe_name}!\n\n'
        'Спасибо за регистрацию в Look. Подтвердите свой email:\n'
        f'{verify_link}\n\n'
        'Ссылка действует 24 часа.\n\n'
        '— Look'
    )
    return _send_via_resend(to_email, subject, html_body, text_body)

def handler(event: dict, context) -> dict:
    """Восстановление пароля: запрос ссылки и установка нового пароля"""
    method = event.get('httpMethod', 'POST')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**HEADERS, 'Access-Control-Max-Age': '86400'}, 'body': ''}

    if method != 'POST':
        return err('Method not allowed', 405)

    body = json.loads(event.get('body') or '{}')
    action = body.get('action')

    if action == 'test_smtp':
        to_email = (body.get('email') or '').strip()
        if not to_email:
            return err('email required')
        link = 'https://visov.ru/?reset_token=TEST_TOKEN_123'
        has_key = bool(os.environ.get('RESEND_API_KEY', '').strip())
        from_email = os.environ.get('RESEND_FROM_EMAIL', '').strip() or 'onboarding@resend.dev'
        sent = send_email(to_email, link)
        return ok({'sent': sent, 'has_key': has_key, 'from': from_email, 'error': LAST_SMTP_ERROR['msg']})

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

    if action == 'verify_send':
        email = (body.get('email') or '').strip().lower()
        origin = (body.get('origin') or '').strip().rstrip('/')
        if not email:
            cur.close(); conn.close()
            return err('email required')
        cur.execute("SELECT id, name, email_verified FROM app_users WHERE email=%s", (email,))
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return ok({'sent': True})
        user_id, name, verified = row
        if verified:
            cur.close(); conn.close()
            return ok({'sent': True, 'already': True})
        token = secrets.token_urlsafe(32)
        expires = datetime.utcnow() + timedelta(hours=24)
        cur.execute(
            "INSERT INTO email_verify_tokens (token, user_id, email, expires_at) VALUES (%s, %s, %s, %s)",
            (token, user_id, email, expires)
        )
        conn.commit()
        cur.close(); conn.close()
        base = origin or 'https://visov.ru'
        verify_link = f"{base}/?verify_token={token}"
        send_verify_email(email, name or '', verify_link)
        return ok({'sent': True})

    if action == 'verify_email':
        token = (body.get('token') or '').strip()
        if not token:
            cur.close(); conn.close()
            return err('token required')
        cur.execute(
            "SELECT user_id, email, expires_at, used FROM email_verify_tokens WHERE token=%s",
            (token,)
        )
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return err('Ссылка недействительна', 400)
        user_id, email, expires_at, used = row
        if used:
            cur.close(); conn.close()
            return err('Ссылка уже использована', 400)
        if expires_at < datetime.utcnow():
            cur.close(); conn.close()
            return err('Срок действия ссылки истёк', 400)
        cur.execute("UPDATE app_users SET email_verified=TRUE WHERE id=%s", (user_id,))
        cur.execute("UPDATE email_verify_tokens SET used=TRUE WHERE token=%s", (token,))
        conn.commit()
        cur.close(); conn.close()
        return ok({'verified': True, 'email': email})

    cur.close(); conn.close()
    return err('Unknown action')