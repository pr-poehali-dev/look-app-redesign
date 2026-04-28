import json
import os
import time
import boto3
import psycopg2
from botocore.config import Config


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


def s3_client():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
        config=Config(signature_version='s3v4', s3={'addressing_style': 'path'}),
    )


def s3_exists(s3, key: str) -> bool:
    try:
        s3.head_object(Bucket='files', Key=key)
        return True
    except Exception:
        return False


def url_to_key(url: str) -> str:
    marker = '/bucket/'
    i = url.find(marker)
    if i < 0:
        return ''
    return url[i + len(marker):]


def handler(event: dict, context) -> dict:
    """Управление скрытием legacy-видео по наличию файла в S3. Параметры: ?action=hide_missing|unhide_present (по умолчанию hide_missing); ?dry=1 — только посчитать; ?timeout=N."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors(), 'body': ''}

    qs = event.get('queryStringParameters') or {}
    action = qs.get('action', 'hide_missing')
    dry = qs.get('dry') == '1'
    timeout_sec = int(qs.get('timeout', '25'))
    deadline = time.time() + timeout_sec

    s3 = s3_client()
    schema = os.environ['MAIN_DB_SCHEMA']
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    cur.execute(
        f"SELECT v.id, v.url, v.hidden, lp.is_private, lp.is_block FROM {schema}.videos v "
        f"JOIN {schema}.legacy_posts lp ON lp.migrated_to_video_id = v.id "
        f"WHERE v.url LIKE '%%cdn.poehali.dev%%legacy/uploads/%%' "
        f"ORDER BY v.id"
    )
    rows = cur.fetchall()

    checked = 0
    missing_ids = []
    present_ids = []
    to_hide = []
    to_unhide = []

    for vid, url, hidden, is_private, is_block in rows:
        if time.time() > deadline:
            break
        key = url_to_key(url)
        if not key:
            continue
        checked += 1
        exists = s3_exists(s3, key)
        if exists:
            present_ids.append(vid)
            if hidden and not is_private and not is_block:
                to_unhide.append(vid)
        else:
            missing_ids.append(vid)
            if not hidden:
                to_hide.append(vid)

    updated = 0
    if not dry:
        if action == 'hide_missing' and to_hide:
            cur.execute(
                f"UPDATE {schema}.videos SET hidden = TRUE WHERE id = ANY(%s)",
                (to_hide,),
            )
            updated = cur.rowcount
            conn.commit()
        elif action == 'unhide_present' and to_unhide:
            cur.execute(
                f"UPDATE {schema}.videos SET hidden = FALSE WHERE id = ANY(%s)",
                (to_unhide,),
            )
            updated = cur.rowcount
            conn.commit()

    cur.close()
    conn.close()

    return jr({
        'action': action,
        'total_rows': len(rows),
        'checked': checked,
        'present': len(present_ids),
        'missing': len(missing_ids),
        'to_hide_count': len(to_hide),
        'to_unhide_count': len(to_unhide),
        'updated': updated,
        'dry': dry,
        'sample_to_unhide': to_unhide[:20],
    })