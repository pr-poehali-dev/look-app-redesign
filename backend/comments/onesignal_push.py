import json
import os
import urllib.error
import urllib.request

APP_ID = 'db483c9f-ad96-40c5-ae85-a86e3f71b13e'
SITE = 'https://look.com.ru'


def _log(ids, title, status, response):
    dsn = os.environ.get('DATABASE_URL')
    if not dsn:
        return
    try:
        import psycopg2
        c = psycopg2.connect(dsn)
        c.autocommit = True
        c.cursor().execute(
            "INSERT INTO push_log (user_ids, title, status, response) VALUES (%s, %s, %s, %s)",
            (','.join(ids), str(title)[:200], status, str(response)[:1500]))
        c.close()
    except Exception as e:
        print(f'push_log error: {e}')


def _diagnose(key, uid):
    try:
        req = urllib.request.Request(
            f'https://api.onesignal.com/apps/{APP_ID}/users/by/external_id/{uid}',
            headers={'Authorization': f'Key {key}'})
        d = json.loads(urllib.request.urlopen(req, timeout=3).read())
        subs = [
            {'type': x.get('type'), 'enabled': x.get('enabled'), 'nt': x.get('notification_types'),
             'token': bool(x.get('token')), 'sdk': x.get('sdk'), 'app_version': x.get('app_version')}
            for x in d.get('subscriptions', [])
        ]
        return subs
    except urllib.error.HTTPError as e:
        return f'diag http {e.code} {e.read()[:200]}'
    except Exception as e:
        return f'diag error {e}'


def send_push(user_ids, title, message, path='/', extra=None):
    """Пуш через OneSignal по внешнему ID пользователя. Ошибки не прерывают основную логику."""
    key = os.environ.get('ONESIGNAL_REST_API_KEY')
    ids = [str(u) for u in dict.fromkeys(user_ids) if u and str(u) != 'anonymous'][:200]
    if not key:
        _log(ids, title, 'no_key', '')
        return 0
    if not ids:
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
        if not res.get('id') and res.get('errors'):
            res = {'result': res, 'subs': {u: _diagnose(key, u) for u in ids[:2]}}
        _log(ids, title, 'ok', res)
        return int(res.get('recipients') or 0) if res.get('id') else 0
    except urllib.error.HTTPError as e:
        _log(ids, title, f'http_{e.code}', e.read())
        return 0
    except Exception as e:
        _log(ids, title, 'error', e)
        return 0
