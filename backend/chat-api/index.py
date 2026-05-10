import json
import os
import random
import psycopg2

SEED_COMMUNITIES = [
    ('com_photo_ru', 'Фотографы России', 'Делимся снимками, лайфхаками и вдохновением', 'open', 'Фото', 'https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/dbf882bc-5b07-4604-a1fa-628313ce915f.jpg'),
    ('com_travel', 'Клуб путешественников', 'Только для тех, кто уже побывал в 10+ странах', 'closed', 'Путешествия', 'https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/a3325030-6571-46e9-845b-2a54062f9059.jpg'),
    ('com_fitness', 'Фитнес & ЗОЖ', 'Тренировки, питание, мотивация каждый день', 'open', 'Спорт', 'https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/5b90e1a9-665b-4e6c-9184-2edf68db2e91.jpg'),
    ('com_gaming', 'Геймеры Look', 'Закрытое сообщество для хардкорных геймеров', 'closed', 'Игры', 'https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/45213a06-ddb6-4425-9410-cb3777726c55.jpg'),
    ('com_coffee', 'Кофейная культура', 'Всё о кофе: варка, обжарка, кофейни мира', 'open', 'Еда', 'https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/0730a864-0860-4c86-8845-835a8c4a720e.jpg'),
    ('com_music', 'Ночная музыка', 'Закрытый клуб любителей электронной музыки', 'closed', 'Музыка', 'https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/c96bc59d-e416-4e11-adf2-a308d67a562d.jpg'),
]

def handler(event: dict, context) -> dict:
    """Чат API: сообщения, онлайн-пользователи, сообщества и WebRTC signaling"""
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
    from urllib.parse import unquote
    user_id = req_headers.get('X-User-Id', 'anon')
    user_name = unquote(req_headers.get('X-User-Name', 'Гость'))
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
                        "SELECT cleared_until_id FROM chat_settings WHERE user_id = %s AND chat_id = %s",
                        (user_id, chat_id)
                    )
                    cleared_row = cur.fetchone()
                    cleared_until = int(cleared_row[0]) if cleared_row and cleared_row[0] else 0
                    effective_since = max(int(since_id), cleared_until)
                    cur.execute(
                        "SELECT id, user_id, user_name, type, content, created_at "
                        "FROM sa_messages WHERE chat_id = %s AND id > %s "
                        "ORDER BY created_at ASC LIMIT 100",
                        (chat_id, effective_since)
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

                elif action == 'all_users':
                    cur.execute(
                        "SELECT au.id, au.name, au.avatar, "
                        "COALESCE(su.online_at > NOW() - INTERVAL '30 seconds', false) AS online "
                        "FROM app_users au "
                        "LEFT JOIN sa_users su ON su.id = au.id "
                        "WHERE au.id != %s "
                        "ORDER BY online DESC, au.name ASC",
                        (user_id,)
                    )
                    users = [
                        {'id': r[0], 'name': r[1], 'avatar': r[2] or '', 'online': bool(r[3])}
                        for r in cur.fetchall()
                    ]
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'users': users})}

                elif action == 'read_get':
                    chat_id = params.get('chat_id')
                    if not chat_id:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers,
                                'body': json.dumps({'error': 'chat_id required'})}
                    cur.execute(
                        "SELECT user_id, last_read_id FROM sa_message_reads "
                        "WHERE chat_id = %s",
                        (chat_id,)
                    )
                    reads = {r[0]: r[1] for r in cur.fetchall()}
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'reads': reads})}

                elif action == 'settings_get':
                    chat_id = params.get('chat_id')
                    if not chat_id:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers,
                                'body': json.dumps({'error': 'chat_id required'})}
                    cur.execute(
                        "SELECT muted, blocked, theme, disappear FROM chat_settings "
                        "WHERE user_id = %s AND chat_id = %s",
                        (user_id, chat_id)
                    )
                    row = cur.fetchone()
                    if row:
                        settings = {'muted': bool(row[0]), 'blocked': bool(row[1]),
                                    'theme': row[2] or 'default', 'disappear': row[3] or 'off'}
                    else:
                        settings = {'muted': False, 'blocked': False,
                                    'theme': 'default', 'disappear': 'off'}
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'settings': settings})}

                elif action == 'typing_get':
                    chat_id = params.get('chat_id')
                    if not chat_id:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers,
                                'body': json.dumps({'error': 'chat_id required'})}
                    cur.execute(
                        "SELECT id, name FROM sa_users "
                        "WHERE typing_chat_id = %s AND typing_at > NOW() - INTERVAL '5 seconds' "
                        "AND id != %s",
                        (chat_id, user_id)
                    )
                    users = [{'id': r[0], 'name': r[1]} for r in cur.fetchall()]
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'typing': users})}

                elif action == 'list':
                    cur.execute(
                        "SELECT c.id, c.type, c.name, c.avatar, "
                        "m.user_name, m.type, m.content, m.created_at, "
                        "u.online_at > NOW() - INTERVAL '30 seconds', "
                        "t.name, "
                        "au.name, au.avatar, "
                        "(SELECT COUNT(*) FROM sa_messages sm "
                        "  WHERE sm.chat_id = c.id AND sm.user_id != %s "
                        "  AND sm.id > COALESCE("
                        "    (SELECT last_read_id FROM sa_message_reads "
                        "      WHERE chat_id = c.id AND user_id = %s), 0) "
                        "  AND sm.id > COALESCE("
                        "    (SELECT cleared_until_id FROM chat_settings "
                        "      WHERE chat_id = c.id AND user_id = %s), 0)"
                        ") AS unread_count "
                        "FROM sa_chats c "
                        "JOIN sa_chat_members cm ON cm.chat_id = c.id AND cm.user_id = %s "
                        "AND (c.name IS NULL OR c.name != '__merged__') "
                        "LEFT JOIN LATERAL ("
                        "  SELECT user_name, type, content, created_at FROM sa_messages "
                        "  WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1"
                        ") m ON true "
                        "LEFT JOIN sa_users u ON u.id = ("
                        "  SELECT user_id FROM sa_chat_members "
                        "  WHERE chat_id = c.id AND user_id != %s LIMIT 1"
                        ") "
                        "LEFT JOIN sa_users t ON t.typing_chat_id = c.id "
                        "  AND t.typing_at > NOW() - INTERVAL '5 seconds' AND t.id != %s "
                        "LEFT JOIN app_users au ON au.id = ("
                        "  SELECT cm2.user_id FROM sa_chat_members cm2 "
                        "  JOIN app_users au2 ON au2.id = cm2.user_id "
                        "  WHERE cm2.chat_id = c.id AND cm2.user_id != %s LIMIT 1"
                        ") "
                        "ORDER BY COALESCE(m.created_at, c.created_at) DESC",
                        (user_id, user_id, user_id, user_id, user_id, user_id, user_id)
                    )
                    rows = cur.fetchall()
                    chats = []
                    for r in rows:
                        last_msg = ''
                        time_str = ''
                        if r[4]:
                            if r[5] == 'image':
                                last_msg = '📷 Фото'
                            elif r[5] == 'voice':
                                last_msg = '🎤 Голосовое'
                            else:
                                last_msg = r[6] or ''
                        if r[7]:
                            import datetime
                            now = datetime.datetime.now(r[7].tzinfo) if r[7].tzinfo else datetime.datetime.now()
                            diff = now - r[7]
                            if diff.total_seconds() < 60:
                                time_str = 'сейчас'
                            elif diff.total_seconds() < 3600:
                                time_str = f"{int(diff.total_seconds()//60)} мин"
                            elif diff.total_seconds() < 86400:
                                time_str = f"{int(diff.total_seconds()//3600)} ч"
                            else:
                                time_str = 'вчера'
                        is_personal = (r[1] == 'personal')
                        peer_name = r[10]
                        peer_avatar = r[11]
                        if is_personal:
                            display_name = peer_name or r[2] or 'Чат'
                            display_avatar = peer_avatar or r[3]
                        else:
                            display_name = r[2] or 'Чат'
                            display_avatar = r[3]
                        chats.append({
                            'id': r[0], 'type': r[1], 'name': display_name,
                            'avatar': display_avatar, 'lastMsg': last_msg, 'time': time_str,
                            'online': bool(r[8]),
                            'typing': r[9] or '',
                            'unread': int(r[12]) if r[12] else 0
                        })
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'chats': chats})}

            elif method == 'POST':
                body = json.loads(event.get('body') or '{}')
                post_action = body.get('action', 'send')

                if post_action == 'read':
                    chat_id = body.get('chat_id')
                    last_id = body.get('last_id', 0)
                    if not chat_id:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers,
                                'body': json.dumps({'error': 'chat_id required'})}
                    cur.execute(
                        "INSERT INTO sa_message_reads (chat_id, user_id, last_read_id, updated_at) "
                        "VALUES (%s, %s, %s, NOW()) "
                        "ON CONFLICT (chat_id, user_id) DO UPDATE "
                        "SET last_read_id = GREATEST(sa_message_reads.last_read_id, EXCLUDED.last_read_id), "
                        "updated_at = NOW()",
                        (chat_id, user_id, int(last_id))
                    )
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'ok': True})}

                if post_action == 'settings_set':
                    chat_id = body.get('chat_id')
                    if not chat_id:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers,
                                'body': json.dumps({'error': 'chat_id required'})}
                    field = body.get('field')
                    value = body.get('value')
                    allowed = {'muted', 'blocked', 'theme', 'disappear'}
                    if field not in allowed:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers,
                                'body': json.dumps({'error': 'invalid field'})}
                    if field in ('muted', 'blocked'):
                        value = bool(value)
                    else:
                        value = str(value or '')
                    cur.execute(
                        "INSERT INTO chat_settings (user_id, chat_id, muted, blocked, theme, disappear, updated_at) "
                        "VALUES (%s, %s, FALSE, FALSE, 'default', 'off', NOW()) "
                        "ON CONFLICT (user_id, chat_id) DO NOTHING",
                        (user_id, chat_id)
                    )
                    if field == 'muted':
                        cur.execute("UPDATE chat_settings SET muted = %s, updated_at = NOW() "
                                    "WHERE user_id = %s AND chat_id = %s", (value, user_id, chat_id))
                    elif field == 'blocked':
                        cur.execute("UPDATE chat_settings SET blocked = %s, updated_at = NOW() "
                                    "WHERE user_id = %s AND chat_id = %s", (value, user_id, chat_id))
                    elif field == 'theme':
                        cur.execute("UPDATE chat_settings SET theme = %s, updated_at = NOW() "
                                    "WHERE user_id = %s AND chat_id = %s", (value, user_id, chat_id))
                    elif field == 'disappear':
                        cur.execute("UPDATE chat_settings SET disappear = %s, updated_at = NOW() "
                                    "WHERE user_id = %s AND chat_id = %s", (value, user_id, chat_id))
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'ok': True})}

                if post_action == 'typing':
                    chat_id = body.get('chat_id')
                    if not chat_id:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers,
                                'body': json.dumps({'error': 'chat_id required'})}
                    cur.execute(
                        "UPDATE sa_users SET typing_chat_id = %s, typing_at = NOW() WHERE id = %s",
                        (chat_id, user_id)
                    )
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'ok': True})}

                if post_action == 'clear_chat':
                    chat_id = body.get('chat_id')
                    for_all = bool(body.get('for_all', False))
                    if not chat_id:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers,
                                'body': json.dumps({'error': 'chat_id required'})}
                    cur.execute(
                        "SELECT COALESCE(MAX(id), 0) FROM sa_messages WHERE chat_id = %s",
                        (chat_id,)
                    )
                    max_id = int(cur.fetchone()[0] or 0)
                    if for_all:
                        cur.execute(
                            "SELECT 1 FROM sa_chat_members WHERE chat_id = %s AND user_id = %s",
                            (chat_id, user_id)
                        )
                        if not cur.fetchone():
                            conn.commit()
                            return {'statusCode': 403, 'headers': headers,
                                    'body': json.dumps({'error': 'not a member'})}
                        cur.execute("DELETE FROM sa_messages WHERE chat_id = %s", (chat_id,))
                        cur.execute(
                            "UPDATE chat_settings SET cleared_until_id = %s, updated_at = NOW() "
                            "WHERE chat_id = %s",
                            (max_id, chat_id)
                        )
                    cur.execute(
                        "INSERT INTO chat_settings (user_id, chat_id, cleared_until_id, updated_at) "
                        "VALUES (%s, %s, %s, NOW()) "
                        "ON CONFLICT (user_id, chat_id) DO UPDATE "
                        "SET cleared_until_id = EXCLUDED.cleared_until_id, updated_at = NOW()",
                        (user_id, chat_id, max_id)
                    )
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'ok': True, 'cleared_until': max_id, 'for_all': for_all})}

                if post_action == 'delete_message':
                    msg_id = body.get('message_id')
                    if not msg_id:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers,
                                'body': json.dumps({'error': 'message_id required'})}
                    cur.execute(
                        "DELETE FROM sa_messages WHERE id = %s AND user_id = %s RETURNING id",
                        (int(msg_id), user_id)
                    )
                    deleted = cur.fetchone()
                    conn.commit()
                    if not deleted:
                        return {'statusCode': 403, 'headers': headers,
                                'body': json.dumps({'error': 'not allowed'})}
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'ok': True, 'id': deleted[0]})}

                if post_action == 'create_chat':
                    import uuid as _uuid
                    chat_name = body.get('name', 'Новый чат')
                    chat_avatar = body.get('avatar')
                    chat_type = body.get('chat_type', 'personal')
                    members = body.get('members', [])
                    new_id = str(_uuid.uuid4())[:12]
                    cur.execute(
                        "INSERT INTO sa_chats (id, type, name, avatar) VALUES (%s, %s, %s, %s)",
                        (new_id, chat_type, chat_name, chat_avatar)
                    )
                    all_members = list(set([user_id] + members))
                    for mid in all_members:
                        cur.execute(
                            "INSERT INTO sa_chat_members (chat_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                            (new_id, mid)
                        )
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'chat_id': new_id, 'ok': True})}

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
                    "INSERT INTO sa_chat_members (chat_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    (chat_id, user_id)
                )
                # Авто-добавление второго участника для DM-чатов формата dm_u_<id1>_u_<id2>
                if chat_id.startswith('dm_'):
                    rest = chat_id[3:]
                    ids = []
                    if rest.startswith('u_'):
                        # ищем разделитель "_u_" между двумя id-шниками
                        sep = rest.find('_u_', 2)
                        if sep > 0:
                            ids = [rest[:sep], rest[sep + 1:]]
                        else:
                            ids = [rest]
                    else:
                        ids = rest.split('_')
                    for pid in ids:
                        if pid and pid != user_id:
                            cur.execute(
                                "INSERT INTO sa_chat_members (chat_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                                (chat_id, pid)
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

        # ── COMMUNITIES MODULE ───────────────────────────────────────
        elif module == 'community':
            import uuid as _uuid

            # Seed default communities if empty
            cur.execute("SELECT COUNT(*) FROM communities")
            if cur.fetchone()[0] == 0:
                for com in SEED_COMMUNITIES:
                    cur.execute(
                        "INSERT INTO communities (id, name, description, type, category, img, creator_id) "
                        "VALUES (%s, %s, %s, %s, %s, %s, 'system')",
                        com
                    )

            if method == 'GET':
                action = params.get('action', 'list')

                if action == 'list':
                    cur.execute(
                        "SELECT c.id, c.name, c.description, c.type, c.category, c.img, "
                        "COUNT(DISTINCT cm.user_id) as member_count, "
                        "MAX(CASE WHEN cm.user_id = %s THEN 1 ELSE 0 END) as is_member "
                        "FROM communities c "
                        "LEFT JOIN community_members cm ON cm.community_id = c.id "
                        "GROUP BY c.id, c.name, c.description, c.type, c.category, c.img "
                        "ORDER BY c.created_at ASC",
                        (user_id,)
                    )
                    rows = cur.fetchall()
                    communities = [
                        {'id': r[0], 'name': r[1], 'description': r[2], 'type': r[3],
                         'category': r[4], 'img': r[5], 'members': r[6], 'joined': bool(r[7])}
                        for r in rows
                    ]
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'communities': communities})}

                elif action == 'members':
                    com_id = params.get('community_id')
                    if not com_id:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'community_id required'})}
                    cur.execute(
                        "SELECT cm.user_id, cm.user_name, cm.role, "
                        "u.online_at > NOW() - INTERVAL '30 seconds' as online "
                        "FROM community_members cm "
                        "LEFT JOIN sa_users u ON u.id = cm.user_id "
                        "WHERE cm.community_id = %s ORDER BY cm.joined_at ASC",
                        (com_id,)
                    )
                    rows = cur.fetchall()
                    members = [{'id': r[0], 'name': r[1], 'role': r[2], 'online': bool(r[3])} for r in rows]
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'members': members})}

            elif method == 'POST':
                body = json.loads(event.get('body') or '{}')
                post_action = body.get('action')

                if post_action == 'join':
                    com_id = body.get('community_id')
                    cur.execute("SELECT type, name FROM communities WHERE id = %s", (com_id,))
                    row = cur.fetchone()
                    if not row:
                        conn.commit()
                        return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'not found'})}
                    com_name_for_chat = row[1]
                    cur.execute(
                        "INSERT INTO community_members (community_id, user_id, user_name) VALUES (%s, %s, %s) "
                        "ON CONFLICT DO NOTHING",
                        (com_id, user_id, user_name)
                    )
                    # Гарантируем существование группового чата сообщества и членства в нём
                    cur.execute(
                        "INSERT INTO sa_chats (id, type, name) VALUES (%s, 'group', %s) "
                        "ON CONFLICT (id) DO NOTHING",
                        (com_id, com_name_for_chat)
                    )
                    cur.execute(
                        "INSERT INTO sa_chat_members (chat_id, user_id) VALUES (%s, %s) "
                        "ON CONFLICT DO NOTHING",
                        (com_id, user_id)
                    )
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True, 'joined': True})}

                elif post_action == 'leave':
                    com_id = body.get('community_id')
                    cur.execute(
                        "UPDATE community_members SET role = 'left' WHERE community_id = %s AND user_id = %s",
                        (com_id, user_id)
                    )
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True, 'joined': False})}

                elif post_action == 'create':
                    com_name = (body.get('name') or 'Сообщество').strip()[:80]
                    com_desc = (body.get('description') or '').strip()[:500]
                    com_type = body.get('type') or 'open'
                    com_category = body.get('category') or 'Другое'
                    if com_type not in ('open', 'closed'):
                        com_type = 'open'
                    if not com_name:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers,
                                'body': json.dumps({'error': 'name required'})}
                    if user_id in ('anon', '', None):
                        conn.commit()
                        return {'statusCode': 401, 'headers': headers,
                                'body': json.dumps({'error': 'login required'})}
                    new_id = 'com_' + str(_uuid.uuid4())[:8]
                    cur.execute(
                        "INSERT INTO communities (id, name, description, type, category, creator_id) "
                        "VALUES (%s, %s, %s, %s, %s, %s)",
                        (new_id, com_name, com_desc, com_type, com_category, user_id)
                    )
                    cur.execute(
                        "INSERT INTO community_members (community_id, user_id, user_name, role) VALUES (%s, %s, %s, 'admin')",
                        (new_id, user_id, user_name)
                    )
                    # Создаём групповой чат сообщества с тем же id и добавляем создателя
                    cur.execute(
                        "INSERT INTO sa_chats (id, type, name) VALUES (%s, 'group', %s)",
                        (new_id, com_name)
                    )
                    cur.execute(
                        "INSERT INTO sa_chat_members (chat_id, user_id) VALUES (%s, %s)",
                        (new_id, user_id)
                    )
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'ok': True, 'community_id': new_id})}

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
                # Probabilistic cleanup: ~2% chance per insert deletes signals older than 5 minutes.
                # Keeps signaling table small without slowing down hot path.
                if random.random() < 0.02:
                    cur.execute(
                        "DELETE FROM sa_signaling WHERE created_at < NOW() - INTERVAL '5 minutes'"
                    )
                conn.commit()
                return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

            elif method == 'GET':
                room_id = params.get('room_id')
                since_id = params.get('since_id', '0')
                max_age = params.get('max_age_seconds')

                if not room_id:
                    conn.commit()
                    return {'statusCode': 400, 'headers': headers,
                            'body': json.dumps({'error': 'room_id required'})}

                if max_age:
                    cur.execute(
                        "SELECT id, from_user, type, payload FROM sa_signaling "
                        "WHERE room_id = %s AND to_user = %s AND id > %s "
                        "AND created_at > NOW() - (%s || ' seconds')::interval "
                        "ORDER BY created_at ASC LIMIT 50",
                        (room_id, user_id, int(since_id), str(int(max_age)))
                    )
                else:
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

        # ── CALL HISTORY MODULE ──────────────────────────────────────
        elif module == 'calls':
            if method == 'POST':
                body = json.loads(event.get('body') or '{}')
                action = body.get('action', 'log')

                if action == 'start':
                    callee_id = body.get('callee_id')
                    callee_name = body.get('callee_name', '')
                    mode = body.get('mode', 'audio')
                    room_id = body.get('room_id', '')
                    if not callee_id:
                        return {'statusCode': 400, 'headers': headers,
                                'body': json.dumps({'error': 'callee_id required'})}
                    cur.execute(
                        "INSERT INTO call_history (caller_id, caller_name, callee_id, callee_name, mode, status, room_id) "
                        "VALUES (%s, %s, %s, %s, %s, 'initiated', %s) RETURNING id",
                        (user_id, user_name, callee_id, callee_name, mode, room_id)
                    )
                    call_id = cur.fetchone()[0]
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'ok': True, 'call_id': call_id})}

                if action == 'finish':
                    call_id = body.get('call_id')
                    status = body.get('status', 'ended')
                    duration = int(body.get('duration_sec', 0) or 0)
                    answered = bool(body.get('answered', False))
                    if not call_id:
                        return {'statusCode': 400, 'headers': headers,
                                'body': json.dumps({'error': 'call_id required'})}
                    if answered:
                        cur.execute(
                            "UPDATE call_history SET status=%s, duration_sec=%s, ended_at=NOW(), "
                            "answered_at=COALESCE(answered_at, NOW()) WHERE id=%s",
                            (status, duration, int(call_id))
                        )
                    else:
                        cur.execute(
                            "UPDATE call_history SET status=%s, duration_sec=%s, ended_at=NOW() WHERE id=%s",
                            (status, duration, int(call_id))
                        )
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'ok': True})}

                if action == 'answer':
                    call_id = body.get('call_id')
                    if not call_id:
                        return {'statusCode': 400, 'headers': headers,
                                'body': json.dumps({'error': 'call_id required'})}
                    cur.execute(
                        "UPDATE call_history SET status='answered', answered_at=NOW() WHERE id=%s",
                        (int(call_id),)
                    )
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'ok': True})}

                return {'statusCode': 400, 'headers': headers,
                        'body': json.dumps({'error': 'unknown action'})}

            elif method == 'GET':
                cur.execute(
                    "SELECT id, caller_id, caller_name, callee_id, callee_name, mode, status, "
                    "EXTRACT(EPOCH FROM started_at)::bigint, duration_sec, room_id "
                    "FROM call_history WHERE caller_id=%s OR callee_id=%s "
                    "ORDER BY started_at DESC LIMIT 100",
                    (user_id, user_id)
                )
                rows = cur.fetchall()
                calls = [{
                    'id': r[0], 'caller_id': r[1], 'caller_name': r[2],
                    'callee_id': r[3], 'callee_name': r[4],
                    'mode': r[5], 'status': r[6],
                    'started_at': r[7], 'duration_sec': r[8] or 0,
                    'room_id': r[9],
                    'direction': 'out' if r[1] == user_id else 'in',
                } for r in rows]
                conn.commit()
                return {'statusCode': 200, 'headers': headers,
                        'body': json.dumps({'calls': calls})}

        conn.commit()
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'unknown request'})}

    except Exception as e:
        conn.rollback()
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': str(e)})}
    finally:
        cur.close()
        conn.close()