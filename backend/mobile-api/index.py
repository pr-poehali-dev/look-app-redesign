import os
import json
import hmac
import base64
import urllib.request
import urllib.error
import urllib.parse

from routes import ROUTES

API_VERSION = 'v1'
FORWARD_HEADERS = ['content-type', 'x-authorization', 'x-admin-token', 'x-user-id', 'x-auth-token', 'x-session-id', 'x-cookie']
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key, X-Admin-Token, X-User-Id, X-Auth-Token, X-Session-Id',
    'Access-Control-Max-Age': '86400',
}


def _resp(status: int, data) -> dict:
    return {
        'statusCode': status,
        'headers': {**CORS, 'Content-Type': 'application/json'},
        'body': json.dumps(data, ensure_ascii=False),
    }


def handler(event: dict, context) -> dict:
    """Единый шлюз для мобильного приложения: проверяет ключ X-Api-Key и передаёт запрос нужной службе сайта (параметр service)."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    headers = {k.lower(): v for k, v in (event.get('headers') or {}).items()}
    params = dict(event.get('queryStringParameters') or {})
    service = params.pop('service', '')

    if not service:
        return _resp(200, {'api': 'look-mobile', 'version': API_VERSION, 'services': sorted(ROUTES.keys())})

    expected = os.environ.get('MOBILE_API_KEY', '')
    if not expected:
        return _resp(503, {'error': 'API не настроен: нет ключа доступа'})
    given = headers.get('x-api-key', '')
    if not hmac.compare_digest(given.encode(), expected.encode()):
        return _resp(401, {'error': 'Неверный ключ API'})

    target = ROUTES.get(service)
    if not target:
        return _resp(404, {'error': 'Неизвестная служба', 'services': sorted(ROUTES.keys())})

    method = event.get('httpMethod', 'GET')
    body = event.get('body')
    data = None
    if body and method in ('POST', 'PUT', 'DELETE'):
        data = base64.b64decode(body) if event.get('isBase64Encoded') else body.encode()

    url = target + ('?' + urllib.parse.urlencode(params) if params else '')
    out_headers = {k: headers[k] for k in FORWARD_HEADERS if k in headers}
    if 'x-authorization' in out_headers:
        out_headers['Authorization'] = out_headers.pop('x-authorization')
    if 'x-cookie' in out_headers:
        out_headers['Cookie'] = out_headers.pop('x-cookie')

    req = urllib.request.Request(url, data=data, method=method, headers=out_headers)
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            status, text = r.status, r.read().decode('utf-8', 'replace')
    except urllib.error.HTTPError as e:
        status, text = e.code, e.read().decode('utf-8', 'replace')
    except Exception:
        return _resp(502, {'error': 'Служба не отвечает'})

    return {
        'statusCode': status,
        'headers': {**CORS, 'Content-Type': 'application/json'},
        'body': text,
    }
