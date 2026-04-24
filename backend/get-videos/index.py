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

    if category and category != 'all':
        cur.execute(
            "SELECT id, url, author, handle, description, category, type, likes, comments, shares FROM videos WHERE type = %s AND category = %s ORDER BY created_at DESC LIMIT 50",
            (media_type, category)
        )
    else:
        cur.execute(
            "SELECT id, url, author, handle, description, category, type, likes, comments, shares FROM videos WHERE type = %s ORDER BY created_at DESC LIMIT 50",
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
            'category': r[5],
            'type': r[6],
            'likes': str(r[7]),
            'comments': str(r[8]),
            'shares': str(r[9]),
            'avatar': r[1] if r[6] == 'image' else None,
        }
        for r in rows
    ]

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'videos': videos})
    }