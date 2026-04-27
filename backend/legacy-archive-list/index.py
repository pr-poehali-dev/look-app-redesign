import json
import os
import urllib.request
import urllib.parse
import io
import zipfile
import boto3
from botocore.config import Config


YANDEX_PUBLIC_KEY = 'https://disk.yandex.ru/d/2E-FYaSBeKK80w'
MANIFEST_KEY = 'legacy/manifest.json'
URL_CACHE_KEY = 'legacy/yandex_url.json'


def get_yandex_direct_url() -> str:
    api = 'https://cloud-api.yandex.net/v1/disk/public/resources/download?public_key=' + urllib.parse.quote(YANDEX_PUBLIC_KEY)
    with urllib.request.urlopen(api, timeout=30) as r:
        data = json.loads(r.read().decode('utf-8'))
    href = data.get('href')
    if not href:
        raise RuntimeError('Yandex API did not return href')
    return href


def fetch_range(url: str, start: int, end: int) -> bytes:
    req = urllib.request.Request(url, headers={'Range': f'bytes={start}-{end}'})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def get_total_size(url: str) -> int:
    req = urllib.request.Request(url, headers={'Range': 'bytes=0-0'})
    with urllib.request.urlopen(req, timeout=30) as r:
        cr = r.headers.get('Content-Range', '')
        if cr and '/' in cr:
            return int(cr.split('/')[-1])
    return 0


class HTTPRangeFile:
    """Файлоподобный объект, который читает данные из HTTP-источника через Range запросы. Достаточно для zipfile.ZipFile.

    Поддерживает offset и size_limit для работы с подмножеством файла (вложенные архивы)."""
    def __init__(self, url: str, total_size: int, offset: int = 0, size_limit: int = None):
        self.url = url
        self.offset = offset
        self.size = size_limit if size_limit is not None else (total_size - offset)
        self.pos = 0

    def seek(self, offset, whence=0):
        if whence == 0:
            self.pos = offset
        elif whence == 1:
            self.pos += offset
        elif whence == 2:
            self.pos = self.size + offset
        return self.pos

    def tell(self):
        return self.pos

    def read(self, n=-1):
        if n < 0:
            end = self.size - 1
        else:
            end = min(self.pos + n - 1, self.size - 1)
        if self.pos > end:
            return b''
        abs_start = self.offset + self.pos
        abs_end = self.offset + end
        data = fetch_range(self.url, abs_start, abs_end)
        self.pos = end + 1
        return data

    def readable(self):
        return True

    def seekable(self):
        return True


import struct


def find_inner_zip_offset(direct_url: str, base_offset: int, nested_info: 'zipfile.ZipInfo') -> int:
    """Возвращает абсолютное смещение начала данных файла, читая local file header через отдельный HTTP Range.

    Local file header: signature(4) + version(2) + flags(2) + method(2) + time(2) + date(2) + crc(4) + compsize(4) + uncompsize(4) + name_len(2) + extra_len(2) = 30 bytes."""
    abs_header_offset = base_offset + nested_info.header_offset
    header = fetch_range(direct_url, abs_header_offset, abs_header_offset + 29)
    if len(header) < 30 or header[:4] != b'PK\x03\x04':
        raise RuntimeError(f'invalid local file header at {abs_header_offset}, got {header[:8]!r}')
    name_len = struct.unpack('<H', header[26:28])[0]
    extra_len = struct.unpack('<H', header[28:30])[0]
    return abs_header_offset + 30 + name_len + extra_len


def handler(event: dict, context) -> dict:
    """Читает central directory ZIP-архива с Яндекс.Диска через HTTP Range и сохраняет список файлов в S3 (manifest.json)."""
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

    direct_url = get_yandex_direct_url()
    total_size = get_total_size(direct_url)
    if total_size <= 0:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'cannot_get_total_size'})
        }

    # Кешируем URL и размер в S3, чтобы другие функции могли использовать
    s3.put_object(
        Bucket=bucket,
        Key=URL_CACHE_KEY,
        Body=json.dumps({'url': direct_url, 'size': total_size}).encode('utf-8'),
        ContentType='application/json',
    )

    rf = HTTPRangeFile(direct_url, total_size)
    outer_zip = zipfile.ZipFile(rf, 'r')

    # Архив-матрёшка: возможно внутри ещё ZIP. Раскрываем второй слой, если он есть.
    nesting = []
    inner_zip = outer_zip
    inner_fp = rf
    inner_offset_in_yandex = 0  # смещение начала данных текущего ZIP во внешнем потоке
    inner_size = total_size

    debug_info = []
    while True:
        infos = inner_zip.infolist()
        non_dirs = [i for i in infos if not i.is_dir()]
        debug_info.append({
            'all_count': len(infos),
            'non_dir_count': len(non_dirs),
            'first_name': non_dirs[0].filename if non_dirs else None,
            'first_method': non_dirs[0].compress_type if non_dirs else None,
            'first_size': non_dirs[0].file_size if non_dirs else None,
        })
        if len(non_dirs) == 1 and non_dirs[0].filename.lower().endswith('.zip') and non_dirs[0].compress_type == zipfile.ZIP_STORED:
            nested_info = non_dirs[0]
            new_abs_offset = find_inner_zip_offset(direct_url, inner_offset_in_yandex, nested_info)
            new_size = nested_info.file_size
            nesting.append({
                'name': nested_info.filename,
                'offset': new_abs_offset,
                'size': new_size,
            })
            sub_rf = HTTPRangeFile(direct_url, total_size, offset=new_abs_offset, size_limit=new_size)
            inner_zip = zipfile.ZipFile(sub_rf, 'r')
            inner_fp = sub_rf
            inner_offset_in_yandex = new_abs_offset
            inner_size = new_size
            if len(nesting) >= 5:
                break
        else:
            break

    files = []
    sql_files = []
    by_extension = {}
    for info in inner_zip.infolist():
        if info.is_dir():
            continue
        ext = info.filename.split('.')[-1].lower() if '.' in info.filename else ''
        by_extension[ext] = by_extension.get(ext, 0) + 1
        item = {
            'name': info.filename,
            'size': info.file_size,
            'compressed': info.compress_size,
            'method': info.compress_type,
            'crc': info.CRC,
            'header_offset': info.header_offset,  # относительно начала текущего ZIP
        }
        files.append(item)
        if ext == 'sql':
            sql_files.append(item)

    manifest = {
        'archive_size': total_size,
        'total_files': len(files),
        'extensions': by_extension,
        'sql_files': sql_files,
        'nesting': nesting,
        'inner_offset_in_yandex': inner_offset_in_yandex,
        'inner_size': inner_size,
        'files': files,
    }

    s3.put_object(
        Bucket=bucket,
        Key=MANIFEST_KEY,
        Body=json.dumps(manifest, ensure_ascii=False).encode('utf-8'),
        ContentType='application/json',
    )

    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json; charset=utf-8',
        },
        'body': json.dumps({
            'archive_size': total_size,
            'total_files': len(files),
            'extensions': by_extension,
            'sql_files': sql_files[:10],
            'sample_files': files[:20],
            'nesting': nesting,
            'debug': debug_info,
            's3_manifest': MANIFEST_KEY,
        }, ensure_ascii=False)
    }