import json
import os
import urllib.request

import boto3
import psycopg2

from faststart import make_faststart

PREFIX = 'https://cdn.poehali.dev/projects/'


def handler(event: dict, context) -> dict:
    """Временная переупаковка старых видео: служебный блок в начало файла"""
    h = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': h, 'body': ''}
    q = event.get('queryStringParameters') or {}
    vid = int(q.get('id', 0))
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    cur.execute("SELECT url FROM videos WHERE id=%d AND type='video'" % vid)
    row = cur.fetchone()
    if not row:
        return {'statusCode': 404, 'headers': h, 'body': json.dumps({'error': 'not found'})}
    url = row[0]
    if '/legacy/' not in url or '/fs_' in url:
        return {'statusCode': 200, 'headers': h, 'body': json.dumps({'skip': True})}
    data = urllib.request.urlopen(url, timeout=20).read()
    fixed = make_faststart(data)
    if fixed is None:
        return {'statusCode': 200, 'headers': h, 'body': json.dumps({'skip': 'already ok'})}
    key = 'videos/legacy/fs_' + url.rsplit('/', 1)[1]
    s3 = boto3.client('s3', endpoint_url='https://bucket.poehali.dev',
                      aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                      aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])
    s3.put_object(Bucket='files', Key=key, Body=fixed, ContentType='video/mp4')
    new_url = PREFIX + os.environ['AWS_ACCESS_KEY_ID'] + '/bucket/' + key
    cur.execute("UPDATE videos SET url='%s' WHERE id=%d" % (new_url, vid))
    conn.commit()
    return {'statusCode': 200, 'headers': h, 'body': json.dumps({'ok': True, 'url': new_url})}
