import json
import os
import re
import boto3
from botocore.config import Config


SQL_S3_KEY = 'legacy/dump.sql'


def handler(event: dict, context) -> dict:
    """Достаёт SQL-дамп из S3, парсит структуру: список всех таблиц и CREATE TABLE для запрошенных."""
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
    obj = s3.get_object(Bucket='files', Key=SQL_S3_KEY)
    sql_text = obj['Body'].read().decode('utf-8', errors='replace')

    # Все CREATE TABLE
    create_re = re.compile(r'CREATE TABLE `(\w+)` \(([\s\S]*?)\) ENGINE', re.MULTILINE)
    creates = {}
    for m in create_re.finditer(sql_text):
        creates[m.group(1)] = m.group(2).strip()

    # Подсчёт INSERT INTO ... строк по таблицам
    counts = {}
    for table in creates.keys():
        # Грубая оценка — считаем строки в INSERT'ах по разделителю '),(' или '),\n('
        # Точнее: ищем INSERT INTO `table` ... VALUES <data>;
        pattern = re.compile(r'INSERT INTO `' + re.escape(table) + r'`[^;]*?VALUES\s*([\s\S]*?);', re.MULTILINE)
        total_rows = 0
        for ins in pattern.finditer(sql_text):
            data = ins.group(1)
            # Считаем кол-во строк по тому, сколько раз встречается '),(' плюс 1
            total_rows += data.count('),(') + 1 if data.strip() else 0
        counts[table] = total_rows

    qs = event.get('queryStringParameters') or {}
    show = qs.get('show', '')
    raw = qs.get('raw', '')
    sample = qs.get('sample', '')

    if raw and raw in creates:
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'text/plain; charset=utf-8',
            },
            'body': creates[raw]
        }

    if sample:
        # Возвращаем все INSERT INTO для таблицы
        pattern = re.compile(r'INSERT INTO `' + re.escape(sample) + r'`[\s\S]*?;', re.MULTILINE)
        all_inserts = '\n\n'.join(m.group(0) for m in pattern.finditer(sql_text))
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'text/plain; charset=utf-8',
            },
            'body': all_inserts[:30000]
        }

    show_creates = {}
    if show:
        for t in show.split(','):
            t = t.strip()
            if t in creates:
                show_creates[t] = creates[t]

    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json; charset=utf-8',
        },
        'body': json.dumps({
            'sql_size': len(sql_text),
            'tables': sorted(creates.keys()),
            'row_counts': counts,
            'creates': show_creates,
        }, ensure_ascii=False)
    }