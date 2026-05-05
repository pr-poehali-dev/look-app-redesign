#!/bin/bash
# Самопроверка стека. Если сервис не отвечает — рестартует контейнер.
cd "$(dirname "$0")/.."

check() {
  local name=$1
  local url=$2
  if ! curl -sf --max-time 5 "$url" > /dev/null; then
    echo "[$(date)] $name DOWN, restarting"
    docker compose restart "$name"
  fi
}

check signaling http://localhost/health 2>/dev/null || \
  curl -sfk https://signal.visov.ru/health > /dev/null || \
  docker compose restart signaling

curl -sfk https://sfu.visov.ru/health > /dev/null || docker compose restart sfu
