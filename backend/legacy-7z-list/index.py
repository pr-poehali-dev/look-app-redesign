import json
import os
import urllib.request
import urllib.parse


YA_PUBLIC_KEY = 'https://disk.yandex.ru/d/4smtv1l8ByTLbQ'


def get_yandex_direct_url(public_key: str) -> tuple[str, int]:
    api = 'https://cloud-api.yandex.net/v1/disk/public/resources/download?public_key=' + urllib.parse.quote(public_key)
    with urllib.request.urlopen(api, timeout=30) as r:
        data = json.loads(r.read().decode('utf-8'))
    href = data['href']
    # узнаём размер
    req = urllib.request.Request(href, headers={'Range': 'bytes=0-0'})
    with urllib.request.urlopen(req, timeout=30) as r:
        cr = r.headers.get('Content-Range', '')
        total = int(cr.split('/')[-1]) if cr and '/' in cr else 0
    return href, total


def handler(event: dict, context) -> dict:
    """Открывает 7z с Яндекс.Диска как стрим, возвращает список первых N файлов внутри (без полного скачивания)."""
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
            'body': ''
        }

    import py7zr

    direct_url, total_size = get_yandex_direct_url(YA_PUBLIC_KEY)

    # Качаем целиком в /tmp (596 МБ — должно влезть в /tmp Yandex Cloud Function)
    tmp_path = '/tmp/uploads.7z'
    if not os.path.exists(tmp_path) or os.path.getsize(tmp_path) != total_size:
        with urllib.request.urlopen(direct_url, timeout=600) as r, open(tmp_path, 'wb') as f:
            while True:
                chunk = r.read(8 * 1024 * 1024)
                if not chunk:
                    break
                f.write(chunk)

    archive = py7zr.SevenZipFile(tmp_path, mode='r')
    files = []
    by_ext = {}
    for info in archive.list():
        if info.is_directory:
            continue
        ext = info.filename.split('.')[-1].lower() if '.' in info.filename else ''
        by_ext[ext] = by_ext.get(ext, 0) + 1
        files.append({'name': info.filename, 'size': info.uncompressed})

    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json; charset=utf-8',
        },
        'body': json.dumps({
            'archive_size': total_size,
            'tmp_size': os.path.getsize(tmp_path),
            'total_files': len(files),
            'by_extension': by_ext,
            'sample': files[:30],
        }, ensure_ascii=False)
    }
