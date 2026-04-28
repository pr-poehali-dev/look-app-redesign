import json
import os
import urllib.request
import urllib.parse
import time
import boto3
from botocore.config import Config


MEDIA_PUBLIC_KEY = 'https://disk.yandex.ru/d/rx8DfuQxnMnEtQ'
STATE_KEY = 'legacy/media_state.json'
CDN_PREFIX = 'legacy/uploads/'
LIST_LIMIT = 1000


def yd_get(url: str, timeout: int = 30) -> dict:
    req = urllib.request.Request(url, headers={'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode('utf-8'))


def list_public_folder(public_key: str) -> list:
    """Возвращает плоский список файлов в публичной папке (рекурсивно)."""
    files = []
    offset = 0
    while True:
        url = (
            'https://cloud-api.yandex.net/v1/disk/public/resources'
            f'?public_key={urllib.parse.quote(public_key)}'
            f'&limit={LIST_LIMIT}&offset={offset}'
            '&fields=_embedded.items.name,_embedded.items.type,_embedded.items.path,_embedded.items.size,_embedded.total'
        )
        data = yd_get(url)
        emb = data.get('_embedded') or {}
        items = emb.get('items') or []
        if not items:
            break
        for it in items:
            if it.get('type') == 'file':
                files.append({'name': it['name'], 'path': it['path'], 'size': it.get('size', 0)})
        total = emb.get('total', 0)
        offset += len(items)
        if offset >= total:
            break
    return files


def get_file_download_url(public_key: str, path: str) -> str:
    url = (
        'https://cloud-api.yandex.net/v1/disk/public/resources/download'
        f'?public_key={urllib.parse.quote(public_key)}'
        f'&path={urllib.parse.quote(path)}'
    )
    data = yd_get(url)
    return data['href']


def load_state(s3, bucket):
    try:
        obj = s3.get_object(Bucket=bucket, Key=STATE_KEY)
        return json.loads(obj['Body'].read().decode('utf-8'))
    except Exception:
        return None


def save_state(s3, bucket, state):
    s3.put_object(
        Bucket=bucket,
        Key=STATE_KEY,
        Body=json.dumps(state, ensure_ascii=False).encode('utf-8'),
        ContentType='application/json',
    )


def guess_content_type(name: str) -> str:
    n = name.lower()
    if n.endswith('.mp4'): return 'video/mp4'
    if n.endswith('.mov'): return 'video/quicktime'
    if n.endswith('.webm'): return 'video/webm'
    if n.endswith('.jpg') or n.endswith('.jpeg'): return 'image/jpeg'
    if n.endswith('.png'): return 'image/png'
    if n.endswith('.webp'): return 'image/webp'
    if n.endswith('.gif'): return 'image/gif'
    if n.endswith('.mp3'): return 'audio/mpeg'
    if n.endswith('.wav'): return 'audio/wav'
    if n.endswith('.m4a'): return 'audio/mp4'
    return 'application/octet-stream'


def upload_file_streaming(s3, bucket, key: str, src_url: str, content_type: str):
    """Качает файл с ЯД и сразу заливает в S3 (через память — каждый файл небольшой)."""
    req = urllib.request.Request(src_url)
    with urllib.request.urlopen(req, timeout=120) as r:
        body = r.read()
    s3.put_object(Bucket=bucket, Key=key, Body=body, ContentType=content_type)
    return len(body)


def handler(event: dict, context) -> dict:
    """Переносит файлы из публичной папки Яндекс.Диска в S3 батчами.
    Состояние хранится в S3 (legacy/media_state.json), вызывать многократно."""
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

    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
        config=Config(signature_version='s3v4', s3={'addressing_style': 'path'}),
    )
    bucket = 'files'

    qs = event.get('queryStringParameters') or {}
    batch_size = int(qs.get('batch', '30'))
    reset = qs.get('reset') == '1'

    # Лимит времени работы (с запасом до таймаута функции)
    timeout_sec = int(qs.get('timeout', '500'))
    deadline = time.time() + timeout_sec

    state = None if reset else load_state(s3, bucket)
    if not state or 'files' not in state:
        files = list_public_folder(MEDIA_PUBLIC_KEY)
        state = {
            'files': files,
            'processed': [],
            'errors': [],
            'phase': 'uploading',
        }
        save_state(s3, bucket, state)

    files = state['files']
    processed_set = set(state.get('processed', []))
    errors = list(state.get('errors', []))

    pending = [f for f in files if f['name'] not in processed_set]

    if not pending:
        state['phase'] = 'done'
        save_state(s3, bucket, state)
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'phase': 'done',
                'total_files': len(files),
                'processed': len(processed_set),
                'errors_count': len(errors),
            })
        }

    take = pending[:batch_size]
    uploaded_now = []
    bytes_now = 0
    new_errors = []

    for f in take:
        if time.time() > deadline:
            break
        try:
            href = get_file_download_url(MEDIA_PUBLIC_KEY, f['path'])
            key = CDN_PREFIX + f['name']
            n = upload_file_streaming(s3, bucket, key, href, guess_content_type(f['name']))
            uploaded_now.append(f['name'])
            processed_set.add(f['name'])
            bytes_now += n
        except Exception as e:
            new_errors.append({'name': f['name'], 'error': str(e)[:200]})

    errors.extend(new_errors)
    state['processed'] = list(processed_set)
    state['errors'] = errors[-50:]
    state['phase'] = 'uploading' if len(processed_set) < len(files) else 'done'
    save_state(s3, bucket, state)

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'phase': state['phase'],
            'total_files': len(files),
            'processed': len(processed_set),
            'remaining': len(files) - len(processed_set),
            'uploaded_now': len(uploaded_now),
            'bytes_now': bytes_now,
            'errors_recent': new_errors[:5],
            'errors_total': len(errors),
        }, ensure_ascii=False)
    }
