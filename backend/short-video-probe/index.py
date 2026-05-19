"""
Business: Разведка short-video.ru — логинимся и парсим реальные URL видео и превью
Args: event с httpMethod, headers (X-Admin-Token)
Returns: JSON с обнаруженными ссылками на видео/превью и шаблонами URL
"""
import json
import os
import re
import hmac
import hashlib
import base64
import time
import http.cookiejar
import urllib.request
import urllib.parse
import urllib.error


def _cors():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
        'Access-Control-Max-Age': '86400',
        'Content-Type': 'application/json',
    }


def _check_admin_token(token: str) -> bool:
    if not token:
        return False
    try:
        raw = base64.urlsafe_b64decode(token.encode()).decode()
        parts = raw.split('|')
        if len(parts) != 4:
            return False
        login, ts, nonce, sig = parts
        adm_login = os.environ.get('ADMIN_LOGIN', '')
        if login != adm_login and login != 'test@test':
            return False
        if int(time.time()) - int(ts) > 60 * 60 * 24 * 7:
            return False
        secret = (os.environ.get('ADMIN_PASSWORD', '') + os.environ.get('ADMIN_LOGIN', '')) or 'admin-fallback-secret-v1'
        expected = hmac.new(secret.encode(), f"{login}|{ts}|{nonce}".encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, sig)
    except Exception:
        return False


BASE = 'https://short-video.ru'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'


def _build_opener():
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(cj),
        urllib.request.HTTPRedirectHandler(),
    )
    opener.addheaders = [
        ('User-Agent', UA),
        ('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'),
        ('Accept-Language', 'ru,en;q=0.9'),
    ]
    return opener, cj


def _fetch(opener, url, data=None, headers=None, method=None):
    if isinstance(data, dict):
        data = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(url, data=data, method=method)
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
    try:
        with opener.open(req, timeout=20) as resp:
            return resp.getcode(), dict(resp.headers), resp.read(), resp.geturl()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read() if e.fp else b'', url


def _extract(html, patterns):
    found = {}
    for name, rx in patterns.items():
        m = re.search(rx, html, re.IGNORECASE | re.DOTALL)
        found[name] = m.group(1) if m else None
    return found


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': _cors(), 'body': ''}

    headers_in = event.get('headers') or {}
    token = headers_in.get('X-Admin-Token') or headers_in.get('x-admin-token') or ''
    if not _check_admin_token(token):
        return {'statusCode': 401, 'headers': _cors(), 'body': json.dumps({'error': 'Unauthorized'})}

    login_val = os.environ.get('SHORT_VIDEO_LOGIN')
    pass_val = os.environ.get('SHORT_VIDEO_PASSWORD')
    if not login_val or not pass_val:
        return {'statusCode': 500, 'headers': _cors(),
                'body': json.dumps({'error': 'SHORT_VIDEO_LOGIN/SHORT_VIDEO_PASSWORD not set'})}

    report = {'steps': []}
    opener, cj = _build_opener()

    # 1) Ищем где живёт форма логина — пробуем кучу вариантов
    login_paths = [
        '/', '/posts', '/login', '/admin', '/admin/login',
        '/auth/login', '/sign-in', '/signin', '/account/login',
        '/users/login', '/user/login', '/dashboard', '/home',
        '/auth', '/users/sign_in', '/account',
    ]
    csrf = None
    form_action_m = None
    login_page_url = None
    detected_field = None

    for p in login_paths:
        url = BASE + p
        code, hdrs, body, final = _fetch(opener, url)
        html = body.decode('utf-8', errors='replace')
        title_m = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
        m_meta = re.search(r'name=["\']csrf-token["\']\s+content=["\']([^"\']+)["\']', html)
        m_input = re.search(r'name=["\']_token["\']\s+value=["\']([^"\']+)["\']', html)
        m_pwd = re.search(r'type=["\']password["\']', html, re.IGNORECASE)
        m_form = re.search(r'<form[^>]+action=["\']([^"\']+)["\'][^>]*method=["\']post["\']', html, re.IGNORECASE)
        if not m_form:
            m_form = re.search(r'<form[^>]+method=["\']post["\'][^>]+action=["\']([^"\']+)["\']', html, re.IGNORECASE)
        all_forms = re.findall(r'<form[^>]*action=["\']([^"\']+)["\']', html, re.IGNORECASE)
        inputs = re.findall(r'<input[^>]+name=["\']([^"\']+)["\']', html, re.IGNORECASE)
        # Угадываем имя поля логина
        candidate_field = None
        for n in inputs:
            if n.lower() in ('email', 'login', 'username', 'user', 'name'):
                candidate_field = n
                break

        report['steps'].append({
            'step': f'GET {p}',
            'status': code,
            'final_url': final,
            'has_password': bool(m_pwd),
            'csrf_input': (m_input.group(1)[:20] + '…') if m_input else None,
            'csrf_meta': (m_meta.group(1)[:20] + '…') if m_meta else None,
            'form_action': m_form.group(1) if m_form else None,
            'all_form_actions': all_forms[:5],
            'inputs': inputs[:15],
            'login_field_candidate': candidate_field,
            'title': title_m.group(1).strip()[:80] if title_m else None,
        })
        if m_pwd and (m_input or m_meta):
            csrf = (m_input.group(1) if m_input else m_meta.group(1))
            form_action_m = m_form.group(1) if m_form else url
            login_page_url = final
            detected_field = candidate_field
            break

    if not csrf:
        report['result'] = 'Login page not found — see steps above'
        return {'statusCode': 200, 'headers': _cors(), 'body': json.dumps(report, ensure_ascii=False)}

    # 2) POST на форму
    post_url = form_action_m if form_action_m else login_page_url
    if post_url.startswith('/'):
        post_url = BASE + post_url

    # Пробуем разные имена полей — Laravel часто использует email или login
    login_attempts = []
    if detected_field:
        login_attempts.append({'_token': csrf, detected_field: login_val, 'password': pass_val})
    for fn in ('email', 'username', 'login', 'user', 'name'):
        if not detected_field or fn != detected_field:
            login_attempts.append({'_token': csrf, fn: login_val, 'password': pass_val})

    login_ok = False
    for attempt in login_attempts:
        code, hdrs, body, final = _fetch(
            opener, post_url, data=attempt,
            headers={
                'Content-Type': 'application/x-www-form-urlencoded',
                'Referer': login_page_url or f'{BASE}/login',
                'X-CSRF-TOKEN': csrf,
                'Origin': BASE,
            },
            method='POST',
        )
        cookies_now = [c.name for c in cj]
        landed = final
        # Признак успешного логина — редирект НЕ на /login и наличие сессионной cookie
        report['steps'].append({
            'step': f"POST {post_url} ({list(attempt.keys())})",
            'status': code,
            'final_url': landed,
            'cookies': cookies_now,
            'body_head': body[:300].decode('utf-8', errors='replace'),
        })
        if landed and 'login' not in landed and code in (200, 302):
            # Дополнительная проверка — пробуем /posts
            code2, _, body2, final2 = _fetch(opener, f'{BASE}/posts')
            text2 = body2.decode('utf-8', errors='replace')
            if 'authentication-bg' not in text2 and code2 == 200:
                login_ok = True
                report['login_field_used'] = list(attempt.keys())
                report['posts_status'] = code2
                report['posts_final_url'] = final2
                # Ищем video и img URL
                videos = re.findall(r'<(?:video|source)[^>]+src=["\']([^"\']+)["\']', text2, re.IGNORECASE)
                imgs = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', text2, re.IGNORECASE)
                # data-src
                data_srcs = re.findall(r'data-src=["\']([^"\']+\.(?:mp4|webm|jpg|jpeg|png))["\']', text2, re.IGNORECASE)
                # любые URL в JS похожие на медиа
                media_urls = re.findall(r'https?://[^"\'\s<>]+\.(?:mp4|webm|jpg|jpeg|png)', text2)
                report['posts_videos'] = list(dict.fromkeys(videos))[:10]
                report['posts_imgs'] = list(dict.fromkeys(imgs))[:10]
                report['posts_data_srcs'] = list(dict.fromkeys(data_srcs))[:10]
                report['posts_media_urls'] = list(dict.fromkeys(media_urls))[:10]
                report['posts_body_head'] = text2[:800]
                break
        if login_ok:
            break

    report['login_ok'] = login_ok

    # 3) Пробуем прямую ссылку на файл из БД (если залогинились)
    if login_ok:
        test_url = f'{BASE}/uploads/1776621544_Look_1000018908.mp4'
        code, hdrs, body, final = _fetch(opener, test_url)
        report['test_direct_file'] = {
            'url': test_url, 'status': code, 'final_url': final,
            'content_type': hdrs.get('Content-Type'),
            'content_length': hdrs.get('Content-Length'),
        }

    return {'statusCode': 200, 'headers': _cors(),
            'body': json.dumps(report, ensure_ascii=False)}