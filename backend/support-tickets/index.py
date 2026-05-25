"""
Поддержка: приём обращений от пользователей и просмотр в админке.
Сохраняет тикет в БД, опционально загружает прикреплённый файл в S3,
отправляет уведомление на support@visov.ru через SMTP.
"""
import json
import os
import base64
import uuid
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, make_msgid
import psycopg2
import boto3

HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-User-Name',
}


def ok(data):
    return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps(data, ensure_ascii=False)}


def err(msg, code=400):
    return {'statusCode': code, 'headers': HEADERS, 'body': json.dumps({'error': msg}, ensure_ascii=False)}


def _upload_to_s3(data_b64: str, filename: str) -> str:
    try:
        ak = os.environ.get('AWS_ACCESS_KEY_ID', '')
        sk = os.environ.get('AWS_SECRET_ACCESS_KEY', '')
        if not ak or not sk:
            return ''
        binary = base64.b64decode(data_b64)
        safe_name = (filename or 'file').replace('/', '_').replace('\\', '_')
        key = f'support/{uuid.uuid4().hex}_{safe_name}'
        s3 = boto3.client(
            's3',
            endpoint_url='https://bucket.poehali.dev',
            aws_access_key_id=ak,
            aws_secret_access_key=sk,
        )
        s3.put_object(Bucket='files', Key=key, Body=binary)
        return f"https://cdn.poehali.dev/projects/{ak}/bucket/{key}"
    except Exception as e:
        print(f'support upload error: {type(e).__name__}: {e}')
        return ''


def _notify_email(subject: str, message: str, user_name: str, user_email: str, attachment_url: str) -> None:
    host = os.environ.get('SMTP_HOST', '').strip()
    user = os.environ.get('SMTP_USER', '').strip()
    password = os.environ.get('SMTP_PASSWORD', '')
    if not host or not user or not password:
        return
    try:
        port = int(os.environ.get('SMTP_PORT', '465'))
    except ValueError:
        port = 465
    to_addr = user
    safe_subject = subject.replace('\n', ' ').replace('\r', ' ').strip()[:120] or 'Новое обращение'
    html_body = f"""<!DOCTYPE html>
<html><body style='font-family:Arial,sans-serif;background:#f5f5f7;padding:24px'>
<table width='560' style='background:#fff;border-radius:12px;padding:24px;max-width:560px'>
<tr><td>
<h2 style='margin:0 0 12px;color:#111'>Новое обращение в поддержку</h2>
<p><b>Тема:</b> {safe_subject}</p>
<p><b>От:</b> {user_name or '—'} ({user_email or '—'})</p>
<p><b>Сообщение:</b></p>
<div style='background:#f5f5f7;border-radius:8px;padding:12px;white-space:pre-wrap;color:#222'>{message}</div>
{f'<p style="margin-top:16px"><b>Файл:</b> <a href="{attachment_url}">{attachment_url}</a></p>' if attachment_url else ''}
</td></tr></table></body></html>"""
    text_body = (
        f'Новое обращение в поддержку\n\n'
        f'Тема: {safe_subject}\n'
        f'От: {user_name or "—"} ({user_email or "—"})\n\n'
        f'{message}\n\n'
        + (f'Файл: {attachment_url}\n' if attachment_url else '')
    )
    msg = MIMEMultipart('alternative')
    msg['Subject'] = f'[Look Support] {safe_subject}'
    msg['From'] = formataddr(('Look Support', user))
    msg['To'] = to_addr
    msg['Reply-To'] = user_email or user
    msg['Message-ID'] = make_msgid(domain=user.split('@')[-1] if '@' in user else 'localhost')
    msg.attach(MIMEText(text_body, 'plain', 'utf-8'))
    msg.attach(MIMEText(html_body, 'html', 'utf-8'))
    try:
        ctx = ssl.create_default_context()
        if port == 465:
            with smtplib.SMTP_SSL(host, port, context=ctx, timeout=15) as srv:
                srv.login(user, password)
                srv.sendmail(user, [to_addr], msg.as_string())
        else:
            with smtplib.SMTP(host, port, timeout=15) as srv:
                srv.ehlo()
                srv.starttls(context=ctx)
                srv.ehlo()
                srv.login(user, password)
                srv.sendmail(user, [to_addr], msg.as_string())
    except Exception as e:
        print(f'support notify smtp error: {type(e).__name__}: {e}')


def handler(event: dict, context) -> dict:
    """Поддержка: приём обращений и просмотр в админке."""
    method = event.get('httpMethod', 'POST')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**HEADERS, 'Access-Control-Max-Age': '86400'}, 'body': ''}

    body = {}
    if event.get('body'):
        try:
            body = json.loads(event['body'])
        except Exception:
            body = {}

    headers = event.get('headers') or {}
    user_id = headers.get('X-User-Id') or headers.get('x-user-id') or ''
    user_name = headers.get('X-User-Name') or headers.get('x-user-name') or ''
    try:
        from urllib.parse import unquote
        user_name = unquote(user_name)
    except Exception:
        pass

    action = body.get('action') or (event.get('queryStringParameters') or {}).get('action') or 'create'

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    try:
        if action == 'create':
            subject = (body.get('subject') or '').strip()
            message = (body.get('message') or '').strip()
            user_email = (body.get('user_email') or '').strip()
            file_b64 = body.get('file_base64') or ''
            file_name = body.get('file_name') or ''
            if not subject or not message:
                return err('Заполни тему и сообщение')
            attachment_url = ''
            if file_b64:
                attachment_url = _upload_to_s3(file_b64, file_name)
            cur.execute(
                "INSERT INTO support_tickets (user_id, user_name, user_email, subject, message, attachment_url) "
                "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                (user_id or None, user_name or None, user_email or None, subject, message, attachment_url or None),
            )
            ticket_id = cur.fetchone()[0]
            conn.commit()
            _notify_email(subject, message, user_name, user_email, attachment_url)
            return ok({'ok': True, 'id': ticket_id})

        if action == 'list':
            cur.execute(
                "SELECT id, user_id, user_name, user_email, subject, message, attachment_url, status, created_at "
                "FROM support_tickets ORDER BY id DESC LIMIT 200"
            )
            items = [
                {
                    'id': r[0], 'user_id': r[1], 'user_name': r[2], 'user_email': r[3],
                    'subject': r[4], 'message': r[5], 'attachment_url': r[6],
                    'status': r[7], 'created_at': r[8].isoformat() if r[8] else None,
                }
                for r in cur.fetchall()
            ]
            return ok({'tickets': items})

        if action == 'update_status':
            ticket_id = body.get('id')
            status = (body.get('status') or '').strip()
            if not ticket_id or status not in ('new', 'in_progress', 'done'):
                return err('id и status обязательны')
            cur.execute("UPDATE support_tickets SET status=%s WHERE id=%s", (status, ticket_id))
            conn.commit()
            return ok({'ok': True})

        return err('Unknown action')
    finally:
        try:
            cur.close()
        except Exception:
            pass
        try:
            conn.close()
        except Exception:
            pass
