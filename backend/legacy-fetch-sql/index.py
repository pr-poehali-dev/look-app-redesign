import json
import os
import urllib.request
import urllib.parse
import zipfile
import io
import boto3
from botocore.config import Config


SQL_PUBLIC_KEY = 'https://disk.yandex.ru/d/wGZwwhzGTY-ZQg'
SQL_S3_KEY = 'legacy/dump.sql'
SQL_INFO_KEY = 'legacy/dump_info.json'


def get_yandex_direct_url(public_key: str) -> str:
    api = 'https://cloud-api.yandex.net/v1/disk/public/resources/download?public_key=' + urllib.parse.quote(public_key)
    with urllib.request.urlopen(api, timeout=30) as r:
        data = json.loads(r.read().decode('utf-8'))
    return data['href']


def handler(event: dict, context) -> dict:
    """Качает SQL-дамп с Яндекс.Диска (zip → распаковывает → кладёт в S3 как dump.sql)."""
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

    direct_url = get_yandex_direct_url(SQL_PUBLIC_KEY)
    with urllib.request.urlopen(direct_url, timeout=120) as r:
        zip_data = r.read()

    zf = zipfile.ZipFile(io.BytesIO(zip_data), 'r')
    sql_name = None
    sql_data = None
    for info in zf.infolist():
        if info.filename.lower().endswith('.sql'):
            sql_name = info.filename
            sql_data = zf.read(info)
            break

    if not sql_data:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'no_sql_in_zip', 'files': [i.filename for i in zf.infolist()]})
        }

    s3.put_object(Bucket=bucket, Key=SQL_S3_KEY, Body=sql_data, ContentType='application/sql')
    info = {
        'sql_name': sql_name,
        'sql_size': len(sql_data),
        'zip_size': len(zip_data),
    }
    s3.put_object(Bucket=bucket, Key=SQL_INFO_KEY, Body=json.dumps(info).encode('utf-8'), ContentType='application/json')

    # Превью первых таблиц
    head = sql_data[:50000].decode('utf-8', errors='replace')
    table_names = []
    for line in head.split('\n'):
        l = line.strip()
        if l.startswith('CREATE TABLE'):
            # CREATE TABLE `users` ( ...
            parts = l.split('`')
            if len(parts) > 1:
                table_names.append(parts[1])

    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json; charset=utf-8',
        },
        'body': json.dumps({
            'sql_name': sql_name,
            'sql_size': len(sql_data),
            's3_key': SQL_S3_KEY,
            'preview_tables': table_names,
            'preview_head': head[:2000],
        }, ensure_ascii=False)
    }
