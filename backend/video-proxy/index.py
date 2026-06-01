import json
import urllib.request
import urllib.parse
import base64
import os

ALLOWED_HOSTS = ('cdn.poehali.dev', 's3.poehali.dev', 'bucket.poehali.dev')
# Максимум первых 2 МБ видео — достаточно чтобы браузер декодировал первый кадр
MAX_BYTES = 2 * 1024 * 1024


def _cors():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Range',
        'Access-Control-Max-Age': '86400',
    }


def handler(event: dict, context) -> dict:
    """CORS-прокси для видео с CDN: возвращает первые 2 МБ с Access-Control-Allow-Origin: *
    чтобы браузер мог загрузить в <video crossOrigin=anonymous> и снять кадр через canvas."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': _cors(), 'body': ''}

    params = event.get('queryStringParameters') or {}
    url = params.get('url', '')

    if not url:
        return {'statusCode': 400, 'headers': {**_cors(), 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'url required'})}

    parsed = urllib.parse.urlparse(url)
    if parsed.hostname not in ALLOWED_HOSTS:
        return {'statusCode': 403, 'headers': {**_cors(), 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'host not allowed'})}

    try:
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': 'Look-Proxy/1.0',
                'Range': f'bytes=0-{MAX_BYTES - 1}',
            }
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read(MAX_BYTES)
            content_type = resp.headers.get('Content-Type', 'video/mp4')
            status = resp.status
    except Exception as e:
        return {'statusCode': 502, 'headers': {**_cors(), 'Content-Type': 'application/json'},
                'body': json.dumps({'error': str(e)[:120]})}

    return {
        'statusCode': 206 if status == 206 else 200,
        'headers': {
            **_cors(),
            'Content-Type': content_type,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=86400',
        },
        'body': base64.b64encode(data).decode('ascii'),
        'isBase64Encoded': True,
    }
