# build v4 - deploy after secret fix
import json
import os
import hashlib
import secrets as pysecrets
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, make_msgid
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

LAST_ERR = {'msg': ''}


def _smtp_send(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
    host = os.environ.get('SMTP_HOST', '').strip()
    port_raw = os.environ.get('SMTP_PORT', '').strip()
    user = os.environ.get('SMTP_USER', '').strip()
    password = os.environ.get('SMTP_PASSWORD', '')
    if not host or not user or not password:
        missing = []
        if not host: missing.append('SMTP_HOST')
        if not user: missing.append('SMTP_USER')
        if not password: missing.append('SMTP_PASSWORD')
        LAST_ERR['msg'] = f'SMTP not configured. Empty: {", ".join(missing)}'
        return False
    try:
        port = int(port_raw or '465')
    except ValueError:
        port = 465
    from_name = os.environ.get('SMTP_FROM_NAME', '').strip() or 'Look'

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = formataddr((from_name, user))
    msg['To'] = to_email
    msg['Message-ID'] = make_msgid(domain=user.split('@')[-1] if '@' in user else 'localhost')
    msg['List-Unsubscribe'] = f'<mailto:{user}?subject=unsubscribe>'
    msg['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'
    msg.attach(MIMEText(text_body, 'plain', 'utf-8'))
    msg.attach(MIMEText(html_body, 'html', 'utf-8'))

    try:
        ctx = ssl.create_default_context()
        if port == 465:
            with smtplib.SMTP_SSL(host, port, context=ctx, timeout=20) as srv:
                srv.login(user, password)
                srv.sendmail(user, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(host, port, timeout=20) as srv:
                srv.ehlo()
                srv.starttls(context=ctx)
                srv.ehlo()
                srv.login(user, password)
                srv.sendmail(user, [to_email], msg.as_string())
        return True
    except Exception as e:
        LAST_ERR['msg'] = f'{type(e).__name__}: {e}'
        return False


def _send_reset(to_email: str, reset_link: str) -> bool:
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
          <p style="margin:0;font-size:12px;color:#999;line-height:1.5">Ссылка действует 1 час. Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:#aaa">© Look · visov.ru</p>
    </td></tr>
  </table>
</body></html>'''
    text_body = (
        'Сброс пароля в Look\n\n'
        f'Откройте ссылку: {reset_link}\n\n'
        'Ссылка действует 1 час.'
    )
    return _smtp_send(to_email, subject, html_body, text_body)


def _send_verify(to_email: str, name: str, verify_link: str) -> bool:
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
          <p style="margin:0 0 16px;font-size:15px;color:#333;line-height:1.5">Спасибо за регистрацию в Look. Подтвердите свой email:</p>
          <p style="margin:0 0 24px"><a href="{verify_link}" style="display:inline-block;padding:14px 28px;background:#fe2c55;color:#fff;text-decoration:none;border-radius:12px;font-weight:600;font-size:15px">Подтвердить email</a></p>
          <p style="margin:0 0 24px;font-size:12px;color:#888;word-break:break-all"><a href="{verify_link}" style="color:#888">{verify_link}</a></p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
          <p style="margin:0;font-size:12px;color:#999;line-height:1.5">Ссылка действует 24 часа.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>'''
    text_body = f'Привет, {safe_name}!\nПодтвердите email: {verify_link}\nСсылка действует 24 часа.'
    return _smtp_send(to_email, subject, html_body, text_body)


def handler(event: dict, context) -> dict:
    """Универсальная функция отправки писем через SMTP. Поддерживает: test_email, request, confirm, verify, verify_send, verify_email."""
    method = event.get('httpMethod', 'POST')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**HEADERS, 'Access-Control-Max-Age': '86400'}, 'body': ''}
    if method != 'POST':
        return err('Method not allowed', 405)

    try:
        body = json.loads(event.get('body') or '{}')
    except Exception:
        body = {}
    action = body.get('action')

    if action in ('test_email', 'test_smtp'):
        to_email = (body.get('email') or '').strip()
        if not to_email:
            return err('email required')
        smtp_user = os.environ.get('SMTP_USER', '').strip()
        smtp_host = os.environ.get('SMTP_HOST', '').strip()
        smtp_password = os.environ.get('SMTP_PASSWORD', '')
        smtp_diag = {
            'SMTP_HOST': 'set' if smtp_host else 'EMPTY',
            'SMTP_USER': 'set' if smtp_user else 'EMPTY',
            'SMTP_PASSWORD': 'set' if smtp_password else 'EMPTY',
            'SMTP_PORT': os.environ.get('SMTP_PORT', '').strip() or 'EMPTY',
        }
        from_email = smtp_user or '—'
        subject = 'Тестовое письмо · Look'
        html_body = f'''<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:24px 0"><tr><td align="center">
    <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;padding:32px;max-width:520px"><tr><td>
      <h1 style="margin:0 0 16px;font-size:22px;color:#111">Письмо доставлено!</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#333;line-height:1.5">Это тестовое письмо от Look. Отправка email работает.</p>
      <p style="margin:0;font-size:13px;color:#888">Провайдер: <b>smtp</b><br>Отправитель: <b>{from_email}</b></p>
    </td></tr></table>
  </td></tr></table>
</body></html>'''
        text_body = f'Тестовое письмо от Look\n\nПровайдер: smtp\nОтправитель: {from_email}'
        sent = _smtp_send(to_email, subject, html_body, text_body)
        return ok({'sent': sent, 'provider': 'smtp', 'from': from_email, 'error': LAST_ERR['msg'], 'smtp_diag': smtp_diag})

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
        token = pysecrets.token_urlsafe(32)
        expires = datetime.utcnow() + timedelta(hours=1)
        cur.execute(
            "INSERT INTO password_reset_tokens (token, user_id, email, expires_at) VALUES (%s, %s, %s, %s)",
            (token, user_id, email, expires)
        )
        conn.commit()
        cur.close(); conn.close()
        base = origin or 'https://visov.ru'
        reset_link = f"{base}/?reset_token={token}"
        _send_reset(email, reset_link)
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
        new_token = pysecrets.token_hex(32)
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
        token = pysecrets.token_urlsafe(32)
        expires = datetime.utcnow() + timedelta(hours=24)
        cur.execute(
            "INSERT INTO email_verify_tokens (token, user_id, email, expires_at) VALUES (%s, %s, %s, %s)",
            (token, user_id, email, expires)
        )
        conn.commit()
        cur.close(); conn.close()
        base = origin or 'https://visov.ru'
        verify_link = f"{base}/?verify_token={token}"
        _send_verify(email, name or '', verify_link)
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