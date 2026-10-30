import base64
import json
import os
from concurrent.futures import ThreadPoolExecutor

import psycopg2
from cryptography.hazmat.primitives import serialization
from py_vapid import Vapid01, Vapid02
from pywebpush import webpush, WebPushException

CONTACT = 'mailto:support@look.com.ru'


def _vapid(cur, conn):
    cur.execute("SELECT private_key, public_key FROM push_vapid WHERE id = 1")
    row = cur.fetchone()
    if row:
        return row[0], row[1]
    v = Vapid01()
    v.generate_keys()
    priv = v.private_pem().decode()
    pub_raw = v.public_key.public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    pub = base64.urlsafe_b64encode(pub_raw).decode().rstrip('=')
    cur.execute(
        "INSERT INTO push_vapid (id, private_key, public_key) VALUES (1, %s, %s) ON CONFLICT (id) DO NOTHING",
        (priv, pub))
    conn.commit()
    cur.execute("SELECT private_key, public_key FROM push_vapid WHERE id = 1")
    row = cur.fetchone()
    return row[0], row[1]


def _log(cur, conn, ids, title, status, response):
    try:
        cur.execute(
            "INSERT INTO push_log (user_ids, title, status, response) VALUES (%s, %s, %s, %s)",
            (','.join(ids)[:1500], str(title)[:200], status, str(response)[:1500]))
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f'push_log error: {e}')


def send_push(user_ids, title, message, path='/', extra=None):
    """Пуш через собственный сервер (Web Push, VAPID). Ошибки не прерывают основную логику."""
    ids = [str(u) for u in dict.fromkeys(user_ids) if u and str(u) != 'anonymous'][:200]
    if not ids:
        return 0
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
    except Exception as e:
        print(f'push db error: {e}')
        return 0
    cur = conn.cursor()
    try:
        priv, _ = _vapid(cur, conn)
        cur.execute("SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id IN %s", (tuple(ids),))
        subs = cur.fetchall()
        if not subs:
            _log(cur, conn, ids, title, 'no_subs', '')
            return 0
        vv = Vapid02.from_pem(priv.encode())
        payload = json.dumps({'type': 'notify', 'title': title, 'body': message or '', 'url': path}, ensure_ascii=False)

        def one(s):
            endpoint, p256dh, auth = s
            try:
                webpush(
                    subscription_info={'endpoint': endpoint, 'keys': {'p256dh': p256dh, 'auth': auth}},
                    data=payload,
                    vapid_private_key=vv,
                    vapid_claims={'sub': CONTACT},
                    ttl=3600,
                    headers={'Urgency': 'high'},
                    timeout=3)
                return endpoint, 1
            except WebPushException as e:
                code = getattr(e.response, 'status_code', None)
                return endpoint, (-1 if code in (404, 410) else 0)
            except Exception:
                return endpoint, 0

        with ThreadPoolExecutor(max_workers=16) as pool:
            results = list(pool.map(one, subs))
        gone = [e for e, r in results if r == -1]
        for e in gone:
            cur.execute("DELETE FROM push_subscriptions WHERE endpoint = %s", (e,))
        if gone:
            conn.commit()
        sent = sum(1 for _, r in results if r == 1)
        _log(cur, conn, ids, title, 'ok', f'sent={sent} total={len(subs)} gone={len(gone)}')
        return sent
    except Exception as e:
        conn.rollback()
        print(f'push error: {e}')
        return 0
    finally:
        cur.close()
        conn.close()
