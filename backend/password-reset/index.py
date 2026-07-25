# SMTP-only build v4 - deploy after secret fix
import json
import os
import hashlib
import secrets
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, make_msgid
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


def _log_email(to_email: str, subject: str, kind: str, success: bool, error_msg: str = ''):
    try:
        c = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = c.cursor()
        cur.execute(
            "INSERT INTO email_log (to_email, subject, kind, success, error_msg) VALUES (%s, %s, %s, %s, %s)",
            (to_email, subject, kind, success, error_msg or None),
        )
        c.commit()
        cur.close()
        c.close()
    except Exception as e:
        print(f'email_log error: {type(e).__name__}: {e}')

def _send_via_smtp(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
    host = os.environ.get('SMTP_HOST', '').strip()
    port_raw = os.environ.get('SMTP_PORT', '').strip()
    user = os.environ.get('SMTP_USER', '').strip()
    password = os.environ.get('SMTP_PASSWORD', '')
    if not host or not user or not password:
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
        LAST_SMTP_ERROR['msg'] = f'{type(e).__name__}: {e}'
        print(f'SMTP error: {type(e).__name__}: {e}')
        return False


def _send_via_brevo(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
    api_key = os.environ.get('BREVO_API_KEY', '').strip()
    from_email = os.environ.get('BREVO_FROM_EMAIL', '').strip()
    from_name = os.environ.get('BREVO_FROM_NAME', '').strip() or 'Look'
    if not api_key or not from_email:
        return False
    payload = {
        'sender': {'name': from_name, 'email': from_email},
        'to': [{'email': to_email}],
        'subject': subject,
        'htmlContent': html_body,
        'textContent': text_body,
        'headers': {
            'List-Unsubscribe': f'<mailto:{from_email}?subject=unsubscribe>',
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
    }
    try:
        resp = requests.post(
            'https://api.brevo.com/v3/smtp/email',
            headers={'api-key': api_key, 'Content-Type': 'application/json', 'accept': 'application/json'},
            json=payload, timeout=15,
        )
        if resp.status_code >= 400:
            LAST_SMTP_ERROR['msg'] = f'Brevo {resp.status_code}: {resp.text}'
            print(f'Brevo error: {resp.status_code} {resp.text}')
            return False
        return True
    except Exception as e:
        LAST_SMTP_ERROR['msg'] = f'{type(e).__name__}: {e}'
        print(f'Brevo error: {type(e).__name__}: {e}')
        return False


def _send_via_resend(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
    # Только SMTP. Никаких фолбэков на Resend/Brevo.
    host = os.environ.get('SMTP_HOST', '').strip()
    user = os.environ.get('SMTP_USER', '').strip()
    pwd = os.environ.get('SMTP_PASSWORD', '')
    if not host or not user or not pwd:
        missing = []
        if not host: missing.append('SMTP_HOST')
        if not user: missing.append('SMTP_USER')
        if not pwd: missing.append('SMTP_PASSWORD')
        LAST_SMTP_ERROR['msg'] = f'SMTP not configured. Empty: {", ".join(missing)}'
        return False
    return _send_via_smtp(to_email, subject, html_body, text_body)


def send_email(to_email: str, reset_link: str) -> bool:
    subject = 'Сброс пароля в Look'
    kind = 'password_reset'
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
      <p style="margin:16px 0 0;font-size:11px;color:#aaa">© Look · look.com.ru</p>
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
    ok_result = _send_via_resend(to_email, subject, html_body, text_body)
    _log_email(to_email, subject, kind, ok_result, LAST_SMTP_ERROR.get('msg', '') if not ok_result else '')
    return ok_result


def send_verify_email(to_email: str, name: str, verify_link: str) -> bool:
    subject = 'Подтверждение email в Look'
    kind = 'verify_email'
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
      <p style="margin:16px 0 0;font-size:11px;color:#aaa">© Look · look.com.ru</p>
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
    ok_result = _send_via_resend(to_email, subject, html_body, text_body)
    _log_email(to_email, subject, kind, ok_result, LAST_SMTP_ERROR.get('msg', '') if not ok_result else '')
    return ok_result

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
    try:
        if action == 'email_stats':
            cur.execute(
                "SELECT COUNT(*) FILTER (WHERE success), COUNT(*) FILTER (WHERE NOT success), COUNT(*) FROM email_log"
            )
            row = cur.fetchone()
            sent, failed, total = (row[0] or 0), (row[1] or 0), (row[2] or 0)
            cur.execute(
                "SELECT COUNT(*) FILTER (WHERE success), COUNT(*) FILTER (WHERE NOT success) "
                "FROM email_log WHERE created_at > NOW() - INTERVAL '24 hours'"
            )
            row24 = cur.fetchone()
            sent24, failed24 = (row24[0] or 0), (row24[1] or 0)
            cur.execute(
                "SELECT kind, COUNT(*) FILTER (WHERE success), COUNT(*) FILTER (WHERE NOT success) "
                "FROM email_log GROUP BY kind ORDER BY kind"
            )
            by_kind = [{'kind': r[0], 'sent': r[1] or 0, 'failed': r[2] or 0} for r in cur.fetchall()]
            cur.execute(
                "SELECT id, to_email, subject, kind, success, error_msg, created_at "
                "FROM email_log ORDER BY id DESC LIMIT 30"
            )
            recent = [
                {
                    'id': r[0], 'to_email': r[1], 'subject': r[2], 'kind': r[3],
                    'success': r[4], 'error_msg': r[5], 'created_at': r[6].isoformat() if r[6] else None,
                }
                for r in cur.fetchall()
            ]
            return ok({
                'total': total, 'sent': sent, 'failed': failed,
                'sent_24h': sent24, 'failed_24h': failed24,
                'by_kind': by_kind, 'recent': recent,
            })

        if action == 'check_verified':
            email = (body.get('email') or '').strip().lower()
            if not email:
                return err('email required')
            cur.execute("SELECT email_verified FROM app_users WHERE email=%s", (email,))
            row = cur.fetchone()
            return ok({'verified': bool(row[0]) if row else False})

        if action == 'request':
            email = (body.get('email') or '').strip().lower()
            origin = (body.get('origin') or '').strip().rstrip('/')
            if not email:
                return err('Введи email')
            cur.execute("SELECT id FROM app_users WHERE email=%s", (email,))
            row = cur.fetchone()
            if not row:
                return ok({'sent': True})
            user_id = row[0]
            token = secrets.token_urlsafe(32)
            expires = datetime.utcnow() + timedelta(hours=1)
            cur.execute(
                "INSERT INTO password_reset_tokens (token, user_id, email, expires_at) VALUES (%s, %s, %s, %s)",
                (token, user_id, email, expires)
            )
            conn.commit()
            base = origin or 'https://look.com.ru'
            reset_link = f"{base}/?reset_token={token}"
            send_email(email, reset_link)
            return ok({'sent': True})

        if action == 'confirm':
            token = (body.get('token') or '').strip()
            new_password = body.get('password') or ''
            if not token or not new_password:
                return err('token и password обязательны')
            if len(new_password) < 6:
                return err('Пароль минимум 6 символов')
            cur.execute(
                "SELECT user_id, expires_at, used FROM password_reset_tokens WHERE token=%s",
                (token,)
            )
            row = cur.fetchone()
            if not row:
                return err('Ссылка недействительна', 400)
            user_id, expires_at, used = row
            if used:
                return err('Ссылка уже использована', 400)
            if expires_at < datetime.utcnow():
                return err('Срок действия ссылки истёк', 400)
            new_token = secrets.token_hex(32)
            cur.execute(
                "UPDATE app_users SET password_hash=%s, token=%s WHERE id=%s",
                (hash_pw(new_password), new_token, user_id)
            )
            cur.execute("UPDATE password_reset_tokens SET used=TRUE WHERE token=%s", (token,))
            conn.commit()
            return ok({'reset': True})

        if action == 'verify':
            token = (body.get('token') or '').strip()
            if not token:
                return err('token required')
            cur.execute(
                "SELECT email, expires_at, used FROM password_reset_tokens WHERE token=%s",
                (token,)
            )
            row = cur.fetchone()
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
                return err('email required')
            cur.execute("SELECT id, name, email_verified FROM app_users WHERE email=%s", (email,))
            row = cur.fetchone()
            if not row:
                return ok({'sent': True})
            user_id, name, verified = row
            if verified:
                return ok({'sent': True, 'already': True})
            token = secrets.token_urlsafe(32)
            expires = datetime.utcnow() + timedelta(hours=24)
            cur.execute(
                "INSERT INTO email_verify_tokens (token, user_id, email, expires_at) VALUES (%s, %s, %s, %s)",
                (token, user_id, email, expires)
            )
            conn.commit()
            base = origin or 'https://look.com.ru'
            verify_link = f"{base}/?verify_token={token}"
            send_verify_email(email, name or '', verify_link)
            return ok({'sent': True})

        if action == 'verify_email':
            token = (body.get('token') or '').strip()
            if not token:
                return err('token required')
            cur.execute(
                "SELECT user_id, email, expires_at, used FROM email_verify_tokens WHERE token=%s",
                (token,)
            )
            row = cur.fetchone()
            if not row:
                return err('Ссылка недействительна', 400)
            user_id, email, expires_at, used = row
            if used:
                return err('Ссылка уже использована', 400)
            if expires_at < datetime.utcnow():
                return err('Срок действия ссылки истёк', 400)
            cur.execute("UPDATE app_users SET email_verified=TRUE WHERE id=%s", (user_id,))
            cur.execute("UPDATE email_verify_tokens SET used=TRUE WHERE token=%s", (token,))
            conn.commit()
            return ok({'verified': True, 'email': email})

        return err('Unknown action')
    finally:
        try: cur.close()
        except Exception: pass
        try: conn.close()
        except Exception: pass