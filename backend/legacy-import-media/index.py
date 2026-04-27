import json
import os
import time
import urllib.request
import urllib.parse
import boto3
import psycopg2
from botocore.config import Config


ARCHIVE_PUBLIC_KEY = 'https://disk.yandex.ru/d/4smtv1l8ByTLbQ'
ARCHIVE_LOCAL = '/tmp/uploads.7z'
EXTRACT_DIR = '/tmp/uploads_extract'
STATE_KEY = 'legacy/media_state.json'


def get_yandex_direct_url(public_key: str) -> str:
    api = 'https://cloud-api.yandex.net/v1/disk/public/resources/download?public_key=' + urllib.parse.quote(public_key)
    with urllib.request.urlopen(api, timeout=30) as r:
        data = json.loads(r.read().decode('utf-8'))
    return data['href']


def download_archive(direct_url: str, total_size: int, deadline: float) -> bool:
    """Качает архив в /tmp/uploads.7z. Поддерживает докачку через Range. Возвращает True если полностью скачан."""
    existing = 0
    if os.path.exists(ARCHIVE_LOCAL):
        existing = os.path.getsize(ARCHIVE_LOCAL)
    if existing >= total_size:
        return True

    headers = {}
    if existing > 0:
        headers['Range'] = f'bytes={existing}-'
    req = urllib.request.Request(direct_url, headers=headers)

    chunk_size = 4 * 1024 * 1024
    with urllib.request.urlopen(req, timeout=300) as r, open(ARCHIVE_LOCAL, 'ab') as f:
        while True:
            if time.time() > deadline:
                return False
            chunk = r.read(chunk_size)
            if not chunk:
                break
            f.write(chunk)
    return os.path.getsize(ARCHIVE_LOCAL) >= total_size


def extract_archive_if_needed():
    if os.path.exists(EXTRACT_DIR) and os.listdir(EXTRACT_DIR):
        return
    os.makedirs(EXTRACT_DIR, exist_ok=True)
    import py7zr
    with py7zr.SevenZipFile(ARCHIVE_LOCAL, mode='r') as z:
        z.extractall(EXTRACT_DIR)


def guess_mime(name: str) -> str:
    n = name.lower()
    if n.endswith('.mp4') or n.endswith('.m4v'):
        return 'video/mp4'
    if n.endswith('.mov'):
        return 'video/quicktime'
    if n.endswith('.webm'):
        return 'video/webm'
    if n.endswith('.jpg') or n.endswith('.jpeg'):
        return 'image/jpeg'
    if n.endswith('.png'):
        return 'image/png'
    if n.endswith('.webp'):
        return 'image/webp'
    if n.endswith('.gif'):
        return 'image/gif'
    if n.endswith('.mp3'):
        return 'audio/mpeg'
    if n.endswith('.wav'):
        return 'audio/wav'
    if n.endswith('.aac'):
        return 'audio/aac'
    if n.endswith('.m4a'):
        return 'audio/mp4'
    return 'application/octet-stream'


def find_extracted_root() -> str:
    """Возвращает реальный путь к папке uploads внутри extracted."""
    entries = os.listdir(EXTRACT_DIR)
    # Если есть папка uploads — берём её
    for e in entries:
        full = os.path.join(EXTRACT_DIR, e)
        if os.path.isdir(full) and e.lower() == 'uploads':
            return full
    # Иначе — корень extract — содержит файлы напрямую
    return EXTRACT_DIR


def index_files(cur, root_dir: str):
    """Обходит распакованную папку и создаёт записи в legacy_media_files со статусом pending."""
    cur.execute("SELECT COUNT(*) FROM legacy_media_files")
    if cur.fetchone()[0] > 0:
        return  # уже проиндексировано
    rows = []
    for dirpath, _dirs, files in os.walk(root_dir):
        for fname in files:
            full = os.path.join(dirpath, fname)
            rel = os.path.relpath(full, root_dir)
            # src_path в дампе — 'uploads/<filename>'
            src = 'uploads/' + rel.replace(os.sep, '/')
            try:
                size = os.path.getsize(full)
            except OSError:
                size = 0
            rows.append((src, size))
    # Bulk insert
    if rows:
        from psycopg2.extras import execute_values
        execute_values(
            cur,
            "INSERT INTO legacy_media_files (src_path, size_bytes, status) VALUES %s ON CONFLICT (src_path) DO NOTHING",
            [(r[0], r[1], 'pending') for r in rows],
        )


def upload_pending(cur, s3, root_dir: str, deadline: float, batch_size: int = 50):
    """Загружает pending файлы в S3, обновляет статус. Останавливается по deadline."""
    aws_key = os.environ['AWS_ACCESS_KEY_ID']
    cdn_base = f'https://cdn.poehali.dev/projects/{aws_key}/bucket'
    uploaded = 0
    failed = 0

    while time.time() < deadline:
        cur.execute(
            "SELECT id, src_path FROM legacy_media_files WHERE status = 'pending' ORDER BY id LIMIT %s",
            (batch_size,)
        )
        batch = cur.fetchall()
        if not batch:
            break

        for media_id, src_path in batch:
            if time.time() > deadline:
                break
            # Локальный путь
            rel = src_path[len('uploads/'):] if src_path.startswith('uploads/') else src_path
            local = os.path.join(root_dir, rel)
            if not os.path.exists(local):
                cur.execute(
                    "UPDATE legacy_media_files SET status = 'missing', migrated_at = now() WHERE id = %s",
                    (media_id,)
                )
                failed += 1
                continue
            mime = guess_mime(src_path)
            s3_key = f'legacy/uploads/{rel}'
            try:
                with open(local, 'rb') as f:
                    s3.put_object(Bucket='files', Key=s3_key, Body=f, ContentType=mime)
                cdn_url = f'{cdn_base}/{s3_key}'
                cur.execute(
                    "UPDATE legacy_media_files SET status = 'done', s3_key = %s, cdn_url = %s, mime = %s, migrated_at = now() WHERE id = %s",
                    (s3_key, cdn_url, mime, media_id)
                )
                uploaded += 1
            except Exception as e:
                cur.execute(
                    "UPDATE legacy_media_files SET status = 'error', error = %s, migrated_at = now() WHERE id = %s",
                    (str(e)[:500], media_id)
                )
                failed += 1
        # Коммитим каждый батч, чтобы не терять прогресс
        cur.connection.commit()

    return uploaded, failed


def update_post_paths(cur):
    """Обновляет пути в legacy_posts.video / .thumbnail на CDN-ссылки. И в legacy_users.profile_photo, legacy_sounds.sound/image."""
    cur.execute("""
        UPDATE legacy_posts p
        SET video = m.cdn_url
        FROM legacy_media_files m
        WHERE p.video = m.src_path AND m.status = 'done' AND m.cdn_url IS NOT NULL
          AND p.video NOT LIKE 'https://%'
    """)
    posts_video = cur.rowcount
    cur.execute("""
        UPDATE legacy_posts p
        SET thumbnail = m.cdn_url
        FROM legacy_media_files m
        WHERE p.thumbnail = m.src_path AND m.status = 'done' AND m.cdn_url IS NOT NULL
          AND p.thumbnail NOT LIKE 'https://%'
    """)
    posts_thumb = cur.rowcount
    cur.execute("""
        UPDATE legacy_users u
        SET profile_photo = m.cdn_url
        FROM legacy_media_files m
        WHERE u.profile_photo = m.src_path AND m.status = 'done' AND m.cdn_url IS NOT NULL
          AND u.profile_photo NOT LIKE 'https://%'
    """)
    users_avatar = cur.rowcount
    return {
        'posts_video': posts_video,
        'posts_thumb': posts_thumb,
        'users_avatar': users_avatar,
    }


def handler(event: dict, context) -> dict:
    """Скачивает uploads.7z с Яндекс.Диска, распаковывает в /tmp, льёт каждый файл в S3, обновляет пути в legacy_posts/users.

    Можно вызывать многократно — продолжит с того же места."""
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
    skip_download = qs.get('skip_download') == '1'
    only_paths = qs.get('only_paths') == '1'

    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
        config=Config(signature_version='s3v4', s3={'addressing_style': 'path'}),
    )

    deadline = time.time() + 60 * 11  # 11 минут активной работы

    download_status = 'skipped'
    extracted = False

    if only_paths:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        try:
            with conn.cursor() as cur:
                paths = update_post_paths(cur)
                conn.commit()
            return {
                'statusCode': 200,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'updated_paths': paths}, ensure_ascii=False)
            }
        finally:
            conn.close()

    if not skip_download:
        direct_url = get_yandex_direct_url(ARCHIVE_PUBLIC_KEY)
        # Узнаём общий размер
        req = urllib.request.Request(direct_url, headers={'Range': 'bytes=0-0'})
        with urllib.request.urlopen(req, timeout=30) as r:
            cr = r.headers.get('Content-Range', '')
            total_size = int(cr.split('/')[-1]) if cr and '/' in cr else 0
        if total_size <= 0:
            return {
                'statusCode': 500,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'cannot_get_total_size'})
            }
        downloaded_full = download_archive(direct_url, total_size, deadline)
        download_status = 'completed' if downloaded_full else 'partial'

        if not downloaded_full:
            current = os.path.getsize(ARCHIVE_LOCAL) if os.path.exists(ARCHIVE_LOCAL) else 0
            return {
                'statusCode': 200,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'phase': 'downloading',
                    'downloaded': current,
                    'total': total_size,
                    'percent': round(current * 100.0 / total_size, 2),
                    'message': 'Call function again to continue download',
                }, ensure_ascii=False)
            }

    # Распаковка
    if not os.path.exists(EXTRACT_DIR) or not os.listdir(EXTRACT_DIR):
        try:
            extract_archive_if_needed()
            extracted = True
        except Exception as e:
            return {
                'statusCode': 500,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'extract_failed', 'message': str(e)})
            }
    else:
        extracted = True

    root_dir = find_extracted_root()

    # Индексация и заливка
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        with conn.cursor() as cur:
            index_files(cur, root_dir)
            conn.commit()
            uploaded, failed = upload_pending(cur, s3, root_dir, deadline)
            paths = update_post_paths(cur)
            conn.commit()

            cur.execute("SELECT status, COUNT(*) FROM legacy_media_files GROUP BY status")
            stats = {row[0]: row[1] for row in cur.fetchall()}
    finally:
        conn.close()

    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json; charset=utf-8',
        },
        'body': json.dumps({
            'download_status': download_status,
            'extracted': extracted,
            'uploaded_this_run': uploaded,
            'failed_this_run': failed,
            'updated_paths': paths,
            'media_status_counts': stats,
        }, ensure_ascii=False)
    }
