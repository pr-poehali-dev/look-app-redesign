import json
import os
import psycopg2

def handler(event: dict, context) -> dict:
    """Получение видео и фото конкретного пользователя по user_id"""
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
