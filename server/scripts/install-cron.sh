#!/bin/bash
# Устанавливает cron-задачи автообслуживания
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
chmod +x "$PROJECT_DIR/scripts/"*.sh

CRON_TMP=$(mktemp)
crontab -l 2>/dev/null > "$CRON_TMP" || true

# Удалить старые записи visov
sed -i '/# visov-/d' "$CRON_TMP"

cat >> "$CRON_TMP" <<EOF
*/2 * * * * $PROJECT_DIR/scripts/healthcheck.sh >> /var/log/visov-health.log 2>&1 # visov-health
0 3 * * * $PROJECT_DIR/scripts/backup.sh >> /var/log/visov-backup.log 2>&1 # visov-backup
0 4 * * * $PROJECT_DIR/scripts/cleanup.sh >> /var/log/visov-cleanup.log 2>&1 # visov-cleanup
EOF

crontab "$CRON_TMP"
rm "$CRON_TMP"
echo "Cron installed:"
crontab -l | grep visov
