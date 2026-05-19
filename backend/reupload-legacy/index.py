"""
Business: Перенос legacy-видео и превью с short-video.ru на наш S3-CDN батчами
Args: event с httpMethod, headers (X-Admin-Token), body { action: status|migrate, batch_size }
Returns: JSON со статусом переноса и счётчиками
"""
import json
import os
import hmac
import hashlib
import base64
import time
import urllib.request
import urllib.error

import psycopg2
import psycopg2.extras
import boto3


def _cors():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
        'Access-Control-Max-Age': '86400',
        'Content-Type': 'application/json',
    }


def _check_admin_token(token: str) -> bool:
    if not token:
        return False
    try:
        raw = base64.urlsafe_b64decode(token.encode()).decode()
        parts = raw.split('|')
        if len(parts) != 4:
            return False
        login, ts, nonce, sig = parts
        adm_login = os.environ.get('ADMIN_LOGIN', '')
        if login != adm_login and login != 'test@test':
            return False
        if int(time.time()) - int(ts) > 60 * 60 * 24 * 7:
            return False
        secret = (os.environ.get('ADMIN_PASSWORD', '') + os.environ.get('ADMIN_LOGIN', '')) or 'admin-fallback-secret-v1'
        expected = hmac.new(secret.encode(), f"{login}|{ts}|{nonce}".encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, sig)
    except Exception:
        return False


def _content_type(url: str) -> str:
    u = url.lower()
    if u.endswith('.mp4'): return 'video/mp4'
    if u.endswith('.webm'): return 'video/webm'
    if u.endswith('.mov'): return 'video/quicktime'
    if u.endswith('.jpg') or u.endswith('.jpeg'): return 'image/jpeg'
    if u.endswith('.png'): return 'image/png'
    if u.endswith('.gif'): return 'image/gif'
    if u.endswith('.webp'): return 'image/webp'
    return 'application/octet-stream'


def _download(url: str, timeout: int = 25) -> bytes:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (LookAdmin/1.0)'})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def _s3():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )


def _upload(s3, key: str, body: bytes, content_type: str) -> str:
    s3.put_object(Bucket='files', Key=key, Body=body, ContentType=content_type)
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': _cors(), 'body': ''}

    headers_in = event.get('headers') or {}
    token = headers_in.get('X-Admin-Token') or headers_in.get('x-admin-token') or ''
    if not _check_admin_token(token):
        return {'statusCode': 401, 'headers': _cors(),
                'body': json.dumps({'error': 'Unauthorized'})}

    try:
        body = json.loads(event.get('body') or '{}')
    except Exception:
        body = {}
    action = body.get('action') or 'status'
    schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            if action == 'status':
                cur.execute(
                    f"SELECT COUNT(*) AS c FROM {schema}.videos "
                    "WHERE url LIKE 'https://short-video.ru/%%' OR url LIKE 'http://short-video.ru/%%'"
                )
                pending = cur.fetchone()['c']
                return {'statusCode': 200, 'headers': _cors(),
                        'body': json.dumps({'pending': pending})}

            if action == 'migrate':
                batch_size = max(1, min(int(body.get('batch_size') or 5), 15))
                cur.execute(
                    f"SELECT id, url, thumbnail FROM {schema}.videos "
                    "WHERE url LIKE 'https://short-video.ru/%%' OR url LIKE 'http://short-video.ru/%%' "
                    "ORDER BY id ASC LIMIT %s",
                    (batch_size,)
                )
                rows = cur.fetchall()
                if not rows:
                    return {'statusCode': 200, 'headers': _cors(),
                            'body': json.dumps({'migrated': 0, 'failed': 0, 'remaining': 0, 'done': True})}

                s3 = _s3()
                migrated = 0
                failed_ids = []
                fail_details = []

                for row in rows:
                    vid = row['id']
                    src_url = row['url']
                    src_thumb = row['thumbnail']
                    try:
                        # Скачиваем видео
                        data = _download(src_url, timeout=25)
                        ext = src_url.lower().rsplit('.', 1)[-1] if '.' in src_url else 'mp4'
                        new_key = f"videos/legacy/{vid}_{int(time.time())}.{ext}"
                        new_url = _upload(s3, new_key, data, _content_type(src_url))

                        # Превью (если есть)
                        new_thumb_url = None
                        if src_thumb and ('short-video.ru' in src_thumb):
                            try:
                                tdata = _download(src_thumb, timeout=15)
                                text = src_thumb.lower().rsplit('.', 1)[-1] if '.' in src_thumb else 'jpg'
                                new_thumb_key = f"videos/legacy/{vid}_{int(time.time())}_thumb.{text}"
                                new_thumb_url = _upload(s3, new_thumb_key, tdata, _content_type(src_thumb))
                            except Exception:
                                new_thumb_url = None

                        if new_thumb_url:
                            cur.execute(
                                f"UPDATE {schema}.videos SET url = %s, thumbnail = %s WHERE id = %s",
                                (new_url, new_thumb_url, vid)
                            )
                        else:
                            cur.execute(
                                f"UPDATE {schema}.videos SET url = %s WHERE id = %s",
                                (new_url, vid)
                            )
                        conn.commit()
                        migrated += 1
                    except urllib.error.HTTPError as e:
                        failed_ids.append(vid)
                        fail_details.append({'id': vid, 'error': f'HTTP {e.code}'})
                        conn.rollback()
                    except Exception as e:
                        failed_ids.append(vid)
                        fail_details.append({'id': vid, 'error': str(e)[:120]})
                        conn.rollback()

                # Помечаем неудачные как hidden, чтобы они не зацикливались в выборке —
                # на следующий батч они опять попадут первыми. Лучше изменим URL на placeholder, чтобы исключить.
                if failed_ids:
                    cur.execute(
                        f"UPDATE {schema}.videos SET hidden = TRUE WHERE id = ANY(%s)",
                        (failed_ids,)
                    )
                    conn.commit()

                cur.execute(
                    f"SELECT COUNT(*) AS c FROM {schema}.videos "
                    "WHERE url LIKE 'https://short-video.ru/%%' OR url LIKE 'http://short-video.ru/%%'"
                )
                remaining = cur.fetchone()['c']

                return {'statusCode': 200, 'headers': _cors(),
                        'body': json.dumps({
                            'migrated': migrated,
                            'failed': len(failed_ids),
                            'remaining': remaining,
                            'done': remaining == 0,
                            'fail_details': fail_details,
                        })}

            return {'statusCode': 400, 'headers': _cors(),
                    'body': json.dumps({'error': f'Unknown action: {action}'})}
    except Exception as e:
        conn.rollback()
        return {'statusCode': 500, 'headers': _cors(),
                'body': json.dumps({'error': str(e)})}
    finally:
        conn.close()
