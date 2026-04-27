import json
import urllib.request
import urllib.parse


def list_public_folder(public_key: str, path: str = '', limit: int = 1000, offset: int = 0):
    params = {
        'public_key': public_key,
        'limit': str(limit),
        'offset': str(offset),
    }
    if path:
        params['path'] = path
    url = 'https://cloud-api.yandex.net/v1/disk/public/resources?' + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=60) as r:
        return json.loads(r.read().decode('utf-8'))


def walk(public_key: str, path: str = '', max_files: int = 5000):
    files = []
    folders = []
    queue = [path]
    visited = 0
    while queue and len(files) < max_files:
        current = queue.pop(0)
        offset = 0
        while True:
            data = list_public_folder(public_key, current, limit=1000, offset=offset)
            embedded = data.get('_embedded') or {}
            items = embedded.get('items', [])
            if not items:
                break
            for it in items:
                if it.get('type') == 'dir':
                    folders.append(it.get('path'))
                    queue.append(it.get('path'))
                else:
                    files.append({
                        'path': it.get('path'),
                        'name': it.get('name'),
                        'size': it.get('size', 0),
                        'mime': it.get('mime_type'),
                    })
                    if len(files) >= max_files:
                        break
            offset += len(items)
            if offset >= embedded.get('total', 0):
                break
            visited += 1
            if visited > 200:
                return files, folders, True
    return files, folders, False


def handler(event: dict, context) -> dict:
    """Разведка публичной папки на Яндекс.Диске: рекурсивно собирает список файлов и папок, считает по расширениям."""
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

    qs = event.get('queryStringParameters') or {}
    public_key = qs.get('key', 'https://disk.yandex.ru/d/4smtv1l8ByTLbQ')

    # Сначала смотрим корень публички
    root = list_public_folder(public_key)
    is_file = root.get('type') == 'file'

    if is_file:
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json; charset=utf-8'},
            'body': json.dumps({
                'is_file': True,
                'name': root.get('name'),
                'size': root.get('size'),
                'mime': root.get('mime_type'),
            }, ensure_ascii=False)
        }

    files, folders, truncated = walk(public_key)

    by_ext = {}
    total_size = 0
    for f in files:
        n = f['name']
        ext = n.split('.')[-1].lower() if '.' in n else ''
        by_ext[ext] = by_ext.get(ext, 0) + 1
        total_size += f['size']

    sql_files = [f for f in files if f['name'].lower().endswith('.sql')]

    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json; charset=utf-8',
        },
        'body': json.dumps({
            'is_file': False,
            'root_name': root.get('name'),
            'total_files': len(files),
            'total_folders': len(folders),
            'total_size_bytes': total_size,
            'truncated': truncated,
            'by_extension': by_ext,
            'sql_files': sql_files,
            'top_folders': folders[:20],
            'sample_files': files[:30],
        }, ensure_ascii=False)
    }
