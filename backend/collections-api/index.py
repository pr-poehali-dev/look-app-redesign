import json
import os
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    'Access-Control-Max-Age': '86400',
}

SYSTEM_TITLE = 'Посмотреть позже'


def _resp(status, payload):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps(payload, default=str, ensure_ascii=False)}


def _system_id(cur, schema, user_id):
    cur.execute(f"SELECT id FROM {schema}.collections WHERE user_id = %s AND is_system = TRUE", (user_id,))
    r = cur.fetchone()
    if r:
        return r[0]
    cur.execute(
        f"INSERT INTO {schema}.collections (user_id, title, is_system) VALUES (%s, %s, TRUE) "
        f"ON CONFLICT DO NOTHING RETURNING id", (user_id, SYSTEM_TITLE))
    r = cur.fetchone()
    if r:
        return r[0]
    cur.execute(f"SELECT id FROM {schema}.collections WHERE user_id = %s AND is_system = TRUE", (user_id,))
    return cur.fetchone()[0]


def _owned(cur, schema, collection_id, user_id):
    cur.execute(f"SELECT id, title, is_system FROM {schema}.collections WHERE id = %s AND user_id = %s",
                (collection_id, user_id))
    return cur.fetchone()


def _item(r):
    return {'id': r[0], 'item_type': r[1], 'item_id': r[2], 'image': r[3], 'title': r[4], 'handle': r[5],
            'watched': bool(r[6]), 'added_at': r[7].isoformat() if r[7] else None, 'url': r[8], 'is_video': bool(r[9])}


ITEM_FIELDS = "id, item_type, item_id, image, title, handle, watched, added_at, url, is_video"


def handler(event: dict, context) -> dict:
    """Личные коллекции «Посмотреть позже»: список, создание в один тап, сохранение, просмотренные, плейлист"""
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

    body = {}
    if method in ('POST', 'PUT', 'DELETE') and event.get('body'):
        body = json.loads(event.get('body') or '{}')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    try:
        if method == 'GET' and action == 'mine':
            _system_id(cur, schema, user_id)
            conn.commit()
            cur.execute(
                f"SELECT c.id, c.title, c.is_system, c.created_at, "
                f"(SELECT COUNT(*) FROM {schema}.collection_items i WHERE i.collection_id = c.id) AS total, "
                f"(SELECT COUNT(*) FROM {schema}.collection_items i WHERE i.collection_id = c.id AND NOT i.watched) AS unwatched, "
                f"(SELECT i.image FROM {schema}.collection_items i WHERE i.collection_id = c.id AND i.image IS NOT NULL AND i.image <> '' ORDER BY i.added_at DESC LIMIT 1) AS cover, "
                f"(SELECT COUNT(*) FROM {schema}.collection_items i WHERE i.collection_id = c.id AND i.is_video) AS videos "
                f"FROM {schema}.collections c WHERE c.user_id = %s "
                f"ORDER BY c.is_system DESC, c.created_at DESC, c.id DESC", (user_id,))
            items = [{'id': r[0], 'title': r[1], 'is_system': bool(r[2]), 'created_at': r[3].isoformat() if r[3] else None,
                      'total': r[4], 'unwatched': r[5], 'cover': r[6], 'videos': r[7]} for r in cur.fetchall()]
            return _resp(200, {'collections': items})

        if method == 'POST' and action == 'create':
            _system_id(cur, schema, user_id)
            title = (body.get('title') or '').strip()[:60]
            if not title:
                cur.execute(f"SELECT COUNT(*) FROM {schema}.collections WHERE user_id = %s AND is_system = FALSE", (user_id,))
                n = cur.fetchone()[0] + 1
                while True:
                    title = f"Коллекция {n}"
                    cur.execute(f"SELECT 1 FROM {schema}.collections WHERE user_id = %s AND title = %s", (user_id, title))
                    if not cur.fetchone():
                        break
                    n += 1
            cur.execute(f"INSERT INTO {schema}.collections (user_id, title) VALUES (%s, %s) RETURNING id", (user_id, title))
            new_id = cur.fetchone()[0]
            conn.commit()
            return _resp(200, {'id': new_id, 'title': title})

        if method == 'PUT' and action == 'rename':
            cid = body.get('id')
            title = (body.get('title') or '').strip()[:60]
            if not cid or not title:
                return _resp(400, {'error': 'id and title required'})
            col = _owned(cur, schema, cid, user_id)
            if not col:
                return _resp(404, {'error': 'not found'})
            if col[2]:
                return _resp(400, {'error': 'system collection cannot be renamed'})
            cur.execute(f"UPDATE {schema}.collections SET title = %s WHERE id = %s", (title, cid))
            conn.commit()
            return _resp(200, {'ok': True})

        if method == 'DELETE' and action == 'delete':
            cid = body.get('id') or params.get('id')
            col = _owned(cur, schema, cid, user_id) if cid else None
            if not col:
                return _resp(404, {'error': 'not found'})
            if col[2]:
                return _resp(400, {'error': 'system collection cannot be removed'})
            cur.execute(f"DELETE FROM {schema}.collection_items WHERE collection_id = %s", (cid,))
            cur.execute(f"DELETE FROM {schema}.collection_opens WHERE collection_id = %s", (cid,))
            cur.execute(f"DELETE FROM {schema}.collections WHERE id = %s", (cid,))
            conn.commit()
            return _resp(200, {'ok': True})

        if method == 'POST' and action == 'add_item':
            cid = body.get('collection_id')
            item_type = (body.get('item_type') or '').strip()[:20]
            item_id = str(body.get('item_id') or '').strip()[:100]
            if not item_type or not item_id:
                return _resp(400, {'error': 'item_type and item_id required'})
            if cid:
                col = _owned(cur, schema, cid, user_id)
                if not col:
                    return _resp(404, {'error': 'not found'})
            else:
                cid = _system_id(cur, schema, user_id)
                col = _owned(cur, schema, cid, user_id)
            cur.execute(
                f"INSERT INTO {schema}.collection_items (collection_id, item_type, item_id, image, title, handle, url, is_video) "
                f"VALUES (%s, %s, %s, %s, %s, %s, %s, %s) "
                f"ON CONFLICT (collection_id, item_type, item_id) DO UPDATE SET added_at = NOW()",
                (cid, item_type, item_id, (body.get('image') or '')[:2000], (body.get('title') or '')[:300],
                 (body.get('handle') or '')[:100], (body.get('url') or '')[:2000], bool(body.get('is_video'))))
            conn.commit()
            return _resp(200, {'ok': True, 'collection_id': cid, 'title': col[1]})

        if method == 'DELETE' and action == 'remove_item':
            item_type = (body.get('item_type') or params.get('item_type') or '').strip()
            item_id = str(body.get('item_id') or params.get('item_id') or '').strip()
            cid = body.get('collection_id') or params.get('collection_id')
            if not item_type or not item_id:
                return _resp(400, {'error': 'item_type and item_id required'})
            if cid:
                if not _owned(cur, schema, cid, user_id):
                    return _resp(404, {'error': 'not found'})
                cur.execute(f"SELECT id FROM {schema}.collection_items WHERE collection_id = %s AND item_type = %s AND item_id = %s",
                            (cid, item_type, item_id))
            else:
                cur.execute(
                    f"SELECT i.id FROM {schema}.collection_items i JOIN {schema}.collections c ON c.id = i.collection_id "
                    f"WHERE c.user_id = %s AND i.item_type = %s AND i.item_id = %s", (user_id, item_type, item_id))
            ids = [r[0] for r in cur.fetchall()]
            if ids:
                cur.execute(f"DELETE FROM {schema}.collection_items WHERE id = ANY(%s)", (ids,))
            conn.commit()
            return _resp(200, {'ok': True, 'removed': len(ids)})

        if method == 'GET' and action == 'view':
            cid = params.get('id')
            col = _owned(cur, schema, cid, user_id) if cid else None
            if not col:
                return _resp(404, {'error': 'not found'})
            only_new = params.get('unwatched') == '1'
            cur.execute(
                f"SELECT {ITEM_FIELDS} FROM {schema}.collection_items WHERE collection_id = %s "
                + ("AND watched = FALSE " if only_new else "") + "ORDER BY added_at DESC, id DESC", (cid,))
            items = [_item(r) for r in cur.fetchall()]
            if params.get('track') == '1':
                cur.execute(f"INSERT INTO {schema}.collection_opens (collection_id, user_id) VALUES (%s, %s)", (cid, user_id))
                conn.commit()
            return _resp(200, {'id': col[0], 'title': col[1], 'is_system': bool(col[2]), 'items': items})

        if method == 'POST' and action == 'watched':
            iid = body.get('id')
            watched = bool(body.get('watched', True))
            if not iid:
                return _resp(400, {'error': 'id required'})
            cur.execute(
                f"UPDATE {schema}.collection_items i SET watched = %s FROM {schema}.collections c "
                f"WHERE i.id = %s AND c.id = i.collection_id AND c.user_id = %s", (watched, iid, user_id))
            conn.commit()
            return _resp(200, {'ok': True})

        if method == 'GET' and action == 'stats':
            cur.execute(f"SELECT COUNT(DISTINCT user_id) FROM {schema}.collection_opens")
            openers = cur.fetchone()[0]
            cur.execute(
                f"SELECT COUNT(*) FROM (SELECT user_id FROM {schema}.collection_opens "
                f"GROUP BY user_id HAVING COUNT(DISTINCT DATE(opened_at)) >= 2 "
                f"AND MAX(opened_at) - MIN(opened_at) <= INTERVAL '7 days') t")
            repeat = cur.fetchone()[0]
            cur.execute(f"SELECT COUNT(*), COUNT(*) FILTER (WHERE NOT watched) FROM {schema}.collection_items")
            total, unwatched = cur.fetchone()
            return _resp(200, {'openers': openers, 'repeat_openers_7d': repeat,
                               'items_total': total, 'items_unwatched': unwatched,
                               'unwatched_pct': round(100.0 * unwatched / total, 1) if total else 0})

        return _resp(404, {'error': 'unknown action'})
    finally:
        cur.close()
        conn.close()
