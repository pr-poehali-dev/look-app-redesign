import json
import os
import random
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, make_msgid
import psycopg2


def send_email(to_email: str, code: str) -> None:
    host = os.environ.get('SMTP_HOST', '').strip()
    port_raw = os.environ.get('SMTP_PORT', '').strip()
    user = os.environ.get('SMTP_USER', '').strip()
    password = os.environ.get('SMTP_PASSWORD', '')
    if not host or not user or not password:
        raise RuntimeError('SMTP not configured')
    try:
        port = int(port_raw or '465')
    except ValueError:
        port = 465
    from_name = os.environ.get('SMTP_FROM_NAME', '').strip() or 'Look'

    subject = 'Код для входа в Look'
    html_body = (
        f'<div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">'
        f'<h2 style="color:#000;">Восстановление аккаунта</h2>'
        f'<p style="color:#444; font-size:15px;">Вы запросили вход в Look по старому email от приложения short-video.</p>'
        f'<p style="color:#444; font-size:15px;">Введите этот код, чтобы войти:</p>'
        f'<div style="font-size:36px; letter-spacing:8px; font-weight:700; background:#f3f3f3; padding:18px; border-radius:12px; text-align:center; margin:20px 0;">{code}</div>'
        f'<p style="color:#888; font-size:13px;">Код действует 15 минут. Если вы не запрашивали вход — просто проигнорируйте это письмо.</p>'
        f'</div>'
    )
    text_body = (
        'Восстановление аккаунта в Look\n\n'
        f'Ваш код для входа: {code}\n\n'
        'Код действует 15 минут.\n'
        'Если вы не запрашивали вход — просто проигнорируйте это письмо.'
    )

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = formataddr((from_name, user))
    msg['To'] = to_email
    msg['Message-ID'] = make_msgid(domain=user.split('@')[-1] if '@' in user else 'localhost')
    msg.attach(MIMEText(text_body, 'plain', 'utf-8'))
    msg.attach(MIMEText(html_body, 'html', 'utf-8'))

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


def handler(event: dict, context) -> dict:
    """Принимает email старого пользователя, генерирует 6-значный код и отправляет на почту через SMTP."""
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
    if not email or '@' not in email:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'invalid_email'})
        }

    ip = (event.get('requestContext', {}).get('identity', {}) or {}).get('sourceIp', '')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, fullname, username FROM legacy_users WHERE LOWER(identity) = %s LIMIT 1",
                (email,)
            )
            row = cur.fetchone()
            if not row:
                return {
                    'statusCode': 200,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'ok': True, 'sent': False, 'message': 'Если такой email был — код придёт.'}, ensure_ascii=False)
                }
            legacy_user_id = row[0]

            cur.execute(
                "SELECT COUNT(*) FROM legacy_otp_codes WHERE LOWER(email) = %s AND created_at > now() - interval '10 minutes'",
                (email,)
            )
            recent = cur.fetchone()[0]
            if recent >= 5:
                return {
                    'statusCode': 429,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'rate_limited', 'message': 'Слишком много попыток. Попробуйте через 10 минут.'}, ensure_ascii=False)
                }

            code = f'{random.randint(0, 999999):06d}'
            cur.execute(
                """INSERT INTO legacy_otp_codes (email, code, legacy_user_id, expires_at, ip)
                   VALUES (%s, %s, %s, now() + interval '15 minutes', %s)""",
                (email, code, legacy_user_id, ip)
            )
    finally:
        conn.close()

    try:
        send_email(email, code)
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'send_failed', 'message': f'{type(e).__name__}: {e}'}, ensure_ascii=False)
        }

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'ok': True, 'sent': True}, ensure_ascii=False)
    }
