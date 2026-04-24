import json
import os
import base64
import uuid
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
    media_type = 'video' if file_type.startswith('video') else 'image'

    if not file_data:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'No file provided'})
        }

    file_bytes = base64.b64decode(file_data)
    file_name = f"videos/{uuid.uuid4()}.{ext}"

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

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO videos (url, author, handle, description, category, type, user_id) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
        (cdn_url, author, handle, description, category, media_type, user_id)
    )
    video_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'url': cdn_url, 'id': video_id, 'type': media_type})
    }
