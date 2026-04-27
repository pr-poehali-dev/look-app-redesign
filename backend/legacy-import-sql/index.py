import json
import os
import re
import boto3
import psycopg2
from botocore.config import Config


SQL_S3_KEY = 'legacy/dump.sql'

# Маппинг: legacy_table -> { mysql_table, columns_to_keep, ts_columns }
TABLES_MAP = [
    {
        'mysql': 'tbl_users',
        'pg': 'legacy_users',
        'columns': ['id', 'identity', 'fullname', 'username', 'user_email', 'profile_photo',
                    'login_method', 'bio', 'follower_count', 'following_count', 'is_verify',
                    'is_moderator', 'country', 'city', 'app_language', 'coin_wallet',
                    'created_at', 'updated_at'],
    },
    {
        'mysql': 'tbl_post',
        'pg': 'legacy_posts',
        'columns_alias': {  # mysql_column → pg_column
            'id': 'id',
            'user_id': 'user_id',
            'video': 'video',
            'thumbnail': 'thumbnail',
            'description': 'description',
            'sound_id': 'sound_id',
            'view_count': 'view_count',
            'like_count': 'like_count',
            'comment_count': 'comment_count',
            'share_count': 'share_count',
            'is_private': 'is_private',
            'is_block': 'is_block',
            'created_at': 'created_at',
            'updated_at': 'updated_at',
        },
    },
    {
        'mysql': 'tbl_likes',
        'pg': 'legacy_likes',
        'columns_alias': {
            'id': 'id',
            'post_id': 'post_id',
            'user_id': 'user_id',
            'created_at': 'created_at',
        },
    },
    {
        'mysql': 'tbl_followers',
        'pg': 'legacy_followers',
        'columns_alias': {
            'id': 'id',
            'user_id': 'user_id',
            'follower_id': 'follower_id',
            'created_at': 'created_at',
        },
    },
    {
        'mysql': 'tbl_comments',
        'pg': 'legacy_comments',
        'columns_alias': {
            'id': 'id',
            'post_id': 'post_id',
            'user_id': 'user_id',
            'comment': 'comment',
            'created_at': 'created_at',
        },
    },
    {
        'mysql': 'comment_likes',
        'pg': 'legacy_comment_likes',
        'columns_alias': {
            'id': 'id',
            'comment_id': 'comment_id',
            'user_id': 'user_id',
            'created_at': 'created_at',
        },
    },
    {
        'mysql': 'tbl_hash_tags',
        'pg': 'legacy_hashtags',
        'columns_alias': {
            'id': 'id',
            'name': 'name',
            'post_count': 'post_count',
            'created_at': 'created_at',
        },
    },
    {
        'mysql': 'tbl_sound',
        'pg': 'legacy_sounds',
        'columns_alias': {
            'id': 'id',
            'user_id': 'user_id',
            'name': 'name',
            'artist': 'artist',
            'sound': 'sound',
            'image': 'image',
            'duration': 'duration',
            'created_at': 'created_at',
        },
    },
    {
        'mysql': 'user_links',
        'pg': 'legacy_user_links',
        'columns_alias': {
            'id': 'id',
            'user_id': 'user_id',
            'title': 'title',
            'url': 'url',
            'created_at': 'created_at',
        },
    },
    {
        'mysql': 'post_saves',
        'pg': 'legacy_post_saves',
        'columns_alias': {
            'id': 'id',
            'post_id': 'post_id',
            'user_id': 'user_id',
            'created_at': 'created_at',
        },
    },
]


def parse_mysql_values(values_text: str):
    """Парсит данные после VALUES — список кортежей. Возвращает list of list of строковых литералов."""
    rows = []
    pos = 0
    n = len(values_text)
    while pos < n:
        # Пропускаем пробелы и запятые
        while pos < n and values_text[pos] in ' \t\n\r,':
            pos += 1
        if pos >= n or values_text[pos] != '(':
            break
        pos += 1
        # Парсим поля до закрывающей )
        fields = []
        current = []
        in_string = False
        escape = False
        while pos < n:
            c = values_text[pos]
            if in_string:
                if escape:
                    current.append(c)
                    escape = False
                elif c == '\\':
                    current.append(c)
                    escape = True
                elif c == "'":
                    in_string = False
                    current.append(c)
                else:
                    current.append(c)
                pos += 1
            else:
                if c == "'":
                    in_string = True
                    current.append(c)
                    pos += 1
                elif c == ',':
                    fields.append(''.join(current).strip())
                    current = []
                    pos += 1
                elif c == ')':
                    fields.append(''.join(current).strip())
                    pos += 1
                    rows.append(fields)
                    break
                else:
                    current.append(c)
                    pos += 1
    return rows


def unquote_mysql(literal: str):
    """Преобразует MySQL-литерал в Python-значение."""
    if literal == 'NULL':
        return None
    if literal.startswith("'") and literal.endswith("'"):
        s = literal[1:-1]
        # Обрабатываем escape-последовательности
        out = []
        i = 0
        while i < len(s):
            if s[i] == '\\' and i + 1 < len(s):
                nxt = s[i + 1]
                if nxt == 'n':
                    out.append('\n')
                elif nxt == 't':
                    out.append('\t')
                elif nxt == 'r':
                    out.append('\r')
                elif nxt == "'":
                    out.append("'")
                elif nxt == '"':
                    out.append('"')
                elif nxt == '\\':
                    out.append('\\')
                elif nxt == '0':
                    out.append('\x00')
                else:
                    out.append(nxt)
                i += 2
            elif s[i] == "'" and i + 1 < len(s) and s[i + 1] == "'":
                out.append("'")
                i += 2
            else:
                out.append(s[i])
                i += 1
        return ''.join(out)
    # Число
    try:
        if '.' in literal:
            return float(literal)
        return int(literal)
    except ValueError:
        return literal


def extract_inserts_for_table(sql_text: str, table: str):
    """Возвращает список (column_names, list_of_rows) для всех INSERT INTO `table`."""
    pattern = re.compile(
        r'INSERT INTO `' + re.escape(table) + r'`\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);',
        re.MULTILINE,
    )
    results = []
    for m in pattern.finditer(sql_text):
        cols_str = m.group(1)
        values_str = m.group(2)
        cols = [c.strip().strip('`') for c in cols_str.split(',')]
        rows = parse_mysql_values(values_str)
        parsed_rows = [[unquote_mysql(v) for v in row] for row in rows]
        results.append((cols, parsed_rows))
    return results


def import_table(cursor, sql_text: str, mapping: dict):
    mysql_table = mapping['mysql']
    pg_table = mapping['pg']
    alias = mapping.get('columns_alias')
    if alias is None:
        # Список колонок 1-к-1
        keep = mapping['columns']
        alias = {c: c for c in keep}

    inserts = extract_inserts_for_table(sql_text, mysql_table)
    if not inserts:
        return {'inserted': 0, 'skipped': 0, 'note': 'no_inserts_found'}

    # Очищаем legacy-таблицу перед импортом (идемпотентность)
    cursor.execute(f'TRUNCATE TABLE {pg_table}')

    inserted = 0
    skipped = 0
    for mysql_cols, rows in inserts:
        # Индексы исходных колонок
        idx_map = {col: i for i, col in enumerate(mysql_cols)}
        # Колонки, которые имеем в PG
        pg_cols = []
        src_indices = []
        for mysql_col, pg_col in alias.items():
            if mysql_col in idx_map:
                pg_cols.append(pg_col)
                src_indices.append(idx_map[mysql_col])

        if not pg_cols:
            skipped += len(rows)
            continue

        for row in rows:
            try:
                values = [row[i] if i < len(row) else None for i in src_indices]
                placeholders = ', '.join(['%s'] * len(values))
                col_list = ', '.join(pg_cols)
                cursor.execute(
                    f'INSERT INTO {pg_table} ({col_list}) VALUES ({placeholders}) ON CONFLICT DO NOTHING',
                    values,
                )
                inserted += 1
            except Exception as e:
                skipped += 1

    return {'inserted': inserted, 'skipped': skipped}


def handler(event: dict, context) -> dict:
    """Парсит SQL-дамп из S3 и заливает данные в legacy_* таблицы PostgreSQL."""
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

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = False
    summary = {}
    try:
        with conn.cursor() as cur:
            for mapping in TABLES_MAP:
                try:
                    res = import_table(cur, sql_text, mapping)
                    summary[mapping['pg']] = res
                except Exception as e:
                    summary[mapping['pg']] = {'error': str(e)}
                    conn.rollback()
                    continue
        conn.commit()
    finally:
        conn.close()

    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json; charset=utf-8',
        },
        'body': json.dumps({'summary': summary}, ensure_ascii=False)
    }
