import json
import base64
import urllib.request
import urllib.parse

ALLOWED_HOSTS = ('cdn.poehali.dev', 's3.poehali.dev', 'bucket.poehali.dev')

def handler(event: dict, context) -> dict:
    """Прокси для скачивания медиа с CDN на ПК (обходит CORS и заставляет браузер сохранить файл)"""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
            'body': ''
        }

    params = event.get('queryStringParameters') or {}
    url = params.get('url', '')
    filename = params.get('filename', 'video.mp4')

    if not url:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'url required'})
        }

    parsed = urllib.parse.urlparse(url)
    if parsed.hostname not in ALLOWED_HOSTS:
        return {
            'statusCode': 403,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'host not allowed'})
        }

    safe_name = ''.join(c for c in filename if c.isalnum() or c in '._-') or 'file.bin'

    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Look-Proxy/1.0'})
        with urllib.request.urlopen(req, timeout=25) as resp:
            data = resp.read()
            content_type = resp.headers.get('Content-Type', 'application/octet-stream')
    except Exception as e:
        return {
            'statusCode': 502,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'error': f'fetch failed: {str(e)[:120]}'})
        }

    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': content_type,
            'Content-Disposition': f'attachment; filename="{safe_name}"',
            'Cache-Control': 'public, max-age=3600',
        },
        'body': base64.b64encode(data).decode('ascii'),
        'isBase64Encoded': True,
    }
