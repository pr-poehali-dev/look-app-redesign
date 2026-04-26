import json
import os
import psycopg2

def handler(event: dict, context) -> dict:
    """Сохранение и получение комментариев к постам и видео"""
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
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

    schema = os.environ['MAIN_DB_SCHEMA']
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    if method == 'GET':
        params = event.get('queryStringParameters') or {}
        target_type = params.get('target_type', '')
        target_id = params.get('target_id', '')

        if not target_type or not target_id:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'target_type and target_id required'})
            }

        safe_type = target_type.replace("'", "''")
        safe_id = target_id.replace("'", "''")
        cur.execute(
            f"SELECT id, author_name, author_handle, text, created_at FROM {schema}.comments WHERE target_type = '{safe_type}' AND target_id = '{safe_id}' ORDER BY created_at DESC LIMIT 200"
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()

        comments = [
            {
                'id': r[0],
                'name': r[1],
                'handle': r[2] or '',
                'text': r[3],
                'time': r[4].isoformat() if r[4] else None,
            }
            for r in rows
        ]

        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'comments': comments})
        }

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        target_type = (body.get('target_type') or '').strip()
        target_id = str(body.get('target_id') or '').strip()
        text = (body.get('text') or '').strip()
        author_name = (body.get('author_name') or 'Я').strip()[:100]
        author_handle = (body.get('author_handle') or '').strip()[:100]

        if not target_type or not target_id or not text:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'target_type, target_id and text required'})
            }

        safe_type = target_type.replace("'", "''")
        safe_id = target_id.replace("'", "''")
        safe_text = text.replace("'", "''")
        safe_name = author_name.replace("'", "''")
        safe_handle = author_handle.replace("'", "''")

        cur.execute(
            f"INSERT INTO {schema}.comments (target_type, target_id, author_name, author_handle, text) VALUES ('{safe_type}', '{safe_id}', '{safe_name}', '{safe_handle}', '{safe_text}') RETURNING id, created_at"
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'comment': {
                    'id': row[0],
                    'name': author_name,
                    'handle': author_handle,
                    'text': text,
                    'time': row[1].isoformat() if row[1] else None,
                }
            })
        }

    cur.close()
    conn.close()
    return {
        'statusCode': 405,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }
