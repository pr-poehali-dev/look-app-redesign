import json
import os
import uuid
import requests
import boto3
import psycopg2

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Accept': 'video/webm,video/mp4,video/*,*/*;q=0.9',
    'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
    'Referer': 'https://short-video.ru/',
    'Origin': 'https://short-video.ru',
}

def handler(event: dict, context) -> dict:
    """Перекачивает видео с short-video.ru на наш CDN и обновляет URL в БД. По 5 штук за вызов."""
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            'body': ''
        }

    schema = os.environ['MAIN_DB_SCHEMA']
    pg = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = pg.cursor()

    cur.execute(f"""
        SELECT id, url, thumbnail FROM {schema}.videos
        WHERE url LIKE 'https://short-video.ru%%'
        ORDER BY id
        LIMIT 5
    """)
    rows = cur.fetchall()

    if not rows:
        cur.close()
        pg.close()
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'done': True, 'message': 'Все видео перекачаны'})
        }

    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )
    access_key = os.environ['AWS_ACCESS_KEY_ID']

    processed = 0
    failed = []

    for row in rows:
        vid_id, url, thumbnail = row

        try:
            r = requests.get(url, headers=HEADERS, timeout=25, allow_redirects=True)
            r.raise_for_status()
            content_type = r.headers.get('Content-Type', 'video/mp4')
            ext = url.split('.')[-1].split('?')[0][:4] or 'mp4'
            key = f"videos/{uuid.uuid4()}.{ext}"
            s3.put_object(Bucket='files', Key=key, Body=r.content, ContentType=content_type)
            new_url = f"https://cdn.poehali.dev/projects/{access_key}/bucket/{key}"
        except Exception as e:
            failed.append({'id': vid_id, 'error': str(e)[:200]})
            cur.execute(f"UPDATE {schema}.videos SET url = 'failed:' || url WHERE id = %s", (vid_id,))
            pg.commit()
            continue

        new_thumbnail = thumbnail
        if thumbnail and thumbnail.startswith('https://short-video.ru'):
            try:
                rt = requests.get(thumbnail, headers=HEADERS, timeout=10, allow_redirects=True)
                rt.raise_for_status()
                tkey = f"thumbnails/{uuid.uuid4()}.jpg"
                s3.put_object(Bucket='files', Key=tkey, Body=rt.content, ContentType='image/jpeg')
                new_thumbnail = f"https://cdn.poehali.dev/projects/{access_key}/bucket/{tkey}"
            except Exception:
                pass

        cur.execute(
            f"UPDATE {schema}.videos SET url = %s, thumbnail = %s WHERE id = %s",
            (new_url, new_thumbnail, vid_id)
        )
        pg.commit()
        processed += 1

    cur.execute(f"SELECT COUNT(*) FROM {schema}.videos WHERE url LIKE 'https://short-video.ru%%'")
    remaining = cur.fetchone()[0]

    cur.close()
    pg.close()

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'done': remaining == 0,
            'processed': processed,
            'failed': failed,
            'remaining': remaining,
        })
    }