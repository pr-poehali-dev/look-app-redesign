import json
import os
import time
import hmac
import hashlib
import base64


def handler(event: dict, context) -> dict:
    """Возвращает ICE-серверы (STUN + TURN с временными кредами) для WebRTC"""
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    ice_servers = [
        {'urls': 'stun:stun.l.google.com:19302'},
        {'urls': 'stun:stun1.l.google.com:19302'},
        {'urls': 'stun:stun.cloudflare.com:3478'},
    ]

    turn_url = os.environ.get('TURN_URL', '').strip()
    turn_secret = os.environ.get('TURN_SECRET', '').strip()
    turn_username = os.environ.get('TURN_USERNAME', '').strip()
    turn_password = os.environ.get('TURN_PASSWORD', '').strip()

    has_turn = False
    if turn_url:
        urls = [u.strip() for u in turn_url.split(',') if u.strip()]
        if urls:
            if turn_secret:
                ttl = 24 * 3600
                expiry = int(time.time()) + ttl
                username = f"{expiry}:webrtc"
                digest = hmac.new(turn_secret.encode(), username.encode(), hashlib.sha1).digest()
                credential = base64.b64encode(digest).decode()
                ice_servers.append({
                    'urls': urls,
                    'username': username,
                    'credential': credential,
                })
                has_turn = True
            elif turn_username and turn_password:
                ice_servers.append({
                    'urls': urls,
                    'username': turn_username,
                    'credential': turn_password,
                })
                has_turn = True

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({'iceServers': ice_servers, 'hasTurn': has_turn})
    }
