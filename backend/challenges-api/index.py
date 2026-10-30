import json
import os
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    'Access-Control-Max-Age': '86400',
}


def _resp(status, payload):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(payload, default=str)}


def _challenge(r, joined=False, participants=0):
    return {
        'id': r[0], 'title': r[1], 'description': r[2], 'criteria': r[3], 'topic': r[4],
        'badge_title': r[5], 'starts_at': r[6].isoformat() if r[6] else None,
        'ends_at': r[7].isoformat() if r[7] else None, 'joined': joined, 'participants': participants,
    }


FIELDS = "id, title, description, criteria, topic, badge_title, starts_at, ends_at"


def handler(event: dict, context) -> dict:
    """Челленджи недели: текущий челлендж, участие, лучшие ответы, бейджи пользователя."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    schema = os.environ['MAIN_DB_SCHEMA']
    params = event.get('queryStringParameters') or {}
    headers = event.get('headers') or {}
    user_id = (headers.get('X-User-Id') or headers.get('x-user-id') or '').strip()[:100]
    action = (params.get('action') or 'current').strip()

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    try:
        if method == 'GET' and action == 'current':
            cur.execute(
                f"SELECT {FIELDS} FROM {schema}.challenges WHERE is_active = TRUE AND ends_at > NOW() "
                f"ORDER BY ends_at ASC LIMIT 1")
            row = cur.fetchone()
            if not row:
                return _resp(200, {'challenge': None})
            cur.execute(f"SELECT COUNT(*) FROM {schema}.challenge_entries WHERE challenge_id = %s", (row[0],))
            total = cur.fetchone()[0]
            joined = False
            if user_id:
                cur.execute(
                    f"SELECT 1 FROM {schema}.challenge_entries WHERE challenge_id = %s AND user_id = %s", (row[0], user_id))
                joined = cur.fetchone() is not None
            return _resp(200, {'challenge': _challenge(row, joined, total)})

        if method == 'GET' and action == 'best':
            cid = params.get('id')
            if not cid:
                return _resp(400, {'error': 'id required'})
            cur.execute(
                f"SELECT v.id, v.url, v.thumbnail, v.type, v.card_title, v.description, v.handle, v.likes "
                f"FROM {schema}.challenge_entries e JOIN {schema}.videos v ON v.id = e.video_id "
                f"WHERE e.challenge_id = %s AND (v.hidden IS NULL OR v.hidden = FALSE) "
                f"ORDER BY v.likes DESC, e.created_at DESC LIMIT 10", (cid,))
            items = [{'id': r[0], 'url': r[1], 'thumbnail': r[2], 'type': r[3],
                      'title': r[4] or (r[5] or '')[:40], 'handle': r[6], 'likes': r[7]} for r in cur.fetchall()]
            return _resp(200, {'items': items})

        if method == 'GET' and action == 'my':
            if not user_id:
                return _resp(401, {'error': 'X-User-Id required'})
            cur.execute(
                f"SELECT c.id, c.title, c.ends_at, e.video_id FROM {schema}.challenge_entries e "
                f"JOIN {schema}.challenges c ON c.id = e.challenge_id WHERE e.user_id = %s ORDER BY e.id DESC", (user_id,))
            entries = [{'challenge_id': r[0], 'title': r[1], 'ends_at': r[2].isoformat() if r[2] else None,
                        'video_id': r[3]} for r in cur.fetchall()]
            cur.execute(
                f"SELECT title, challenge_id, awarded_at FROM {schema}.user_badges WHERE user_id = %s ORDER BY id DESC", (user_id,))
            badges = [{'title': r[0], 'challenge_id': r[1], 'awarded_at': r[2].isoformat() if r[2] else None}
                      for r in cur.fetchall()]
            return _resp(200, {'entries': entries, 'badges': badges})

        if method == 'GET' and action == 'user_badges':
            uid = (params.get('user_id') or '').strip()[:100]
            cur.execute(f"SELECT title, challenge_id FROM {schema}.user_badges WHERE user_id = %s ORDER BY id DESC", (uid,))
            return _resp(200, {'badges': [{'title': r[0], 'challenge_id': r[1]} for r in cur.fetchall()]})

        if method == 'POST' and action == 'join':
            if not user_id:
                return _resp(401, {'error': 'X-User-Id required'})
            body = json.loads(event.get('body') or '{}')
            cid = body.get('challenge_id')
            cur.execute(f"SELECT {FIELDS} FROM {schema}.challenges WHERE id = %s AND is_active = TRUE AND ends_at > NOW()", (cid,))
            ch = cur.fetchone()
            if not ch:
                return _resp(404, {'error': 'challenge closed'})
            cur.execute(
                f"INSERT INTO {schema}.challenge_entries (challenge_id, user_id) VALUES (%s, %s) "
                f"ON CONFLICT (challenge_id, user_id) DO NOTHING", (cid, user_id))
            conn.commit()
            return _resp(200, {'ok': True})

        if method == 'POST' and action == 'submit':
            if not user_id:
                return _resp(401, {'error': 'X-User-Id required'})
            body = json.loads(event.get('body') or '{}')
            cid = body.get('challenge_id')
            video_id = body.get('video_id')
            if not cid or not video_id:
                return _resp(400, {'error': 'challenge_id and video_id required'})
            cur.execute(f"SELECT 1 FROM {schema}.videos WHERE id = %s AND user_id = %s", (video_id, user_id))
            if not cur.fetchone():
                return _resp(403, {'error': 'not your post'})
            cur.execute(f"SELECT badge_title FROM {schema}.challenges WHERE id = %s", (cid,))
            ch = cur.fetchone()
            if not ch:
                return _resp(404, {'error': 'not found'})
            cur.execute(
                f"INSERT INTO {schema}.challenge_entries (challenge_id, user_id, video_id) VALUES (%s, %s, %s) "
                f"ON CONFLICT (challenge_id, user_id) DO UPDATE SET video_id = EXCLUDED.video_id", (cid, user_id, video_id))
            cur.execute(
                f"INSERT INTO {schema}.user_badges (user_id, challenge_id, title) VALUES (%s, %s, %s) "
                f"ON CONFLICT (user_id, challenge_id) DO NOTHING", (user_id, cid, ch[0]))
            conn.commit()
            return _resp(200, {'ok': True, 'badge': ch[0]})

        return _resp(405, {'error': 'Method not allowed'})
    finally:
        cur.close()
        conn.close()
