import json
import os
import boto3
import psycopg2

def handler(event: dict, context) -> dict:
    """Получение и удаление медиа пользователя"""
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
            'body': ''
        }

    method = event.get('httpMethod', 'GET')

    # POST — удаление
    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        video_id = body.get('id')
        user_id = body.get('user_id')

        if not video_id or not user_id:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'id and user_id required'})
            }

        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        cur.execute("SELECT url FROM videos WHERE id = %s AND user_id = %s", (video_id, user_id))
        row = cur.fetchone()

        if not row:
            cur.close()
            conn.close()
            return {
                'statusCode': 404,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Not found'})
            }

        cdn_url = row[0]

        try:
            s3_key = cdn_url.split('/bucket/')[-1]
            s3 = boto3.client(
                's3',
                endpoint_url='https://bucket.poehali.dev',
                aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
            )
            s3.delete_object(Bucket='files', Key=s3_key)
        except Exception:
            pass

        cur.execute("DELETE FROM videos WHERE id = %s AND user_id = %s", (video_id, user_id))
        conn.commit()
        cur.close()
        conn.close()

        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'ok': True})
        }

    # GET — получение списка
    params = event.get('queryStringParameters') or {}
    user_id = params.get('user_id', 'anonymous')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    cur.execute(
        "SELECT id, url, type, created_at FROM videos WHERE user_id = %s ORDER BY created_at DESC LIMIT 100",
        (user_id,)
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()

    videos = [
        {
            'id': r[0],
            'url': r[1],
            'type': r[2],
            'label': r[3].strftime('%H:%M') if r[3] else '',
        }
        for r in rows
    ]

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'videos': videos})
    }
