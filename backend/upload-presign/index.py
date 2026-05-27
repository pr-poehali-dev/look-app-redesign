import json
import os
import uuid
import boto3
import psycopg2


def _cors_headers() -> dict:
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
        'Access-Control-Max-Age': '86400',
        'Content-Type': 'application/json',
    }


def handler(event: dict, context) -> dict:
    """Выдаёт presigned URL для прямой загрузки файла в S3 (action=presign)
    и регистрирует запись в БД после успешной загрузки (action=register).
    Позволяет грузить файлы любого размера, минуя лимит cloud function."""
    method = event.get('httpMethod', 'POST')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': _cors_headers(), 'body': ''}

    try:
        body = json.loads(event.get('body') or '{}')
    except Exception:
        return {'statusCode': 400, 'headers': _cors_headers(),
                'body': json.dumps({'error': 'Invalid JSON'})}

    action = body.get('action', 'presign')

    if action == 'presign':
        content_type = body.get('content_type') or 'application/octet-stream'
        ext = (body.get('ext') or 'bin').lstrip('.').lower()
        if len(ext) > 6 or not ext.isalnum():
            ext = 'bin'

        key = f"videos/{uuid.uuid4().hex}.{ext}"

        s3 = boto3.client(
            's3',
            endpoint_url='https://bucket.poehali.dev',
            aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
            aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
        )

        upload_url = s3.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': 'files',
                'Key': key,
                'ContentType': content_type,
            },
            ExpiresIn=3600,
        )

        cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

        return {
            'statusCode': 200,
            'headers': _cors_headers(),
            'body': json.dumps({
                'upload_url': upload_url,
                'cdn_url': cdn_url,
                'key': key,
                'content_type': content_type,
            }),
        }

    if action == 'register':
        cdn_url = body.get('cdn_url')
        if not cdn_url:
            return {'statusCode': 400, 'headers': _cors_headers(),
                    'body': json.dumps({'error': 'cdn_url required'})}

        media_type = body.get('media_type') or ('video' if str(body.get('type', '')).startswith('video') else 'image')
        category = body.get('category', 'humor')
        user_id = body.get('user_id', 'anonymous')
        author = body.get('author', 'Я')
        handle = body.get('handle', 'user')
        description = body.get('description', '')
        hashtags = body.get('hashtags', '')

        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        try:
            cur.execute(
                "INSERT INTO videos (url, author, handle, description, hashtags, category, type, user_id) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
                (cdn_url, author, handle, description, hashtags, category, media_type, user_id),
            )
            video_id = cur.fetchone()[0]
            conn.commit()
        finally:
            cur.close()
            conn.close()

        return {
            'statusCode': 200,
            'headers': _cors_headers(),
            'body': json.dumps({'id': video_id, 'url': cdn_url, 'type': media_type}),
        }

    return {'statusCode': 400, 'headers': _cors_headers(),
            'body': json.dumps({'error': 'Unknown action'})}
