import json
import os
import urllib.request
import urllib.error


def handler(event: dict, context) -> dict:
    """Возвращает список TURN/STUN серверов для WebRTC звонков"""
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    fallback_servers = [
        {'urls': 'stun:stun.l.google.com:19302'},
        {'urls': 'stun:stun1.l.google.com:19302'},
        {'urls': 'stun:stun.cloudflare.com:3478'},
        {
            'urls': 'turn:openrelay.metered.ca:80',
            'username': 'openrelayproject',
            'credential': 'openrelayproject',
        },
        {
            'urls': 'turn:openrelay.metered.ca:443',
            'username': 'openrelayproject',
            'credential': 'openrelayproject',
        },
        {
            'urls': 'turn:openrelay.metered.ca:443?transport=tcp',
            'username': 'openrelayproject',
            'credential': 'openrelayproject',
        },
    ]

    api_key = os.environ.get('METERED_API_KEY', '').strip()
    if not api_key:
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'iceServers': fallback_servers, 'source': 'fallback'}),
        }

    try:
        url = f'https://poehali.metered.live/api/v1/turn/credentials?apiKey={api_key}'
        req = urllib.request.Request(url, headers={'Accept': 'application/json'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if isinstance(data, list) and data:
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'iceServers': data, 'source': 'metered'}),
                }
    except Exception:
        pass

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({'iceServers': fallback_servers, 'source': 'fallback'}),
    }
