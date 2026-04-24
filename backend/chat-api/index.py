import json
import os
import psycopg2

def handler(event: dict, context) -> dict:
    """Чат API: сообщения, онлайн-пользователи и WebRTC signaling для P2P звонков"""
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
    user_name = req_headers.get('X-User-Name', 'Гость')
    module = params.get('module', 'chat')

    try:
        # Upsert user online status
        cur.execute(
            "INSERT INTO sa_users (id, name, online_at) VALUES (%s, %s, NOW()) "
            "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, online_at = NOW()",
            (user_id, user_name)
        )

        # ── CHAT MODULE ──────────────────────────────────────────────
        if module == 'chat':
            if method == 'GET':
                action = params.get('action', 'messages')

                if action == 'messages':
                    chat_id = params.get('chat_id')
                    since_id = params.get('since_id', '0')
                    if not chat_id:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers,
                                'body': json.dumps({'error': 'chat_id required'})}
                    cur.execute(
                        "SELECT id, user_id, user_name, type, content, created_at "
                        "FROM sa_messages WHERE chat_id = %s AND id > %s "
                        "ORDER BY created_at ASC LIMIT 100",
                        (chat_id, int(since_id))
                    )
                    rows = cur.fetchall()
                    messages = [
                        {'id': r[0], 'user_id': r[1], 'user_name': r[2],
                         'type': r[3], 'content': r[4],
                         'time': r[5].strftime('%H:%M')}
                        for r in rows
                    ]
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'messages': messages})}

                elif action == 'online':
                    cur.execute(
                        "SELECT id, name FROM sa_users "
                        "WHERE online_at > NOW() - INTERVAL '30 seconds'"
                    )
                    users = [{'id': r[0], 'name': r[1]} for r in cur.fetchall()]
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'users': users})}

            elif method == 'POST':
                body = json.loads(event.get('body') or '{}')
                chat_id = body.get('chat_id')
                content = body.get('content', '')
                msg_type = body.get('type', 'text')
                if not chat_id:
                    conn.commit()
                    return {'statusCode': 400, 'headers': headers,
                            'body': json.dumps({'error': 'chat_id required'})}

                cur.execute(
                    "INSERT INTO sa_chats (id, type) VALUES (%s, 'personal') ON CONFLICT DO NOTHING",
                    (chat_id,)
                )
                cur.execute(
                    "INSERT INTO sa_messages (chat_id, user_id, user_name, type, content) "
                    "VALUES (%s, %s, %s, %s, %s) RETURNING id, created_at",
                    (chat_id, user_id, user_name, msg_type, content)
                )
                row = cur.fetchone()
                conn.commit()
                return {'statusCode': 200, 'headers': headers,
                        'body': json.dumps({'id': row[0], 'time': row[1].strftime('%H:%M'), 'ok': True})}

        # ── SIGNALING MODULE ─────────────────────────────────────────
        elif module == 'signal':
            if method == 'POST':
                body = json.loads(event.get('body') or '{}')
                room_id = body.get('room_id')
                to_user = body.get('to_user')
                sig_type = body.get('type')
                payload = body.get('payload', '')

                if not all([room_id, to_user, sig_type]):
                    conn.commit()
                    return {'statusCode': 400, 'headers': headers,
                            'body': json.dumps({'error': 'room_id, to_user, type required'})}

                cur.execute(
                    "INSERT INTO sa_signaling (room_id, from_user, to_user, type, payload) "
                    "VALUES (%s, %s, %s, %s, %s)",
                    (room_id, user_id, to_user, sig_type, json.dumps(payload))
                )
                conn.commit()
                return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

            elif method == 'GET':
                room_id = params.get('room_id')
                since_id = params.get('since_id', '0')

                if not room_id:
                    conn.commit()
                    return {'statusCode': 400, 'headers': headers,
                            'body': json.dumps({'error': 'room_id required'})}

                cur.execute(
                    "SELECT id, from_user, type, payload FROM sa_signaling "
                    "WHERE room_id = %s AND to_user = %s AND id > %s "
                    "ORDER BY created_at ASC LIMIT 50",
                    (room_id, user_id, int(since_id))
                )
                rows = cur.fetchall()
                signals = [
                    {'id': r[0], 'from_user': r[1], 'type': r[2], 'payload': json.loads(r[3])}
                    for r in rows
                ]
                conn.commit()
                return {'statusCode': 200, 'headers': headers,
                        'body': json.dumps({'signals': signals})}

        conn.commit()
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'unknown request'})}

    except Exception as e:
        conn.rollback()
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': str(e)})}
    finally:
        cur.close()
        conn.close()
