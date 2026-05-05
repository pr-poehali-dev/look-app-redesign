#!/bin/bash
# Получение SSL сертификатов Let's Encrypt для всех доменов
set -e

EMAIL="${LETSENCRYPT_EMAIL:-admin@visov.ru}"
DOMAINS=("signal.visov.ru" "sfu.visov.ru" "turn.visov.ru")

mkdir -p ./certbot/conf ./certbot/www

# Stop nginx if running
docker compose stop nginx 2>/dev/null || true

# Standalone certificate request for each domain
for D in "${DOMAINS[@]}"; do
  echo "==> Requesting cert for $D"
  docker run --rm \
    -p 80:80 \
    -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
    -v "$(pwd)/certbot/www:/var/www/certbot" \
    certbot/certbot certonly --standalone \
    --non-interactive --agree-tos --email "$EMAIL" \
    -d "$D"
done

echo "==> Certificates ready"
docker compose up -d nginx
