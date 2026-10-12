import json
import os
import re
import difflib
import psycopg2

CORS = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}
PERIODS = {'day': '1 day', 'week': '7 days', 'month': '30 days'}


def esc(s: str) -> str:
    return s.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')


def stem(w: str) -> str:
    n = len(w)
    if n <= 3:
        return w
    if n <= 5:
        return w[:-1]
    return w[:-2]


def parse_query(q: str) -> dict:
    phrases = re.findall(r'"([^"]+)"', q)
    rest = re.sub(r'"[^"]*"', ' ', q)
    include, exclude = [], []
    for tok in rest.split():
        if tok.startswith('-') and len(tok) > 1:
            exclude.append(tok[1:].lstrip('#').lower())
        else:
            t = tok.lstrip('#').lower()
            if t:
                include.append(t)
    return {'phrases': [p.strip().lower() for p in phrases if p.strip()], 'include': include, 'exclude': exclude}


def build_where(fields: list, p: dict, use_stem: bool = True):
    conds, args = [], []
    ors = ' OR '.join(f"{f} ILIKE %s" for f in fields)
    for t in p['include']:
        conds.append(f"({ors})")
        pat = '%' + esc(stem(t) if use_stem else t) + '%'
        args += [pat] * len(fields)
    for ph in p['phrases']:
        conds.append(f"({ors})")
        args += ['%' + esc(ph) + '%'] * len(fields)
    for t in p['exclude']:
        conds.append(f"NOT ({' OR '.join(f'COALESCE({f}, chr(32)) ILIKE %s' for f in fields)})")
        args += ['%' + esc(stem(t)) + '%'] * len(fields)
    return conds, args


def fuzzy_match(blob: str, p: dict) -> bool:
    text = blob.lower()
    words = set(re.findall(r'[\w]+', text))
    for ph in p['phrases']:
        if ph not in text:
            return False
    for t in p['exclude']:
        if stem(t) in text:
            return False
    for t in p['include']:
        if stem(t) in text:
            continue
        if not difflib.get_close_matches(t, words, n=1, cutoff=0.75):
            return False
    return bool(p['include'] or p['phrases'])


def run_search(cur, table, fields, select_sql, base_cond, p, order_new, order_pop, sort, period, date_col, limit=30):
    conds, args = build_where(fields, p)
    where = [base_cond] if base_cond else []
    if period in PERIODS and date_col:
        where.append(f"{date_col} > NOW() - INTERVAL '{PERIODS[period]}'")
    order = order_pop if sort == 'popular' else order_new
    sql = f"SELECT {select_sql} FROM {table} {'WHERE ' + ' AND '.join(where + conds) if (where or conds) else ''} ORDER BY {order} LIMIT {limit}"
    cur.execute(sql, args)
    rows = cur.fetchall()
    fuzzy = False
    if len(rows) < 3 and p['include']:
        blob = " || ' ' || ".join(f"COALESCE({f}, chr(32))" for f in fields)
        cand_where = ' AND '.join(where) if where else 'TRUE'
        cur.execute(f"SELECT id, {blob} FROM {table} WHERE {cand_where} ORDER BY {order_new} LIMIT 3000")
        ids = [r[0] for r in cur.fetchall() if fuzzy_match(r[1] or '', p)][:limit]
        have = {r[0] for r in rows}
        extra = [i for i in ids if i not in have]
        if extra:
            cur.execute(f"SELECT {select_sql} FROM {table} WHERE id = ANY(%s) ORDER BY {order}", (extra,))
            rows = list(rows) + cur.fetchall()
            fuzzy = True
    return rows, fuzzy


def handler(event: dict, context) -> dict:
    """Поиск: ?q=текст&kind=post|video|people|article|suggest&sort=new|popular&period=day|week|month|all. Поддерживает "фразу", -исключение, формы слов, опечатки"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
            'Access-Control-Max-Age': '86400'}, 'body': ''}

    params = event.get('queryStringParameters') or {}
    q = (params.get('q') or '').strip()[:100]
    kind = params.get('kind', 'video')
    sort = params.get('sort', 'new')
    period = params.get('period', 'all')
    if not q and kind != 'trending':
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'items': []})}

    schema = os.environ['MAIN_DB_SCHEMA']
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    fuzzy = False
    adult = False
    try:
        uid = (params.get('user_id') or '').strip()
        if uid:
            cur.execute(f"SELECT birth_date FROM {schema}.app_users WHERE id = %s", (uid,))
            br = cur.fetchone()
            if br and br[0]:
                import datetime
                t = datetime.date.today()
                adult = (t.year - br[0].year - ((t.month, t.day) < (br[0].month, br[0].day))) >= 18
        if kind == 'log':
            qn = ' '.join(q.lower().split())[:60]
            if len(qn) >= 2 and not qn.startswith('-'):
                n = params.get('n', '')
                cnt = int(n) if n.isdigit() else None
                cur.execute(f"INSERT INTO {schema}.search_queries (query, results_count) VALUES (%s, %s)", (qn, cnt))
                conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        if kind == 'trending':
            cur.execute(
                f"SELECT query, COUNT(*) c FROM {schema}.search_queries "
                f"WHERE created_at > NOW() - INTERVAL '7 days' GROUP BY query ORDER BY c DESC, MAX(created_at) DESC LIMIT 10")
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'trending': [r[0] for r in cur.fetchall()]})}

        if kind == 'suggest':
            last = q.split()[-1].lstrip('#-"').lower()
            out = []
            if len(last) >= 2:
                pat = esc(last) + '%'
                cur.execute(
                    f"SELECT DISTINCT lower(handle) FROM {schema}.app_users WHERE handle ILIKE %s LIMIT 4", (pat,))
                out += ['@' + r[0] for r in cur.fetchall() if r[0]]
                cur.execute(
                    f"SELECT hashtags FROM {schema}.videos WHERE hashtags ILIKE %s AND (hidden IS NULL OR hidden = FALSE) "
                    f"ORDER BY created_at DESC LIMIT 200", ('%' + esc(last) + '%',))
                seen = {}
                for (h,) in cur.fetchall():
                    for t in re.findall(r'[\w]+', (h or '').lower()):
                        if t.startswith(last):
                            seen[t] = seen.get(t, 0) + 1
                out += ['#' + t for t, _ in sorted(seen.items(), key=lambda x: -x[1])[:5]]
                cur.execute(
                    f"SELECT title FROM {schema}.articles WHERE status = 'published' AND title ILIKE %s LIMIT 3",
                    ('%' + esc(last) + '%',))
                out += [r[0] for r in cur.fetchall()]
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'suggestions': out[:10]})}

        p = parse_query(q)
        if not (p['include'] or p['phrases']):
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'items': []})}

        if kind == 'people':
            rows, fuzzy = run_search(
                cur, f"{schema}.app_users", ['handle', 'name'],
                "id, name, handle, avatar, COALESCE(is_verified, FALSE)", '', p,
                "is_verified DESC NULLS LAST, name", "is_verified DESC NULLS LAST, name", sort, 'all', None)
            items = [{'id': str(r[0]), 'name': r[1], 'handle': r[2], 'avatar': r[3], 'is_verified': bool(r[4])} for r in rows]
        elif kind == 'article':
            rows, fuzzy = run_search(
                cur, f"{schema}.articles", ['title'],
                "id, title, cover_image, views", "status = 'published'", p,
                "created_at DESC", "views DESC NULLS LAST", sort, period, 'created_at')
            items = [{'id': r[0], 'title': r[1], 'cover': r[2], 'views': r[3] or 0} for r in rows]
        else:
            type_cond = "type = 'video'" if kind == 'video' else "type IN ('image', 'text')"
            rows, fuzzy = run_search(
                cur, f"{schema}.videos", ['description', 'hashtags', 'author', 'handle'],
                "id, url, thumbnail, author, handle, description, likes, comments, created_at, type, user_id",
                f"{type_cond} AND (hidden IS NULL OR hidden = FALSE)" + ("" if adult else " AND age_rating <> '18+'"), p,
                "created_at DESC", "likes DESC NULLS LAST, created_at DESC", sort, period, 'created_at')
            items = [{'id': r[0], 'url': r[1], 'thumbnail': r[2], 'author': r[3], 'handle': r[4],
                      'description': r[5], 'likes': str(r[6]), 'comments': str(r[7]),
                      'created_at': r[8].isoformat() if r[8] else None, 'type': r[9]} for r in rows]
    finally:
        cur.close()
        conn.close()
    return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'items': items, 'fuzzy': fuzzy})}
