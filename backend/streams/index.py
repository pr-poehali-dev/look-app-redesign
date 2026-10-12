import json
import os
import psycopg2
from datetime import datetime, timezone
from urllib.parse import unquote


def _notify(cur, user_ids, title, message, stream_id):
    for uid in user_ids:
        cur.execute(
            "INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id) "
            "VALUES (%s, 'stream', %s, %s, 'stream', %s)",
            (uid, title, message, str(stream_id)))


def _followers(cur, author_id):
    cur.execute("SELECT handle FROM app_users WHERE id = %s", (author_id,))
    row = cur.fetchone()
    if not row or not row[0]:
        return []
    cur.execute("SELECT DISTINCT follower_id FROM follows WHERE target_handle = %s LIMIT 5000", (row[0],))
    return [r[0] for r in cur.fetchall() if r[0] and r[0] != author_id]


def _iso(dt):
    return dt.isoformat() + 'Z' if dt else None


def handler(event: dict, context) -> dict:
    """Управление прямыми эфирами: старт, список, обновление, завершение"""
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-User-Name',
        'Content-Type': 'application/json'
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    req_headers = event.get('headers') or {}
    user_id = req_headers.get('X-User-Id', 'anon')
    user_name = unquote(req_headers.get('X-User-Name', 'Гость'))

    try:
        # Авточистка зависших стримов (нет heartbeat более 60 сек)
        cur.execute(
            "UPDATE live_streams SET status = 'ended', ended_at = NOW() "
            "WHERE status = 'active' AND heartbeat_at < NOW() - INTERVAL '60 seconds'"
        )

        now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
        cur.execute(
            "UPDATE live_streams SET status = 'missed' "
            "WHERE status = 'scheduled' AND scheduled_at < %s - INTERVAL '3 hours'",
            (now_utc,)
        )

        if method == 'GET':
            action = params.get('action', 'list')

            if action == 'upcoming':
                cur.execute(
                    "SELECT id, user_id, user_name, user_avatar, title, category, thumb, scheduled_at, "
                    "(SELECT COUNT(*) FROM stream_reminders r WHERE r.stream_id = s.id), "
                    "EXISTS(SELECT 1 FROM stream_reminders r WHERE r.stream_id = s.id AND r.user_id = %s) "
                    "FROM live_streams s WHERE status = 'scheduled' "
                    "AND scheduled_at > %s - INTERVAL '3 hours' "
                    "ORDER BY scheduled_at ASC LIMIT 50",
                    (user_id, now_utc)
                )
                rows = cur.fetchall()

                cur.execute(
                    "SELECT id, user_id, title FROM live_streams WHERE status = 'scheduled' AND notified_at IS NULL "
                    "AND scheduled_at <= %s + INTERVAL '15 minutes' "
                    "AND scheduled_at > %s - INTERVAL '3 hours'",
                    (now_utc, now_utc)
                )
                for sid, owner, title in cur.fetchall():
                    cur.execute("SELECT user_id FROM stream_reminders WHERE stream_id = %s", (sid,))
                    ids = [r[0] for r in cur.fetchall()]
                    _notify(cur, ids, 'Эфир скоро начнётся', f'«{title}» стартует в ближайшие 15 минут', sid)
                    cur.execute("UPDATE live_streams SET notified_at = NOW() WHERE id = %s", (sid,))
                conn.commit()

                streams = [{
                    'id': r[0], 'user_id': r[1], 'user_name': r[2], 'user_avatar': r[3],
                    'title': r[4], 'category': r[5], 'thumb': r[6],
                    'scheduled_at': _iso(r[7]), 'reminders': r[8], 'reminded': bool(r[9]),
                } for r in rows]
                return {'statusCode': 200, 'headers': headers,
                        'body': json.dumps({'streams': streams})}

            if action == 'list':
                category = params.get('category', '')
                if category and category != 'Все':
                    cur.execute(
                        "SELECT id, user_id, user_name, user_avatar, title, category, thumb, tags, "
                        "viewers, likes, started_at "
                        "FROM live_streams WHERE status = 'active' AND category = %s "
                        "ORDER BY heartbeat_at DESC LIMIT 100",
                        (category,)
                    )
                else:
                    cur.execute(
                        "SELECT id, user_id, user_name, user_avatar, title, category, thumb, tags, "
                        "viewers, likes, started_at "
                        "FROM live_streams WHERE status = 'active' "
                        "ORDER BY heartbeat_at DESC LIMIT 100"
                    )
                rows = cur.fetchall()
                streams = [{
                    'id': r[0], 'user_id': r[1], 'user_name': r[2], 'user_avatar': r[3],
                    'title': r[4], 'category': r[5], 'thumb': r[6],
                    'tags': r[7].split(',') if r[7] else [],
                    'viewers': r[8], 'likes': r[9],
                    'started_at': r[10].isoformat() if r[10] else None
                } for r in rows]
                conn.commit()
                return {'statusCode': 200, 'headers': headers,
                        'body': json.dumps({'streams': streams})}

            if action == 'get':
                stream_id = params.get('id')
                if not stream_id:
                    conn.commit()
                    return {'statusCode': 400, 'headers': headers,
                            'body': json.dumps({'error': 'id required'})}
                cur.execute(
                    "SELECT id, user_id, user_name, user_avatar, title, category, thumb, tags, "
                    "viewers, likes, status, started_at FROM live_streams WHERE id = %s",
                    (int(stream_id),)
                )
                r = cur.fetchone()
                if not r:
                    conn.commit()
                    return {'statusCode': 404, 'headers': headers,
                            'body': json.dumps({'error': 'not found'})}
                stream = {
                    'id': r[0], 'user_id': r[1], 'user_name': r[2], 'user_avatar': r[3],
                    'title': r[4], 'category': r[5], 'thumb': r[6],
                    'tags': r[7].split(',') if r[7] else [],
                    'viewers': r[8], 'likes': r[9], 'status': r[10],
                    'started_at': r[11].isoformat() if r[11] else None
                }
                conn.commit()
                return {'statusCode': 200, 'headers': headers,
                        'body': json.dumps({'stream': stream})}

        if method == 'POST':
            body = json.loads(event.get('body') or '{}')
            action = body.get('action', '')

            if action == 'schedule':
                if user_id == 'anon':
                    return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Войдите в аккаунт'})}
                title = (body.get('title') or '').strip()[:120]
                category = body.get('category', 'Общее')
                raw_dt = (body.get('scheduled_at') or '').strip()
                if not title:
                    return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите тему эфира'})}
                try:
                    dt = datetime.fromisoformat(raw_dt.replace('Z', '+00:00'))
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
                except Exception:
                    return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Неверная дата'})}
                if dt < now_utc:
                    return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Время эфира уже прошло'})}
                cur.execute("SELECT COUNT(*) FROM live_streams WHERE user_id = %s AND status = 'scheduled'", (user_id,))
                if cur.fetchone()[0] >= 10:
                    return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Не больше 10 запланированных эфиров'})}
                cur.execute(
                    "INSERT INTO live_streams (user_id, user_name, user_avatar, title, category, thumb, tags, status, scheduled_at) "
                    "VALUES (%s, %s, %s, %s, %s, %s, '', 'scheduled', %s) RETURNING id",
                    (user_id, user_name, body.get('user_avatar', ''), title, category, body.get('thumb', ''), dt)
                )
                stream_id = cur.fetchone()[0]
                when = dt.strftime('%d.%m %H:%M') + ' UTC'
                _notify(cur, _followers(cur, user_id), f'{user_name} анонсирует эфир', f'«{title}» · {when}', stream_id)
                conn.commit()
                return {'statusCode': 200, 'headers': headers,
                        'body': json.dumps({'ok': True, 'stream_id': stream_id})}

            if action == 'remind':
                if user_id == 'anon':
                    return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Войдите в аккаунт'})}
                sid = int(body.get('stream_id') or 0)
                cur.execute("DELETE FROM stream_reminders WHERE stream_id = %s AND user_id = %s", (sid, user_id))
                on = cur.rowcount == 0
                if on:
                    cur.execute("INSERT INTO stream_reminders (stream_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (sid, user_id))
                conn.commit()
                return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True, 'reminded': on})}

            if action == 'cancel_schedule':
                sid = int(body.get('stream_id') or 0)
                cur.execute("SELECT title FROM live_streams WHERE id = %s AND user_id = %s AND status = 'scheduled'", (sid, user_id))
                row = cur.fetchone()
                if not row:
                    return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Эфир не найден'})}
                cur.execute("UPDATE live_streams SET status = 'cancelled', ended_at = NOW() WHERE id = %s", (sid,))
                cur.execute("SELECT user_id FROM stream_reminders WHERE stream_id = %s", (sid,))
                _notify(cur, [r[0] for r in cur.fetchall()], 'Эфир отменён', f'«{row[0]}» не состоится', sid)
                conn.commit()
                return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

            if action == 'start':
                title = body.get('title', '')
                category = body.get('category', 'Общее')
                thumb = body.get('thumb', '')
                tags = body.get('tags', '')
                user_avatar = body.get('user_avatar', '')
                if isinstance(tags, list):
                    tags = ','.join(tags)
                # Если уже есть активный стрим у пользователя — завершаем его
                cur.execute(
                    "UPDATE live_streams SET status = 'ended', ended_at = NOW() "
                    "WHERE user_id = %s AND status = 'active'",
                    (user_id,)
                )
                cur.execute(
                    "INSERT INTO live_streams (user_id, user_name, user_avatar, title, category, thumb, tags) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
                    (user_id, user_name, user_avatar, title, category, thumb, tags)
                )
                stream_id = cur.fetchone()[0]
                conn.commit()
                return {'statusCode': 200, 'headers': headers,
                        'body': json.dumps({'ok': True, 'stream_id': stream_id})}

            if action == 'heartbeat':
                stream_id = body.get('stream_id')
                viewers = body.get('viewers')
                likes = body.get('likes')
                if not stream_id:
                    conn.commit()
                    return {'statusCode': 400, 'headers': headers,
                            'body': json.dumps({'error': 'stream_id required'})}
                if viewers is not None and likes is not None:
                    cur.execute(
                        "UPDATE live_streams SET heartbeat_at = NOW(), viewers = %s, likes = %s "
                        "WHERE id = %s AND user_id = %s AND status = 'active'",
                        (int(viewers), int(likes), int(stream_id), user_id)
                    )
                else:
                    cur.execute(
                        "UPDATE live_streams SET heartbeat_at = NOW() "
                        "WHERE id = %s AND user_id = %s AND status = 'active'",
                        (int(stream_id), user_id)
                    )
                conn.commit()
                return {'statusCode': 200, 'headers': headers,
                        'body': json.dumps({'ok': True})}

            if action == 'stop':
                stream_id = body.get('stream_id')
                if not stream_id:
                    conn.commit()
                    return {'statusCode': 400, 'headers': headers,
                            'body': json.dumps({'error': 'stream_id required'})}
                cur.execute(
                    "UPDATE live_streams SET status = 'ended', ended_at = NOW() "
                    "WHERE id = %s AND user_id = %s",
                    (int(stream_id), user_id)
                )
                conn.commit()
                return {'statusCode': 200, 'headers': headers,
                        'body': json.dumps({'ok': True})}

        return {'statusCode': 400, 'headers': headers,
                'body': json.dumps({'error': 'Unknown action'})}
    finally:
        cur.close()
        conn.close()
