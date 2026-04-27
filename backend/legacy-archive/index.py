import json
import os
import io
import time
import traceback
import zipfile
import boto3
import urllib.request
import urllib.parse
import urllib.error


YANDEX_PUBLIC_URL = 'https://disk.yandex.ru/d/2E-FYaSBeKK80w'
S3_PARTS_PREFIX = 'legacy/parts/'
S3_PROGRESS_KEY = 'legacy/progress.json'
S3_DUMP_KEY = 'legacy/dump.sql'
PART_SIZE = 16 * 1024 * 1024  # 16 МБ — размер одной части


def _cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
    }


def _json_response(data, status=200):
    return {
        'statusCode': status,
        'headers': {**_cors_headers(), 'Content-Type': 'application/json; charset=utf-8'},
        'body': json.dumps(data, ensure_ascii=False, default=str),
    }


def _s3_client():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )


def _get_yandex_direct_url():
    api = 'https://cloud-api.yandex.net/v1/disk/public/resources/download?public_key=' + urllib.parse.quote(YANDEX_PUBLIC_URL)
    req = urllib.request.Request(api, headers={'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode('utf-8'))
    return data['href']


def _load_progress(s3):
    try:
        obj = s3.get_object(Bucket='files', Key=S3_PROGRESS_KEY)
        return json.loads(obj['Body'].read().decode('utf-8'))
    except Exception:
        return None


def _save_progress(s3, data):
    s3.put_object(
        Bucket='files',
        Key=S3_PROGRESS_KEY,
        Body=json.dumps(data).encode('utf-8'),
        ContentType='application/json',
    )


def _part_key(n: int) -> str:
    return f'{S3_PARTS_PREFIX}{n:06d}.bin'


class YandexRangeReader(io.RawIOBase):
    """Читает архив напрямую из публичной ссылки Яндекс.Диска через HTTP Range-запросы.

    Ссылка живёт ~15 минут — при 403/410 обновляется через ЯД API.
    Для эффективности читаем минимум 64 КБ за раз и кешируем.
    """

    MIN_FETCH = 64 * 1024  # минимум 64 КБ за один HTTP-запрос
    CACHE_SIZE = 4 * 1024 * 1024  # держим до 4 МБ в кеше (последний блок)

    def __init__(self, total_size: int, direct_url: str = None):
        self._size = total_size
        self._pos = 0
        self._url = direct_url or _get_yandex_direct_url()
        self._cache_start = -1
        self._cache_data = b''

    def readable(self):
        return True

    def seekable(self):
        return True

    def tell(self):
        return self._pos

    def seek(self, offset, whence=io.SEEK_SET):
        if whence == io.SEEK_SET:
            self._pos = offset
        elif whence == io.SEEK_CUR:
            self._pos += offset
        elif whence == io.SEEK_END:
            self._pos = self._size + offset
        return self._pos

    def _http_get_range(self, start: int, end: int) -> bytes:
        for attempt in range(3):
            try:
                req = urllib.request.Request(
                    self._url,
                    headers={'Range': f'bytes={start}-{end}', 'User-Agent': 'Mozilla/5.0'},
                )
                with urllib.request.urlopen(req, timeout=30) as resp:
                    return resp.read()
            except urllib.error.HTTPError as e:
                if e.code in (403, 410):
                    self._url = _get_yandex_direct_url()
                    continue
                raise
        return b''

    def read(self, size=-1):
        if self._pos >= self._size:
            return b''
        if size is None or size < 0:
            size = self._size - self._pos
        size = min(size, self._size - self._pos)
        if size == 0:
            return b''

        # Проверяем кеш
        if (self._cache_start >= 0
                and self._pos >= self._cache_start
                and self._pos + size <= self._cache_start + len(self._cache_data)):
            offset_in_cache = self._pos - self._cache_start
            data = self._cache_data[offset_in_cache:offset_in_cache + size]
            self._pos += len(data)
            return data

        # Скачиваем минимум MIN_FETCH байт, не больше CACHE_SIZE и не за пределы файла
        fetch_size = max(size, self.MIN_FETCH)
        fetch_size = min(fetch_size, self.CACHE_SIZE)
        fetch_end = min(self._pos + fetch_size - 1, self._size - 1)

        data = self._http_get_range(self._pos, fetch_end)
        if not data:
            return b''

        self._cache_start = self._pos
        self._cache_data = data

        result = data[:size]
        self._pos += len(result)
        return result


class S3PartsReader(io.RawIOBase):
    """File-like объект, представляющий «склеенный» архив из нескольких S3-объектов.

    Архив разбит на части одинакового размера (PART_SIZE), последняя — может быть короче.
    parts_count — общее количество частей. total_size — итоговый размер архива.
    """

    def __init__(self, s3, parts_count: int, total_size: int, part_size: int):
        self._s3 = s3
        self._parts_count = parts_count
        self._total_size = total_size
        self._part_size = part_size
        self._pos = 0

    def readable(self):
        return True

    def seekable(self):
        return True

    def tell(self):
        return self._pos

    def seek(self, offset, whence=io.SEEK_SET):
        if whence == io.SEEK_SET:
            self._pos = offset
        elif whence == io.SEEK_CUR:
            self._pos += offset
        elif whence == io.SEEK_END:
            self._pos = self._total_size + offset
        return self._pos

    def _real_part_size(self, part_num: int) -> int:
        """Реальный размер части без HEAD-запроса: все, кроме последней — part_size, последняя — остаток."""
        if part_num < self._parts_count:
            return self._part_size
        # Последняя часть
        return self._total_size - (self._parts_count - 1) * self._part_size

    def _read_part_range(self, part_num: int, start: int, length: int) -> bytes:
        real_size = self._real_part_size(part_num)
        if start >= real_size:
            return b''
        end = min(start + length - 1, real_size - 1)
        rng = f'bytes={start}-{end}'
        obj = self._s3.get_object(Bucket='files', Key=_part_key(part_num), Range=rng)
        body = obj['Body']
        buf = bytearray()
        while True:
            chunk = body.read(1024 * 1024)
            if not chunk:
                break
            buf.extend(chunk)
        return bytes(buf)

    def read(self, size=-1):
        if self._pos >= self._total_size:
            return b''
        if size is None or size < 0:
            size = self._total_size - self._pos
        size = min(size, self._total_size - self._pos)

        result = bytearray()
        remaining = size

        while remaining > 0:
            part_index = self._pos // self._part_size
            offset_in_part = self._pos % self._part_size
            part_num = part_index + 1

            bytes_left_in_part = self._part_size - offset_in_part
            to_read = min(remaining, bytes_left_in_part)

            chunk = self._read_part_range(part_num, offset_in_part, to_read)

            if not chunk:
                break

            result.extend(chunk)
            self._pos += len(chunk)
            remaining -= len(chunk)

        return bytes(result)


def _action_status(s3):
    info = {'progress': None, 'dump': None, 'parts_in_s3': 0}
    try:
        head = s3.head_object(Bucket='files', Key=S3_DUMP_KEY)
        info['dump'] = {
            'exists': True,
            'size_bytes': head['ContentLength'],
            'size_mb': round(head['ContentLength'] / 1024 / 1024, 2),
        }
    except Exception:
        info['dump'] = {'exists': False}

    try:
        resp = s3.list_objects_v2(Bucket='files', Prefix=S3_PARTS_PREFIX)
        info['parts_in_s3'] = resp.get('KeyCount', 0)
    except Exception:
        pass

    p = _load_progress(s3)
    if p:
        total = p.get('total_size', 0) or 1
        info['progress'] = {
            'completed': p.get('completed', False),
            'bytes_uploaded': p.get('bytes_uploaded', 0),
            'total_size': p.get('total_size', 0),
            'mb_uploaded': round(p.get('bytes_uploaded', 0) / 1024 / 1024, 2),
            'percent': round(p.get('bytes_uploaded', 0) / total * 100, 2),
            'parts_uploaded': p.get('parts_uploaded', 0),
            'parts_total_expected': p.get('parts_total_expected', 0),
        }
    return info


def _action_diag(s3):
    diag = {}
    url = None
    try:
        url = _get_yandex_direct_url()
        diag['yandex_url_ok'] = True
    except Exception as e:
        diag['yandex_url_ok'] = False
        diag['yandex_url_error'] = f'{type(e).__name__}: {str(e)[:200]}'

    try:
        s3.list_objects_v2(Bucket='files', Prefix='legacy/', MaxKeys=10)
        diag['s3_list_ok'] = True
    except Exception as e:
        diag['s3_list_ok'] = False
        diag['s3_error'] = f'{type(e).__name__}: {str(e)[:200]}'

    if url:
        try:
            head_req = urllib.request.Request(url, method='HEAD', headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(head_req, timeout=15) as r:
                diag['yandex_head_status'] = r.status
                diag['yandex_content_length'] = r.headers.get('Content-Length')
                diag['yandex_accept_ranges'] = r.headers.get('Accept-Ranges')
        except Exception as e:
            diag['yandex_head_error'] = f'{type(e).__name__}: {str(e)[:200]}'

    return diag


def _action_test_range(s3):
    """Прямой тест: уважает ли S3 Range-запросы."""
    obj_full = s3.get_object(Bucket='files', Key=_part_key(46))
    full_size = len(obj_full['Body'].read())

    obj_range = s3.get_object(Bucket='files', Key=_part_key(46), Range='bytes=0-21')
    range_size = len(obj_range['Body'].read())

    obj_range_metadata = s3.get_object(Bucket='files', Key=_part_key(46), Range='bytes=0-21')
    return {
        'full_size': full_size,
        'range_0_21_size': range_size,
        'range_respected': range_size == 22,
        'range_status': obj_range_metadata.get('ResponseMetadata', {}).get('HTTPStatusCode'),
        'range_content_range': obj_range_metadata.get('ContentRange'),
    }


def _action_test_read(s3):
    """Тест чтения через YandexRangeReader: последние 22 байта + начало."""
    progress = _load_progress(s3)
    if not progress:
        return {'error': 'no_progress'}

    reader = YandexRangeReader(
        total_size=progress['total_size'],
        direct_url=progress.get('direct_url'),
    )

    # Чтение первых 4 байт (zip-сигнатура должна быть PK\x03\x04)
    reader.seek(0)
    head4 = reader.read(4)

    # Последние 22 байта (EOCD signature должна быть PK\x05\x06)
    reader.seek(-22, io.SEEK_END)
    tail22 = reader.read(22)

    # Последние 100 байт hex
    reader.seek(-100, io.SEEK_END)
    tail100 = reader.read(100)

    # Поиск EOCD сигнатуры в последних 4096 байтах
    reader.seek(max(0, progress['total_size'] - 4096))
    last_block = reader.read(4096)
    eocd_pos = last_block.rfind(b'PK\x05\x06')

    return {
        'head4_is_zip': head4 == b'PK\x03\x04',
        'tail22_starts_with_eocd': tail22[:4] == b'PK\x05\x06',
        'tail22_len': len(tail22),
        'tail100_len': len(tail100),
        'last_block_len': len(last_block),
        'eocd_relative_offset': eocd_pos,
    }


def _action_verify(s3):
    """Проверка целостности: размеры всех частей в S3, сравнение с total_size."""
    progress = _load_progress(s3)
    if not progress:
        return {'error': 'no_progress'}

    expected_total = progress.get('total_size', 0)
    parts_expected = progress.get('parts_total_expected', 0)
    part_size = progress.get('part_size', PART_SIZE)

    parts_info = []
    actual_total = 0
    missing = []

    for n in range(1, parts_expected + 1):
        try:
            head = s3.head_object(Bucket='files', Key=_part_key(n))
            sz = head['ContentLength']
            actual_total += sz
            expected_size = part_size if n < parts_expected else (expected_total - (parts_expected - 1) * part_size)
            parts_info.append({
                'n': n,
                'size': sz,
                'expected_size': expected_size,
                'ok': sz == expected_size,
            })
        except Exception as e:
            missing.append({'n': n, 'error': str(e)[:100]})

    bad = [p for p in parts_info if not p['ok']]
    return {
        'expected_total': expected_total,
        'actual_total': actual_total,
        'match': expected_total == actual_total,
        'parts_total': len(parts_info),
        'parts_bad_size': bad[:10],
        'parts_missing': missing[:10],
        'sample_first_5': parts_info[:5],
        'sample_last_3': parts_info[-3:] if len(parts_info) >= 3 else parts_info,
    }


def _action_init(s3):
    """Инициализация: получить размер архива, посчитать кол-во частей."""
    progress = _load_progress(s3)
    if progress and not progress.get('completed'):
        return {'status': 'already_initialized', 'progress': {
            'bytes_uploaded': progress.get('bytes_uploaded', 0),
            'total_size': progress.get('total_size', 0),
            'parts_uploaded': progress.get('parts_uploaded', 0),
        }}

    direct_url = _get_yandex_direct_url()
    head_req = urllib.request.Request(direct_url, method='HEAD', headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(head_req, timeout=30) as r:
        total_size = int(r.headers.get('Content-Length', '0'))

    parts_total = (total_size + PART_SIZE - 1) // PART_SIZE

    progress = {
        'direct_url': direct_url,
        'part_size': PART_SIZE,
        'parts_uploaded': 0,
        'parts_total_expected': parts_total,
        'bytes_uploaded': 0,
        'total_size': total_size,
        'completed': False,
    }
    _save_progress(s3, progress)
    return {
        'status': 'initialized',
        'total_size_mb': round(total_size / 1024 / 1024, 2),
        'parts_total_expected': parts_total,
        'part_size_mb': PART_SIZE / 1024 / 1024,
    }


def _action_chunk(s3, max_seconds: int = 20):
    """Качает несколько частей и сохраняет каждую как отдельный S3-объект."""
    start = time.time()
    progress = _load_progress(s3)
    if not progress:
        return {'error': 'not_initialized'}
    if progress.get('completed'):
        return {'status': 'already_completed'}

    direct_url = progress['direct_url']
    parts_uploaded = progress.get('parts_uploaded', 0)
    bytes_uploaded = progress.get('bytes_uploaded', 0)
    total_size = progress['total_size']
    parts_total = progress['parts_total_expected']

    parts_added = 0
    last_error = None

    while parts_uploaded < parts_total:
        if time.time() - start > max_seconds:
            break

        next_part_num = parts_uploaded + 1
        start_byte = parts_uploaded * PART_SIZE
        end_byte = min(start_byte + PART_SIZE - 1, total_size - 1)

        try:
            req = urllib.request.Request(
                direct_url,
                headers={'Range': f'bytes={start_byte}-{end_byte}', 'User-Agent': 'Mozilla/5.0'},
            )
            with urllib.request.urlopen(req, timeout=90) as resp:
                chunk = resp.read()
        except urllib.error.HTTPError as e:
            if e.code in (403, 410):
                direct_url = _get_yandex_direct_url()
                progress['direct_url'] = direct_url
                _save_progress(s3, progress)
                continue
            last_error = f'HTTP {e.code}: {str(e)[:100]}'
            break
        except Exception as e:
            last_error = f'{type(e).__name__}: {str(e)[:100]}'
            break

        if not chunk:
            break

        # Сохраняем часть как отдельный S3-объект
        s3.put_object(
            Bucket='files',
            Key=_part_key(next_part_num),
            Body=chunk,
            ContentType='application/octet-stream',
        )

        parts_uploaded += 1
        bytes_uploaded += len(chunk)
        parts_added += 1

        progress.update({
            'parts_uploaded': parts_uploaded,
            'bytes_uploaded': bytes_uploaded,
        })
        _save_progress(s3, progress)

    if parts_uploaded >= parts_total and parts_total > 0:
        progress['completed'] = True
        _save_progress(s3, progress)
        return {
            'status': 'completed',
            'total_size_mb': round(total_size / 1024 / 1024, 2),
            'parts_total': parts_uploaded,
        }

    return {
        'status': 'in_progress',
        'parts_uploaded': parts_uploaded,
        'parts_total_expected': parts_total,
        'bytes_uploaded': bytes_uploaded,
        'mb_uploaded': round(bytes_uploaded / 1024 / 1024, 2),
        'percent': round(bytes_uploaded / total_size * 100, 2) if total_size else 0,
        'parts_added_this_call': parts_added,
        'elapsed': round(time.time() - start, 2),
        'last_error': last_error,
    }


def _action_abort(s3):
    """Удалить все части и сбросить прогресс."""
    deleted = 0
    paginator = s3.get_paginator('list_objects_v2')
    for page in paginator.paginate(Bucket='files', Prefix=S3_PARTS_PREFIX):
        for obj in page.get('Contents', []):
            try:
                s3.delete_object(Bucket='files', Key=obj['Key'])
                deleted += 1
            except Exception:
                pass
    try:
        s3.delete_object(Bucket='files', Key=S3_PROGRESS_KEY)
    except Exception:
        pass
    return {'status': 'aborted', 'parts_deleted': deleted}


class OffsetReader(io.RawIOBase):
    """Обёртка над reader, читающая под-диапазон [offset, offset+size)."""

    def __init__(self, base_reader, offset: int, size: int):
        self._base = base_reader
        self._offset = offset
        self._size = size
        self._pos = 0

    def readable(self):
        return True

    def seekable(self):
        return True

    def tell(self):
        return self._pos

    def seek(self, offset, whence=io.SEEK_SET):
        if whence == io.SEEK_SET:
            self._pos = offset
        elif whence == io.SEEK_CUR:
            self._pos += offset
        elif whence == io.SEEK_END:
            self._pos = self._size + offset
        return self._pos

    def read(self, size=-1):
        if self._pos >= self._size:
            return b''
        if size is None or size < 0:
            size = self._size - self._pos
        size = min(size, self._size - self._pos)
        self._base.seek(self._offset + self._pos)
        data = self._base.read(size)
        self._pos += len(data)
        return data


def _open_inner_zip(reader):
    """Открывает внешний zip, находит archive_*.zip внутри (stored), возвращает (inner_offset, inner_size).

    Поскольку внутренний zip stored — его данные лежат непрерывно во внешнем,
    начиная с реального offset (после local file header).
    """
    with zipfile.ZipFile(reader, 'r') as zf:
        for info in zf.infolist():
            if info.filename.endswith('.zip') and not info.is_dir():
                if info.compress_type != 0:
                    raise ValueError(f'Inner zip is not stored (compress_type={info.compress_type})')
                # Реальный offset данных = header_offset + размер local file header
                # Local file header: 30 байт фикс + len(filename) + len(extra)
                reader.seek(info.header_offset + 26)  # пропускаем сигнатуру и флаги
                hdr = reader.read(4)
                fn_len = int.from_bytes(hdr[0:2], 'little')
                extra_len = int.from_bytes(hdr[2:4], 'little')
                data_offset = info.header_offset + 30 + fn_len + extra_len
                return data_offset, info.file_size, info.filename
    raise FileNotFoundError('No inner zip found')


def _action_inspect(s3):
    """Раскрыть внутренний zip и показать структуру."""
    progress = _load_progress(s3)
    if not progress:
        return {'error': 'not_initialized'}

    outer = YandexRangeReader(
        total_size=progress['total_size'],
        direct_url=progress.get('direct_url'),
    )
    inner_offset, inner_size, inner_name = _open_inner_zip(outer)

    inner_reader = OffsetReader(outer, inner_offset, inner_size)
    with zipfile.ZipFile(inner_reader, 'r') as zf:
        infos = zf.infolist()
        sql_files = []
        media_by_ext = {}
        media_total = 0
        dirs = set()
        sample = []
        for info in infos:
            name = info.filename
            if name.endswith('/'):
                continue
            parts = name.split('/')
            for i in range(1, len(parts)):
                dirs.add('/'.join(parts[:i]) + '/')
            ext = (name.rsplit('.', 1)[-1] if '.' in name else '').lower()
            if ext == 'sql':
                sql_files.append({'name': name, 'size': info.file_size, 'compressed': info.compress_size, 'compress_type': info.compress_type})
            else:
                media_by_ext[ext] = media_by_ext.get(ext, 0) + 1
                media_total += info.file_size
            if len(sample) < 20:
                sample.append({'name': name, 'size': info.file_size})

        return {
            'inner_zip_name': inner_name,
            'inner_zip_size_mb': round(inner_size / 1024 / 1024, 2),
            'total_files': len([i for i in infos if not i.filename.endswith('/')]),
            'directories': sorted(dirs)[:30],
            'sql_files': sql_files,
            'media_by_extension': dict(sorted(media_by_ext.items(), key=lambda x: -x[1])),
            'media_total_size_mb': round(media_total / 1024 / 1024, 2),
            'sample_files': sample,
        }


def _action_extract_sql(s3):
    progress = _load_progress(s3)
    if not progress:
        return {'error': 'not_initialized'}

    reader = YandexRangeReader(
        total_size=progress['total_size'],
        direct_url=progress.get('direct_url'),
    )
    with zipfile.ZipFile(reader, 'r') as zf:
        sql_name = None
        for info in zf.infolist():
            if info.filename.lower().endswith('.sql'):
                sql_name = info.filename
                break
        if not sql_name:
            return {'status': 'no_sql_found'}

        with zf.open(sql_name) as f:
            data = f.read()

        s3.put_object(
            Bucket='files',
            Key=S3_DUMP_KEY,
            Body=data,
            ContentType='application/sql',
        )
        return {
            'status': 'extracted',
            'sql_file': sql_name,
            'size_bytes': len(data),
            'size_mb': round(len(data) / 1024 / 1024, 2),
        }


def handler(event: dict, context) -> dict:
    """Управление архивом legacy: status / diag / init / chunk / abort / inspect / extract-sql"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': _cors_headers(), 'body': ''}

    qs = event.get('queryStringParameters') or {}
    action = qs.get('action', 'status')
    s3 = _s3_client()

    try:
        if action == 'status':
            return _json_response(_action_status(s3))
        if action == 'diag':
            return _json_response(_action_diag(s3))
        if action == 'verify':
            return _json_response(_action_verify(s3))
        if action == 'test-read':
            return _json_response(_action_test_read(s3))
        if action == 'test-range':
            return _json_response(_action_test_range(s3))
        if action == 'init':
            return _json_response(_action_init(s3))
        if action == 'chunk':
            max_seconds = int(qs.get('max_seconds', '20'))
            return _json_response(_action_chunk(s3, max_seconds))
        if action == 'abort':
            return _json_response(_action_abort(s3))
        if action == 'inspect':
            return _json_response(_action_inspect(s3))
        if action == 'extract-sql':
            return _json_response(_action_extract_sql(s3))
        return _json_response({'error': 'unknown_action', 'action': action})
    except Exception as e:
        return _json_response({
            'error': type(e).__name__,
            'message': str(e)[:500],
            'trace': traceback.format_exc()[:2000],
            'action': action,
        })