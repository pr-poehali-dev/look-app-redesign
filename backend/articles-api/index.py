import json
import os
import re
import socket
import ipaddress
import urllib.request
import urllib.parse
from html.parser import HTMLParser
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    'Access-Control-Max-Age': '86400',
}

FIELDS = "a.id, a.owner_user_id, a.title, a.cover_image, a.body, a.source_url, a.views, a.created_at, u.name, u.handle, u.avatar, a.kind, a.steps, a.materials, a.duration, a.difficulty"


def _resp(status, payload):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(payload, default=str)}


def _load_steps(raw):
    try:
        data = json.loads(raw) if raw else []
    except Exception:
        return []
    return data if isinstance(data, list) else []


def _clean_steps(raw):
    out = []
    for st in (raw or [])[:30]:
        if not isinstance(st, dict):
            continue
        text = str(st.get('text') or '').strip()[:1500]
        title = str(st.get('title') or '').strip()[:120]
        image = str(st.get('image') or '').strip()[:1000]
        if not text and not title:
            continue
        out.append({'title': title, 'text': text, 'image': image if image.startswith('https://') else ''})
    return out


def _tutorial_fields(body):
    kind = 'tutorial' if body.get('kind') == 'tutorial' else 'article'
    steps = _clean_steps(body.get('steps')) if kind == 'tutorial' else []
    difficulty = body.get('difficulty') if body.get('difficulty') in ('easy', 'medium', 'hard') else None
    return (
        kind,
        json.dumps(steps, ensure_ascii=False) if steps else None,
        str(body.get('materials') or '').strip()[:1500] or None,
        str(body.get('duration') or '').strip()[:40] or None,
        difficulty if kind == 'tutorial' else None,
    ), steps


def _row(r, full=True):
    body = r[4] or ''
    return {
        'id': r[0], 'owner_user_id': r[1], 'title': r[2], 'cover_image': r[3],
        'body': body if full else body[:240], 'source_url': r[5], 'views': r[6],
        'created_at': r[7].isoformat() if r[7] else None,
        'author_name': r[8] or r[9] or 'Автор', 'author_handle': r[9], 'author_avatar': r[10],
        'read_minutes': max(1, round(len(body.split()) / 200)),
        'kind': r[11] or 'article',
        'steps': _load_steps(r[12]) if full else [],
        'steps_count': len(_load_steps(r[12])),
        'materials': r[13] or '',
        'duration': r[14] or '',
        'difficulty': r[15] or '',
    }


class _Extractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = ''
        self.og_title = ''
        self.og_image = ''
        self.og_desc = ''
        self.paragraphs = []
        self._skip = 0
        self._in_title = False
        self._in_p = False
        self._buf = ''

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ('script', 'style', 'noscript', 'nav', 'footer', 'header'):
            self._skip += 1
        if tag == 'title':
            self._in_title = True
        if tag == 'meta':
            p = a.get('property') or a.get('name') or ''
            c = a.get('content') or ''
            if p == 'og:title':
                self.og_title = c
            elif p == 'og:image':
                self.og_image = c
            elif p in ('og:description', 'description') and not self.og_desc:
                self.og_desc = c
        if tag in ('p', 'h1', 'h2', 'h3', 'li', 'blockquote') and not self._skip:
            self._in_p = True
            self._buf = ''

    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'noscript', 'nav', 'footer', 'header') and self._skip:
            self._skip -= 1
        if tag == 'title':
            self._in_title = False
        if tag in ('p', 'h1', 'h2', 'h3', 'li', 'blockquote') and self._in_p:
            t = re.sub(r'\s+', ' ', self._buf).strip()
            if len(t) > 40 or (tag in ('h2', 'h3') and t):
                self.paragraphs.append(t)
            self._in_p = False

    def handle_data(self, data):
        if self._in_title:
            self.title += data
        if self._in_p and not self._skip:
            self._buf += data


def _safe_url(url):
    p = urllib.parse.urlparse(url)
    if p.scheme not in ('http', 'https') or not p.hostname:
        return False
    try:
        for info in socket.getaddrinfo(p.hostname, None):
            ip = ipaddress.ip_address(info[4][0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                return False
    except Exception:
        return False
    return True


def _import_url(url):
    if not _safe_url(url):
        return None, 'Некорректная или недоступная ссылка'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (compatible; ImportBot/1.0)'})
    try:
        with urllib.request.urlopen(req, timeout=4) as resp:
            raw = resp.read(1500000)
            charset = resp.headers.get_content_charset() or 'utf-8'
    except Exception:
        return None, 'Не удалось открыть страницу. Некоторые соцсети закрывают доступ к своему контенту'
    html = raw.decode(charset, errors='ignore')
    ex = _Extractor()
    ex.feed(html)
    title = (ex.og_title or ex.title or '').strip()[:200]
    body = '\n\n'.join(ex.paragraphs) or ex.og_desc
    if not title and not body:
        return None, 'На странице не нашлось текста. Вставьте текст вручную'
    return {'title': title, 'cover_image': ex.og_image or None, 'body': body[:30000], 'source_url': url}, None


def handler(event: dict, context) -> dict:
    """Статьи и длинные посты: feed, user, view, create, update, delete, import_url (импорт статьи по ссылке)"""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    schema = os.environ['MAIN_DB_SCHEMA']
    params = event.get('queryStringParameters') or {}
    headers = event.get('headers') or {}
    user_id = (headers.get('X-User-Id') or headers.get('x-user-id') or '').strip()[:100]
    action = (params.get('action') or '').strip()
    body = json.loads(event.get('body') or '{}') if method in ('POST', 'PUT') else {}

    if action == 'import_url':
        if not user_id:
            return _resp(401, {'error': 'X-User-Id required'})
        data, err = _import_url(str(body.get('url') or '').strip())
        if err:
            return _resp(422, {'error': err})
        return _resp(200, {'article': data})

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    base = f"SELECT {FIELDS} FROM {schema}.articles a LEFT JOIN {schema}.app_users u ON u.id::text = a.owner_user_id"
    try:
        if method == 'GET' and action == 'feed':
            cur.execute(f"{base} WHERE a.status = 'published' ORDER BY a.created_at DESC LIMIT 50")
            return _resp(200, {'articles': [_row(r, False) for r in cur.fetchall()]})

        if method == 'GET' and action == 'user':
            owner = (params.get('user_id') or '').strip()[:100]
            if not owner:
                return _resp(400, {'error': 'user_id required'})
            cur.execute(f"{base} WHERE a.owner_user_id = %s AND a.status = 'published' ORDER BY a.created_at DESC LIMIT 100", (owner,))
            return _resp(200, {'articles': [_row(r, False) for r in cur.fetchall()]})

        if method == 'GET' and action == 'view':
            aid = int(params.get('id') or 0)
            if not aid:
                return _resp(400, {'error': 'id required'})
            cur.execute(f"UPDATE {schema}.articles SET views = views + 1 WHERE id = {aid}")
            conn.commit()
            cur.execute(f"{base} WHERE a.id = {aid}")
            r = cur.fetchone()
            if not r:
                return _resp(404, {'error': 'not found'})
            return _resp(200, {'article': _row(r)})

        if method == 'POST' and action == 'create':
            if not user_id:
                return _resp(401, {'error': 'X-User-Id required'})
            title = str(body.get('title') or '').strip()[:200]
            text = str(body.get('body') or '').strip()[:30000]
            extra, steps = _tutorial_fields(body)
            if extra[0] == 'tutorial':
                if not title or not steps:
                    return _resp(400, {'error': 'Добавьте заголовок и хотя бы один шаг'})
                text = text or title
            elif not title or not text:
                return _resp(400, {'error': 'title and body required'})
            cur.execute(
                f"INSERT INTO {schema}.articles (owner_user_id, title, cover_image, body, source_url, kind, steps, materials, duration, difficulty) "
                f"VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                (user_id, title, str(body.get('cover_image') or '')[:1000] or None, text, str(body.get('source_url') or '')[:1000] or None) + extra
            )
            aid = cur.fetchone()[0]
            conn.commit()
            return _resp(200, {'ok': True, 'id': aid})

        if method == 'PUT' and action == 'update':
            if not user_id:
                return _resp(401, {'error': 'X-User-Id required'})
            aid = int(body.get('id') or 0)
            title = str(body.get('title') or '').strip()[:200]
            text = str(body.get('body') or '').strip()[:30000]
            extra, steps = _tutorial_fields(body)
            if extra[0] == 'tutorial':
                text = text or title
                if not aid or not title or not steps:
                    return _resp(400, {'error': 'id, title and steps required'})
            elif not aid or not title or not text:
                return _resp(400, {'error': 'id, title, body required'})
            cur.execute(
                f"UPDATE {schema}.articles SET title=%s, body=%s, cover_image=%s, kind=%s, steps=%s, materials=%s, duration=%s, difficulty=%s, updated_at=now() "
                f"WHERE id=%s AND owner_user_id=%s",
                (title, text, str(body.get('cover_image') or '')[:1000] or None) + extra + (aid, user_id)
            )
            conn.commit()
            return _resp(200, {'ok': True})

        if method == 'DELETE' and action == 'delete':
            if not user_id:
                return _resp(401, {'error': 'X-User-Id required'})
            aid = int(params.get('id') or 0)
            cur.execute(f"DELETE FROM {schema}.articles WHERE id = {aid} AND owner_user_id = %s", (user_id,))
            conn.commit()
            return _resp(200, {'ok': True})

        return _resp(400, {'error': 'unknown action'})
    finally:
        cur.close()
        conn.close()
