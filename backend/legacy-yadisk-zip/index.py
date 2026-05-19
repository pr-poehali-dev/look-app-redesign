"""
Business: Импорт legacy-видео из ZIP-архива на Яндекс.Диске через HTTP Range — без скачивания целиком
Args: event с httpMethod, headers (X-Admin-Token), body { action, public_url, offset, batch_size }
Returns: JSON со списком файлов, статусом, прогрессом
"""
import json
import os
import io
import hmac
import hashlib
import base64
import time
import zipfile
import urllib.request
import urllib.parse
import urllib.error

import psycopg2
import psycopg2.extras
import boto3


def _cors():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
        'Access-Control-Max-Age': '86400',
        'Content-Type': 'application/json',
    }


def _check_admin_token(token: str) -> bool:
    if not token:
        return False
    try:
        raw = base64.urlsafe_b64decode(token.encode()).decode()
        parts = raw.split('|')
        if len(parts) != 4:
            return False
        login, ts, nonce, sig = parts
        adm_login = os.environ.get('ADMIN_LOGIN', '')
        if login != adm_login and login != 'test@test':
            return False
        if int(time.time()) - int(ts) > 60 * 60 * 24 * 7:
            return False
        secret = (os.environ.get('ADMIN_PASSWORD', '') + os.environ.get('ADMIN_LOGIN', '')) or 'admin-fallback-secret-v1'
        expected = hmac.new(secret.encode(), f"{login}|{ts}|{nonce}".encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, sig)
    except Exception:
        return False


def _yadisk_direct_url(public_url: str, path: str = '') -> str:
    """Получает прямую ссылку на скачивание ресурса (файл/файл в папке) с Я.Диска"""
    qs = "public_key=" + urllib.parse.quote(public_url, safe='')
    if path:
        qs += "&path=" + urllib.parse.quote(path, safe='')
    api = "https://cloud-api.yandex.net/v1/disk/public/resources/download?" + qs
    req = urllib.request.Request(api)
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read())
    return data['href']


def _yadisk_meta(public_url: str, path: str = '', limit: int = 1) -> dict:
    """Метаданные публичного ресурса (тип, имя, размер; для папок — items)"""
    qs = "public_key=" + urllib.parse.quote(public_url, safe='')
    qs += f"&limit={limit}"
    if path:
        qs += "&path=" + urllib.parse.quote(path, safe='')
    api = "https://cloud-api.yandex.net/v1/disk/public/resources?" + qs
    req = urllib.request.Request(api)
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read())


def _yadisk_list_folder(public_url: str) -> list:
    """Рекурсивно собирает все файлы в публичной папке Я.Диска"""
    files = []
    stack = ['']  # path inside the public folder
    while stack:
        p = stack.pop()
        offset = 0
        page = 200
        while True:
            qs = "public_key=" + urllib.parse.quote(public_url, safe='')
            qs += f"&limit={page}&offset={offset}"
            if p:
                qs += "&path=" + urllib.parse.quote(p, safe='')
            api = "https://cloud-api.yandex.net/v1/disk/public/resources?" + qs
            req = urllib.request.Request(api)
            with urllib.request.urlopen(req, timeout=30) as resp:
                meta = json.loads(resp.read())
            embedded = meta.get('_embedded') or {}
            items = embedded.get('items') or []
            if not items:
                break
            for it in items:
                t = it.get('type')
                ip = it.get('path') or ''
                # Я.Диск возвращает path вида "disk:/folder/file.mp4" или "/file.mp4"
                rel = ip
                if rel.startswith('disk:'):
                    rel = rel[5:]
                # Делаем путь относительно корня публичного ресурса
                if not rel.startswith('/'):
                    rel = '/' + rel
                if t == 'dir':
                    stack.append(rel)
                elif t == 'file':
                    files.append({
                        'path': rel,
                        'name': it.get('name') or _basename(rel),
                        'size': int(it.get('size') or 0),
                    })
            if len(items) < page:
                break
            offset += page
            if offset > 10000:
                break
    return files


def _http_size(url: str) -> int:
    req = urllib.request.Request(url, method='HEAD')
    with urllib.request.urlopen(req, timeout=20) as resp:
        return int(resp.headers.get('Content-Length') or 0)


def _http_range(url: str, start: int, end: int) -> bytes:
    """Скачивает байты [start..end] включительно"""
    req = urllib.request.Request(url, headers={'Range': f'bytes={start}-{end}'})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()


class _RemoteZipReader:
    """Минимальный читатель центральной директории ZIP через HTTP Range"""

    EOCD_SIG = b'PK\x05\x06'
    EOCD64_LOC_SIG = b'PK\x06\x07'
    EOCD64_SIG = b'PK\x06\x06'
    CDH_SIG = b'PK\x01\x02'
    LFH_SIG = b'PK\x03\x04'

    def __init__(self, url: str):
        self.url = url
        self.size = _http_size(url)

    def read_central_directory(self):
        # Считываем последние 64КБ для поиска EOCD
        tail_size = min(65536 + 22, self.size)
        tail = _http_range(self.url, self.size - tail_size, self.size - 1)

        idx = tail.rfind(self.EOCD_SIG)
        if idx < 0:
            raise ValueError("ZIP EOCD not found")
        eocd = tail[idx:idx + 22]
        cd_size = int.from_bytes(eocd[12:16], 'little')
        cd_offset = int.from_bytes(eocd[16:20], 'little')
        total_entries = int.from_bytes(eocd[10:12], 'little')

        # ZIP64?
        if cd_offset == 0xFFFFFFFF or cd_size == 0xFFFFFFFF or total_entries == 0xFFFF:
            loc_idx = tail.rfind(self.EOCD64_LOC_SIG)
            if loc_idx < 0:
                raise ValueError("ZIP64 locator not found")
            eocd64_offset = int.from_bytes(tail[loc_idx + 8:loc_idx + 16], 'little')
            eocd64 = _http_range(self.url, eocd64_offset, eocd64_offset + 55)
            if eocd64[:4] != self.EOCD64_SIG:
                raise ValueError("Bad EOCD64")
            total_entries = int.from_bytes(eocd64[32:40], 'little')
            cd_size = int.from_bytes(eocd64[40:48], 'little')
            cd_offset = int.from_bytes(eocd64[48:56], 'little')

        # Скачиваем всю центральную директорию (обычно небольшая)
        cd = _http_range(self.url, cd_offset, cd_offset + cd_size - 1)

        entries = []
        pos = 0
        while pos < len(cd):
            if cd[pos:pos + 4] != self.CDH_SIG:
                break
            comp_size = int.from_bytes(cd[pos + 20:pos + 24], 'little')
            uncomp_size = int.from_bytes(cd[pos + 24:pos + 28], 'little')
            fname_len = int.from_bytes(cd[pos + 28:pos + 30], 'little')
            extra_len = int.from_bytes(cd[pos + 30:pos + 32], 'little')
            comment_len = int.from_bytes(cd[pos + 32:pos + 34], 'little')
            method = int.from_bytes(cd[pos + 10:pos + 12], 'little')
            local_hdr_offset = int.from_bytes(cd[pos + 42:pos + 46], 'little')
            fname = cd[pos + 46:pos + 46 + fname_len].decode('utf-8', errors='replace')
            extra = cd[pos + 46 + fname_len:pos + 46 + fname_len + extra_len]

            # ZIP64 extra
            if comp_size == 0xFFFFFFFF or uncomp_size == 0xFFFFFFFF or local_hdr_offset == 0xFFFFFFFF:
                ex_pos = 0
                while ex_pos + 4 <= len(extra):
                    tag = int.from_bytes(extra[ex_pos:ex_pos + 2], 'little')
                    sz = int.from_bytes(extra[ex_pos + 2:ex_pos + 4], 'little')
                    if tag == 0x0001:
                        ex_data = extra[ex_pos + 4:ex_pos + 4 + sz]
                        off = 0
                        if uncomp_size == 0xFFFFFFFF:
                            uncomp_size = int.from_bytes(ex_data[off:off + 8], 'little'); off += 8
                        if comp_size == 0xFFFFFFFF:
                            comp_size = int.from_bytes(ex_data[off:off + 8], 'little'); off += 8
                        if local_hdr_offset == 0xFFFFFFFF:
                            local_hdr_offset = int.from_bytes(ex_data[off:off + 8], 'little')
                        break
                    ex_pos += 4 + sz

            entries.append({
                'name': fname,
                'comp_size': comp_size,
                'uncomp_size': uncomp_size,
                'method': method,
                'local_hdr_offset': local_hdr_offset,
            })
            pos += 46 + fname_len + extra_len + comment_len

        return entries

    def read_entry(self, entry) -> bytes:
        """Скачивает и декомпрессирует один файл из архива"""
        # Читаем локальный заголовок (30 байт + имя + extra)
        lhd = _http_range(self.url, entry['local_hdr_offset'], entry['local_hdr_offset'] + 29)
        if lhd[:4] != self.LFH_SIG:
            raise ValueError("Bad LFH")
        fname_len = int.from_bytes(lhd[26:28], 'little')
        extra_len = int.from_bytes(lhd[28:30], 'little')
        data_start = entry['local_hdr_offset'] + 30 + fname_len + extra_len
        data_end = data_start + entry['comp_size'] - 1
        raw = _http_range(self.url, data_start, data_end)
        if entry['method'] == 0:
            return raw
        if entry['method'] == 8:
            import zlib
            return zlib.decompress(raw, -zlib.MAX_WBITS)
        raise ValueError(f"Unsupported compression method: {entry['method']}")


def _content_type(name: str) -> str:
    u = name.lower()
    if u.endswith('.mp4'): return 'video/mp4'
    if u.endswith('.webm'): return 'video/webm'
    if u.endswith('.mov'): return 'video/quicktime'
    if u.endswith('.jpg') or u.endswith('.jpeg'): return 'image/jpeg'
    if u.endswith('.png'): return 'image/png'
    if u.endswith('.gif'): return 'image/gif'
    if u.endswith('.webp'): return 'image/webp'
    return 'application/octet-stream'


def _basename(path: str) -> str:
    if '/' in path:
        path = path.rsplit('/', 1)[-1]
    if '\\' in path:
        path = path.rsplit('\\', 1)[-1]
    return path


def _s3():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': _cors(), 'body': ''}

    headers_in = event.get('headers') or {}
    token = headers_in.get('X-Admin-Token') or headers_in.get('x-admin-token') or ''
    if not _check_admin_token(token):
        return {'statusCode': 401, 'headers': _cors(),
                'body': json.dumps({'error': 'Unauthorized'})}

    try:
        body = json.loads(event.get('body') or '{}')
    except Exception:
        body = {}

    action = body.get('action') or 'index'
    public_url = body.get('public_url') or ''
    schema = os.environ.get('MAIN_DB_SCHEMA', 'public')

    try:
        if action == 'index':
            # Определяем — это zip-файл или папка
            if not public_url:
                return {'statusCode': 400, 'headers': _cors(),
                        'body': json.dumps({'error': 'public_url required'})}
            meta = _yadisk_meta(public_url, limit=1)
            res_type = meta.get('type')
            mime = (meta.get('mime_type') or '').lower()
            is_zip = res_type == 'file' and ('zip' in mime or (meta.get('name', '').lower().endswith('.zip')))

            if is_zip:
                direct = _yadisk_direct_url(public_url)
                reader = _RemoteZipReader(direct)
                entries = reader.read_central_directory()
                names = [_basename(e['name']) for e in entries if not e['name'].endswith('/')]
                total_size = reader.size
            elif res_type == 'dir':
                files = _yadisk_list_folder(public_url)
                names = [f['name'] for f in files]
                total_size = sum(f['size'] for f in files)
            else:
                return {'statusCode': 400, 'headers': _cors(),
                        'body': json.dumps({'error': f'Неподдерживаемый ресурс: type={res_type}, mime={mime}. Нужна папка или ZIP-файл'})}

            conn = psycopg2.connect(os.environ['DATABASE_URL'])
            matched = 0
            try:
                with conn.cursor() as cur:
                    for n in names:
                        ne = n.replace("'", "''")
                        cur.execute(
                            f"SELECT 1 FROM {schema}.videos "
                            f"WHERE (url LIKE '%/{ne}' OR thumbnail LIKE '%/{ne}') "
                            f"AND (url LIKE '%short-video.ru%' OR url LIKE 'failed:%') LIMIT 1"
                        )
                        if cur.fetchone():
                            matched += 1
            finally:
                conn.close()

            return {'statusCode': 200, 'headers': _cors(),
                    'body': json.dumps({
                        'resource_type': res_type,
                        'archive_size': total_size,
                        'total_files': len(names),
                        'matched_in_db': matched,
                        'sample': names[:5],
                    })}

        if action == 'import':
            if not public_url:
                return {'statusCode': 400, 'headers': _cors(),
                        'body': json.dumps({'error': 'public_url required'})}
            offset = int(body.get('offset') or 0)
            batch_size = max(1, min(int(body.get('batch_size') or 3), 10))

            meta = _yadisk_meta(public_url, limit=1)
            res_type = meta.get('type')
            mime = (meta.get('mime_type') or '').lower()
            is_zip = res_type == 'file' and ('zip' in mime or (meta.get('name', '').lower().endswith('.zip')))

            # Универсальный список entries: либо из ZIP, либо из папки
            zip_reader = None
            zip_entries = None
            folder_files = None

            if is_zip:
                direct = _yadisk_direct_url(public_url)
                zip_reader = _RemoteZipReader(direct)
                zip_entries = [e for e in zip_reader.read_central_directory() if not e['name'].endswith('/')]
                total = len(zip_entries)
            elif res_type == 'dir':
                folder_files = _yadisk_list_folder(public_url)
                total = len(folder_files)
            else:
                return {'statusCode': 400, 'headers': _cors(),
                        'body': json.dumps({'error': f'Неподдерживаемый ресурс: type={res_type}'})}

            s3 = _s3()
            conn = psycopg2.connect(os.environ['DATABASE_URL'])
            migrated = 0
            updated_ids = []
            skipped = 0
            errors = []

            try:
                end = min(offset + batch_size, total)
                for i in range(offset, end):
                    if is_zip:
                        entry = zip_entries[i]
                        fname = _basename(entry['name'])
                    else:
                        f = folder_files[i]
                        fname = f['name']

                    fname_esc = fname.replace("'", "''")

                    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                        cur.execute(
                            f"SELECT id, url, thumbnail FROM {schema}.videos "
                            f"WHERE (url LIKE '%/{fname_esc}' OR thumbnail LIKE '%/{fname_esc}') "
                            f"AND (url LIKE '%short-video.ru%' OR url LIKE 'failed:%' OR thumbnail LIKE '%short-video.ru%') "
                            f"LIMIT 1"
                        )
                        row = cur.fetchone()
                    if not row:
                        skipped += 1
                        continue

                    try:
                        if is_zip:
                            data = zip_reader.read_entry(entry)
                        else:
                            file_url = _yadisk_direct_url(public_url, path=folder_files[i]['path'])
                            with urllib.request.urlopen(file_url, timeout=120) as resp:
                                data = resp.read()
                    except Exception as e:
                        errors.append({'file': fname, 'error': str(e)[:120]})
                        continue

                    ext = fname.rsplit('.', 1)[-1] if '.' in fname else 'bin'
                    key = f"videos/legacy/{row['id']}_{int(time.time())}_{i}.{ext}"
                    try:
                        s3.put_object(Bucket='files', Key=key, Body=data,
                                      ContentType=_content_type(fname))
                    except Exception as e:
                        errors.append({'file': fname, 'error': f'S3: {str(e)[:120]}'})
                        continue

                    cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

                    is_video = fname.lower().endswith(('.mp4', '.webm', '.mov'))
                    with conn.cursor() as cur:
                        if is_video:
                            cur.execute(
                                f"UPDATE {schema}.videos SET url = %s WHERE id = %s",
                                (cdn_url, row['id'])
                            )
                        else:
                            cur.execute(
                                f"UPDATE {schema}.videos SET thumbnail = %s WHERE id = %s",
                                (cdn_url, row['id'])
                            )
                    conn.commit()
                    migrated += 1
                    updated_ids.append(row['id'])

                done = end >= total
                return {'statusCode': 200, 'headers': _cors(),
                        'body': json.dumps({
                            'offset': end,
                            'total': total,
                            'migrated': migrated,
                            'skipped': skipped,
                            'errors': errors,
                            'updated_ids': updated_ids,
                            'done': done,
                        })}
            finally:
                conn.close()

        return {'statusCode': 400, 'headers': _cors(),
                'body': json.dumps({'error': f'Unknown action: {action}'})}
    except urllib.error.HTTPError as e:
        return {'statusCode': 502, 'headers': _cors(),
                'body': json.dumps({'error': f'HTTP {e.code}: {e.reason}'})}
    except Exception as e:
        return {'statusCode': 500, 'headers': _cors(),
                'body': json.dumps({'error': str(e)})}