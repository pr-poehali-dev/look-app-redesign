import json
import os
import io
import time
import urllib.request
import urllib.parse
import urllib.error
import boto3
from botocore.config import Config


YA_PUBLIC_KEY = 'https://disk.yandex.ru/d/4smtv1l8ByTLbQ'
STATE_KEY = 'legacy/extract7z_state.json'
CDN_PREFIX = 'legacy/uploads/'


def cors():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
    }


def jr(data, status=200):
    return {
        'statusCode': status,
        'headers': {**cors(), 'Content-Type': 'application/json; charset=utf-8'},
        'body': json.dumps(data, ensure_ascii=False, default=str),
    }


def get_yadisk_direct(public_key: str) -> tuple[str, int]:
    api = 'https://cloud-api.yandex.net/v1/disk/public/resources/download?public_key=' + urllib.parse.quote(public_key)
    req = urllib.request.Request(api, headers={'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode('utf-8'))
    href = data['href']
    head = urllib.request.Request(href, headers={'Range': 'bytes=0-0'})
    with urllib.request.urlopen(head, timeout=30) as r:
        cr = r.headers.get('Content-Range', '')
        total = int(cr.split('/')[-1]) if cr and '/' in cr else 0
    return href, total


class YandexRangeReader(io.RawIOBase):
    MIN_FETCH = 256 * 1024
    CACHE_SIZE = 8 * 1024 * 1024

    def __init__(self, public_key: str):
        self._public_key = public_key
        self._url, self._size = get_yadisk_direct(public_key)
        self._pos = 0
        self._cache_start = -1
        self._cache_data = b''

    def readable(self): return True
    def seekable(self): return True
    def tell(self): return self._pos

    def seek(self, offset, whence=io.SEEK_SET):
        if whence == io.SEEK_SET: self._pos = offset
        elif whence == io.SEEK_CUR: self._pos += offset
        elif whence == io.SEEK_END: self._pos = self._size + offset
        return self._pos

    def _refresh_url(self):
        self._url, _ = get_yadisk_direct(self._public_key)

    def _get_range(self, start: int, end: int) -> bytes:
        for attempt in range(4):
            try:
                req = urllib.request.Request(self._url, headers={'Range': f'bytes={start}-{end}'})
                with urllib.request.urlopen(req, timeout=60) as r:
                    return r.read()
            except urllib.error.HTTPError as e:
                if e.code in (403, 410):
                    self._refresh_url()
                    continue
                raise
            except Exception:
                if attempt == 3: raise
                time.sleep(0.5)
        return b''

    def read(self, size=-1):
        if self._pos >= self._size: return b''
        if size is None or size < 0: size = self._size - self._pos
        size = min(size, self._size - self._pos)
        if size == 0: return b''

        if (self._cache_start >= 0
                and self._pos >= self._cache_start
                and self._pos + size <= self._cache_start + len(self._cache_data)):
            off = self._pos - self._cache_start
            data = self._cache_data[off:off + size]
            self._pos += len(data)
            return data

        fetch = max(size, self.MIN_FETCH)
        fetch = min(fetch, self.CACHE_SIZE)
        end = min(self._pos + fetch - 1, self._size - 1)
        data = self._get_range(self._pos, end)
        if not data: return b''
        self._cache_start = self._pos
        self._cache_data = data
        result = data[:size]
        self._pos += len(result)
        return result


def s3_client():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
        config=Config(signature_version='s3v4', s3={'addressing_style': 'path'}),
    )


def load_state(s3):
    try:
        obj = s3.get_object(Bucket='files', Key=STATE_KEY)
        return json.loads(obj['Body'].read().decode('utf-8'))
    except Exception:
        return None


def save_state(s3, state):
    s3.put_object(Bucket='files', Key=STATE_KEY,
                  Body=json.dumps(state, ensure_ascii=False).encode('utf-8'),
                  ContentType='application/json')


def guess_ct(name: str) -> str:
    n = name.lower()
    if n.endswith('.mp4'): return 'video/mp4'
    if n.endswith('.mov'): return 'video/quicktime'
    if n.endswith('.webm'): return 'video/webm'
    if n.endswith('.jpg') or n.endswith('.jpeg'): return 'image/jpeg'
    if n.endswith('.png'): return 'image/png'
    if n.endswith('.webp'): return 'image/webp'
    if n.endswith('.gif'): return 'image/gif'
    return 'application/octet-stream'


def s3_object_exists(s3, key: str) -> bool:
    try:
        s3.head_object(Bucket='files', Key=key)
        return True
    except Exception:
        return False


def handler(event: dict, context) -> dict:
    """Распаковывает 7z с Яндекс.Диска прямо в S3 батчами через range-стрим. Параметры: ?batch=N, ?reset=1, ?timeout=N, ?action=index|extract."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors(), 'body': ''}

    import py7zr

    qs = event.get('queryStringParameters') or {}
    action = qs.get('action', 'extract')
    batch_size = int(qs.get('batch', '5'))
    reset = qs.get('reset') == '1'
    timeout_sec = int(qs.get('timeout', '25'))
    deadline = time.time() + timeout_sec

    s3 = s3_client()
    state = None if reset else load_state(s3)

    if action == 'status':
        return jr({'state': state})

    # Фаза индексации
    if not state or 'files' not in state:
        reader = YandexRangeReader(YA_PUBLIC_KEY)
        archive = py7zr.SevenZipFile(reader, mode='r')
        files = []
        for info in archive.list():
            if info.is_directory: continue
            files.append({'name': info.filename, 'size': info.uncompressed})
        archive.close()
        state = {'files': files, 'processed': [], 'errors': [], 'phase': 'extracting',
                 'archive_size': reader._size}
        save_state(s3, state)

    if action == 'index':
        return jr({'phase': 'indexed', 'total_files': len(state['files']),
                   'archive_size': state.get('archive_size'),
                   'sample': state['files'][:10]})

    # Фаза извлечения
    files = state['files']
    processed_set = set(state.get('processed', []))
    errors = list(state.get('errors', []))
    pending = [f for f in files if f['name'] not in processed_set]

    if not pending:
        state['phase'] = 'done'
        save_state(s3, state)
        return jr({'phase': 'done', 'total_files': len(files),
                   'processed': len(processed_set), 'errors_count': len(errors)})

    take_names = [f['name'] for f in pending[:batch_size]]
    reader = YandexRangeReader(YA_PUBLIC_KEY)
    archive = py7zr.SevenZipFile(reader, mode='r')

    # py7zr.read(targets=[...]) возвращает dict{name: BytesIO}
    extracted = archive.read(targets=take_names)
    archive.close()

    uploaded_now = []
    bytes_now = 0
    new_errors = []

    for name, bio in extracted.items():
        if time.time() > deadline: break
        try:
            data = bio.read() if hasattr(bio, 'read') else bio
            base = name.split('/')[-1]
            key = CDN_PREFIX + base
            if not s3_object_exists(s3, key):
                s3.put_object(Bucket='files', Key=key, Body=data, ContentType=guess_ct(base))
            processed_set.add(name)
            uploaded_now.append(base)
            bytes_now += len(data)
        except Exception as e:
            new_errors.append({'name': name, 'error': str(e)[:200]})

    errors.extend(new_errors)
    state['processed'] = list(processed_set)
    state['errors'] = errors[-50:]
    state['phase'] = 'extracting' if len(processed_set) < len(files) else 'done'
    save_state(s3, state)

    return jr({
        'phase': state['phase'],
        'total_files': len(files),
        'processed': len(processed_set),
        'remaining': len(files) - len(processed_set),
        'uploaded_now': len(uploaded_now),
        'bytes_now': bytes_now,
        'errors_recent': new_errors[:5],
        'errors_total': len(errors),
    })
