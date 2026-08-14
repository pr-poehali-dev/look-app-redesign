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
    """Корзина пользователя: список товаров в корзине с деталями, добавление, изменение количества, удаление, оформление заказа."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    schema = os.environ['MAIN_DB_SCHEMA']
    params = event.get('queryStringParameters') or {}
    headers = event.get('headers') or {}
    user_id = (headers.get('X-User-Id') or headers.get('x-user-id') or '').strip()[:100]
    action = (params.get('action') or '').strip()

    if not user_id:
        return _resp(401, {'error': 'X-User-Id required'})

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    try:
        if method == 'GET' and (action == '' or action == 'list'):
            cur.execute(
                f"SELECT ci.id, ci.product_id, ci.quantity, p.title, p.price, p.image, p.promo_code, p.video_id "
                f"FROM {schema}.cart_items ci "
                f"JOIN {schema}.products p ON p.id = ci.product_id "
                f"WHERE ci.user_id = %s ORDER BY ci.created_at DESC",
                (user_id,)
            )
            rows = cur.fetchall()
            items = [{
                'id': r[0], 'product_id': r[1], 'quantity': r[2], 'title': r[3],
                'price': float(r[4]) if r[4] is not None else 0,
                'image': r[5], 'promo_code': r[6], 'video_id': r[7],
            } for r in rows]
            total = sum(i['price'] * i['quantity'] for i in items)
            return _resp(200, {'items': items, 'total': total})

        if method == 'POST' and action == 'add':
            body = json.loads(event.get('body') or '{}')
            product_id = body.get('product_id')
            quantity = int(body.get('quantity') or 1)
            ref_code = (body.get('ref') or '').strip()[:40] or None
            if not product_id:
                return _resp(400, {'error': 'product_id required'})
            cur.execute(
                f"SELECT id, quantity FROM {schema}.cart_items WHERE user_id = %s AND product_id = %s",
                (user_id, product_id)
            )
            existing = cur.fetchone()
            if existing:
                cur.execute(
                    f"UPDATE {schema}.cart_items SET quantity = quantity + %s{', ref_code = %s' if ref_code else ''} WHERE id = %s",
                    (quantity, ref_code, existing[0]) if ref_code else (quantity, existing[0])
                )
            else:
                cur.execute(
                    f"INSERT INTO {schema}.cart_items (user_id, product_id, quantity, ref_code) VALUES (%s, %s, %s, %s)",
                    (user_id, product_id, quantity, ref_code)
                )
            conn.commit()
            return _resp(200, {'ok': True})

        if method == 'POST' and action == 'update_quantity':
            body = json.loads(event.get('body') or '{}')
            item_id = body.get('id')
            quantity = int(body.get('quantity') or 1)
            if not item_id:
                return _resp(400, {'error': 'id required'})
            if quantity <= 0:
                cur.execute(f"DELETE FROM {schema}.cart_items WHERE id = %s AND user_id = %s", (item_id, user_id))
            else:
                cur.execute(
                    f"UPDATE {schema}.cart_items SET quantity = %s WHERE id = %s AND user_id = %s",
                    (quantity, item_id, user_id)
                )
            conn.commit()
            return _resp(200, {'ok': True})

        if method == 'DELETE' and action == 'remove':
            item_id = params.get('id')
            if not item_id:
                return _resp(400, {'error': 'id required'})
            cur.execute(f"DELETE FROM {schema}.cart_items WHERE id = %s AND user_id = %s", (item_id, user_id))
            conn.commit()
            return _resp(200, {'ok': True})

        if method == 'POST' and action == 'checkout':
            cur.execute(
                f"SELECT ci.product_id, ci.quantity, p.title, p.price, ci.ref_code "
                f"FROM {schema}.cart_items ci JOIN {schema}.products p ON p.id = ci.product_id "
                f"WHERE ci.user_id = %s",
                (user_id,)
            )
            rows = cur.fetchall()
            if not rows:
                return _resp(400, {'error': 'Cart is empty'})
            items = [{'product_id': r[0], 'quantity': r[1], 'title': r[2], 'price': float(r[3])} for r in rows]
            total = sum(i['price'] * i['quantity'] for i in items)
            cur.execute(
                f"INSERT INTO {schema}.orders (user_id, items, total) VALUES (%s, %s, %s) RETURNING id",
                (user_id, json.dumps(items), total)
            )
            order_id = cur.fetchone()[0]

            # Фиксируем продажи по партнёрским ссылкам (для комиссии рекомендателя)
            for r in rows:
                product_id, quantity, _title, price, ref_code = r
                if not ref_code:
                    continue
                cur.execute(
                    f"SELECT DISTINCT referrer_user_id FROM {schema}.referral_clicks "
                    f"WHERE product_id = %s AND referral_code = %s LIMIT 1",
                    (product_id, ref_code)
                )
                ref_row = cur.fetchone()
                if ref_row and ref_row[0] != user_id:
                    cur.execute(
                        f"INSERT INTO {schema}.referral_orders (order_id, product_id, referral_code, referrer_user_id, buyer_user_id, amount) "
                        f"VALUES (%s, %s, %s, %s, %s, %s)",
                        (order_id, product_id, ref_code, ref_row[0], user_id, float(price) * quantity)
                    )

            cur.execute(f"DELETE FROM {schema}.cart_items WHERE user_id = %s", (user_id,))
            conn.commit()
            return _resp(200, {'order_id': order_id, 'total': total})

        if method == 'GET' and action == 'orders':
            cur.execute(
                f"SELECT id, items, total, status, created_at FROM {schema}.orders "
                f"WHERE user_id = %s ORDER BY created_at DESC LIMIT 100",
                (user_id,)
            )
            rows = cur.fetchall()
            orders = [{
                'id': r[0], 'items': r[1], 'total': float(r[2]),
                'status': r[3], 'created_at': r[4].isoformat() if r[4] else None,
            } for r in rows]
            return _resp(200, {'orders': orders})

        return _resp(405, {'error': 'Method not allowed'})
    finally:
        cur.close()
        conn.close()