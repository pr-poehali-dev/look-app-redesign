import json
import os
import pymysql


def handler(event: dict, context) -> dict:
    """Разведывательная функция: показывает все таблицы и колонки MySQL beget'а short-video.ru"""
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

    mysql = pymysql.connect(
        host='alexei3y.beget.tech',
        port=3306,
        user='alexei3y_tiktoks',
        password=os.environ['SHORT_VIDEO_DB_PASSWORD'],
        database='alexei3y_tiktoks',
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=10,
    )

    result = {}

    try:
        with mysql.cursor() as cur:
            cur.execute("SHOW TABLES")
            tables_raw = cur.fetchall()
            tables = [list(t.values())[0] for t in tables_raw]

            for table in tables:
                cur.execute(f"DESCRIBE `{table}`")
                columns = cur.fetchall()
                cur.execute(f"SELECT COUNT(*) AS cnt FROM `{table}`")
                count_row = cur.fetchone()
                count = count_row['cnt'] if count_row else 0

                cur.execute(f"SELECT * FROM `{table}` LIMIT 1")
                sample = cur.fetchone() or {}
                sample_clean = {}
                for k, v in sample.items():
                    if isinstance(v, (bytes, bytearray)):
                        try:
                            v = v.decode('utf-8', errors='replace')
                        except Exception:
                            v = '<binary>'
                    if hasattr(v, 'isoformat'):
                        v = v.isoformat()
                    if isinstance(v, str) and len(v) > 200:
                        v = v[:200] + '...'
                    sample_clean[k] = v

                result[table] = {
                    'rows': count,
                    'columns': [
                        {
                            'name': c['Field'],
                            'type': c['Type'],
                            'null': c['Null'],
                            'key': c['Key'],
                        }
                        for c in columns
                    ],
                    'sample': sample_clean,
                }
    finally:
        mysql.close()

    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json; charset=utf-8',
        },
        'body': json.dumps(result, ensure_ascii=False, default=str)
    }
