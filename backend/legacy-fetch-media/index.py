import json
import os
import urllib.request
import urllib.parse
import time
import boto3
from botocore.config import Config
import py7zr


MEDIA_PUBLIC_KEY = 'https://disk.yandex.ru/d/4smtv1l8ByTLbQ'
ARCHIVE_TMP = '/tmp/uploads.7z'
STATE_KEY = 'legacy/media_state.json'
CDN_PREFIX = 'legacy/uploads/'


def get_yandex_direct_url(public_key: str) -> str:
    api = 'https://cloud-api.yandex.net/v1/disk/public/resources/download?public_key=' + urllib.parse.quote(public_key)
    with urllib.request.urlopen(api, timeout=30) as r:
        data = json.loads(r.read().decode('utf-8'))
    return data['href']


def download_archive(url: str, path: str, deadline: float) -> bool:
    """Качает архив в /tmp с поддержкой докачки. Возвращает True если скачано полностью."""
    start = 0
    if os.path.exists(path):
        start = os.path.getsize(path)

    headers = {}
    if start > 0:
        headers['Range'] = f'bytes={start}-'

    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=120) as resp, open(path, 'ab') as f:
        # Узнаём общий размер
        if start > 0 and 'Content-Range' in resp.headers:
            total = int(resp.headers['Content-Range'].split('/')[-1])
        else:
            total = int(resp.headers.get('Content-Length', '0')) + start

        chunk_size = 4 * 1024 * 1024
        while True:
            if time.time() > deadline:
                return False
            chunk = resp.read(chunk_size)
            if not chunk:
                break
            f.write(chunk)

    if total and os.path.getsize(path) < total:
        return False
    return True


def load_state(s3, bucket):
    try:
        obj = s3.get_object(Bucket=bucket, Key=STATE_KEY)
        return json.loads(obj['Body'].read().decode('utf-8'))
    except Exception:
        return None


def save_state(s3, bucket, state):
    s3.put_object(Bucket=bucket, Key=STATE_KEY, Body=json.dumps(state).encode('utf-8'), ContentType='application/json')


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


def handler(event: dict, context) -> dict:
    """Качает uploads.7z с Яндекс.Диска, распаковывает и заливает файлы пачками в S3.
    Состояние сохраняется в S3, можно вызывать многократно."""
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
    batch_size = int(qs.get('batch', '20'))
    deadline = time.time() + 60 * 11

    # Этап 1: скачать архив
    direct_url = get_yandex_direct_url(MEDIA_PUBLIC_KEY)
    completed = download_archive(direct_url, ARCHIVE_TMP, deadline)
    archive_size = os.path.getsize(ARCHIVE_TMP) if os.path.exists(ARCHIVE_TMP) else 0

    if not completed:
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'phase': 'downloading',
                'downloaded': archive_size,
                'message': 'Archive download in progress, call again to continue.',
            })
        }

    # Этап 2: открыть 7z, получить список файлов
    state = load_state(s3, bucket) or {'processed': [], 'phase': 'extracting'}
    processed_set = set(state.get('processed', []))

    with py7zr.SevenZipFile(ARCHIVE_TMP, 'r') as z:
        all_names = z.getnames()
        # Фильтруем только файлы (не директории)
        # py7zr не различает напрямую — узнаём через .list()
        items = z.list()
        file_names = [it.filename for it in items if not it.is_directory]

        pending = [n for n in file_names if n not in processed_set]

        if not pending:
            # Всё перенесено
            state['phase'] = 'done'
            state['total_files'] = len(file_names)
            save_state(s3, bucket, state)
            return {
                'statusCode': 200,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'phase': 'done',
                    'total_files': len(file_names),
                    'processed': len(processed_set),
                })
            }

        # Берём batch_size файлов
        take = pending[:batch_size]
        targets = {name: None for name in take}
        # py7zr: extract выполняется в /tmp, потом читаем и удаляем
        # Используем readall для получения файлов в памяти (по одному имени)
        # Альтернатива: extract(targets=...) — извлекает только нужные файлы

        extract_dir = '/tmp/extract_batch'
        os.makedirs(extract_dir, exist_ok=True)
        # Очистим директорию от прошлого прогона
        for f in os.listdir(extract_dir):
            try:
                fp = os.path.join(extract_dir, f)
                if os.path.isfile(fp):
                    os.remove(fp)
            except Exception:
                pass

        z.extract(path=extract_dir, targets=take)

    uploaded = []
    errors = []
    for name in take:
        if time.time() > deadline:
            break
        local_path = os.path.join(extract_dir, name)
        if not os.path.exists(local_path):
            errors.append({'name': name, 'error': 'extract_missing'})
            continue
        try:
            key = CDN_PREFIX + name.replace('\\', '/')
            with open(local_path, 'rb') as f:
                s3.put_object(
                    Bucket=bucket,
                    Key=key,
                    Body=f,
                    ContentType=guess_content_type(name),
                )
            uploaded.append(name)
            processed_set.add(name)
            try:
                os.remove(local_path)
            except Exception:
                pass
        except Exception as e:
            errors.append({'name': name, 'error': str(e)})

    # Сохраняем state
    state['processed'] = list(processed_set)
    state['phase'] = 'extracting'
    save_state(s3, bucket, state)

    remaining = len(file_names) - len(processed_set)
    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'phase': 'extracting' if remaining > 0 else 'done',
            'total_files': len(file_names),
            'processed': len(processed_set),
            'remaining': remaining,
            'uploaded_now': len(uploaded),
            'errors': errors[:5],
        }, ensure_ascii=False)
    }
