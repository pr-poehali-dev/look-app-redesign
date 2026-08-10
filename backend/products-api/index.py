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
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(payload)}


def handler(event: dict, context) -> dict:
    """Товары, привязанные к видео: список товаров по video_id, добавление/удаление товаров автором, учёт кликов "перешёл к товару" для аналитики."""
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
        if method == 'GET' and action == 'by_video':
            video_ids_raw = (params.get('video_ids') or params.get('video_id') or '').strip()
            if not video_ids_raw:
                return _resp(400, {'error': 'video_ids required'})
            ids = [int(x) for x in video_ids_raw.split(',') if x.strip().isdigit()][:200]
            if not ids:
                return _resp(200, {'products': {}})
            placeholders = ','.join(['%s'] * len(ids))
            cur.execute(
                f"SELECT id, video_id, title, price, old_price, image, promo_code, product_url "
                f"FROM {schema}.products WHERE video_id IN ({placeholders}) ORDER BY id ASC",
                tuple(ids)
            )
            rows = cur.fetchall()
            result: dict = {}
            for r in rows:
                vid = str(r[1])
                result.setdefault(vid, []).append({
                    'id': r[0], 'video_id': r[1], 'title': r[2],
                    'price': float(r[3]) if r[3] is not None else 0,
                    'old_price': float(r[4]) if r[4] is not None else None,
                    'image': r[5], 'promo_code': r[6], 'product_url': r[7],
                })
            return _resp(200, {'products': result})

        if method == 'GET' and action == 'mine':
            if not user_id:
                return _resp(401, {'error': 'X-User-Id required'})
            cur.execute(
                f"SELECT id, video_id, title, price, old_price, image, promo_code, product_url "
                f"FROM {schema}.products WHERE owner_user_id = %s ORDER BY id DESC",
                (user_id,)
            )
            rows = cur.fetchall()
            products = [{
                'id': r[0], 'video_id': r[1], 'title': r[2],
                'price': float(r[3]) if r[3] is not None else 0,
                'old_price': float(r[4]) if r[4] is not None else None,
                'image': r[5], 'promo_code': r[6], 'product_url': r[7],
            } for r in rows]
            return _resp(200, {'products': products})

        if method == 'POST' and action == 'create':
            if not user_id:
                return _resp(401, {'error': 'X-User-Id required'})
            body = json.loads(event.get('body') or '{}')
            video_id = body.get('video_id')
            title = (body.get('title') or '').strip()[:200]
            price = body.get('price') or 0
            old_price = body.get('old_price')
            image = (body.get('image') or '').strip()
            promo_code = (body.get('promo_code') or '').strip()[:50]
            product_url = (body.get('product_url') or '').strip()
            if not video_id or not title:
                return _resp(400, {'error': 'video_id and title required'})
            cur.execute(
                f"INSERT INTO {schema}.products (video_id, owner_user_id, title, price, old_price, image, promo_code, product_url) "
                f"VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
                (video_id, user_id, title, price, old_price, image, promo_code, product_url)
            )
            new_id = cur.fetchone()[0]
            conn.commit()
            return _resp(200, {'id': new_id})

        if method == 'DELETE' and action == 'delete':
            if not user_id:
                return _resp(401, {'error': 'X-User-Id required'})
            product_id = params.get('id')
            if not product_id:
                return _resp(400, {'error': 'id required'})
            cur.execute(
                f"DELETE FROM {schema}.products WHERE id = %s AND owner_user_id = %s",
                (product_id, user_id)
            )
            conn.commit()
            return _resp(200, {'ok': True})

        if method == 'POST' and action == 'click':
            body = json.loads(event.get('body') or '{}')
            product_id = body.get('product_id')
            video_id = body.get('video_id')
            if not product_id:
                return _resp(400, {'error': 'product_id required'})
            cur.execute(
                f"INSERT INTO {schema}.product_clicks (product_id, video_id, user_id) VALUES (%s, %s, %s)",
                (product_id, video_id, user_id or None)
            )
            conn.commit()
            return _resp(200, {'ok': True})

        return _resp(405, {'error': 'Method not allowed'})
    finally:
        cur.close()
        conn.close()
