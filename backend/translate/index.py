import json
import re
import urllib.parse
import urllib.request

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
    'Access-Control-Max-Age': '86400',
}

CYR = re.compile(r'[А-Яа-яЁё]')


def _resp(status: int, body: dict) -> dict:
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(body, ensure_ascii=False)}


def _chunks(text: str, size: int = 450) -> list:
    parts, cur = [], ''
    for piece in re.split(r'(?<=[.!?\n])\s*', text):
        if len(cur) + len(piece) + 1 > size and cur:
            parts.append(cur)
            cur = ''
        while len(piece) > size:
            parts.append(piece[:size])
            piece = piece[size:]
        cur = (cur + ' ' + piece).strip()
    if cur:
        parts.append(cur)
    return parts


def _translate_part(text: str, pair: str) -> str:
    url = 'https://api.mymemory.translated.net/get?' + urllib.parse.urlencode({'q': text, 'langpair': pair})
    with urllib.request.urlopen(url, timeout=4) as r:
        data = json.loads(r.read().decode('utf-8'))
    out = (data.get('responseData') or {}).get('translatedText') or text
    return out


def handler(event: dict, context) -> dict:
    """Перевод текста поста или комментария: русский на английский, остальные языки на русский"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}
    if event.get('httpMethod') != 'POST':
        return _resp(405, {'error': 'Method not allowed'})

    body = json.loads(event.get('body') or '{}')
    text = (body.get('text') or '').strip()[:1500]
    target = (body.get('target') or '').strip().lower()
    if not text:
        return _resp(400, {'error': 'text required'})

    if target not in ('ru', 'en'):
        target = 'en' if CYR.search(text) else 'ru'
    source = 'ru' if CYR.search(text) else ('en' if target == 'ru' else 'ru')
    if source == target:
        return _resp(200, {'text': text, 'target': target})

    pair = f'{source}|{target}'
    translated = ' '.join(_translate_part(p, pair) for p in _chunks(text))
    return _resp(200, {'text': translated, 'target': target})
