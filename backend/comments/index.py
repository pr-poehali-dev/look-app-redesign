import json
import os
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-User-Name',
    'Access-Control-Max-Age': '86400',
}


def _resp(status, payload):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(payload)}


def _esc(value):
    return str(value or '').replace("'", "''")


def handler(event: dict, context) -> dict:
    """Комментарии и лайки для видео и постов. action=likes для лайков, без action — комментарии"""
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
        if action == 'likes':
            if method == 'GET':
                target_type = _esc(params.get('target_type', ''))[:20]
                target_id = _esc(params.get('target_id', ''))[:100]
                if not target_type or not target_id:
                    return _resp(400, {'error': 'target_type and target_id required'})

                cur.execute(
                    f"SELECT COUNT(*) FROM {schema}.likes WHERE target_type = '{target_type}' AND target_id = '{target_id}'"
                )
                count = cur.fetchone()[0]

                liked = False
                if user_id:
                    safe_user = _esc(user_id)
                    cur.execute(
                        f"SELECT 1 FROM {schema}.likes WHERE target_type = '{target_type}' AND target_id = '{target_id}' AND user_id = '{safe_user}' LIMIT 1"
                    )
                    liked = cur.fetchone() is not None

                return _resp(200, {'count': count, 'liked': liked})

            if method == 'POST':
                body = json.loads(event.get('body') or '{}')
                target_type = _esc((body.get('target_type') or '').strip())[:20]
                target_id = _esc(str(body.get('target_id') or '').strip())[:100]
                if not user_id:
                    return _resp(401, {'error': 'X-User-Id required'})
                if not target_type or not target_id:
                    return _resp(400, {'error': 'target_type and target_id required'})

                safe_user = _esc(user_id)
                cur.execute(
                    f"SELECT id FROM {schema}.likes WHERE target_type = '{target_type}' AND target_id = '{target_id}' AND user_id = '{safe_user}' LIMIT 1"
                )
                row = cur.fetchone()
                if row:
                    cur.execute(
                        f"DELETE FROM {schema}.likes WHERE id = {int(row[0])}"
                    )
                    liked = False
                else:
                    cur.execute(
                        f"INSERT INTO {schema}.likes (target_type, target_id, user_id) VALUES ('{target_type}', '{target_id}', '{safe_user}')"
                    )
                    liked = True

                cur.execute(
                    f"SELECT COUNT(*) FROM {schema}.likes WHERE target_type = '{target_type}' AND target_id = '{target_id}'"
                )
                count = cur.fetchone()[0]
                conn.commit()
                return _resp(200, {'count': count, 'liked': liked})

            return _resp(405, {'error': 'Method not allowed'})

        if action == 'count' and method == 'GET':
            target_type = _esc(params.get('target_type', ''))[:20]
            ids_raw = (params.get('target_ids') or '').strip()
            if not target_type or not ids_raw:
                return _resp(400, {'error': 'target_type and target_ids required'})
            ids = [_esc(x.strip())[:100] for x in ids_raw.split(',') if x.strip()][:200]
            if not ids:
                return _resp(200, {'counts': {}})
            in_list = ", ".join(f"'{i}'" for i in ids)
            cur.execute(
                f"SELECT target_id, COUNT(*) FROM {schema}.comments WHERE target_type = '{target_type}' AND target_id IN ({in_list}) GROUP BY target_id"
            )
            c_rows = cur.fetchall()
            cur.execute(
                f"SELECT target_id, COUNT(*) FROM {schema}.likes WHERE target_type = '{target_type}' AND target_id IN ({in_list}) GROUP BY target_id"
            )
            l_rows = cur.fetchall()
            return _resp(200, {
                'comments': {r[0]: r[1] for r in c_rows},
                'likes': {r[0]: r[1] for r in l_rows},
            })

        if method == 'GET':
            target_type = _esc(params.get('target_type', ''))[:20]
            target_id = _esc(params.get('target_id', ''))[:100]
            if not target_type or not target_id:
                return _resp(400, {'error': 'target_type and target_id required'})

            cur.execute(
                f"SELECT id, author_name, author_handle, text, created_at, parent_id FROM {schema}.comments "
                f"WHERE target_type = '{target_type}' AND target_id = '{target_id}' ORDER BY created_at ASC LIMIT 500"
            )
            rows = cur.fetchall()
            ids = [str(r[0]) for r in rows]
            like_counts: dict = {}
            if ids:
                in_list = ", ".join(f"'{_esc(i)}'" for i in ids)
                cur.execute(
                    f"SELECT target_id, COUNT(*) FROM {schema}.likes WHERE target_type = 'comment' AND target_id IN ({in_list}) GROUP BY target_id"
                )
                like_counts = {r[0]: r[1] for r in cur.fetchall()}
            comments = [
                {
                    'id': r[0],
                    'name': r[1],
                    'handle': r[2] or '',
                    'text': r[3],
                    'time': r[4].isoformat() if r[4] else None,
                    'parent_id': r[5],
                    'likes': like_counts.get(str(r[0]), 0),
                }
                for r in rows
            ]
            top = [c for c in comments if not c['parent_id']]
            top.sort(key=lambda c: c['id'], reverse=True)
            replies = [c for c in comments if c['parent_id']]
            ordered = []
            for t in top:
                ordered.append(t)
                ordered.extend([r for r in replies if r['parent_id'] == t['id']])
            return _resp(200, {'comments': ordered, 'count': len(comments)})

        if method == 'POST':
            body = json.loads(event.get('body') or '{}')
            target_type = (body.get('target_type') or '').strip()
            target_id = str(body.get('target_id') or '').strip()
            text = (body.get('text') or '').strip()
            author_name = (body.get('author_name') or 'Я').strip()[:100]
            author_handle = (body.get('author_handle') or '').strip()[:100]
            parent_id = body.get('parent_id')

            if not target_type or not target_id or not text:
                return _resp(400, {'error': 'target_type, target_id and text required'})

            safe_type = _esc(target_type)
            safe_id = _esc(target_id)
            safe_text = _esc(text[:2000])
            safe_name = _esc(author_name)
            safe_handle = _esc(author_handle)
            safe_user = _esc(user_id) if user_id else ''
            parent_sql = str(int(parent_id)) if parent_id else 'NULL'

            if safe_user:
                cur.execute(
                    f"INSERT INTO {schema}.comments (target_type, target_id, author_name, author_handle, text, user_id, parent_id) "
                    f"VALUES ('{safe_type}', '{safe_id}', '{safe_name}', '{safe_handle}', '{safe_text}', '{safe_user}', {parent_sql}) RETURNING id, created_at"
                )
            else:
                cur.execute(
                    f"INSERT INTO {schema}.comments (target_type, target_id, author_name, author_handle, text, parent_id) "
                    f"VALUES ('{safe_type}', '{safe_id}', '{safe_name}', '{safe_handle}', '{safe_text}', {parent_sql}) RETURNING id, created_at"
                )
            row = cur.fetchone()
            conn.commit()
            return _resp(200, {
                'comment': {
                    'id': row[0],
                    'name': author_name,
                    'handle': author_handle,
                    'text': text,
                    'time': row[1].isoformat() if row[1] else None,
                    'parent_id': int(parent_id) if parent_id else None,
                    'likes': 0,
                }
            })

        return _resp(405, {'error': 'Method not allowed'})
    finally:
        cur.close()
        conn.close()