import json
import os
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    'Access-Control-Max-Age': '86400',
}


def _resp(status, payload):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(payload, default=str)}


def handler(event: dict, context) -> dict:
    """Отзывы и оценки на товары: list (по товару), summary (рейтинги списка товаров), add (создать/обновить свой отзыв), delete"""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    schema = os.environ['MAIN_DB_SCHEMA']
    params = event.get('queryStringParameters') or {}
    headers = event.get('headers') or {}
    user_id = (headers.get('X-User-Id') or headers.get('x-user-id') or '').strip()[:100]
    action = (params.get('action') or '').strip()

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    try:
        if method == 'GET' and action == 'list':
            pid = int(params.get('product_id') or 0)
            if not pid:
                return _resp(400, {'error': 'product_id required'})
            cur.execute(
                f"SELECT r.id, r.user_id, r.rating, r.text, r.image, r.created_at, u.name, u.handle, u.avatar "
                f"FROM {schema}.product_reviews r LEFT JOIN {schema}.app_users u ON u.id::text = r.user_id "
                f"WHERE r.product_id = {pid} ORDER BY r.created_at DESC LIMIT 100"
            )
            reviews = [{
                'id': r[0], 'user_id': r[1], 'rating': r[2], 'text': r[3], 'image': r[4],
                'created_at': r[5].isoformat() if r[5] else None,
                'author_name': r[6] or r[7] or 'Покупатель', 'author_handle': r[7], 'author_avatar': r[8],
            } for r in cur.fetchall()]
            cur.execute(f"SELECT COALESCE(AVG(rating),0), COUNT(*) FROM {schema}.product_reviews WHERE product_id = {pid}")
            avg, cnt = cur.fetchone()
            return _resp(200, {'reviews': reviews, 'avg': round(float(avg), 1), 'count': int(cnt)})

        if method == 'GET' and action == 'summary':
            ids = [int(x) for x in (params.get('product_ids') or '').split(',') if x.strip().isdigit()][:200]
            if not ids:
                return _resp(200, {'summary': {}})
            cur.execute(
                f"SELECT product_id, AVG(rating), COUNT(*) FROM {schema}.product_reviews "
                f"WHERE product_id IN ({','.join(str(i) for i in ids)}) GROUP BY product_id"
            )
            return _resp(200, {'summary': {str(r[0]): {'avg': round(float(r[1]), 1), 'count': int(r[2])} for r in cur.fetchall()}})

        if method == 'POST' and action == 'add':
            if not user_id:
                return _resp(401, {'error': 'X-User-Id required'})
            body = json.loads(event.get('body') or '{}')
            pid = int(body.get('product_id') or 0)
            rating = int(body.get('rating') or 0)
            text = str(body.get('text') or '').strip()[:2000]
            image = str(body.get('image') or '').strip()[:1000] or None
            if not pid or rating < 1 or rating > 5:
                return _resp(400, {'error': 'product_id and rating 1-5 required'})
            cur.execute(
                f"INSERT INTO {schema}.product_reviews (product_id, user_id, rating, text, image) VALUES (%s, %s, %s, %s, %s) "
                f"ON CONFLICT (product_id, user_id) DO UPDATE SET rating = EXCLUDED.rating, text = EXCLUDED.text, "
                f"image = EXCLUDED.image, created_at = now() RETURNING id",
                (pid, user_id, rating, text, image)
            )
            rid = cur.fetchone()[0]
            conn.commit()
            return _resp(200, {'ok': True, 'id': rid})

        if method == 'DELETE' and action == 'delete':
            if not user_id:
                return _resp(401, {'error': 'X-User-Id required'})
            rid = int(params.get('id') or 0)
            cur.execute(f"DELETE FROM {schema}.product_reviews WHERE id = {rid} AND user_id = %s", (user_id,))
            conn.commit()
            return _resp(200, {'ok': True})

        return _resp(400, {'error': 'unknown action'})
    finally:
        cur.close()
        conn.close()
