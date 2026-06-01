import json
import os
import uuid
import urllib.request
import urllib.parse

import boto3
import psycopg2
import cv2
import numpy as np


ALLOWED_HOSTS = ('cdn.poehali.dev', 's3.poehali.dev', 'bucket.poehali.dev')
BUCKET = 'files'


def _cors():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
    }


def _s3():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )


def handler(event: dict, context) -> dict:
    """Генерация thumbnail для видео на сервере через OpenCV.
    Скачивает видео, снимает кадр, сохраняет в S3, обновляет БД."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': _cors(), 'body': ''}

    try:
        body = json.loads(event.get('body') or '{}')
    except Exception:
        return {'statusCode': 400, 'headers': _cors(), 'body': json.dumps({'error': 'bad json'})}

    video_url = body.get('video_url', '')
    video_id = body.get('video_id')

    if not video_url or not video_id:
        return {'statusCode': 400, 'headers': _cors(),
                'body': json.dumps({'error': 'video_url and video_id required'})}

    parsed = urllib.parse.urlparse(video_url)
    if parsed.hostname not in ALLOWED_HOSTS:
        return {'statusCode': 403, 'headers': _cors(), 'body': json.dumps({'error': 'host not allowed'})}

    tmp_video = f'/tmp/{uuid.uuid4().hex}.mp4'

    try:
        # Скачиваем видео во временный файл (server-side, без CORS)
        req = urllib.request.Request(video_url, headers={'User-Agent': 'Look-Thumb/1.0'})
        with urllib.request.urlopen(req, timeout=25) as resp:
            with open(tmp_video, 'wb') as f:
                f.write(resp.read())

        # Открываем видео через OpenCV и берём кадр
        cap = cv2.VideoCapture(tmp_video)
        if not cap.isOpened():
            return {'statusCode': 500, 'headers': _cors(),
                    'body': json.dumps({'error': 'cannot open video'})}

        fps = cap.get(cv2.CAP_PROP_FPS) or 25
        total = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0
        # Берём кадр примерно на 1 секунде (или ближе к началу для коротких)
        target = int(min(fps, max(0, total - 1)))
        cap.set(cv2.CAP_PROP_POS_FRAMES, target)
        ok, frame = cap.read()
        if not ok or frame is None:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ok, frame = cap.read()
        cap.release()

        if not ok or frame is None:
            return {'statusCode': 500, 'headers': _cors(),
                    'body': json.dumps({'error': 'cannot read frame'})}

        # Масштабируем до ширины 720
        h, w = frame.shape[:2]
        if w > 720:
            nh = int(h * 720 / w)
            frame = cv2.resize(frame, (720, nh), interpolation=cv2.INTER_AREA)

        ok2, buf = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 82])
        if not ok2:
            return {'statusCode': 500, 'headers': _cors(),
                    'body': json.dumps({'error': 'encode failed'})}
        thumb_bytes = buf.tobytes()

        # Сохраняем в S3
        thumb_key = f'thumbs/{uuid.uuid4().hex}.jpg'
        _s3().put_object(Bucket=BUCKET, Key=thumb_key, Body=thumb_bytes, ContentType='image/jpeg')
        thumb_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{thumb_key}"

        # Обновляем БД
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        try:
            cur.execute("UPDATE videos SET thumbnail = %s WHERE id = %s AND thumbnail IS NULL",
                        (thumb_url, int(video_id)))
            conn.commit()
        finally:
            cur.close()
            conn.close()

        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'ok': True, 'thumb': thumb_url})}

    except Exception as e:
        return {'statusCode': 500, 'headers': _cors(), 'body': json.dumps({'error': str(e)[:200]})}
    finally:
        try:
            if os.path.exists(tmp_video):
                os.remove(tmp_video)
        except Exception:
            pass
