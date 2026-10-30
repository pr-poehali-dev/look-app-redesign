import json
import os
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    'Access-Control-Max-Age': '86400',
}

BOARD_FIELDS = "id, owner_user_id, title, description, cover_image, is_public, created_at, topic, is_collab, community_id"


def _resp(status, payload):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(payload, default=str)}


def _row_to_board(r):
    return {
        'id': r[0], 'owner_user_id': r[1], 'title': r[2], 'description': r[3] or '',
        'cover_image': r[4], 'is_public': bool(r[5]),
        'created_at': r[6].isoformat() if r[6] else None,
        'topic': r[7], 'is_collab': bool(r[8]), 'community_id': r[9],
    }


def _role(cur, schema, board_id, user_id, owner_id):
    if not user_id:
        return None
    if owner_id == user_id:
        return 'owner'
    cur.execute(f"SELECT role FROM {schema}.board_members WHERE board_id = %s AND user_id = %s", (board_id, user_id))
    r = cur.fetchone()
    if r:
        return r[0]
    cur.execute(
        f"SELECT 1 FROM {schema}.boards b JOIN {schema}.community_members cm ON cm.community_id = b.community_id "
        f"WHERE b.id = %s AND cm.user_id = %s AND cm.role <> 'left'", (board_id, user_id))
    return 'editor' if cur.fetchone() else None


def _with_counts(cur, schema, boards):
    if not boards:
        return boards
    ids = [b['id'] for b in boards]
    cur.execute(
        f"SELECT board_id, COUNT(*) FROM {schema}.board_items WHERE board_id = ANY(%s) GROUP BY board_id", (ids,))
    counts = {r[0]: r[1] for r in cur.fetchall()}
    cur.execute(
        f"SELECT board_id, image FROM ("
        f"SELECT board_id, image, ROW_NUMBER() OVER (PARTITION BY board_id ORDER BY added_at DESC) AS rn "
        f"FROM {schema}.board_items WHERE board_id = ANY(%s) AND image IS NOT NULL AND image <> '') t WHERE rn <= 4", (ids,))
    collages = {}
    for r in cur.fetchall():
        collages.setdefault(r[0], []).append(r[1])
    for b in boards:
        b['items_count'] = counts.get(b['id'], 0)
        b['collage'] = collages.get(b['id'], [])
        if not b['cover_image'] and b['collage']:
            b['cover_image'] = b['collage'][0]
    return boards


def handler(event: dict, context) -> dict:
    """Публичные доски (коллекции): создание досок, добавление/удаление элементов, публичный просмотр чужих досок."""
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
                f"SELECT {BOARD_FIELDS} FROM {schema}.boards WHERE owner_user_id = %s "
                f"OR id IN (SELECT board_id FROM {schema}.board_members WHERE user_id = %s) ORDER BY id DESC",
                (user_id, user_id)
            )
            boards = [_row_to_board(r) for r in cur.fetchall()]
            cur.execute(f"SELECT board_id, role FROM {schema}.board_members WHERE user_id = %s", (user_id,))
            roles = {r[0]: r[1] for r in cur.fetchall()}
            for b in boards:
                b['my_role'] = 'owner' if b['owner_user_id'] == user_id else roles.get(b['id'], 'member')
            _with_counts(cur, schema, boards)
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
            _with_counts(cur, schema, boards)
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
            my_role = _role(cur, schema, board['id'], user_id, board['owner_user_id'])
            if not board['is_public'] and not my_role:
                return _resp(403, {'error': 'private board'})
            cur.execute(
                f"SELECT bi.id, bi.item_type, bi.item_id, bi.image, bi.title, bi.added_at, bi.added_by, au.handle "
                f"FROM {schema}.board_items bi LEFT JOIN {schema}.app_users au ON au.id::text = bi.added_by "
                f"WHERE bi.board_id = %s ORDER BY bi.added_at DESC",
                (board_id,)
            )
            items = [{
                'id': r[0], 'item_type': r[1], 'item_id': r[2], 'image': r[3], 'title': r[4],
                'added_at': r[5].isoformat() if r[5] else None, 'added_by': r[6], 'added_by_handle': r[7],
            } for r in cur.fetchall()]
            members = []
            if board['is_collab']:
                cur.execute(
                    f"SELECT m.user_id, m.role, au.handle, au.name FROM {schema}.board_members m "
                    f"LEFT JOIN {schema}.app_users au ON au.id::text = m.user_id WHERE m.board_id = %s ORDER BY m.id",
                    (board_id,)
                )
                members = [{'user_id': r[0], 'role': r[1], 'handle': r[2], 'name': r[3]} for r in cur.fetchall()]
                cur.execute(f"SELECT handle, name FROM {schema}.app_users WHERE id::text = %s", (board['owner_user_id'],))
                o = cur.fetchone()
                members.insert(0, {'user_id': board['owner_user_id'], 'role': 'owner',
                                   'handle': o[0] if o else None, 'name': o[1] if o else None})
            return _resp(200, {'board': board, 'items': items, 'my_role': my_role, 'members': members})

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
            topic = (body.get('topic') or '').strip()[:40] or None
            is_collab = bool(body.get('is_collab', False))
            community_id = (body.get('community_id') or '').strip()[:100] or None
            if community_id:
                cur.execute(
                    f"SELECT 1 FROM {schema}.community_members WHERE community_id = %s AND user_id = %s AND role <> 'left'",
                    (community_id, user_id))
                if not cur.fetchone():
                    return _resp(403, {'error': 'join the circle first'})
                is_collab = True
                is_public = True
            cur.execute(
                f"INSERT INTO {schema}.boards (owner_user_id, title, description, is_public, topic, is_collab, community_id) "
                f"VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
                (user_id, title, description, is_public, topic, is_collab, community_id)
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
            if 'topic' in body:
                fields.append("topic = %s"); values.append((body.get('topic') or '').strip()[:40] or None)
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
            cur.execute(f"DELETE FROM {schema}.board_members WHERE board_id = %s", (board_id,))
            cur.execute(f"DELETE FROM {schema}.board_invites WHERE board_id = %s", (board_id,))
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
            if not row:
                return _resp(404, {'error': 'not found'})
            if _role(cur, schema, int(board_id), user_id, row[0]) not in ('owner', 'editor'):
                return _resp(403, {'error': 'no rights'})
            cur.execute(
                f"INSERT INTO {schema}.board_items (board_id, item_type, item_id, image, title, added_by) "
                f"VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT (board_id, item_type, item_id) DO NOTHING",
                (board_id, item_type, item_id, image, title, user_id)
            )
            conn.commit()
            return _resp(200, {'ok': True})

        # --- Добавить элемент сразу в несколько досок (до 3) ---
        if method == 'POST' and action == 'add_item_multi':
            if not user_id:
                return _resp(401, {'error': 'X-User-Id required'})
            body = json.loads(event.get('body') or '{}')
            board_ids = [int(x) for x in (body.get('board_ids') or [])][:3]
            item_type = (body.get('item_type') or '').strip()[:20]
            item_id = str(body.get('item_id') or '').strip()[:100]
            image = (body.get('image') or '').strip()
            title = (body.get('title') or '').strip()[:200]
            if not board_ids or not item_type or not item_id:
                return _resp(400, {'error': 'board_ids, item_type and item_id required'})
            added = 0
            for bid in board_ids:
                cur.execute(f"SELECT owner_user_id FROM {schema}.boards WHERE id = %s", (bid,))
                row = cur.fetchone()
                if not row or _role(cur, schema, bid, user_id, row[0]) not in ('owner', 'editor'):
                    continue
                cur.execute(
                    f"INSERT INTO {schema}.board_items (board_id, item_type, item_id, image, title, added_by) "
                    f"VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT (board_id, item_type, item_id) DO NOTHING",
                    (bid, item_type, item_id, image, title, user_id)
                )
                added += 1
            conn.commit()
            return _resp(200, {'ok': True, 'added': added})

        # --- Ссылка-приглашение в коллективную доску ---
        if method == 'POST' and action == 'invite_link':
            if not user_id:
                return _resp(401, {'error': 'X-User-Id required'})
            body = json.loads(event.get('body') or '{}')
            board_id = body.get('board_id')
            role = body.get('role') if body.get('role') in ('editor', 'member') else 'editor'
            cur.execute(f"SELECT owner_user_id FROM {schema}.boards WHERE id = %s", (board_id,))
            row = cur.fetchone()
            if not row or row[0] != user_id:
                return _resp(403, {'error': 'only owner'})
            import secrets
            token = secrets.token_urlsafe(16)
            cur.execute(f"UPDATE {schema}.boards SET is_collab = TRUE WHERE id = %s", (board_id,))
            cur.execute(
                f"INSERT INTO {schema}.board_invites (board_id, token, role, created_by) VALUES (%s, %s, %s, %s)",
                (board_id, token, role, user_id))
            conn.commit()
            return _resp(200, {'token': token})

        # --- Принять приглашение по ссылке ---
        if method == 'POST' and action == 'join':
            if not user_id:
                return _resp(401, {'error': 'X-User-Id required'})
            body = json.loads(event.get('body') or '{}')
            token = (body.get('token') or '').strip()[:60]
            cur.execute(f"SELECT board_id, role FROM {schema}.board_invites WHERE token = %s", (token,))
            inv = cur.fetchone()
            if not inv:
                return _resp(404, {'error': 'invite not found'})
            cur.execute(f"SELECT owner_user_id FROM {schema}.boards WHERE id = %s", (inv[0],))
            ow = cur.fetchone()
            if ow and ow[0] != user_id:
                cur.execute(
                    f"INSERT INTO {schema}.board_members (board_id, user_id, role) VALUES (%s, %s, %s) "
                    f"ON CONFLICT (board_id, user_id) DO NOTHING", (inv[0], user_id, inv[1]))
            conn.commit()
            return _resp(200, {'ok': True, 'board_id': inv[0]})

        # --- Пригласить по нику ---
        if method == 'POST' and action == 'invite_handle':
            if not user_id:
                return _resp(401, {'error': 'X-User-Id required'})
            body = json.loads(event.get('body') or '{}')
            board_id = body.get('board_id')
            handle = (body.get('handle') or '').strip().lstrip('@')[:80]
            role = body.get('role') if body.get('role') in ('editor', 'member') else 'editor'
            cur.execute(f"SELECT owner_user_id FROM {schema}.boards WHERE id = %s", (board_id,))
            row = cur.fetchone()
            if not row or row[0] != user_id:
                return _resp(403, {'error': 'only owner'})
            cur.execute(f"SELECT id FROM {schema}.app_users WHERE LOWER(handle) = LOWER(%s)", (handle,))
            u = cur.fetchone()
            if not u:
                return _resp(404, {'error': 'user not found'})
            uid = str(u[0])
            if uid == user_id:
                return _resp(400, {'error': 'self'})
            cur.execute(f"UPDATE {schema}.boards SET is_collab = TRUE WHERE id = %s", (board_id,))
            cur.execute(
                f"INSERT INTO {schema}.board_members (board_id, user_id, role) VALUES (%s, %s, %s) "
                f"ON CONFLICT (board_id, user_id) DO UPDATE SET role = EXCLUDED.role", (board_id, uid, role))
            conn.commit()
            return _resp(200, {'ok': True})

        # --- Сменить роль / убрать участника ---
        if method == 'POST' and action == 'set_role':
            if not user_id:
                return _resp(401, {'error': 'X-User-Id required'})
            body = json.loads(event.get('body') or '{}')
            board_id = body.get('board_id')
            target = str(body.get('user_id') or '')
            role = body.get('role')
            cur.execute(f"SELECT owner_user_id FROM {schema}.boards WHERE id = %s", (board_id,))
            row = cur.fetchone()
            if not row or row[0] != user_id:
                return _resp(403, {'error': 'only owner'})
            if role == 'remove':
                cur.execute(f"DELETE FROM {schema}.board_members WHERE board_id = %s AND user_id = %s", (board_id, target))
            elif role in ('editor', 'member'):
                cur.execute(f"UPDATE {schema}.board_members SET role = %s WHERE board_id = %s AND user_id = %s", (role, board_id, target))
            else:
                return _resp(400, {'error': 'bad role'})
            conn.commit()
            return _resp(200, {'ok': True})

        # --- Доски кружка ---
        if method == 'GET' and action == 'circle_boards':
            cid = (params.get('community_id') or '').strip()[:100]
            cur.execute(
                f"SELECT {BOARD_FIELDS} FROM {schema}.boards WHERE community_id = %s ORDER BY id DESC", (cid,))
            return _resp(200, {'boards': _with_counts(cur, schema, [_row_to_board(r) for r in cur.fetchall()])})

        # --- Лента кружка: свежие посты участников ---
        if method == 'GET' and action == 'circle_feed':
            cid = (params.get('community_id') or '').strip()[:100]
            cur.execute(
                f"SELECT v.id, v.url, v.thumbnail, v.type, v.card_title, v.description, v.handle, v.likes "
                f"FROM {schema}.videos v WHERE (v.hidden IS NULL OR v.hidden = FALSE) "
                f"AND COALESCE(v.is_commercial, FALSE) = FALSE AND v.user_id IN "
                f"(SELECT user_id FROM {schema}.community_members WHERE community_id = %s AND role <> 'left') "
                f"ORDER BY v.created_at DESC LIMIT 30", (cid,))
            items = [{'id': r[0], 'url': r[1], 'thumbnail': r[2], 'type': r[3], 'title': r[4] or (r[5] or '')[:40],
                      'handle': r[6], 'likes': r[7]} for r in cur.fetchall()]
            return _resp(200, {'items': items})

        # --- Раздел «Вдохновение»: лучшие подборки недели ---
        if method == 'GET' and action == 'inspiration':
            cur.execute(
                f"SELECT {BOARD_FIELDS} FROM {schema}.boards b WHERE b.is_public = TRUE "
                f"AND EXISTS (SELECT 1 FROM {schema}.board_items bi WHERE bi.board_id = b.id) "
                f"ORDER BY (SELECT COUNT(*) FROM {schema}.board_items bi WHERE bi.board_id = b.id "
                f"AND bi.added_at > NOW() - INTERVAL '7 days') DESC, b.id DESC LIMIT 12")
            return _resp(200, {'boards': _with_counts(cur, schema, [_row_to_board(r) for r in cur.fetchall()])})

        # --- Темы со счётчиками постов ---
        if method == 'GET' and action == 'topics':
            cur.execute(
                f"SELECT t.slug, t.title, t.icon, t.color, "
                f"(SELECT COUNT(*) FROM {schema}.videos v WHERE v.topic = t.slug AND (v.hidden IS NULL OR v.hidden = FALSE)) "
                f"FROM {schema}.topics t ORDER BY t.sort_order")
            return _resp(200, {'topics': [{'slug': r[0], 'title': r[1], 'icon': r[2], 'color': r[3], 'posts': r[4]} for r in cur.fetchall()]})

        # --- Событие использования функции (для метрик) ---
        if method == 'POST' and action == 'track':
            body = json.loads(event.get('body') or '{}')
            ev = (body.get('event') or '').strip()[:40]
            if ev in ('ideas_filter_on', 'ideas_filter_off', 'board_saved', 'card_created'):
                cur.execute(f"INSERT INTO {schema}.feature_events (event, user_id) VALUES (%s, %s)", (ev, user_id or None))
                conn.commit()
            return _resp(200, {'ok': True})

        # --- Страница темы: топ недели, новые доски ---
        if method == 'GET' and action == 'topic_page':
            slug = (params.get('slug') or '').strip()[:40]
            cur.execute(
                f"SELECT v.id, v.url, v.thumbnail, v.type, v.card_title, v.description, v.handle, v.likes "
                f"FROM {schema}.videos v WHERE v.topic = %s AND (v.hidden IS NULL OR v.hidden = FALSE) "
                f"AND COALESCE(v.is_commercial, FALSE) = FALSE AND v.created_at > NOW() - INTERVAL '7 days' "
                f"ORDER BY v.likes DESC, v.created_at DESC LIMIT 10", (slug,))
            top = [{'id': r[0], 'url': r[1], 'thumbnail': r[2], 'type': r[3], 'title': r[4] or (r[5] or '')[:40],
                    'handle': r[6], 'likes': r[7]} for r in cur.fetchall()]
            if len(top) < 10:
                cur.execute(
                    f"SELECT v.id, v.url, v.thumbnail, v.type, v.card_title, v.description, v.handle, v.likes "
                    f"FROM {schema}.videos v WHERE v.topic = %s AND (v.hidden IS NULL OR v.hidden = FALSE) "
                    f"AND COALESCE(v.is_commercial, FALSE) = FALSE AND v.id <> ALL(%s) "
                    f"ORDER BY v.created_at DESC LIMIT %s", (slug, [t['id'] for t in top] or [0], 10 - len(top)))
                top += [{'id': r[0], 'url': r[1], 'thumbnail': r[2], 'type': r[3], 'title': r[4] or (r[5] or '')[:40],
                         'handle': r[6], 'likes': r[7]} for r in cur.fetchall()]
            cur.execute(
                f"SELECT {BOARD_FIELDS} FROM {schema}.boards WHERE topic = %s AND is_public = TRUE ORDER BY id DESC LIMIT 12", (slug,))
            boards = _with_counts(cur, schema, [_row_to_board(r) for r in cur.fetchall()])
            return _resp(200, {'top': top, 'boards': boards})

        # --- Удалить элемент из доски ---
        if method == 'DELETE' and action == 'remove_item':
            if not user_id:
                return _resp(401, {'error': 'X-User-Id required'})
            item_row_id = params.get('id')
            if not item_row_id:
                return _resp(400, {'error': 'id required'})
            cur.execute(
                f"SELECT b.owner_user_id, bi.board_id, bi.added_by FROM {schema}.board_items bi "
                f"JOIN {schema}.boards b ON b.id = bi.board_id WHERE bi.id = %s",
                (item_row_id,)
            )
            row = cur.fetchone()
            if not row:
                return _resp(404, {'error': 'not found'})
            r_role = _role(cur, schema, row[1], user_id, row[0])
            if not (r_role == 'owner' or (r_role == 'editor' and row[2] == user_id)):
                return _resp(403, {'error': 'no rights'})
            cur.execute(f"DELETE FROM {schema}.board_items WHERE id = %s", (item_row_id,))
            conn.commit()
            return _resp(200, {'ok': True})

        return _resp(405, {'error': 'Method not allowed'})
    finally:
        cur.close()
        conn.close()
