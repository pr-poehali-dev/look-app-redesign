import json
import os
import psycopg2

def handler(event: dict, context) -> dict:
    """WebRTC signaling сервер: обмен offer/answer/ICE кандидатами для P2P звонков"""
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
        'Content-Type': 'application/json'
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    user_id = (event.get('headers') or {}).get('X-User-Id', 'anon')

    try:
        if method == 'POST':
            body = json.loads(event.get('body') or '{}')
            room_id = body.get('room_id')
            to_user = body.get('to_user')
            sig_type = body.get('type')
            payload = body.get('payload', '')

            if not all([room_id, to_user, sig_type]):
                conn.commit()
                return {'statusCode': 400, 'headers': headers,
                        'body': json.dumps({'error': 'room_id, to_user, type required'})}

            cur.execute(
                "INSERT INTO sa_signaling (room_id, from_user, to_user, type, payload) "
                "VALUES (%s, %s, %s, %s, %s)",
                (room_id, user_id, to_user, sig_type, json.dumps(payload))
            )
            conn.commit()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

        elif method == 'GET':
            room_id = params.get('room_id')
            since_id = params.get('since_id', '0')

            if not room_id:
                conn.commit()
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'room_id required'})}

            cur.execute(
                "SELECT id, from_user, type, payload FROM sa_signaling "
                "WHERE room_id = %s AND to_user = %s AND id > %s "
                "ORDER BY created_at ASC LIMIT 50",
                (room_id, user_id, int(since_id))
            )
            rows = cur.fetchall()

            # Clean up old signals
            cur.execute(
                "UPDATE sa_signaling SET payload = '{}' "
                "WHERE room_id = %s AND to_user = %s AND id <= %s AND payload != '{}'",
                (room_id, user_id, int(since_id) + 100)
            )

            signals = [
                {'id': r[0], 'from_user': r[1], 'type': r[2], 'payload': json.loads(r[3])}
                for r in rows
            ]
            conn.commit()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'signals': signals})}

        conn.commit()
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'unknown'})}

    except Exception as e:
        conn.rollback()
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': str(e)})}
    finally:
        cur.close()
        conn.close()
