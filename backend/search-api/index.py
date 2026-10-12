import json
import os
import psycopg2

CORS = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}


def esc(s: str) -> str:
    return s.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')


def handler(event: dict, context) -> dict:
    """Поиск по видео и людям: ?q=текст&kind=video|people|article"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
            'Access-Control-Max-Age': '86400'}, 'body': ''}

    params = event.get('queryStringParameters') or {}
    q = (params.get('q') or '').strip().lstrip('#')[:100]
    kind = params.get('kind', 'video')
    if not q:
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'items': []})}

    pat = '%' + esc(q) + '%'
    schema = os.environ['MAIN_DB_SCHEMA']
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    try:
        if kind == 'people':
            cur.execute(
                f"SELECT id, name, handle, avatar, COALESCE(is_verified, FALSE) FROM {schema}.app_users "
                f"WHERE handle ILIKE %s OR name ILIKE %s ORDER BY is_verified DESC NULLS LAST, name LIMIT 30",
                (pat, pat))
            items = [{'id': str(r[0]), 'name': r[1], 'handle': r[2], 'avatar': r[3], 'is_verified': bool(r[4])}
                     for r in cur.fetchall()]
        elif kind == 'article':
            cur.execute(
                f"SELECT id, title, cover_image, views FROM {schema}.articles "
                f"WHERE status = 'published' AND title ILIKE %s ORDER BY created_at DESC LIMIT 30",
                (pat,))
            items = [{'id': r[0], 'title': r[1], 'cover': r[2], 'views': r[3] or 0} for r in cur.fetchall()]
        else:
            cur.execute(
                f"SELECT v.id, v.url, v.thumbnail, v.author, v.handle, v.description, v.likes "
                f"FROM {schema}.videos v "
                f"WHERE v.type = 'video' AND (v.hidden IS NULL OR v.hidden = FALSE) "
                f"AND (v.description ILIKE %s OR v.hashtags ILIKE %s OR v.author ILIKE %s OR v.handle ILIKE %s) "
                f"ORDER BY v.created_at DESC LIMIT 30",
                (pat, pat, pat, pat))
            items = [{'id': r[0], 'url': r[1], 'thumbnail': r[2], 'author': r[3], 'handle': r[4],
                      'description': r[5], 'likes': str(r[6])} for r in cur.fetchall()]
    finally:
        cur.close()
        conn.close()
    return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'items': items})}
