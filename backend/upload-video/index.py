import json
import os
import base64
import uuid
import hashlib
import boto3
import psycopg2

def handler(event: dict, context) -> dict:
    """Загрузка видео или фото в S3 и сохранение в БД"""
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400',
            },
            'body': ''
        }

    body = json.loads(event.get('body') or '{}')
    file_data = body.get('file')
    file_type = body.get('type', 'video/mp4')
    ext = body.get('ext', 'mp4')
    category = body.get('category', 'humor')
    user_id = body.get('user_id', 'anonymous')
    author = body.get('author', 'Я')
    handle = body.get('handle', 'user')
    description = body.get('description', '')
    hashtags = body.get('hashtags', '')
    media_type = 'video' if file_type.startswith('video') else 'image'

    if not file_data:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'No file provided'})
        }

    file_bytes = base64.b64decode(file_data)
    file_hash = hashlib.sha256(file_bytes).hexdigest()[:32]

    # Защита от дублей: тот же user_id + тот же файл за последние 60 секунд = возвращаем существующую запись
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT id, url, type FROM videos WHERE user_id=%s AND url LIKE %s AND created_at > NOW() - INTERVAL '60 seconds' ORDER BY id DESC LIMIT 1",
            (user_id, f'%{file_hash}%')
        )
        existing = cur.fetchone()
        if existing:
            cur.close()
            conn.close()
            return {
                'statusCode': 200,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'url': existing[1], 'id': existing[0], 'type': existing[2], 'deduped': True})
            }
    except Exception:
        pass

    file_name = f"videos/{file_hash}-{uuid.uuid4().hex[:8]}.{ext}"

    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )

    s3.put_object(
        Bucket='files',
        Key=file_name,
        Body=file_bytes,
        ContentType=file_type,
    )

    cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{file_name}"

    try:
        cur.execute(
            "INSERT INTO videos (url, author, handle, description, hashtags, category, type, user_id) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (cdn_url, author, handle, description, hashtags, category, media_type, user_id)
        )
        video_id = cur.fetchone()[0]
        conn.commit()
    finally:
        cur.close()
        conn.close()

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'url': cdn_url, 'id': video_id, 'type': media_type})
    }