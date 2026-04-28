import json
import os
import boto3
import psycopg2
from botocore.config import Config


def handler(event: dict, context) -> dict:
    """Сверяет ссылки в БД с реальными файлами в S3 и помечает hidden=true там,
    где видео не существует. Возвращает статистику."""
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

    obj = s3.get_object(Bucket='files', Key='legacy/media_state.json')
    st = json.loads(obj['Body'].read().decode('utf-8'))
    processed = set(st.get('processed', []))

    schema = os.environ['MAIN_DB_SCHEMA']
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    cur.execute(
        f"SELECT id, video, thumbnail, migrated_to_video_id "
        f"FROM {schema}.legacy_posts WHERE video IS NOT NULL"
    )
    rows = cur.fetchall()

    hide_video_ids = []
    clear_thumb_ids = []
    video_ok = 0
    video_missing = 0
    thumb_missing = 0

    for lp_id, video, thumb, video_row_id in rows:
        v_name = video.rsplit('/', 1)[-1] if video else None
        t_name = thumb.rsplit('/', 1)[-1] if thumb else None
        if v_name and v_name in processed:
            video_ok += 1
        else:
            video_missing += 1
            if video_row_id is not None:
                hide_video_ids.append(video_row_id)
        if t_name and t_name not in processed:
            thumb_missing += 1
            if video_row_id is not None:
                clear_thumb_ids.append(video_row_id)

    apply = (event.get('queryStringParameters') or {}).get('apply') == '1'
    if apply and hide_video_ids:
        ids_csv = ','.join(str(i) for i in hide_video_ids)
        cur.execute(f"UPDATE {schema}.videos SET hidden = TRUE WHERE id IN ({ids_csv})")
    if apply and clear_thumb_ids:
        ids_csv = ','.join(str(i) for i in clear_thumb_ids)
        cur.execute(f"UPDATE {schema}.videos SET thumbnail = NULL WHERE id IN ({ids_csv})")
    if apply:
        conn.commit()

    cur.close()
    conn.close()

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'total_legacy_posts': len(rows),
            'video_ok': video_ok,
            'video_missing': video_missing,
            'thumb_missing': thumb_missing,
            'will_hide_video_ids_count': len(hide_video_ids),
            'will_clear_thumb_ids_count': len(clear_thumb_ids),
            'applied': apply,
        }, ensure_ascii=False)
    }
