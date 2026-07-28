#!/bin/bash
# Устанавливает cron-задачи автообслуживания
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
chmod +x "$PROJECT_DIR/scripts/"*.sh

CRON_TMP=$(mktemp)
crontab -l 2>/dev/null > "$CRON_TMP" || true

# Удалить старые записи look
sed -i '/# look-/d' "$CRON_TMP"

cat >> "$CRON_TMP" <<EOF
*/2 * * * * $PROJECT_DIR/scripts/healthcheck.sh >> /var/log/look-health.log 2>&1 # look-health
0 3 * * * $PROJECT_DIR/scripts/backup.sh >> /var/log/look-backup.log 2>&1 # look-backup
0 4 * * * $PROJECT_DIR/scripts/cleanup.sh >> /var/log/look-cleanup.log 2>&1 # look-cleanup
EOF

crontab "$CRON_TMP"
rm "$CRON_TMP"
echo "Cron installed:"
crontab -l | grep look
