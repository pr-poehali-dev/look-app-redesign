import json
import os
import urllib.error
import urllib.request

APP_ID = 'db483c9f-ad96-40c5-ae85-a86e3f71b13e'
SITE = 'https://look.com.ru'


def send_push(user_ids, title, message, path='/', extra=None):
    """Пуш через OneSignal по внешнему ID пользователя. Ошибки не прерывают основную логику."""
    key = os.environ.get('ONESIGNAL_REST_API_KEY')
    ids = [str(u) for u in dict.fromkeys(user_ids) if u and str(u) != 'anonymous'][:200]
    if not key or not ids:
        return 0
    payload = {
        'app_id': APP_ID,
        'target_channel': 'push',
        'include_aliases': {'external_id': ids},
        'headings': {'en': title, 'ru': title},
        'contents': {'en': message or ' ', 'ru': message or ' '},
        'url': SITE + path,
    }
    if extra:
        payload.update(extra)
    req = urllib.request.Request(
        'https://api.onesignal.com/notifications?c=push',
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json; charset=utf-8', 'Authorization': f'Key {key}'},
        method='POST',
    )
    try:
        raw = urllib.request.urlopen(req, timeout=4).read() or b'{}'
        res = json.loads(raw)
        print(f'onesignal ok ids={ids} resp={str(res)[:300]}')
        return int(res.get('recipients') or 0) if res.get('id') else 0
    except urllib.error.HTTPError as e:
        print(f'onesignal http {e.code} ids={ids} body={e.read()[:400]}')
        return 0
    except Exception as e:
        print(f'onesignal error: {e}')
        return 0
