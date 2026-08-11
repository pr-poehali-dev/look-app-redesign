import json
import os
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    'Access-Control-Max-Age': '86400',
}

BOARD_FIELDS = "id, owner_user_id, title, description, cover_image, is_public, created_at"


def _resp(status, payload):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(payload, default=str)}


def _row_to_board(r):
    return {
        'id': r[0], 'owner_user_id': r[1], 'title': r[2], 'description': r[3] or '',
        'cover_image': r[4], 'is_public': bool(r[5]),
        'created_at': r[6].isoformat() if r[6] else None,
    }


def handler(event: dict, context) -> dict:
    """Публичные доски (коллекции) — как в Pinterest: создание досок, добавление/удаление элементов, публичный просмотр чужих досок."""
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
        # --- Мои доски (включая приватные) ---
        if method == 'GET' and action == 'mine':
            if not user_id:
                return _resp(401, {'error': 'X-User-Id required'})
            cur.execute(
                f"SELECT {BOARD_FIELDS} FROM {schema}.boards WHERE owner_user_id = %s ORDER BY id DESC",
                (user_id,)
            )
            boards = [_row_to_board(r) for r in cur.fetchall()]
            return _resp(200, {'boards': boards})

        # --- Публичные доски конкретного пользователя ---
        if method == 'GET' and action == 'user_boards':
            owner_id = (params.get('user_id') or '').strip()[:100]
            if not owner_id:
                return _resp(400, {'error': 'user_id required'})
            cur.execute(
                f"SELECT {BOARD_FIELDS} FROM {schema}.boards WHERE owner_user_id = %s AND is_public = TRUE ORDER BY id DESC",
                (owner_id,)
            )
            boards = [_row_to_board(r) for r in cur.fetchall()]
            return _resp(200, {'boards': boards})

        # --- Одна доска + её элементы (публично, если is_public или владелец) ---
        if method == 'GET' and action == 'view':
            board_id = params.get('board_id')
            if not board_id:
                return _resp(400, {'error': 'board_id required'})
            cur.execute(f"SELECT {BOARD_FIELDS} FROM {schema}.boards WHERE id = %s", (board_id,))
            row = cur.fetchone()
            if not row:
                return _resp(404, {'error': 'not found'})
            board = _row_to_board(row)
            if not board['is_public'] and board['owner_user_id'] != user_id:
                return _resp(403, {'error': 'private board'})
            cur.execute(
                f"SELECT id, item_type, item_id, image, title, added_at FROM {schema}.board_items "
                f"WHERE board_id = %s ORDER BY added_at DESC",
                (board_id,)
            )
            items = [{
                'id': r[0], 'item_type': r[1], 'item_id': r[2], 'image': r[3], 'title': r[4],
                'added_at': r[5].isoformat() if r[5] else None,
            } for r in cur.fetchall()]
            return _resp(200, {'board': board, 'items': items})

        # --- Создать доску ---
        if method == 'POST' and action == 'create':
            if not user_id:
                return _resp(401, {'error': 'X-User-Id required'})
            body = json.loads(event.get('body') or '{}')
            title = (body.get('title') or '').strip()[:200]
            if not title:
                return _resp(400, {'error': 'title required'})
            description = (body.get('description') or '').strip()[:2000]
            is_public = bool(body.get('is_public', True))
            cur.execute(
                f"INSERT INTO {schema}.boards (owner_user_id, title, description, is_public) "
                f"VALUES (%s, %s, %s, %s) RETURNING id",
                (user_id, title, description, is_public)
            )
            new_id = cur.fetchone()[0]
            conn.commit()
            return _resp(200, {'id': new_id})

        # --- Обновить доску (название/описание/приватность) ---
        if method == 'PUT' and action == 'update':
            if not user_id:
                return _resp(401, {'error': 'X-User-Id required'})
            body = json.loads(event.get('body') or '{}')
            board_id = body.get('id')
            if not board_id:
                return _resp(400, {'error': 'id required'})
            cur.execute(f"SELECT owner_user_id FROM {schema}.boards WHERE id = %s", (board_id,))
            row = cur.fetchone()
            if not row or row[0] != user_id:
                return _resp(403, {'error': 'not your board'})
            fields, values = [], []
            if 'title' in body:
                fields.append("title = %s"); values.append((body.get('title') or '').strip()[:200])
            if 'description' in body:
                fields.append("description = %s"); values.append((body.get('description') or '').strip()[:2000])
            if 'is_public' in body:
                fields.append("is_public = %s"); values.append(bool(body.get('is_public')))
            if 'cover_image' in body:
                fields.append("cover_image = %s"); values.append((body.get('cover_image') or '').strip())
            if not fields:
                return _resp(400, {'error': 'nothing to update'})
            values.append(board_id)
            cur.execute(f"UPDATE {schema}.boards SET {', '.join(fields)} WHERE id = %s", tuple(values))
            conn.commit()
            return _resp(200, {'ok': True})

        # --- Удалить доску ---
        if method == 'DELETE' and action == 'delete':
            if not user_id:
                return _resp(401, {'error': 'X-User-Id required'})
            board_id = params.get('id')
            if not board_id:
                return _resp(400, {'error': 'id required'})
            cur.execute(f"SELECT owner_user_id FROM {schema}.boards WHERE id = %s", (board_id,))
            row = cur.fetchone()
            if not row or row[0] != user_id:
                return _resp(403, {'error': 'not your board'})
            cur.execute(f"DELETE FROM {schema}.board_items WHERE board_id = %s", (board_id,))
            cur.execute(f"DELETE FROM {schema}.boards WHERE id = %s", (board_id,))
            conn.commit()
            return _resp(200, {'ok': True})

        # --- Добавить элемент (пост/видео) в доску ---
        if method == 'POST' and action == 'add_item':
            if not user_id:
                return _resp(401, {'error': 'X-User-Id required'})
            body = json.loads(event.get('body') or '{}')
            board_id = body.get('board_id')
            item_type = (body.get('item_type') or '').strip()[:20]
            item_id = str(body.get('item_id') or '').strip()[:100]
            image = (body.get('image') or '').strip()
            title = (body.get('title') or '').strip()[:200]
            if not board_id or not item_type or not item_id:
                return _resp(400, {'error': 'board_id, item_type and item_id required'})
            cur.execute(f"SELECT owner_user_id FROM {schema}.boards WHERE id = %s", (board_id,))
            row = cur.fetchone()
            if not row or row[0] != user_id:
                return _resp(403, {'error': 'not your board'})
            cur.execute(
                f"INSERT INTO {schema}.board_items (board_id, item_type, item_id, image, title) "
                f"VALUES (%s, %s, %s, %s, %s) ON CONFLICT (board_id, item_type, item_id) DO NOTHING",
                (board_id, item_type, item_id, image, title)
            )
            conn.commit()
            return _resp(200, {'ok': True})

        # --- Удалить элемент из доски ---
        if method == 'DELETE' and action == 'remove_item':
            if not user_id:
                return _resp(401, {'error': 'X-User-Id required'})
            item_row_id = params.get('id')
            if not item_row_id:
                return _resp(400, {'error': 'id required'})
            cur.execute(
                f"SELECT b.owner_user_id FROM {schema}.board_items bi "
                f"JOIN {schema}.boards b ON b.id = bi.board_id WHERE bi.id = %s",
                (item_row_id,)
            )
            row = cur.fetchone()
            if not row or row[0] != user_id:
                return _resp(403, {'error': 'not your board'})
            cur.execute(f"DELETE FROM {schema}.board_items WHERE id = %s", (item_row_id,))
            conn.commit()
            return _resp(200, {'ok': True})

        return _resp(405, {'error': 'Method not allowed'})
    finally:
        cur.close()
        conn.close()
