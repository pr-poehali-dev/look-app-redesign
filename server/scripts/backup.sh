#!/bin/bash
# Ежедневный бэкап конфигов и сертификатов
set -e

BACKUP_DIR="/var/backups/look"
DATE=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"

cd "$(dirname "$0")/.."
tar -czf "$BACKUP_DIR/look-$DATE.tar.gz" \
  docker-compose.yml \
  .env \
  signaling \
  sfu \
  coturn \
  nginx \
  certbot/conf 2>/dev/null || true

# Хранить только последние 14 бэкапов
ls -t "$BACKUP_DIR"/look-*.tar.gz | tail -n +15 | xargs -r rm -f

echo "Backup: $BACKUP_DIR/look-$DATE.tar.gz"
