import json
import os
import psycopg2
from onesignal_push import send_push

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    'Access-Control-Max-Age': '86400',
}

FIELDS = ("c.id, c.brand_user_id, c.brand_name, c.author_user_id, c.product_title, c.message, "
          "c.product_url, c.status, c.video_id, c.created_at, "
          "bu.handle, bu.avatar, au.handle, au.avatar")


def _resp(status, payload):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps(payload, ensure_ascii=False)}


def _item(r):
    return {
        'id': r[0], 'brand_user_id': r[1], 'brand_name': r[2], 'author_user_id': r[3],
        'product_title': r[4], 'message': r[5], 'product_url': r[6], 'status': r[7],
        'video_id': r[8], 'created_at': r[9].isoformat() if r[9] else None,
        'brand_handle': r[10], 'brand_avatar': r[11],
        'author_handle': r[12], 'author_avatar': r[13],
    }


def handler(event: dict, context) -> dict:
    """Сотрудничество бренд-автор: бренд предлагает товар на обзор, автор принимает или отклоняет.
    action=send|incoming|outgoing|respond|cancel"""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    headers = event.get('headers') or {}
    user_id = (headers.get('X-User-Id') or headers.get('x-user-id') or '').strip()[:100]
    if not user_id:
        return _resp(401, {'error': 'Нужно войти в аккаунт'})

    params = event.get('queryStringParameters') or {}
    body = {}
    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
    action = (body.get('action') or params.get('action') or '').strip()

    schema = os.environ['MAIN_DB_SCHEMA']
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    base = (f"SELECT {FIELDS} FROM {schema}.brand_collabs c "
            f"LEFT JOIN {schema}.app_users bu ON bu.id = c.brand_user_id "
            f"LEFT JOIN {schema}.app_users au ON au.id = c.author_user_id ")
    try:
        if action == 'incoming' and method == 'GET':
            cur.execute(base + "WHERE c.author_user_id = %s ORDER BY c.created_at DESC LIMIT 100", (user_id,))
            return _resp(200, {'collabs': [_item(r) for r in cur.fetchall()]})

        if action == 'outgoing' and method == 'GET':
            cur.execute(base + "WHERE c.brand_user_id = %s ORDER BY c.created_at DESC LIMIT 100", (user_id,))
            return _resp(200, {'collabs': [_item(r) for r in cur.fetchall()]})

        if action == 'send' and method == 'POST':
            handle = (body.get('author_handle') or '').strip().lstrip('@')[:100]
            brand_name = (body.get('brand_name') or '').strip().lstrip('#@')[:80]
            title = (body.get('product_title') or '').strip()[:200]
            message = (body.get('message') or '').strip()[:1000]
            url = (body.get('product_url') or '').strip()[:500]
            if not handle or not brand_name or not title:
                return _resp(400, {'error': 'Укажите автора, название бренда и товар'})
            if url and not url.lower().startswith(('http://', 'https://')):
                return _resp(400, {'error': 'Ссылка должна начинаться с https://'})
            cur.execute(f"SELECT id FROM {schema}.app_users WHERE LOWER(handle) = LOWER(%s) LIMIT 1", (handle,))
            a = cur.fetchone()
            if not a:
                return _resp(404, {'error': 'Автор не найден'})
            author_id = str(a[0])
            if author_id == user_id:
                return _resp(400, {'error': 'Нельзя отправить предложение самому себе'})
            cur.execute(
                f"SELECT COUNT(*) FROM {schema}.brand_collabs WHERE brand_user_id = %s AND created_at > NOW() - INTERVAL '1 day'",
                (user_id,))
            if cur.fetchone()[0] >= 20:
                return _resp(429, {'error': 'Слишком много предложений за сутки'})
            cur.execute(
                f"SELECT 1 FROM {schema}.brand_collabs WHERE brand_user_id = %s AND author_user_id = %s "
                f"AND LOWER(product_title) = LOWER(%s) AND status IN ('pending', 'accepted') LIMIT 1",
                (user_id, author_id, title))
            if cur.fetchone():
                return _resp(409, {'error': 'Такое предложение уже отправлено'})
            cur.execute(
                f"INSERT INTO {schema}.brand_collabs (brand_user_id, brand_name, author_user_id, product_title, message, product_url) "
                f"VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                (user_id, brand_name, author_id, title, message, url or None))
            cid = cur.fetchone()[0]
            cur.execute(
                f"INSERT INTO {schema}.notifications (user_id, type, title, message, entity_type, entity_id) "
                f"VALUES (%s, 'collab', %s, %s, 'collab', %s)",
                (author_id, f'Предложение от бренда {brand_name}', f'Товар на обзор: {title}', str(cid)))
            conn.commit()
            send_push([author_id], f'Предложение от бренда {brand_name}', f'Товар на обзор: {title}')
            return _resp(200, {'ok': True, 'id': cid})

        if action == 'respond' and method == 'POST':
            cid = int(body.get('id') or 0)
            decision = body.get('decision')
            if decision not in ('accept', 'decline') or cid < 1:
                return _resp(400, {'error': 'bad params'})
            new_status = 'accepted' if decision == 'accept' else 'declined'
            cur.execute(
                f"UPDATE {schema}.brand_collabs SET status = %s, updated_at = NOW() "
                f"WHERE id = %s AND author_user_id = %s AND status = 'pending' "
                f"RETURNING brand_user_id, brand_name, product_title",
                (new_status, cid, user_id))
            r = cur.fetchone()
            if not r:
                return _resp(404, {'error': 'Предложение не найдено или уже обработано'})
            word = 'принял' if decision == 'accept' else 'отклонил'
            cur.execute(
                f"INSERT INTO {schema}.notifications (user_id, type, title, message, entity_type, entity_id) "
                f"VALUES (%s, 'collab', %s, %s, 'collab', %s)",
                (r[0], f'Автор {word} предложение', f'{r[1]}: {r[2]}', str(cid)))
            conn.commit()
            send_push([r[0]], f'Автор {word} предложение', f'{r[1]}: {r[2]}')
            return _resp(200, {'ok': True, 'status': new_status})

        if action == 'cancel' and method == 'POST':
            cid = int(body.get('id') or 0)
            cur.execute(
                f"UPDATE {schema}.brand_collabs SET status = 'cancelled', updated_at = NOW() "
                f"WHERE id = %s AND brand_user_id = %s AND status IN ('pending', 'accepted')",
                (cid, user_id))
            conn.commit()
            return _resp(200, {'ok': cur.rowcount > 0})

        return _resp(400, {'error': 'Unknown action'})
    finally:
        cur.close()
        conn.close()
