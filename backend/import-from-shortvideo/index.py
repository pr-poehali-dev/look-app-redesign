import json
import os
import psycopg2
import pymysql

def handler(event: dict, context) -> dict:
    """Импорт видео и пользователей из MySQL БД short-video.ru в локальную PostgreSQL"""
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
            'body': ''
        }

    # Подключаемся к MySQL short-video.ru
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

    imported_videos = 0
    imported_users = 0

    try:
        with mysql.cursor() as cur:
            # Получаем видео-посты
            cur.execute("""
                SELECT p.id, p.post_file, p.post_description, p.likes_count, p.comments_count,
                       u.username, u.name, u.profile_image
                FROM tbl_posts p
                LEFT JOIN tbl_users u ON p.user_id = u.id
                WHERE p.post_type = 'video'
                ORDER BY p.id DESC
                LIMIT 200
            """)
            videos = cur.fetchall()

            # Получаем пользователей
            cur.execute("""
                SELECT id, username, name, profile_image, followers_count, following_count, bio
                FROM tbl_users
                ORDER BY id DESC
                LIMIT 500
            """)
            users = cur.fetchall()
    finally:
        mysql.close()

    # Сохраняем в PostgreSQL
    pg = psycopg2.connect(os.environ['DATABASE_URL'])
    pg_cur = pg.cursor()

    for v in videos:
        url = v.get('post_file') or ''
        if not url:
            continue
        if not url.startswith('http'):
            url = 'https://short-video.ru/uploads/' + url

        avatar = v.get('profile_image') or ''
        if avatar and not avatar.startswith('http'):
            avatar = 'https://short-video.ru/uploads/' + avatar

        pg_cur.execute("""
            INSERT INTO videos (url, thumbnail, author, handle, description, category, type, likes, comments, shares, user_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """, (
            url,
            avatar,
            v.get('name') or v.get('username') or 'Пользователь',
            v.get('username') or 'user',
            v.get('post_description') or '',
            'humor',
            'video',
            int(v.get('likes_count') or 0),
            int(v.get('comments_count') or 0),
            0,
            str(v.get('user_id') or 'imported'),
        ))
        imported_videos += 1

    pg.commit()
    pg_cur.close()
    pg.close()

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'success': True,
            'imported_videos': imported_videos,
            'imported_users': imported_users,
            'mysql_videos_found': len(videos),
            'mysql_users_found': len(users),
        })
    }
