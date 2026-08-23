import json
import os
import random
import base64
import time
import psycopg2
import boto3

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
    user_name = unquote(req_headers.get('X-User-Name', '')).strip()
    module = params.get('module', 'chat')

    # Если имя не передано (или пришло как «Гость») — берём настоящее из app_users,
    # чтобы никогда не записывать и не показывать «Гость».
    if not user_name or user_name == 'Гость':
        try:
            main_schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
            cur.execute(
                f'SELECT name, handle FROM "{main_schema}".app_users WHERE id = %s LIMIT 1',
                (user_id,)
            )
            row = cur.fetchone()
            if row:
                user_name = (row[0] or row[1] or '').strip()
        except Exception:
            pass
    if not user_name:
        user_name = 'Пользователь'

    try:
        # Upsert user online status. Имя не затираем, если новое пустое —
        # оставляем прежнее (COALESCE), чтобы «Гость» не перезаписал реальное имя.
        cur.execute(
            "INSERT INTO sa_users (id, name, online_at) VALUES (%s, %s, NOW()) "
            "ON CONFLICT (id) DO UPDATE SET "
            "name = CASE WHEN EXCLUDED.name IN ('', 'Гость') THEN sa_users.name ELSE EXCLUDED.name END, "
            "online_at = NOW()",
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
                        "SELECT au.id, au.name, au.avatar, au.handle, au.phone, "
                        "COALESCE(su.online_at > NOW() - INTERVAL '30 seconds', false) AS online "
                        "FROM app_users au "
                        "LEFT JOIN sa_users su ON su.id = au.id "
                        "WHERE au.id != %s "
                        "ORDER BY online DESC, au.name ASC",
                        (user_id,)
                    )
                    users = [
                        {'id': r[0], 'name': r[1], 'avatar': r[2] or '', 'handle': r[3] or '', 'phone': r[4] or '', 'online': bool(r[5])}
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
                        "AND NOT EXISTS ("
                        "  SELECT 1 FROM community_members ccm "
                        "  WHERE ccm.community_id = c.id AND ccm.user_id = %s AND ccm.role = 'left'"
                        ") "
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
                        (user_id, user_id, user_id, user_id, user_id, user_id, user_id, user_id)
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
                            elif r[5] == 'video':
                                last_msg = '🎬 Видео'
                            elif r[5] == 'poll':
                                poll_q = ''
                                try:
                                    pd = json.loads(r[6]) if r[6] else None
                                    if isinstance(pd, dict):
                                        poll_q = pd.get('question') or pd.get('title') or ''
                                except Exception:
                                    poll_q = ''
                                last_msg = f'📊 Опрос: {poll_q}' if poll_q else '📊 Опрос'
                            elif r[5] == 'file':
                                last_msg = '📎 Файл'
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

                if post_action == 'delete_chat':
                    chat_id = body.get('chat_id')
                    for_all = bool(body.get('for_all', True))
                    if not chat_id:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers,
                                'body': json.dumps({'error': 'chat_id required'})}
                    if for_all:
                        # Удаляем чат целиком у всех участников: сообщения, прочитанность, настройки, членов и сам чат
                        cur.execute("DELETE FROM sa_messages WHERE chat_id = %s", (chat_id,))
                        cur.execute("DELETE FROM sa_message_reads WHERE chat_id = %s", (chat_id,))
                        cur.execute("DELETE FROM chat_settings WHERE chat_id = %s", (chat_id,))
                        cur.execute("DELETE FROM sa_chat_members WHERE chat_id = %s", (chat_id,))
                        cur.execute("DELETE FROM sa_chats WHERE id = %s", (chat_id,))
                        conn.commit()
                        return {'statusCode': 200, 'headers': headers,
                                'body': json.dumps({'ok': True, 'for_all': True, 'remaining_members': 0})}
                    # Иначе — удаляем только у себя
                    cur.execute(
                        "SELECT COALESCE(MAX(id), 0) FROM sa_messages WHERE chat_id = %s",
                        (chat_id,)
                    )
                    max_id = int(cur.fetchone()[0] or 0)
                    cur.execute(
                        "INSERT INTO chat_settings (user_id, chat_id, cleared_until_id, updated_at) "
                        "VALUES (%s, %s, %s, NOW()) "
                        "ON CONFLICT (user_id, chat_id) DO UPDATE "
                        "SET cleared_until_id = EXCLUDED.cleared_until_id, updated_at = NOW()",
                        (user_id, chat_id, max_id)
                    )
                    cur.execute(
                        "DELETE FROM sa_chat_members WHERE chat_id = %s AND user_id = %s",
                        (chat_id, user_id)
                    )
                    cur.execute(
                        "SELECT COUNT(*) FROM sa_chat_members WHERE chat_id = %s",
                        (chat_id,)
                    )
                    remaining = int(cur.fetchone()[0] or 0)
                    if remaining == 0:
                        cur.execute("DELETE FROM sa_messages WHERE chat_id = %s", (chat_id,))
                        cur.execute("DELETE FROM sa_message_reads WHERE chat_id = %s", (chat_id,))
                        cur.execute("DELETE FROM chat_settings WHERE chat_id = %s", (chat_id,))
                        cur.execute("DELETE FROM sa_chats WHERE id = %s", (chat_id,))
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'ok': True, 'for_all': False, 'remaining_members': remaining})}

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

                if post_action == 'add_members':
                    import uuid as _uuid
                    src_chat_id = body.get('chat_id')
                    new_members = body.get('user_ids') or []
                    group_name = (body.get('name') or '').strip()
                    if not src_chat_id or not isinstance(new_members, list) or not new_members:
                        return {'statusCode': 400, 'headers': headers,
                                'body': json.dumps({'error': 'chat_id и user_ids обязательны'})}
                    new_members = [m for m in new_members if isinstance(m, str) and m][:50]
                    src_chat_id = str(src_chat_id)
                    if src_chat_id.startswith('dm_'):
                        rest = src_chat_id[3:]
                        if rest.startswith('u_'):
                            sep = rest.find('_u_', 2)
                            if sep > 0:
                                dm_members = [rest[:sep], rest[sep + 1:]]
                            else:
                                dm_members = [rest]
                        else:
                            dm_members = rest.split('_')
                        dm_members = [m for m in dm_members if m]
                        target_id = str(_uuid.uuid4())[:12]
                        if not group_name:
                            cur.execute("SELECT name FROM app_users WHERE id = ANY(%s)", (dm_members + new_members,))
                            names = [r[0] for r in cur.fetchall()]
                            group_name = ', '.join(names[:3]) if names else 'Группа'
                        cur.execute(
                            "INSERT INTO sa_chats (id, type, name) VALUES (%s, 'group', %s)",
                            (target_id, group_name)
                        )
                        for mid in set(dm_members + new_members + [user_id]):
                            cur.execute(
                                "INSERT INTO sa_chat_members (chat_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                                (target_id, mid)
                            )
                        cur.execute(
                            "INSERT INTO sa_messages (chat_id, user_id, user_name, type, content) "
                            "VALUES (%s, %s, %s, 'system', %s)",
                            (target_id, user_id, user_name, 'Создана группа')
                        )
                        conn.commit()
                        return {'statusCode': 200, 'headers': headers,
                                'body': json.dumps({'ok': True, 'chat_id': target_id, 'converted': True})}
                    cur.execute("SELECT id, type FROM sa_chats WHERE id = %s", (src_chat_id,))
                    chat_row = cur.fetchone()
                    if not chat_row:
                        cur.execute("INSERT INTO sa_chats (id, type) VALUES (%s, 'group') ON CONFLICT DO NOTHING", (src_chat_id,))
                    elif chat_row[1] != 'group':
                        cur.execute("UPDATE sa_chats SET type='group' WHERE id=%s", (src_chat_id,))
                    added = 0
                    for mid in new_members:
                        cur.execute(
                            "INSERT INTO sa_chat_members (chat_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                            (src_chat_id, mid)
                        )
                        if cur.rowcount > 0:
                            added += 1
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'ok': True, 'chat_id': src_chat_id, 'added': added, 'converted': False})}

                chat_id = body.get('chat_id')
                content = body.get('content', '')
                msg_type = body.get('type', 'text')
                # Опциональные поля для случая, когда чат создаётся впервые (открыт из профиля)
                peer_id_explicit = (body.get('peer_id') or '').strip() or None
                peer_name_explicit = (body.get('peer_name') or '').strip() or None
                peer_avatar_explicit = (body.get('peer_avatar') or '').strip() or None
                if not chat_id:
                    conn.commit()
                    return {'statusCode': 400, 'headers': headers,
                            'body': json.dumps({'error': 'chat_id required'})}

                # Создаём чат, при наличии — сохраняем имя/аватар собеседника
                if peer_name_explicit or peer_avatar_explicit:
                    cur.execute(
                        "INSERT INTO sa_chats (id, type, name, avatar) VALUES (%s, 'personal', %s, %s) "
                        "ON CONFLICT (id) DO UPDATE SET "
                        "name = COALESCE(NULLIF(sa_chats.name, ''), EXCLUDED.name), "
                        "avatar = COALESCE(NULLIF(sa_chats.avatar, ''), EXCLUDED.avatar)",
                        (chat_id, peer_name_explicit, peer_avatar_explicit)
                    )
                else:
                    cur.execute(
                        "INSERT INTO sa_chats (id, type) VALUES (%s, 'personal') ON CONFLICT DO NOTHING",
                        (chat_id,)
                    )
                cur.execute(
                    "INSERT INTO sa_chat_members (chat_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    (chat_id, user_id)
                )
                # Явно добавляем собеседника (если фронт передал peer_id)
                if peer_id_explicit and peer_id_explicit != user_id:
                    cur.execute(
                        "INSERT INTO sa_chat_members (chat_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                        (chat_id, peer_id_explicit)
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
            # Сидовые/системные сообщества скрыты из выдачи — оставляем только реальные пользовательские

            if method == 'GET':
                action = params.get('action', 'list')

                if action == 'list':
                    cur.execute(
                        "SELECT c.id, c.name, c.description, c.type, c.category, c.img, c.creator_id, "
                        "COUNT(DISTINCT CASE WHEN cm.role != 'left' THEN cm.user_id END) as member_count, "
                        "MAX(CASE WHEN cm.user_id = %s AND cm.role != 'left' THEN 1 ELSE 0 END) as is_member, "
                        "MAX(CASE WHEN cm.user_id = %s THEN cm.role ELSE NULL END) as my_role "
                        "FROM communities c "
                        "LEFT JOIN community_members cm ON cm.community_id = c.id "
                        "WHERE c.creator_id <> 'system' AND COALESCE(c.is_hidden, FALSE) = FALSE "
                        "GROUP BY c.id, c.name, c.description, c.type, c.category, c.img, c.creator_id "
                        "ORDER BY c.created_at DESC",
                        (user_id, user_id)
                    )
                    rows = cur.fetchall()
                    communities = [
                        {'id': r[0], 'name': r[1], 'description': r[2], 'type': r[3],
                         'category': r[4], 'img': r[5], 'creator_id': r[6],
                         'members': r[7], 'joined': bool(r[8]),
                         'my_role': r[9] or '',
                         'is_admin': (r[6] == user_id) or (r[9] in ('owner', 'admin'))}
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
                        "u.online_at > NOW() - INTERVAL '30 seconds' as online, "
                        "COALESCE(cm.can_invite, FALSE), COALESCE(cm.can_pin, FALSE), "
                        "COALESCE(cm.can_remove_messages, FALSE), COALESCE(cm.can_ban, FALSE), "
                        "COALESCE(cm.can_change_info, FALSE), COALESCE(cm.can_add_admins, FALSE), "
                        "cm.custom_title "
                        "FROM community_members cm "
                        "LEFT JOIN sa_users u ON u.id = cm.user_id "
                        "WHERE cm.community_id = %s AND cm.role != 'left' "
                        "ORDER BY CASE cm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, cm.joined_at ASC",
                        (com_id,)
                    )
                    rows = cur.fetchall()
                    members = [{
                        'id': r[0], 'name': r[1], 'role': r[2], 'online': bool(r[3]),
                        'can_invite': bool(r[4]), 'can_pin': bool(r[5]),
                        'can_remove_messages': bool(r[6]), 'can_ban': bool(r[7]),
                        'can_change_info': bool(r[8]), 'can_add_admins': bool(r[9]),
                        'custom_title': r[10] or '',
                    } for r in rows]
                    # Список забаненных (для админов это нужно)
                    cur.execute(
                        "SELECT user_id, user_name, banned_at, reason FROM community_bans WHERE community_id = %s "
                        "ORDER BY banned_at DESC",
                        (com_id,)
                    )
                    bans = [{'id': b[0], 'name': b[1], 'banned_at': b[2].isoformat() if b[2] else None, 'reason': b[3] or ''} for b in cur.fetchall()]
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'members': members, 'banned': bans})}

            elif method == 'POST':
                body = json.loads(event.get('body') or '{}')
                post_action = body.get('action')

                if post_action == 'join':
                    com_id = body.get('community_id')
                    cur.execute("SELECT type, name FROM communities WHERE id = %s AND COALESCE(is_hidden, FALSE) = FALSE", (com_id,))
                    row = cur.fetchone()
                    if not row:
                        conn.commit()
                        return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'not found'})}
                    com_type = row[0]
                    com_name_for_chat = row[1]

                    if com_type == 'closed':
                        cur.execute(
                            "INSERT INTO community_join_requests (community_id, user_id, user_name) "
                            "VALUES (%s, %s, %s) "
                            "ON CONFLICT (community_id, user_id) DO UPDATE SET status = 'pending', created_at = NOW(), decided_at = NULL, decided_by = NULL",
                            (com_id, user_id, user_name)
                        )
                        conn.commit()
                        return {'statusCode': 200, 'headers': headers,
                                'body': json.dumps({'ok': True, 'joined': False, 'pending': True})}

                    cur.execute(
                        "INSERT INTO community_members (community_id, user_id, user_name) VALUES (%s, %s, %s) "
                        "ON CONFLICT DO NOTHING",
                        (com_id, user_id, user_name)
                    )
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

                elif post_action == 'list_requests':
                    com_id = body.get('community_id')
                    if not com_id:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'community_id required'})}
                    cur.execute("SELECT creator_id FROM communities WHERE id = %s", (com_id,))
                    c_row = cur.fetchone()
                    if not c_row or c_row[0] != user_id:
                        conn.commit()
                        return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'forbidden'})}
                    cur.execute(
                        "SELECT r.id, r.user_id, r.user_name, r.created_at, "
                        "COALESCE(au.avatar, '') "
                        "FROM community_join_requests r "
                        "LEFT JOIN app_users au ON au.id = r.user_id "
                        "WHERE r.community_id = %s AND r.status = 'pending' "
                        "ORDER BY r.created_at ASC",
                        (com_id,)
                    )
                    rows = cur.fetchall()
                    requests = [{'id': r[0], 'user_id': r[1], 'user_name': r[2],
                                 'created_at': r[3].isoformat() if r[3] else None,
                                 'avatar': r[4]} for r in rows]
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'requests': requests})}

                elif post_action == 'approve_request' or post_action == 'reject_request':
                    com_id = body.get('community_id')
                    target_user = body.get('user_id')
                    if not com_id or not target_user:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'community_id and user_id required'})}
                    cur.execute("SELECT creator_id, name FROM communities WHERE id = %s", (com_id,))
                    c_row = cur.fetchone()
                    if not c_row or c_row[0] != user_id:
                        conn.commit()
                        return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'forbidden'})}
                    com_name_for_chat = c_row[1]

                    new_status = 'approved' if post_action == 'approve_request' else 'rejected'
                    cur.execute(
                        "UPDATE community_join_requests SET status = %s, decided_at = NOW(), decided_by = %s "
                        "WHERE community_id = %s AND user_id = %s AND status = 'pending' "
                        "RETURNING user_name",
                        (new_status, user_id, com_id, target_user)
                    )
                    upd = cur.fetchone()
                    if not upd:
                        conn.commit()
                        return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'request not found'})}

                    if new_status == 'approved':
                        target_name = upd[0]
                        cur.execute(
                            "INSERT INTO community_members (community_id, user_id, user_name) VALUES (%s, %s, %s) "
                            "ON CONFLICT DO NOTHING",
                            (com_id, target_user, target_name)
                        )
                        cur.execute(
                            "INSERT INTO sa_chats (id, type, name) VALUES (%s, 'group', %s) "
                            "ON CONFLICT (id) DO NOTHING",
                            (com_id, com_name_for_chat)
                        )
                        cur.execute(
                            "INSERT INTO sa_chat_members (chat_id, user_id) VALUES (%s, %s) "
                            "ON CONFLICT DO NOTHING",
                            (com_id, target_user)
                        )
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'ok': True, 'status': new_status})}

                elif post_action == 'leave':
                    com_id = body.get('community_id')
                    cur.execute(
                        "UPDATE community_members SET role = 'left' WHERE community_id = %s AND user_id = %s",
                        (com_id, user_id)
                    )
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True, 'joined': False})}

                elif post_action == 'delete':
                    com_id = body.get('community_id')
                    if not com_id:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers,
                                'body': json.dumps({'error': 'community_id required'})}
                    # Проверяем, что текущий пользователь — создатель
                    cur.execute("SELECT creator_id FROM communities WHERE id = %s", (com_id,))
                    row = cur.fetchone()
                    if not row:
                        conn.commit()
                        return {'statusCode': 404, 'headers': headers,
                                'body': json.dumps({'error': 'not found'})}
                    if row[0] != user_id:
                        conn.commit()
                        return {'statusCode': 403, 'headers': headers,
                                'body': json.dumps({'error': 'only creator can delete'})}
                    # Мягкое удаление: скрываем сообщество, помечаем имя, прячем чат у всех участников
                    cur.execute(
                        "UPDATE communities SET creator_id = 'system', is_hidden = TRUE, "
                        "name = CASE WHEN name LIKE '[Удалено]%%' THEN name ELSE '[Удалено] ' || name END "
                        "WHERE id = %s",
                        (com_id,)
                    )
                    cur.execute(
                        "UPDATE community_members SET role = 'left' WHERE community_id = %s",
                        (com_id,)
                    )
                    # Прячем сам групповой чат сообщества — фронт фильтрует чаты по name != '__merged__'
                    cur.execute(
                        "UPDATE sa_chats SET name = '__merged__' WHERE id = %s",
                        (com_id,)
                    )
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'ok': True, 'deleted': True})}

                elif post_action == 'invite':
                    com_id = body.get('community_id')
                    invites = body.get('user_ids') or []
                    if not com_id or not isinstance(invites, list) or not invites:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers,
                                'body': json.dumps({'error': 'community_id and user_ids required'})}
                    cur.execute("SELECT creator_id, type FROM communities WHERE id = %s AND is_hidden = FALSE", (com_id,))
                    row = cur.fetchone()
                    if not row:
                        conn.commit()
                        return {'statusCode': 404, 'headers': headers,
                                'body': json.dumps({'error': 'not found'})}
                    creator_id, com_type = row[0], row[1]
                    # Проверка прав: для закрытых групп — только админ/owner или участник с can_invite.
                    # Для открытых — любой участник может пригласить.
                    cur.execute(
                        "SELECT role, COALESCE(can_invite, TRUE) FROM community_members "
                        "WHERE community_id = %s AND user_id = %s",
                        (com_id, user_id)
                    )
                    me = cur.fetchone()
                    is_owner = creator_id == user_id or (me and me[0] == 'owner')
                    is_admin = is_owner or (me and me[0] == 'admin')
                    can_invite = is_admin or (me and me[1])
                    if com_type == 'closed' and not is_admin:
                        conn.commit()
                        return {'statusCode': 403, 'headers': headers,
                                'body': json.dumps({'error': 'only admin can invite to closed group'})}
                    if not can_invite:
                        conn.commit()
                        return {'statusCode': 403, 'headers': headers,
                                'body': json.dumps({'error': 'no invite permission'})}
                    added = 0
                    for uid in invites[:50]:
                        if not uid or not isinstance(uid, str):
                            continue
                        cur.execute(
                            "SELECT name FROM app_users WHERE id = %s",
                            (uid,)
                        )
                        u_row = cur.fetchone()
                        u_name = u_row[0] if u_row else 'Пользователь'
                        cur.execute(
                            "INSERT INTO community_members (community_id, user_id, user_name) "
                            "VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                            (com_id, uid, u_name)
                        )
                        cur.execute(
                            "INSERT INTO sa_chat_members (chat_id, user_id) "
                            "VALUES (%s, %s) ON CONFLICT DO NOTHING",
                            (com_id, uid)
                        )
                        added += 1
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'ok': True, 'added': added})}

                elif post_action == 'update':
                    com_id = body.get('community_id')
                    if not com_id:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers,
                                'body': json.dumps({'error': 'community_id required'})}
                    cur.execute("SELECT creator_id FROM communities WHERE id = %s", (com_id,))
                    row = cur.fetchone()
                    if not row:
                        conn.commit()
                        return {'statusCode': 404, 'headers': headers,
                                'body': json.dumps({'error': 'not found'})}
                    if row[0] != user_id:
                        conn.commit()
                        return {'statusCode': 403, 'headers': headers,
                                'body': json.dumps({'error': 'only creator can edit'})}

                    updates = []
                    values = []
                    new_name = body.get('name')
                    if new_name is not None:
                        new_name = new_name.strip()[:80]
                        if not new_name:
                            conn.commit()
                            return {'statusCode': 400, 'headers': headers,
                                    'body': json.dumps({'error': 'name required'})}
                        updates.append("name = %s")
                        values.append(new_name)
                    if 'description' in body:
                        updates.append("description = %s")
                        values.append((body.get('description') or '').strip()[:500])
                    if 'type' in body:
                        new_type = body.get('type')
                        if new_type in ('open', 'closed'):
                            updates.append("type = %s")
                            values.append(new_type)
                    if 'category' in body:
                        updates.append("category = %s")
                        values.append((body.get('category') or 'Другое').strip()[:40])
                    if 'img' in body:
                        new_img = body.get('img')
                        # Поддержка base64-загрузки в S3
                        if new_img and isinstance(new_img, str) and new_img.startswith('data:'):
                            try:
                                header_b64, b64data = new_img.split(',', 1)
                                content_type_part = header_b64.split(';')[0].replace('data:', '') or 'image/png'
                                ext = content_type_part.split('/')[-1] or 'png'
                                if ext == 'jpeg':
                                    ext = 'jpg'
                                file_bytes = base64.b64decode(b64data)
                                s3 = boto3.client(
                                    's3',
                                    endpoint_url='https://bucket.poehali.dev',
                                    aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                                    aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
                                )
                                key = f"communities/{com_id}/cover_{int(time.time())}.{ext}"
                                s3.put_object(Bucket='files', Key=key, Body=file_bytes,
                                              ContentType=content_type_part)
                                new_img = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
                            except Exception as _e:
                                conn.commit()
                                return {'statusCode': 500, 'headers': headers,
                                        'body': json.dumps({'error': 'upload failed'})}
                        updates.append("img = %s")
                        values.append(new_img or '')

                    if not updates:
                        conn.commit()
                        return {'statusCode': 200, 'headers': headers,
                                'body': json.dumps({'ok': True, 'updated': False})}

                    values.append(com_id)
                    cur.execute(f"UPDATE communities SET {', '.join(updates)} WHERE id = %s", values)
                    # Синхронизируем имя в чате
                    if new_name:
                        cur.execute("UPDATE sa_chats SET name = %s WHERE id = %s", (new_name, com_id))
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'ok': True, 'updated': True})}

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
                        "INSERT INTO community_members "
                        "(community_id, user_id, user_name, role, "
                        "can_invite, can_pin, can_remove_messages, can_ban, can_change_info, can_add_admins) "
                        "VALUES (%s, %s, %s, 'owner', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)",
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

                elif post_action == 'create_invite':
                    com_id = body.get('community_id')
                    if not com_id:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers,
                                'body': json.dumps({'error': 'community_id required'})}
                    cur.execute("SELECT creator_id FROM communities WHERE id = %s AND is_hidden = FALSE", (com_id,))
                    row = cur.fetchone()
                    if not row:
                        conn.commit()
                        return {'statusCode': 404, 'headers': headers,
                                'body': json.dumps({'error': 'community not found'})}
                    # Любой админ может создать ссылку. Сейчас admin = creator + role='admin'
                    cur.execute(
                        "SELECT role FROM community_members WHERE community_id = %s AND user_id = %s",
                        (com_id, user_id)
                    )
                    mrow = cur.fetchone()
                    is_admin = (row[0] == user_id) or (mrow and mrow[0] == 'admin')
                    if not is_admin:
                        conn.commit()
                        return {'statusCode': 403, 'headers': headers,
                                'body': json.dumps({'error': 'only admin'})}
                    token = _uuid.uuid4().hex[:12]
                    cur.execute(
                        "INSERT INTO community_invites (token, community_id, created_by) VALUES (%s, %s, %s)",
                        (token, com_id, user_id)
                    )
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'ok': True, 'token': token, 'community_id': com_id})}

                elif post_action == 'join_by_invite':
                    token = (body.get('token') or '').strip()
                    if not token:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers,
                                'body': json.dumps({'error': 'token required'})}
                    if user_id in ('anon', '', None):
                        conn.commit()
                        return {'statusCode': 401, 'headers': headers,
                                'body': json.dumps({'error': 'login required'})}
                    cur.execute(
                        "SELECT community_id, revoked FROM community_invites WHERE token = %s",
                        (token,)
                    )
                    inv = cur.fetchone()
                    if not inv or inv[1]:
                        conn.commit()
                        return {'statusCode': 404, 'headers': headers,
                                'body': json.dumps({'error': 'invite invalid'})}
                    com_id = inv[0]
                    cur.execute("SELECT id, name FROM communities WHERE id = %s AND is_hidden = FALSE", (com_id,))
                    com = cur.fetchone()
                    if not com:
                        conn.commit()
                        return {'statusCode': 404, 'headers': headers,
                                'body': json.dumps({'error': 'community not found'})}
                    # Добавляем (или восстанавливаем) участника независимо от open/closed
                    cur.execute(
                        "INSERT INTO community_members (community_id, user_id, user_name, role) "
                        "VALUES (%s, %s, %s, 'member') "
                        "ON CONFLICT (community_id, user_id) DO UPDATE SET role = "
                        "CASE WHEN community_members.role = 'left' THEN 'member' ELSE community_members.role END, "
                        "user_name = EXCLUDED.user_name",
                        (com_id, user_id, user_name)
                    )
                    cur.execute(
                        "INSERT INTO sa_chat_members (chat_id, user_id) VALUES (%s, %s) "
                        "ON CONFLICT DO NOTHING",
                        (com_id, user_id)
                    )
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'ok': True, 'community_id': com_id, 'name': com[1]})}

                elif post_action == 'poll_create':
                    com_id = body.get('community_id')
                    question = (body.get('question') or '').strip()[:300]
                    options = body.get('options') or []
                    is_multi = bool(body.get('is_multi'))
                    is_anonymous = bool(body.get('is_anonymous'))
                    if not com_id or not question or len(options) < 2:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers,
                                'body': json.dumps({'error': 'community_id, question and >=2 options required'})}
                    cur.execute("SELECT creator_id FROM communities WHERE id = %s AND is_hidden = FALSE", (com_id,))
                    row = cur.fetchone()
                    if not row:
                        conn.commit()
                        return {'statusCode': 404, 'headers': headers,
                                'body': json.dumps({'error': 'community not found'})}
                    cur.execute(
                        "SELECT role FROM community_members WHERE community_id = %s AND user_id = %s",
                        (com_id, user_id)
                    )
                    mrow = cur.fetchone()
                    is_admin = (row[0] == user_id) or (mrow and mrow[0] in ('owner', 'admin'))
                    if not is_admin:
                        conn.commit()
                        return {'statusCode': 403, 'headers': headers,
                                'body': json.dumps({'error': 'only admin can create polls'})}
                    cur.execute(
                        "INSERT INTO community_polls (community_id, author_id, author_name, question, is_multi, is_anonymous) "
                        "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                        (com_id, user_id, user_name, question, is_multi, is_anonymous)
                    )
                    poll_id = cur.fetchone()[0]
                    for i, opt in enumerate(options[:10]):
                        t = (str(opt) or '').strip()[:120]
                        if not t:
                            continue
                        cur.execute(
                            "INSERT INTO community_poll_options (poll_id, text, position) VALUES (%s, %s, %s)",
                            (poll_id, t, i)
                        )
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'ok': True, 'poll_id': poll_id})}

                elif post_action == 'poll_vote':
                    poll_id = body.get('poll_id')
                    option_ids = body.get('option_ids') or []
                    if not poll_id or not option_ids:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers,
                                'body': json.dumps({'error': 'poll_id and option_ids required'})}
                    if user_id in ('anon', '', None):
                        conn.commit()
                        return {'statusCode': 401, 'headers': headers,
                                'body': json.dumps({'error': 'login required'})}
                    cur.execute("SELECT is_multi, is_closed FROM community_polls WHERE id = %s", (poll_id,))
                    p = cur.fetchone()
                    if not p:
                        conn.commit()
                        return {'statusCode': 404, 'headers': headers,
                                'body': json.dumps({'error': 'poll not found'})}
                    if p[1]:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers,
                                'body': json.dumps({'error': 'poll closed'})}
                    if not p[0]:
                        option_ids = option_ids[:1]
                    # Деактивируем все прошлые голоса этого пользователя
                    cur.execute(
                        "UPDATE community_poll_votes SET active = FALSE WHERE poll_id = %s AND user_id = %s",
                        (poll_id, user_id)
                    )
                    # Активируем выбранные (вставляем новые или реактивируем существующие)
                    for oid in option_ids:
                        cur.execute(
                            "INSERT INTO community_poll_votes (poll_id, option_id, user_id, user_name, active) "
                            "VALUES (%s, %s, %s, %s, TRUE) "
                            "ON CONFLICT (poll_id, option_id, user_id) DO UPDATE "
                            "SET active = TRUE, user_name = EXCLUDED.user_name",
                            (poll_id, int(oid), user_id, user_name)
                        )
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'ok': True})}

                elif post_action == 'poll_close':
                    poll_id = body.get('poll_id')
                    if not poll_id:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers,
                                'body': json.dumps({'error': 'poll_id required'})}
                    cur.execute(
                        "SELECT p.community_id, p.author_id, c.creator_id "
                        "FROM community_polls p JOIN communities c ON c.id = p.community_id "
                        "WHERE p.id = %s",
                        (poll_id,)
                    )
                    row = cur.fetchone()
                    if not row:
                        conn.commit()
                        return {'statusCode': 404, 'headers': headers,
                                'body': json.dumps({'error': 'poll not found'})}
                    cur.execute(
                        "SELECT role FROM community_members WHERE community_id = %s AND user_id = %s",
                        (row[0], user_id)
                    )
                    mrow = cur.fetchone()
                    is_admin = (row[2] == user_id) or (mrow and mrow[0] == 'admin') or (row[1] == user_id)
                    if not is_admin:
                        conn.commit()
                        return {'statusCode': 403, 'headers': headers,
                                'body': json.dumps({'error': 'forbidden'})}
                    cur.execute("UPDATE community_polls SET is_closed = TRUE WHERE id = %s", (poll_id,))
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'ok': True})}

                elif post_action == 'poll_list':
                    com_id = body.get('community_id')
                    if not com_id:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers,
                                'body': json.dumps({'error': 'community_id required'})}
                    cur.execute(
                        "SELECT id, author_id, author_name, question, is_multi, is_anonymous, is_closed, created_at "
                        "FROM community_polls WHERE community_id = %s ORDER BY created_at DESC LIMIT 50",
                        (com_id,)
                    )
                    polls = []
                    for r in cur.fetchall():
                        pid = r[0]
                        cur.execute(
                            "SELECT id, text, position FROM community_poll_options WHERE poll_id = %s ORDER BY position",
                            (pid,)
                        )
                        opts = [{'id': o[0], 'text': o[1]} for o in cur.fetchall()]
                        cur.execute(
                            "SELECT option_id, COUNT(*) FROM community_poll_votes "
                            "WHERE poll_id = %s AND active = TRUE GROUP BY option_id",
                            (pid,)
                        )
                        counts = {int(c[0]): int(c[1]) for c in cur.fetchall()}
                        cur.execute(
                            "SELECT option_id FROM community_poll_votes "
                            "WHERE poll_id = %s AND user_id = %s AND active = TRUE",
                            (pid, user_id)
                        )
                        my_votes = [int(v[0]) for v in cur.fetchall()]
                        total = sum(counts.values())
                        polls.append({
                            'id': pid, 'author_id': r[1], 'author_name': r[2],
                            'question': r[3], 'is_multi': r[4], 'is_anonymous': r[5], 'is_closed': r[6],
                            'created_at': r[7].isoformat() if r[7] else None,
                            'options': [{'id': o['id'], 'text': o['text'], 'votes': counts.get(o['id'], 0)} for o in opts],
                            'total_votes': total,
                            'my_votes': my_votes,
                        })
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'polls': polls})}

                elif post_action == 'promote':
                    com_id = body.get('community_id')
                    target_id = body.get('user_id')
                    perms = body.get('permissions') or {}
                    title = (body.get('custom_title') or '').strip()[:32]
                    if not com_id or not target_id:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers,
                                'body': json.dumps({'error': 'community_id and user_id required'})}
                    cur.execute("SELECT creator_id FROM communities WHERE id = %s AND is_hidden = FALSE", (com_id,))
                    crow = cur.fetchone()
                    if not crow:
                        conn.commit()
                        return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'community not found'})}
                    cur.execute("SELECT role, COALESCE(can_add_admins, FALSE) FROM community_members WHERE community_id = %s AND user_id = %s",
                                (com_id, user_id))
                    me = cur.fetchone()
                    is_owner = crow[0] == user_id or (me and me[0] == 'owner')
                    can_add = is_owner or (me and (me[1] or me[0] == 'admin'))
                    if not can_add:
                        conn.commit()
                        return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'forbidden'})}
                    # Нельзя понижать owner-а
                    cur.execute("SELECT role FROM community_members WHERE community_id = %s AND user_id = %s",
                                (com_id, target_id))
                    trow = cur.fetchone()
                    if not trow or trow[0] == 'left':
                        conn.commit()
                        return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'target not member'})}
                    if trow[0] == 'owner':
                        conn.commit()
                        return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'cannot modify owner'})}
                    cur.execute(
                        "UPDATE community_members SET role = 'admin', "
                        "can_invite = %s, can_pin = %s, can_remove_messages = %s, can_ban = %s, "
                        "can_change_info = %s, can_add_admins = %s, custom_title = %s, "
                        "promoted_by = %s, promoted_at = NOW() "
                        "WHERE community_id = %s AND user_id = %s",
                        (
                            bool(perms.get('can_invite', True)), bool(perms.get('can_pin', True)),
                            bool(perms.get('can_remove_messages', True)), bool(perms.get('can_ban', True)),
                            bool(perms.get('can_change_info', False)), bool(perms.get('can_add_admins', False)),
                            title or None, user_id, com_id, target_id,
                        )
                    )
                    cur.execute(
                        "INSERT INTO community_admin_log (community_id, actor_id, actor_name, action, target_id, payload) "
                        "VALUES (%s, %s, %s, 'promote', %s, %s)",
                        (com_id, user_id, user_name, target_id, json.dumps(perms))
                    )
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

                elif post_action == 'demote':
                    com_id = body.get('community_id')
                    target_id = body.get('user_id')
                    if not com_id or not target_id:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'community_id and user_id required'})}
                    cur.execute("SELECT creator_id FROM communities WHERE id = %s AND is_hidden = FALSE", (com_id,))
                    crow = cur.fetchone()
                    if not crow:
                        conn.commit()
                        return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'community not found'})}
                    cur.execute("SELECT role, COALESCE(can_add_admins, FALSE) FROM community_members WHERE community_id = %s AND user_id = %s",
                                (com_id, user_id))
                    me = cur.fetchone()
                    is_owner = crow[0] == user_id or (me and me[0] == 'owner')
                    if not is_owner and not (me and me[1]):
                        conn.commit()
                        return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'forbidden'})}
                    cur.execute("SELECT role FROM community_members WHERE community_id = %s AND user_id = %s",
                                (com_id, target_id))
                    trow = cur.fetchone()
                    if not trow:
                        conn.commit()
                        return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'target not member'})}
                    if trow[0] == 'owner':
                        conn.commit()
                        return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'cannot demote owner'})}
                    cur.execute(
                        "UPDATE community_members SET role = 'member', "
                        "can_invite = TRUE, can_pin = FALSE, can_remove_messages = FALSE, can_ban = FALSE, "
                        "can_change_info = FALSE, can_add_admins = FALSE, custom_title = NULL "
                        "WHERE community_id = %s AND user_id = %s",
                        (com_id, target_id)
                    )
                    cur.execute(
                        "INSERT INTO community_admin_log (community_id, actor_id, actor_name, action, target_id) "
                        "VALUES (%s, %s, %s, 'demote', %s)",
                        (com_id, user_id, user_name, target_id)
                    )
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

                elif post_action == 'kick' or post_action == 'ban':
                    com_id = body.get('community_id')
                    target_id = body.get('user_id')
                    reason = (body.get('reason') or '').strip()[:200]
                    if not com_id or not target_id:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'community_id and user_id required'})}
                    cur.execute("SELECT creator_id FROM communities WHERE id = %s AND is_hidden = FALSE", (com_id,))
                    crow = cur.fetchone()
                    if not crow:
                        conn.commit()
                        return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'community not found'})}
                    cur.execute("SELECT role, COALESCE(can_ban, FALSE) FROM community_members WHERE community_id = %s AND user_id = %s",
                                (com_id, user_id))
                    me = cur.fetchone()
                    is_owner = crow[0] == user_id or (me and me[0] == 'owner')
                    can_ban = is_owner or (me and (me[1] or me[0] == 'admin'))
                    if not can_ban:
                        conn.commit()
                        return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'forbidden'})}
                    cur.execute("SELECT role, user_name FROM community_members WHERE community_id = %s AND user_id = %s",
                                (com_id, target_id))
                    trow = cur.fetchone()
                    if not trow:
                        conn.commit()
                        return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'target not member'})}
                    if trow[0] == 'owner':
                        conn.commit()
                        return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'cannot ban owner'})}
                    target_name = trow[1] or ''
                    # Помечаем как 'left' (мы не удаляем — это запрещено)
                    cur.execute("UPDATE community_members SET role = 'left' WHERE community_id = %s AND user_id = %s",
                                (com_id, target_id))
                    cur.execute("UPDATE sa_chat_members SET user_id = user_id WHERE chat_id = %s AND user_id = %s",
                                (com_id, target_id))
                    if post_action == 'ban':
                        cur.execute(
                            "INSERT INTO community_bans (community_id, user_id, user_name, banned_by, reason) "
                            "VALUES (%s, %s, %s, %s, %s) "
                            "ON CONFLICT (community_id, user_id) DO UPDATE "
                            "SET banned_by = EXCLUDED.banned_by, banned_at = NOW(), reason = EXCLUDED.reason",
                            (com_id, target_id, target_name, user_id, reason)
                        )
                    cur.execute(
                        "INSERT INTO community_admin_log (community_id, actor_id, actor_name, action, target_id, target_name, payload) "
                        "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                        (com_id, user_id, user_name, post_action, target_id, target_name, reason)
                    )
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

                elif post_action == 'unban':
                    com_id = body.get('community_id')
                    target_id = body.get('user_id')
                    if not com_id or not target_id:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'community_id and user_id required'})}
                    cur.execute("SELECT creator_id FROM communities WHERE id = %s AND is_hidden = FALSE", (com_id,))
                    crow = cur.fetchone()
                    if not crow:
                        conn.commit()
                        return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'community not found'})}
                    cur.execute("SELECT role, COALESCE(can_ban, FALSE) FROM community_members WHERE community_id = %s AND user_id = %s",
                                (com_id, user_id))
                    me = cur.fetchone()
                    is_owner = crow[0] == user_id or (me and me[0] == 'owner')
                    if not is_owner and not (me and me[1]):
                        conn.commit()
                        return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'forbidden'})}
                    # Мы не можем DELETE — пометим banned_by пустым (фактически "снять" — добавим маркер через UPDATE)
                    cur.execute(
                        "UPDATE community_bans SET banned_by = '__unbanned__', reason = NULL WHERE community_id = %s AND user_id = %s",
                        (com_id, target_id)
                    )
                    cur.execute(
                        "INSERT INTO community_admin_log (community_id, actor_id, actor_name, action, target_id) "
                        "VALUES (%s, %s, %s, 'unban', %s)",
                        (com_id, user_id, user_name, target_id)
                    )
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

                elif post_action == 'transfer_ownership':
                    com_id = body.get('community_id')
                    target_id = body.get('user_id')
                    if not com_id or not target_id:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'community_id and user_id required'})}
                    cur.execute("SELECT creator_id FROM communities WHERE id = %s AND is_hidden = FALSE", (com_id,))
                    crow = cur.fetchone()
                    if not crow:
                        conn.commit()
                        return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'community not found'})}
                    if crow[0] != user_id:
                        conn.commit()
                        return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'only owner'})}
                    cur.execute("SELECT role FROM community_members WHERE community_id = %s AND user_id = %s",
                                (com_id, target_id))
                    trow = cur.fetchone()
                    if not trow or trow[0] == 'left':
                        conn.commit()
                        return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'target not member'})}
                    # Передаём владельца
                    cur.execute("UPDATE communities SET creator_id = %s WHERE id = %s", (target_id, com_id))
                    cur.execute(
                        "UPDATE community_members SET role = 'owner', can_invite=TRUE, can_pin=TRUE, "
                        "can_remove_messages=TRUE, can_ban=TRUE, can_change_info=TRUE, can_add_admins=TRUE "
                        "WHERE community_id = %s AND user_id = %s",
                        (com_id, target_id)
                    )
                    cur.execute(
                        "UPDATE community_members SET role = 'admin' "
                        "WHERE community_id = %s AND user_id = %s",
                        (com_id, user_id)
                    )
                    cur.execute(
                        "INSERT INTO community_admin_log (community_id, actor_id, actor_name, action, target_id) "
                        "VALUES (%s, %s, %s, 'transfer_ownership', %s)",
                        (com_id, user_id, user_name, target_id)
                    )
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

                elif post_action == 'pin_message':
                    com_id = body.get('community_id')
                    msg_id = body.get('message_id')
                    if not com_id or not msg_id:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'community_id and message_id required'})}
                    cur.execute("SELECT creator_id FROM communities WHERE id = %s AND is_hidden = FALSE", (com_id,))
                    crow = cur.fetchone()
                    if not crow:
                        conn.commit()
                        return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'community not found'})}
                    cur.execute("SELECT role, COALESCE(can_pin, FALSE) FROM community_members WHERE community_id = %s AND user_id = %s",
                                (com_id, user_id))
                    me = cur.fetchone()
                    if not me or not (me[0] in ('owner', 'admin') or me[1]):
                        conn.commit()
                        return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'forbidden'})}
                    # Сначала снимаем активные пины
                    cur.execute(
                        "UPDATE community_pinned_messages SET active = FALSE WHERE community_id = %s",
                        (com_id,)
                    )
                    cur.execute(
                        "INSERT INTO community_pinned_messages (community_id, message_id, pinned_by, pinned_by_name, active) "
                        "VALUES (%s, %s, %s, %s, TRUE)",
                        (com_id, int(msg_id), user_id, user_name)
                    )
                    cur.execute(
                        "INSERT INTO community_admin_log (community_id, actor_id, actor_name, action, payload) "
                        "VALUES (%s, %s, %s, 'pin_message', %s)",
                        (com_id, user_id, user_name, str(msg_id))
                    )
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

                elif post_action == 'unpin_message':
                    com_id = body.get('community_id')
                    if not com_id:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'community_id required'})}
                    cur.execute("SELECT role, COALESCE(can_pin, FALSE) FROM community_members WHERE community_id = %s AND user_id = %s",
                                (com_id, user_id))
                    me = cur.fetchone()
                    cur.execute("SELECT creator_id FROM communities WHERE id = %s AND is_hidden = FALSE", (com_id,))
                    crow = cur.fetchone()
                    if not crow:
                        conn.commit()
                        return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'community not found'})}
                    is_owner = crow[0] == user_id or (me and me[0] == 'owner')
                    has_admin_role = me and me[0] in ('owner', 'admin')
                    has_pin_perm = me and me[1]
                    if not (is_owner or has_admin_role or has_pin_perm):
                        conn.commit()
                        return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'forbidden'})}
                    cur.execute(
                        "UPDATE community_pinned_messages SET active = FALSE WHERE community_id = %s",
                        (com_id,)
                    )
                    cur.execute(
                        "INSERT INTO community_admin_log (community_id, actor_id, actor_name, action) "
                        "VALUES (%s, %s, %s, 'unpin_message')",
                        (com_id, user_id, user_name)
                    )
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

                elif post_action == 'get_pinned':
                    com_id = body.get('community_id')
                    if not com_id:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'community_id required'})}
                    cur.execute(
                        "SELECT p.message_id, p.pinned_by, p.pinned_by_name, p.pinned_at, "
                        "m.user_id, m.user_name, m.type, m.content "
                        "FROM community_pinned_messages p "
                        "LEFT JOIN sa_messages m ON m.id = p.message_id "
                        "WHERE p.community_id = %s AND p.active = TRUE "
                        "ORDER BY p.pinned_at DESC LIMIT 1",
                        (com_id,)
                    )
                    r = cur.fetchone()
                    pinned = None
                    if r:
                        pinned = {
                            'message_id': r[0], 'pinned_by': r[1], 'pinned_by_name': r[2],
                            'pinned_at': r[3].isoformat() if r[3] else None,
                            'author_id': r[4], 'author_name': r[5],
                            'type': r[6] or 'text', 'content': r[7] or '',
                        }
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'pinned': pinned})}

                elif post_action == 'admin_log':
                    com_id = body.get('community_id')
                    if not com_id:
                        conn.commit()
                        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'community_id required'})}
                    cur.execute("SELECT role FROM community_members WHERE community_id = %s AND user_id = %s",
                                (com_id, user_id))
                    me = cur.fetchone()
                    if not me or me[0] not in ('owner', 'admin'):
                        conn.commit()
                        return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'forbidden'})}
                    cur.execute(
                        "SELECT actor_id, actor_name, action, target_id, target_name, payload, created_at "
                        "FROM community_admin_log WHERE community_id = %s "
                        "ORDER BY created_at DESC LIMIT 100",
                        (com_id,)
                    )
                    items = [{
                        'actor_id': r[0], 'actor_name': r[1], 'action': r[2],
                        'target_id': r[3], 'target_name': r[4], 'payload': r[5] or '',
                        'created_at': r[6].isoformat() if r[6] else None,
                    } for r in cur.fetchall()]
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'items': items})}

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

        # ── TRANSCRIBE MODULE (расшифровка голосовых/видео-сообщений через OpenAI Whisper) ──
        elif module == 'transcribe':
            if method == 'POST':
                body = json.loads(event.get('body') or '{}')
                data_url = body.get('data', '')
                kind = body.get('kind', 'voice')
                if not data_url or ',' not in data_url:
                    conn.commit()
                    return {'statusCode': 400, 'headers': headers,
                            'body': json.dumps({'error': 'data required'})}
                api_key = os.environ.get('OPENAI_API_KEY')
                if not api_key:
                    conn.commit()
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'error': 'Расшифровка не настроена'})}
                header_part, b64data = data_url.split(',', 1)
                mime = header_part.split(';')[0].replace('data:', '') or ('video/webm' if kind == 'video_note' else 'audio/webm')
                ext = 'mp4' if 'mp4' in mime else 'webm'
                file_bytes = base64.b64decode(b64data)

                import requests as _requests
                import io as _io
                files = {'file': (f'audio.{ext}', _io.BytesIO(file_bytes), mime)}
                data = {'model': 'whisper-1', 'language': 'ru'}
                resp = _requests.post(
                    'https://api.openai.com/v1/audio/transcriptions',
                    headers={'Authorization': f'Bearer {api_key}'},
                    files=files,
                    data=data,
                    timeout=25,
                )
                conn.commit()
                if resp.status_code != 200:
                    return {'statusCode': 200, 'headers': headers,
                            'body': json.dumps({'error': 'Не удалось распознать речь'})}
                result = resp.json()
                text = (result.get('text') or '').strip()
                return {'statusCode': 200, 'headers': headers,
                        'body': json.dumps({'text': text})}

        conn.commit()
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'unknown request'})}

    except Exception as e:
        conn.rollback()
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': str(e)})}
    finally:
        cur.close()
        conn.close()