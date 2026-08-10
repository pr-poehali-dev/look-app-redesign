import json
import os
import uuid
import base64
import boto3
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Admin-Token',
    'Access-Control-Max-Age': '86400',
}

PRODUCT_FIELDS = (
    "id, video_id, owner_user_id, title, description, price, old_price, image, "
    "promo_code, product_url, category, in_stock, status, is_partner, moderation_note, created_at"
)

# Те же поля товара + хэндл/имя/аватар продавца (для кнопки "Перейти в профиль" на карточке товара)
PRODUCT_FIELDS_WITH_OWNER = (
    "p.id, p.video_id, p.owner_user_id, p.title, p.description, p.price, p.old_price, p.image, "
    "p.promo_code, p.product_url, p.category, p.in_stock, p.status, p.is_partner, p.moderation_note, p.created_at, "
    "u.handle, u.name, u.avatar"
)


def _resp(status, payload):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(payload)}


def _row_to_product(r):
    return {
        'id': r[0], 'video_id': r[1] if r[1] else None, 'owner_user_id': r[2], 'title': r[3],
        'description': r[4] or '',
        'price': float(r[5]) if r[5] is not None else 0,
        'old_price': float(r[6]) if r[6] is not None else None,
        'image': r[7], 'promo_code': r[8], 'product_url': r[9],
        'category': r[10] or 'other', 'in_stock': bool(r[11]),
        'status': r[12], 'is_partner': bool(r[13]), 'moderation_note': r[14] or '',
        'created_at': r[15].isoformat() if r[15] else None,
    }


def _row_to_product_with_owner(r):
    prod = _row_to_product(r[:16])
    prod['owner_handle'] = r[16] if len(r) > 16 else None
    prod['owner_name'] = r[17] if len(r) > 17 else None
    prod['owner_avatar'] = r[18] if len(r) > 18 else None
    return prod


def _s3():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )


def _upload_image(file_data_b64: str, content_type: str) -> str:
    file_bytes = base64.b64decode(file_data_b64)
    ext = (content_type.split('/')[-1] or 'jpg').lower()
    if ext not in ('jpg', 'jpeg', 'png', 'webp', 'gif'):
        ext = 'jpg'
    key = f"products/{uuid.uuid4().hex}.{ext}"
    _s3().put_object(Bucket='files', Key=key, Body=file_bytes, ContentType=content_type)
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def handler(event: dict, context) -> dict:
    """Товары: витрина в профиле (CRUD, загрузка фото файлом), привязка к видео, партнёрский каталог,
    хотспоты (метки товара на кадре видео), модерация (draft/pending/active/blocked), клики для аналитики."""
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
        # --- Загрузка фото товара файлом (base64) — отдельный шаг перед create/update ---
        if method == 'POST' and action == 'upload_image':
            if not user_id:
                return _resp(401, {'error': 'X-User-Id required'})
            body = json.loads(event.get('body') or '{}')
            file_data = body.get('file')
            content_type = body.get('content_type') or 'image/jpeg'
            if not file_data:
                return _resp(400, {'error': 'file required'})
            image_url = _upload_image(file_data, content_type)
            return _resp(200, {'url': image_url})

        # --- Товары конкретного видео (только активные — для показа в ленте) ---
        if method == 'GET' and action == 'by_video':
            video_ids_raw = (params.get('video_ids') or params.get('video_id') or '').strip()
            if not video_ids_raw:
                return _resp(400, {'error': 'video_ids required'})
            ids = [int(x) for x in video_ids_raw.split(',') if x.strip().isdigit()][:200]
            if not ids:
                return _resp(200, {'products': {}})
            placeholders = ','.join(['%s'] * len(ids))
            result: dict = {}

            # Товары, привязанные напрямую через video_id
            cur.execute(
                f"SELECT {PRODUCT_FIELDS_WITH_OWNER} FROM {schema}.products p "
                f"LEFT JOIN {schema}.app_users u ON u.id = p.owner_user_id "
                f"WHERE p.video_id IN ({placeholders}) AND p.video_id != 0 AND p.status = 'active' ORDER BY p.id ASC",
                tuple(ids)
            )
            for r in cur.fetchall():
                vid = str(r[1])
                result.setdefault(vid, []).append(_row_to_product_with_owner(r))

            # Товары, привязанные через хотспоты (метки на кадре)
            cur.execute(
                f"SELECT h.video_id, {PRODUCT_FIELDS_WITH_OWNER} FROM {schema}.product_hotspots h "
                f"JOIN {schema}.products p ON p.id = h.product_id "
                f"LEFT JOIN {schema}.app_users u ON u.id = p.owner_user_id "
                f"WHERE h.video_id IN ({placeholders}) AND p.status = 'active' ORDER BY p.id ASC",
                tuple(ids)
            )
            for r in cur.fetchall():
                vid = str(r[0])
                prod = _row_to_product_with_owner(r[1:])
                lst = result.setdefault(vid, [])
                if not any(p['id'] == prod['id'] for p in lst):
                    lst.append(prod)

            return _resp(200, {'products': result})

        # --- Хотспоты (координаты меток) конкретного видео — для отображения точек поверх кадра ---
        if method == 'GET' and action == 'hotspots':
            video_id = params.get('video_id')
            if not video_id:
                return _resp(400, {'error': 'video_id required'})
            cur.execute(
                f"SELECT h.id, h.product_id, h.x, h.y, h.time_start, p.title, p.price, p.image "
                f"FROM {schema}.product_hotspots h JOIN {schema}.products p ON p.id = h.product_id "
                f"WHERE h.video_id = %s AND p.status = 'active' ORDER BY h.id ASC",
                (video_id,)
            )
            hotspots = [{
                'id': r[0], 'product_id': r[1], 'x': float(r[2]), 'y': float(r[3]),
                'time_start': float(r[4]), 'title': r[5], 'price': float(r[6]) if r[6] is not None else 0,
                'image': r[7],
            } for r in cur.fetchall()]
            return _resp(200, {'hotspots': hotspots})

        # --- Моя витрина (все статусы, чтобы видеть на модерации/забаненные) ---
        if method == 'GET' and action == 'mine':
            if not user_id:
                return _resp(401, {'error': 'X-User-Id required'})
            cur.execute(
                f"SELECT {PRODUCT_FIELDS} FROM {schema}.products "
                f"WHERE owner_user_id = %s AND is_partner = FALSE ORDER BY id DESC",
                (user_id,)
            )
            products = [_row_to_product(r) for r in cur.fetchall()]
            return _resp(200, {'products': products})

        # --- Партнёрский каталог (товары брендов, доступные всем для привязки к видео) ---
        if method == 'GET' and action == 'partner_catalog':
            cur.execute(
                f"SELECT {PRODUCT_FIELDS} FROM {schema}.products "
                f"WHERE is_partner = TRUE AND status = 'active' ORDER BY id DESC LIMIT 200"
            )
            products = [_row_to_product(r) for r in cur.fetchall()]
            return _resp(200, {'products': products})

        # --- Публичная витрина конкретного продавца (только активные товары) ---
        if method == 'GET' and action == 'shop':
            owner_id = (params.get('user_id') or '').strip()[:100]
            if not owner_id:
                return _resp(400, {'error': 'user_id required'})
            cur.execute(
                f"SELECT {PRODUCT_FIELDS} FROM {schema}.products "
                f"WHERE owner_user_id = %s AND is_partner = FALSE AND status = 'active' ORDER BY id DESC LIMIT 200",
                (owner_id,)
            )
            products = [_row_to_product(r) for r in cur.fetchall()]
            return _resp(200, {'products': products})

        # --- Общий каталог всех активных товаров пользователей (маркетплейс) ---
        if method == 'GET' and action == 'catalog':
            category = (params.get('category') or '').strip()[:50]
            limit = min(int(params.get('limit') or 60), 100)
            offset = max(int(params.get('offset') or 0), 0)
            if category and category != 'all':
                cur.execute(
                    f"SELECT {PRODUCT_FIELDS_WITH_OWNER} FROM {schema}.products p "
                    f"LEFT JOIN {schema}.app_users u ON u.id = p.owner_user_id "
                    f"WHERE p.status = 'active' AND p.category = %s ORDER BY p.id DESC LIMIT %s OFFSET %s",
                    (category, limit, offset)
                )
            else:
                cur.execute(
                    f"SELECT {PRODUCT_FIELDS_WITH_OWNER} FROM {schema}.products p "
                    f"LEFT JOIN {schema}.app_users u ON u.id = p.owner_user_id "
                    f"WHERE p.status = 'active' ORDER BY p.id DESC LIMIT %s OFFSET %s",
                    (limit, offset)
                )
            products = [_row_to_product_with_owner(r) for r in cur.fetchall()]
            return _resp(200, {'products': products})

        # --- Создать товар в своей витрине (video_id не обязателен) ---
        if method == 'POST' and action == 'create':
            if not user_id:
                return _resp(401, {'error': 'X-User-Id required'})
            body = json.loads(event.get('body') or '{}')
            title = (body.get('title') or '').strip()[:200]
            if not title:
                return _resp(400, {'error': 'title required'})
            price = body.get('price') or 0
            old_price = body.get('old_price')
            description = (body.get('description') or '').strip()[:2000]
            image = (body.get('image') or '').strip()
            promo_code = (body.get('promo_code') or '').strip()[:50]
            product_url = (body.get('product_url') or '').strip()
            category = (body.get('category') or 'other').strip()[:50]
            in_stock = bool(body.get('in_stock', True))
            video_id = body.get('video_id') or 0
            cur.execute(
                f"INSERT INTO {schema}.products "
                f"(video_id, owner_user_id, title, description, price, old_price, image, promo_code, product_url, category, in_stock, status) "
                f"VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending') RETURNING id",
                (video_id, user_id, title, description, price, old_price, image, promo_code, product_url, category, in_stock)
            )
            new_id = cur.fetchone()[0]
            conn.commit()
            return _resp(200, {'id': new_id, 'status': 'pending'})

        # --- Обновить товар (только владелец; после правки статус снова уходит на модерацию) ---
        if method == 'PUT' and action == 'update':
            if not user_id:
                return _resp(401, {'error': 'X-User-Id required'})
            body = json.loads(event.get('body') or '{}')
            product_id = body.get('id')
            if not product_id:
                return _resp(400, {'error': 'id required'})
            cur.execute(f"SELECT owner_user_id FROM {schema}.products WHERE id = %s", (product_id,))
            row = cur.fetchone()
            if not row or row[0] != user_id:
                return _resp(403, {'error': 'not owner'})
            fields = []
            values = []
            for key, col in [
                ('title', 'title'), ('description', 'description'), ('price', 'price'),
                ('old_price', 'old_price'), ('image', 'image'), ('promo_code', 'promo_code'),
                ('product_url', 'product_url'), ('category', 'category'), ('in_stock', 'in_stock'),
            ]:
                if key in body:
                    fields.append(f"{col} = %s")
                    values.append(body[key])
            if not fields:
                return _resp(400, {'error': 'nothing to update'})
            fields.append("status = 'pending'")
            fields.append("updated_at = now()")
            values.append(product_id)
            cur.execute(f"UPDATE {schema}.products SET {', '.join(fields)} WHERE id = %s", tuple(values))
            conn.commit()
            return _resp(200, {'ok': True, 'status': 'pending'})

        # --- Скрыть/показать свой товар ---
        if method == 'POST' and action == 'toggle_visibility':
            if not user_id:
                return _resp(401, {'error': 'X-User-Id required'})
            body = json.loads(event.get('body') or '{}')
            product_id = body.get('id')
            hide = bool(body.get('hide', True))
            cur.execute(f"SELECT owner_user_id, status FROM {schema}.products WHERE id = %s", (product_id,))
            row = cur.fetchone()
            if not row or row[0] != user_id:
                return _resp(403, {'error': 'not owner'})
            new_status = 'draft' if hide else ('active' if row[1] in ('draft',) else row[1])
            cur.execute(f"UPDATE {schema}.products SET status = %s WHERE id = %s", (new_status, product_id))
            conn.commit()
            return _resp(200, {'ok': True, 'status': new_status})

        # --- Удалить товар (только владелец) ---
        if method == 'DELETE' and action == 'delete':
            if not user_id:
                return _resp(401, {'error': 'X-User-Id required'})
            product_id = params.get('id')
            if not product_id:
                return _resp(400, {'error': 'id required'})
            cur.execute(f"DELETE FROM {schema}.product_hotspots WHERE product_id = %s", (product_id,))
            cur.execute(
                f"DELETE FROM {schema}.products WHERE id = %s AND owner_user_id = %s",
                (product_id, user_id)
            )
            conn.commit()
            return _resp(200, {'ok': True})

        # --- Прикрепить товар(ы) к видео как хотспоты (метки на кадре) при публикации ---
        if method == 'POST' and action == 'attach_hotspots':
            if not user_id:
                return _resp(401, {'error': 'X-User-Id required'})
            body = json.loads(event.get('body') or '{}')
            video_id = body.get('video_id')
            hotspots = body.get('hotspots') or []
            if not video_id or not hotspots:
                return _resp(400, {'error': 'video_id and hotspots required'})
            for h in hotspots[:20]:
                product_id = h.get('product_id')
                if not product_id:
                    continue
                cur.execute(
                    f"INSERT INTO {schema}.product_hotspots (video_id, product_id, x, y, time_start) "
                    f"VALUES (%s, %s, %s, %s, %s)",
                    (video_id, product_id, h.get('x', 50), h.get('y', 50), h.get('time_start', 0))
                )
            conn.commit()
            return _resp(200, {'ok': True})

        # --- Клик по товару (аналитика переходов) ---
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

        # ============= АДМИНСКАЯ МОДЕРАЦИЯ =============

        if method == 'GET' and action == 'admin_list':
            status_filter = (params.get('status') or 'pending').strip()
            if status_filter == 'all':
                cur.execute(f"SELECT {PRODUCT_FIELDS} FROM {schema}.products ORDER BY id DESC LIMIT 300")
            else:
                cur.execute(
                    f"SELECT {PRODUCT_FIELDS} FROM {schema}.products WHERE status = %s ORDER BY id DESC LIMIT 300",
                    (status_filter,)
                )
            products = [_row_to_product(r) for r in cur.fetchall()]
            return _resp(200, {'products': products})

        if method == 'POST' and action == 'admin_moderate':
            body = json.loads(event.get('body') or '{}')
            product_id = body.get('id')
            new_status = (body.get('status') or '').strip()
            note = (body.get('note') or '').strip()[:500]
            if not product_id or new_status not in ('active', 'blocked', 'pending', 'draft'):
                return _resp(400, {'error': 'id and valid status required'})
            cur.execute(
                f"UPDATE {schema}.products SET status = %s, moderation_note = %s WHERE id = %s",
                (new_status, note, product_id)
            )
            conn.commit()
            return _resp(200, {'ok': True})

        return _resp(405, {'error': 'Method not allowed'})
    finally:
        cur.close()
        conn.close()