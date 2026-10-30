import json
import base64
from pywebpush import webpush, WebPushException
from py_vapid import Vapid01, Vapid02
from cryptography.hazmat.primitives import serialization


def get_vapid(cur, conn):
    cur.execute("SELECT private_key, public_key FROM push_vapid WHERE id = 1")
    row = cur.fetchone()
    if row:
        return row[0], row[1]
    v = Vapid01()
    v.generate_keys()
    priv = v.private_pem().decode()
    pub_raw = v.public_key.public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
    )
    pub = base64.urlsafe_b64encode(pub_raw).decode().rstrip('=')
    cur.execute(
        "INSERT INTO push_vapid (id, private_key, public_key) VALUES (1, %s, %s) ON CONFLICT (id) DO NOTHING",
        (priv, pub),
    )
    conn.commit()
    cur.execute("SELECT private_key, public_key FROM push_vapid WHERE id = 1")
    row = cur.fetchone()
    return row[0], row[1]


def send_call_push(cur, conn, to_user, data):
    priv, _ = get_vapid(cur, conn)
    vv = Vapid02.from_pem(priv.encode())
    cur.execute("SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = %s", (to_user,))
    subs = cur.fetchall()
    sent = 0
    for endpoint, p256dh, auth in subs:
        try:
            webpush(
                subscription_info={"endpoint": endpoint, "keys": {"p256dh": p256dh, "auth": auth}},
                data=json.dumps(data),
                vapid_private_key=vv,
                vapid_claims={"sub": "mailto:support@look.com.ru"},
                ttl=30,
                headers={"Urgency": "high"},
                timeout=3,
            )
            sent += 1
        except WebPushException as e:
            status = getattr(e.response, 'status_code', None)
            if status in (404, 410):
                cur.execute("DELETE FROM push_subscriptions WHERE endpoint = %s", (endpoint,))
                conn.commit()
        except Exception:
            pass
    return sent
