import json
import os
import re
import secrets
import hashlib
import psycopg2

HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
}


def make_handle(display_name: str, email: str, taken: set) -> str:
    def slugify(s: str) -> str:
        return re.sub(r'[^a-zA-Z0-9_]', '_', (s or '').strip()).strip('_')

    base = slugify(display_name)
    if not base or len(base) < 2:
        base = slugify((email or '').split('@')[0])
    if not base:
        base = 'user'
    base = base[:20]
    candidate = base
    i = 1
    while candidate.lower() in taken:
        candidate = f'{base}_{i}'
        i += 1
    taken.add(candidate.lower())
    return candidate


def handler(event: dict, context) -> dict:
    """Одноразовый импорт пользователей из Firebase Auth (users.json). Принимает массив users в body, сохраняет firebase_hash/salt и displayName."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': HEADERS, 'body': ''}

    if event.get('httpMethod') != 'POST':
        return {'statusCode': 405, 'headers': HEADERS, 'body': json.dumps({'error': 'Method not allowed'})}

    try:
        body = json.loads(event.get('body') or '{}')
        if not isinstance(body, dict):
            raise ValueError('body must be object')
    except Exception:
        return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'Invalid JSON'})}

    users = body.get('users') or []
    if not isinstance(users, list) or not users:
        return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'users array required'})}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    inserted = 0
    updated = 0
    skipped = 0
    details = []

    try:
        cur.execute("SELECT LOWER(handle) FROM app_users")
        taken_handles = {row[0] for row in cur.fetchall()}

        for u in users:
            uid = u.get('localId')
            email = (u.get('email') or '').strip().lower()
            display_name = (u.get('displayName') or '').strip()
            fb_hash = u.get('passwordHash')
            fb_salt = u.get('salt')
            email_verified = bool(u.get('emailVerified'))

            if not uid or not email or not fb_hash or not fb_salt:
                skipped += 1
                details.append({'email': email, 'status': 'skipped_invalid'})
                continue

            cur.execute("SELECT id FROM app_users WHERE email=%s", (email,))
            existing = cur.fetchone()

            if existing:
                cur.execute(
                    "UPDATE app_users SET firebase_hash=%s, firebase_salt=%s WHERE id=%s",
                    (fb_hash, fb_salt, existing[0])
                )
                updated += 1
                details.append({'email': email, 'status': 'updated', 'id': existing[0]})
            else:
                handle = make_handle(display_name, email, taken_handles)
                name = display_name or handle
                random_hash = hashlib.sha256(secrets.token_bytes(32)).hexdigest()
                token = secrets.token_hex(32)
                try:
                    cur.execute(
                        "INSERT INTO app_users (id, name, handle, email, password_hash, token, email_verified, firebase_hash, firebase_salt) "
                        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                        (uid, name, handle, email, random_hash, token, email_verified, fb_hash, fb_salt)
                    )
                    inserted += 1
                    details.append({'email': email, 'status': 'inserted', 'id': uid, 'handle': handle})
                except Exception as e:
                    conn.rollback()
                    skipped += 1
                    details.append({'email': email, 'status': 'error', 'error': str(e)})
                    continue

        conn.commit()
    finally:
        cur.close()
        conn.close()

    return {
        'statusCode': 200,
        'headers': {**HEADERS, 'Content-Type': 'application/json'},
        'body': json.dumps({
            'ok': True,
            'inserted': inserted,
            'updated': updated,
            'skipped': skipped,
            'total': len(users),
            'details': details,
        }, ensure_ascii=False)
    }