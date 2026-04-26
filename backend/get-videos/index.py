import json
import os
import psycopg2

def handler(event: dict, context) -> dict:
    """Получение списка видео из БД по категории"""
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
            'body': ''
        }

    params = event.get('queryStringParameters') or {}
    category = params.get('category', '')
    media_type = params.get('type', 'video')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    schema = os.environ['MAIN_DB_SCHEMA']
    if category and category != 'all':
        cur.execute(
            f"SELECT id, url, author, handle, description, hashtags, category, type, likes, comments, shares, created_at FROM {schema}.videos WHERE type = %s AND category = %s AND (hidden IS NULL OR hidden = FALSE) ORDER BY created_at DESC LIMIT 50",
            (media_type, category)
        )
    else:
        cur.execute(
            f"SELECT id, url, author, handle, description, hashtags, category, type, likes, comments, shares, created_at FROM {schema}.videos WHERE type = %s AND (hidden IS NULL OR hidden = FALSE) ORDER BY created_at DESC LIMIT 50",
            (media_type,)
        )

    rows = cur.fetchall()
    cur.close()
    conn.close()

    videos = [
        {
            'id': r[0],
            'url': r[1],
            'author': r[2],
            'handle': r[3],
            'description': r[4],
            'hashtags': r[5] or '',
            'category': r[6],
            'type': r[7],
            'likes': str(r[8]),
            'comments': str(r[9]),
            'shares': str(r[10]),
            'avatar': r[1] if r[7] == 'image' else None,
            'created_at': r[11].isoformat() if r[11] else None,
        }
        for r in rows
    ]

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'videos': videos})
    }