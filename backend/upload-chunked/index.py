import json
import os
import uuid
import base64
import boto3
import psycopg2


def _cors() -> dict:
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
        'Access-Control-Max-Age': '86400',
        'Content-Type': 'application/json',
    }


def _s3():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )


BUCKET = 'files'


def handler(event: dict, context) -> dict:
    """Загрузка файлов любого размера чанками.
    Каждый чанк сохраняется как отдельный S3-объект,
    на finish — склейка в финальный файл."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': _cors(), 'body': ''}

    try:
        body = json.loads(event.get('body') or '{}')
    except Exception:
        return {'statusCode': 400, 'headers': _cors(),
                'body': json.dumps({'error': 'Invalid JSON'})}

    action = body.get('action')
    s3 = _s3()

    if action == 'init':
        ext = (body.get('ext') or 'mp4').lstrip('.').lower()
        if len(ext) > 6 or not ext.isalnum():
            ext = 'bin'
        upload_id = uuid.uuid4().hex
        key = f"videos/{upload_id}.{ext}"
        return {
            'statusCode': 200, 'headers': _cors(),
            'body': json.dumps({'upload_id': upload_id, 'key': key}),
        }

    if action == 'chunk':
        upload_id = body.get('upload_id')
        part_number = int(body.get('part_number') or 0)
        data_b64 = body.get('data') or ''
        if not upload_id or part_number < 1:
            return {'statusCode': 400, 'headers': _cors(),
                    'body': json.dumps({'error': 'bad params'})}
        chunk = base64.b64decode(data_b64)
        part_key = f"_chunks/{upload_id}/part-{part_number:05d}"
        s3.put_object(Bucket=BUCKET, Key=part_key, Body=chunk)
        return {
            'statusCode': 200, 'headers': _cors(),
            'body': json.dumps({'part_number': part_number, 'size': len(chunk)}),
        }

    if action == 'finish':
        key = body.get('key')
        upload_id = body.get('upload_id')
        total_parts = int(body.get('total_parts') or 0)
        content_type = body.get('content_type') or 'application/octet-stream'
        if not key or not upload_id or total_parts < 1:
            return {'statusCode': 400, 'headers': _cors(),
                    'body': json.dumps({'error': 'bad params'})}

        combined = bytearray()
        for n in range(1, total_parts + 1):
            part_key = f"_chunks/{upload_id}/part-{n:05d}"
            obj = s3.get_object(Bucket=BUCKET, Key=part_key)
            combined.extend(obj['Body'].read())

        s3.put_object(Bucket=BUCKET, Key=key, Body=bytes(combined),
                      ContentType=content_type)

        for n in range(1, total_parts + 1):
            try:
                s3.delete_object(Bucket=BUCKET,
                                 Key=f"_chunks/{upload_id}/part-{n:05d}")
            except Exception:
                pass

        cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

        meta = body.get('meta') or {}
        video_id = None
        media_type = 'video' if str(content_type).startswith('video') else 'image'
        if meta:
            conn = psycopg2.connect(os.environ['DATABASE_URL'])
            cur = conn.cursor()
            try:
                cur.execute(
                    "INSERT INTO videos (url, author, handle, description, hashtags, category, type, user_id) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
                    (cdn_url, meta.get('author', 'Я'), meta.get('handle', 'user'),
                     meta.get('description', ''), meta.get('hashtags', ''),
                     meta.get('category', 'humor'), media_type,
                     meta.get('user_id', 'anonymous')),
                )
                video_id = cur.fetchone()[0]
                conn.commit()
            finally:
                cur.close()
                conn.close()

        return {
            'statusCode': 200, 'headers': _cors(),
            'body': json.dumps({'url': cdn_url, 'id': video_id, 'key': key,
                                'type': media_type}),
        }

    if action == 'abort':
        upload_id = body.get('upload_id')
        total_parts = int(body.get('total_parts') or 0)
        if upload_id and total_parts > 0:
            for n in range(1, total_parts + 1):
                try:
                    s3.delete_object(Bucket=BUCKET,
                                     Key=f"_chunks/{upload_id}/part-{n:05d}")
                except Exception:
                    pass
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'ok': True})}

    return {'statusCode': 400, 'headers': _cors(),
            'body': json.dumps({'error': 'Unknown action'})}
